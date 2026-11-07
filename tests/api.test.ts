import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCore, parseStatus, parseEconomy, isFresh, simpleCheckpointEstimate } from '../src/lib/api';
import { CONTRACTS, WAD } from '../src/lib/constants';
// Explicitly synthetic fixtures for validation; never included in the site's runtime.
import { coreFixture, statusFixture, economyFixture } from './fixtures';
test('core reads only settled work and validates block-unit consistency',()=>{assert.equal(parseCore(coreFixture()).height,1999n);const f=coreFixture();f.core.blockHeight='2000';assert.throws(()=>parseCore(f));});
test('unavailable, wrong network, contract and schema cannot become live values',()=>{for(const mutate of [(f:any)=>f.status='unavailable',(f:any)=>f.chain.chainId='1',(f:any)=>f.identities.core=CONTRACTS.mining,(f:any)=>f.schemaVersion=2]){const f=coreFixture();mutate(f);assert.throws(()=>parseCore(f));}});
test('zero queue work is valid but unavailable and missing queue work are unknown',()=>{const f=statusFixture();f.settlementQueue.buffered.workUnits='0';assert.equal(parseStatus(f).pending,0n);f.settlementQueue.status='unavailable';assert.throws(()=>parseStatus(f));assert.throws(()=>parseStatus({schemaVersion:1}));});
test('wheel and projected values never affect settled metrics or pending closed work',()=>{const f=statusFixture();assert.equal(parseStatus(f).pending,7n);f.measurement.rpmMilli=0;f.measurement.cumulativeWorkUnits='0';f.builder.projected.blockHeight='0';assert.equal(parseStatus(f).pending,7n);});
test('old pipeline snapshots are explicitly unavailable',()=>{const f=statusFixture();f.generatedAt=new Date(Date.now()-600_000).toISOString();assert.throws(()=>parseStatus(f));});
test('economy checks every bound address, maturity and fee policy',()=>{const f=economyFixture();assert.equal(parseEconomy(f).mature,39_000_000n*WAD);f.staking.exitPolicy.minBps=201;assert.throws(()=>parseEconomy(f));});
test('cooldown schedule indexes the resulting level and exposes maximum level distinctly',()=>{const e=parseEconomy(economyFixture());assert.equal(e.cooldowns[1],3000n);assert.equal(e.cooldowns[8],49000n);assert.equal(e.cooldowns[9],0n);});
test('zero issuance is inferred only from consistent, caught-up API snapshots',()=>{const c=parseCore(coreFixture()),e=parseEconomy(economyFixture());assert.equal(simpleCheckpointEstimate(c,e),0n);assert.equal(simpleCheckpointEstimate(c,{...e,safeBlock:101n}),null);assert.equal(simpleCheckpointEstimate(c,{...e,fundedBlocks:1998n}),null);assert.equal(simpleCheckpointEstimate(c,{...e,paused:true}),null);});
test('client data expires and never remains live indefinitely',()=>{assert.equal(isFresh(1000,121000),true);assert.equal(isFresh(1000,121001),false);assert.equal(isFresh(0,100),false);});
