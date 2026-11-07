import { POLICY, WAD } from './constants';

export function squeekPower(level: number): bigint {
  if (!Number.isInteger(level) || level < 1 || level > 10) throw new Error('Choose a level from 1 to 10.');
  // Exact rational version of round(1000 × 2.2^(L−1)), avoiding floating-point drift.
  const denominator = 5n ** BigInt(level - 1);
  return (1000n * 11n ** BigInt(level - 1) + denominator / 2n) / denominator;
}
export function sqkPower(stake: bigint, totalPower: bigint): bigint {
  if (stake < 0n || totalPower < 0n) throw new Error('Power inputs must be nonnegative.');
  return stake * (1000n + totalPower) / 40_000n; // WAD power
}
export function parseAmount(value: string): bigint | null {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  const amount = BigInt(whole) * WAD + BigInt(fraction.padEnd(18, '0'));
  return amount <= 2_100_000_000n * WAD ? amount : null;
}
export function amountText(value: bigint, places = 2): string {
  const negative = value < 0n; const n = negative ? -value : value;
  const whole = (n / WAD).toLocaleString('en-US');
  const digits = (n % WAD).toString().padStart(18, '0').slice(0, places).replace(/0+$/, '');
  if (n > 0n && n < WAD / 10n ** BigInt(places)) return `${negative ? '−' : ''}<${(1 / 10 ** places).toFixed(places)}`;
  return `${negative ? '−' : ''}${whole}${digits ? '.' + digits : ''}`;
}
export function exactAmount(value: bigint): string {
  const fraction = (value % WAD).toString().padStart(18, '0').replace(/0+$/, '');
  return `${value / WAD}${fraction ? '.' + fraction : ''}`;
}
export function feeEstimate(amount: bigint, mature: bigint, recent: bigint): bigint {
  if (amount < 0n || mature < 0n || recent < 0n) throw new Error('Fee inputs must be nonnegative.');
  const d = mature + recent > POLICY.floor ? mature + recent : POLICY.floor;
  const cap = d * POLICY.saturationBps / 10_000n;
  const primitive = (x: bigint) => {
    const below = x < cap ? x : cap;
    const above = x - below;
    return (POLICY.minBps * below + (POLICY.maxBps - POLICY.minBps) * below ** 3n / (3n * cap ** 2n) + POLICY.maxBps * above) / 10_000n;
  };
  return primitive(recent + amount) - primitive(recent);
}
export function feeRate(fee: bigint, amount: bigint): string {
  return amount === 0n ? '0%' : `${(Number(fee * 10000n / amount) / 100).toFixed(2)}%`;
}
export function marginalRate(mature: bigint, recent: bigint): number {
  const d = mature + recent > POLICY.floor ? mature + recent : POLICY.floor;
  const c = d * POLICY.saturationBps / 10000n;
  return Number(POLICY.minBps + (POLICY.maxBps - POLICY.minBps) * (recent < c ? recent : c) ** 2n / c ** 2n) / 100;
}
export function windowEndsAt(timestamp: number): number {
  return (Math.floor(timestamp / 86_400_000) + POLICY.windowDays) * 86_400_000;
}
export function mergeScenario(level: number, count: number, stake: bigint) {
  const one = squeekPower(level); const before = one * BigInt(count);
  if (level === 10 || count < 2) return null;
  const gain = squeekPower(level + 1) - 2n * one;
  const after = before + gain;
  return { before, after, gain, pairBefore: 2n * one, survivor: squeekPower(level + 1), qGain: sqkPower(stake, after) - sqkPower(stake, before), percent: Number(gain * 10000n / (2n * one)) / 100 };
}
