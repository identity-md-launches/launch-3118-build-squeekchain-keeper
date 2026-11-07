import { API, BLOCK_UNITS, CHAIN_ID, CONTRACTS, POLICY, STALE_MS } from './constants';

type RecordData = Record<string, unknown>;
const record = (x: unknown): RecordData => {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error('The API response has an unsupported shape.');
  return x as RecordData;
};
export const uint = (x: unknown): bigint => {
  if (typeof x !== 'string' || !/^\d{1,78}$/.test(x)) throw new Error('The API returned an invalid number.');
  return BigInt(x);
};
const bool = (x: unknown) => { if (typeof x !== 'boolean') throw new Error('The API returned an invalid status.'); return x; };
const addressMatches = (a: unknown, b: string) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();
function available(raw: unknown, version: number) {
  const d = record(raw);
  if (d.status !== 'available') throw new Error('API status unavailable. Retry to check again.');
  if (d.schemaVersion !== version) throw new Error('API version changed. Values are unknown.');
  if (uint(record(d.chain).chainId) !== BigInt(CHAIN_ID)) throw new Error('API network mismatch. Only Sepolia is supported.');
  return d;
}
export function parseCore(raw: unknown) {
  const d = available(raw, 1); const c = record(d.core); const config = record(d.configuration); const chain = record(d.chain);
  if (!addressMatches(record(d.identities).core, CONTRACTS.core)) throw new Error('Core contract does not match this deployment.');
  const units = uint(c.cumulativeBlockUnits); const height = uint(c.blockHeight); const progress = uint(c.blockProgress);
  if (height !== units / BLOCK_UNITS || progress !== units % BLOCK_UNITS || uint(config.blockUnitsPerBlock) !== BLOCK_UNITS) throw new Error('Settled block data is inconsistent.');
  const difficulty = uint(c.workPerThousandBlocks);
  if (difficulty === 0n) throw new Error('Difficulty is unavailable.');
  return { height, progress, difficulty, work: uint(c.cumulativeWork), settledRound: uint(c.settledThroughRound), maxWork: uint(config.maxWorkPerRound), targetBlocks: uint(config.targetBlocksPerActiveRound), roundSeconds: uint(config.roundDuration), safeBlock: uint(chain.safeThroughBlock), paused: bool(c.paused) };
}
export type CoreData = ReturnType<typeof parseCore>;
export function parseStatus(raw: unknown) {
  const d = record(raw);
  if (d.schemaVersion !== 1 || d.status === 'unavailable') throw new Error('Pipeline status unavailable.');
  if (d.installationId !== 'sepolia-core-sepolia-20261103') throw new Error('Pipeline deployment mismatch.');
  const queue = record(d.settlementQueue);
  if (queue.status !== 'available') throw new Error('Settlement queue unavailable.');
  const generatedAt = Date.parse(String(d.generatedAt));
  if (!Number.isFinite(generatedAt) || Math.abs(Date.now() - generatedAt) > 300_000) throw new Error('Pipeline status is stale.');
  const buffered = record(queue.buffered);
  // Deliberately never read measurement, projected, openRoundWorkUnits or wheel speed.
  return { pending: uint(buffered.workUnits), rounds: uint(buffered.roundCount), blocked: queue.incidentOpen === true || !!queue.blockedReason, generatedAt };
}
export type StatusData = ReturnType<typeof parseStatus>;
export function parseEconomy(raw: unknown) {
  const d = available(raw, 3); const chain = record(d.chain); const deployment = record(d.deployment);
  const components = record(deployment.components);
  for (const [apiName, key] of [['core', 'core'], ['collection', 'nft'], ['token', 'token'], ['mining', 'mining'], ['staking', 'staking']] as const) {
    if (!addressMatches(record(components[apiName]).address, CONTRACTS[key])) throw new Error('Economy deployment mismatch.');
  }
  if (record(d.asset).decimals !== 18 || !addressMatches(record(d.asset).address, CONTRACTS.token)) throw new Error('Token units do not match this deployment.');
  const staking = record(d.staking); const policy = record(staking.exitPolicy); const nft = record(d.nft);
  if (policy.minBps !== Number(POLICY.minBps) || policy.maxBps !== Number(POLICY.maxBps) || policy.saturationBps !== Number(POLICY.saturationBps) || policy.windowDays !== POLICY.windowDays || uint(policy.pressureFloorBaseUnits) !== POLICY.floor) throw new Error('Exit policy changed. Live fee estimates are unknown.');
  if (!Array.isArray(nft.cooldownBlocks) || nft.cooldownBlocks.length !== 10) throw new Error('Cooldown schedule unavailable.');
  const schedule = record(d.schedule); const mining = record(d.mining);
  const timestamp = Date.parse(String(chain.safeBlockTimestamp));
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 900_000) throw new Error('Economy snapshot is stale.');
  const total = uint(staking.totalStakedBaseUnits); const fresh = uint(staking.freshPrincipalBaseUnits);
  if (fresh > total) throw new Error('Mature stake is inconsistent.');
  return { safeBlock: uint(chain.safeThroughBlock), timestamp, cooldowns: nft.cooldownBlocks.map(uint), mergesOpen: bool(nft.mergesOpen), mature: total - fresh, total, fresh, processedRound: uint(mining.processedThroughRound), fundedBlocks: uint(mining.fundedBlocks), startHeight: uint(schedule.startHeight), issued: uint(schedule.issuedBaseUnits), minted: uint(record(d.supply).miningMintedBaseUnits), paused: bool(record(d.lifecycle).paused), stage: String(record(d.lifecycle).stage) };
}
export type EconomyData = ReturnType<typeof parseEconomy>;
export async function apiRead<T>(path: string, parse: (raw: unknown) => T): Promise<T> {
  const response = await fetch(`${API}/${path}`, { signal: AbortSignal.timeout(12_000), headers: { Accept: 'application/json' }, credentials: 'omit' });
  if (!response.ok) throw new Error(response.status === 429 ? 'API rate limit reached. Wait a minute, then retry.' : `Public API unavailable (HTTP ${response.status}). Retry to check again.`);
  return parse(await response.json());
}
export function isFresh(updatedAt: number, now: number) { return updatedAt > 0 && now - updatedAt <= STALE_MS; }
export function simpleCheckpointEstimate(core: CoreData, economy: EconomyData): bigint | null {
  // Independent API responses must represent exactly the same safe Ethereum block.
  if (core.safeBlock !== economy.safeBlock || core.paused || economy.paused || economy.stage !== 'active' || core.settledRound < economy.processedRound || core.settledRound - economy.processedRound > 32n) return null;
  if (economy.issued < economy.minted) return null;
  // The economy schedule's issued amount is only for closedThroughBlock; don't assume
  // it covers an unfunded backlog. A caught-up checkpoint is definitively zero.
  return core.height === economy.startHeight + economy.fundedBlocks ? 0n : null;
}
