import { publicClient } from './chain';
import { coreAbi, miningAbi, stakingAbi } from './abi';
import { BLOCK_UNITS, CHAIN_ID, CONTRACTS } from './constants';

export async function readExitSnapshot(blockNumber: bigint) {
  if (await publicClient.getChainId() !== CHAIN_ID) throw new Error('Public RPC is not Sepolia.');
  const [recent, total, fresh] = await Promise.all([
    publicClient.readContract({ address: CONTRACTS.staking, abi: stakingAbi, functionName: 'recentExits', blockNumber }),
    publicClient.readContract({ address: CONTRACTS.staking, abi: stakingAbi, functionName: 'totalStaked', blockNumber }),
    publicClient.readContract({ address: CONTRACTS.staking, abi: stakingAbi, functionName: 'totalFresh', blockNumber }),
  ]);
  if (fresh[0] > total) throw new Error('Invalid mature principal.');
  return { recent, mature: total - fresh[0], blockNumber };
}
export async function readCheckpointEstimate(blockNumber: bigint) {
  if (await publicClient.getChainId() !== CHAIN_ID) throw new Error('Public RPC is not Sepolia.');
  const readMining = { address: CONTRACTS.mining, abi: miningAbi, blockNumber } as const;
  const readCore = { address: CONTRACTS.core, abi: coreAbi, blockNumber } as const;
  const [state, core, status, boundCore] = await Promise.all([
    publicClient.readContract({ ...readMining, functionName: 'state' }),
    publicClient.readContract({ ...readCore, functionName: 'state' }),
    publicClient.readContract({ ...readMining, functionName: 'checkpointStatus' }),
    publicClient.readContract({ ...readMining, functionName: 'core' }),
  ]);
  if (boundCore.toLowerCase() !== CONTRACTS.core.toLowerCase()) throw new Error('Mining core binding changed.');
  if (!state.bootstrapped || !state.active || state.startRound === 0n) return { amount: 0n, ready: false, reason: 'Mining has not started.', rounds: 0, through: state.processedThroughRound };
  if (core.paused || state.paused || status[0]) return { amount: null, ready: false, reason: 'Checkpointing is paused.', rounds: 0, through: state.processedThroughRound };
  if (!status[2]) return { amount: 0n, ready: false, reason: 'All settled rounds are checkpointed.', rounds: 0, through: state.processedThroughRound };
  let startHeight = state.startHeight;
  if (!state.startCaptured) {
    const prior = state.startRound - 1n;
    const page = await publicClient.readContract({ ...readCore, functionName: 'roundPage', args: [prior, prior, 0n] });
    startHeight = page.end.cumulativeBlockUnits / BLOCK_UNITS;
  }
  const startedAt = Date.now();
  let height = startHeight + state.fundedBlocks; let rounds = 0; let through = state.processedThroughRound;
  // Skip zero-block rounds via blockInfo. One point read reaches the end of each earning round.
  while (height < core.blockHeight && rounds < 32) {
    if (Date.now() - startedAt > 20_000) throw new Error('Checkpoint estimate timed out. Refresh to retry.');
    const info = await publicClient.readContract({ ...readCore, functionName: 'blockInfo', args: [height + 1n] });
    const page = await publicClient.readContract({ ...readCore, functionName: 'roundPage', args: [info.roundId, info.roundId, 0n] });
    const nextHeight = page.end.cumulativeBlockUnits / BLOCK_UNITS;
    if (nextHeight <= height || nextHeight > core.blockHeight) throw new Error('Inconsistent settled block boundary.');
    height = nextHeight; through = info.roundId; rounds++;
  }
  if (height === core.blockHeight) through = core.settledThroughRound;
  const issued = await publicClient.readContract({ ...readMining, functionName: 'issued', args: [height - startHeight] });
  if (issued < state.minted) throw new Error('Issuance regressed.');
  return { amount: issued - state.minted, ready: true, reason: 'Settled rounds are ready to checkpoint.', rounds, through };
}
