import test from 'node:test';
import assert from 'node:assert/strict';
import { squeekPower, sqkPower, parseAmount, feeEstimate, marginalRate, mergeScenario, windowEndsAt, amountText } from '../src/lib/math';
import { WAD } from '../src/lib/constants';

test('all ten levels match the published rounded power table', () => {
  assert.deepEqual(Array.from({length:10}, (_,i) => squeekPower(i+1)), [1000n,2200n,4840n,10648n,23426n,51536n,113380n,249436n,548759n,1207269n]);
  for (const level of [0,11,-1,1.5,NaN]) assert.throws(() => squeekPower(level));
});
test('SQK power uses total NFT power and retains fractional units', () => {
  assert.equal(sqkPower(40_000n*WAD, 2000n),3000n*WAD);
  assert.equal(sqkPower(WAD,1000n),WAD/20n);
  assert.equal(sqkPower(0n,2000n),0n);
  assert.throws(() => sqkPower(-1n,0n));
});
test('amount input is exact to 18 decimals and never coerces invalid input to zero', () => {
  assert.equal(parseAmount('0'),0n); assert.equal(parseAmount('0.000000000000000001'),1n);
  assert.equal(parseAmount('2100000000'),2_100_000_000n*WAD);
  for(const s of ['', '-1','1e9','NaN','Infinity','1,000','1.0000000000000000001','2100000000.1','   ']) assert.equal(parseAmount(s),null,s);
});
test('merging retains the other NFTs and boosts token power only by the delta', () => {
  const m=mergeScenario(1,4,40_000n*WAD)!;
  assert.equal(m.before,4000n);assert.equal(m.after,4200n);assert.equal(m.gain,200n);assert.equal(m.qGain,200n*WAD);assert.equal(m.percent,10);
  assert.equal(mergeScenario(10,2,WAD),null);assert.equal(mergeScenario(1,1,WAD),null);
});
test('marginal fee follows the quiet, elevated, heavy and bank-run curve', () => {
  assert.equal(marginalRate(100_000_000n*WAD,0n),2);
  assert.equal(marginalRate(95_000_000n*WAD,5_000_000n*WAD),5.62);
  assert.equal(marginalRate(90_000_000n*WAD,10_000_000n*WAD),16.5);
  assert.equal(marginalRate(80_000_000n*WAD,20_000_000n*WAD),60);
});
test('the 21-million floor keeps a small pool from generating artificial bank-run rates', () => {
  assert.equal(marginalRate(0n,1000n*WAD),2);
  assert.equal(feeEstimate(100n*WAD,0n,0n),feeEstimate(100n*WAD,1_000_000n*WAD,0n));
});
test('a large exit includes its own rising fee, as in the protocol example', () => {
  const fee=feeEstimate(1_000_000n*WAD,95_000_000n*WAD,5_000_000n*WAD);
  assert.equal(amountText(fee,4),'63,983.3333');
  assert.ok(fee > 56_250n*WAD && fee < 72_200n*WAD);
});
test('fee integral is additive when an exit is split, including crossing saturation', () => {
  for (const [m,x] of [[95_000_000n,5_000_000n],[84_000_000n,16_000_000n],[10_000_000n,3_000_000n]]) {
    const a=3_000_000n*WAD,b=2_000_000n*WAD;
    assert.equal(feeEstimate(a+b,m*WAD,x*WAD),feeEstimate(a,m*WAD,x*WAD)+feeEstimate(b,m*WAD-a,x*WAD+a));
  }
});
test('fees never exceed 60 percent except the documented integer dust rounding', () => {
  for (const a of [0n,1n,100n*WAD,1_000_000_000n*WAD]) {
    const f=feeEstimate(a,0n,1_000_000_000n*WAD);assert.ok(f <= a*60n/100n+1n);assert.ok(f <= a);
  }
});
test('waiting clears past exits, but a large own exit still exceeds the quiet marginal rate', () => {
  const a=5_000_000n*WAD,m=21_000_000n*WAD;
  assert.ok(feeEstimate(a,m,0n)>a*2n/100n);
  assert.ok(feeEstimate(a,m,10_000_000n*WAD)>feeEstimate(a,m,0n));
});
test('exit window clears at the seventh UTC midnight, not 168 hours from now', () => {
  assert.equal(new Date(windowEndsAt(Date.parse('2026-11-07T23:59:59Z'))).toISOString(),'2026-11-14T00:00:00.000Z');
  assert.equal(new Date(windowEndsAt(Date.parse('2026-12-28T03:00:00Z'))).toISOString(),'2027-01-04T00:00:00.000Z');
});
test('display preserves large integer values and calls out sub-display amounts', () => {
  assert.equal(amountText(1n,4),'<0.0001');assert.equal(amountText(123456789123456789n*WAD),'123,456,789,123,456,789');
});
