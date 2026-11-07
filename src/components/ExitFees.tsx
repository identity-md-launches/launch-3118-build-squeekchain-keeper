import { useState } from 'react';
import { amountText, feeEstimate, feeRate, marginalRate, parseAmount, windowEndsAt } from '../lib/math';
import type { Network } from '../lib/useNetwork';
import { Icon } from './Icon';
export function ExitFees({ stake, network: n }: { stake: bigint | null; network: Network }) {
  const [mode, setMode] = useState<'network' | 'custom'>('network');
  const [matureText, setMatureText] = useState('21000000'); const [recentText, setRecentText] = useState('0');
  const live = n.economy && !n.exitsQuery.isError ? n.exitsQuery.data : undefined;
  const mature = mode === 'custom' ? parseAmount(matureText) : live?.mature ?? null;
  const recent = mode === 'custom' ? parseAmount(recentText) : live?.recent ?? null;
  const valid = stake !== null && mature !== null && recent !== null;
  const feeNow = valid ? feeEstimate(stake!, mature!, recent!) : null;
  const afterMature = mode === 'network' ? live?.mature ?? n.economy?.mature ?? null : mature;
  const feeAfter = stake !== null && afterMature !== null ? feeEstimate(stake, afterMature, 0n) : null;
  const rateNow = mature !== null && recent !== null ? marginalRate(mature, recent) : null;
  const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(windowEndsAt(n.economy?.timestamp ?? n.now));
  const showOutsidePool = stake !== null && mature !== null && stake > mature;
  return <section className="exit-panel panel" aria-labelledby="exit-heading">
    <div className="section-top"><h3 id="exit-heading"><Icon name="clock" /> Exit now or wait?</h3><label className="source-select">Inputs<select aria-label="Exit fee input source" value={mode} onChange={e => setMode(e.target.value as 'network' | 'custom')}><option value="network">Public network data</option><option value="custom">Custom scenario</option></select></label></div>
    <p className="muted small">Estimate the fee burned when unstaking your scenario’s SQK.</p>
    {mode === 'custom' && <div className="custom-inputs"><div className="field"><label htmlFor="mature">Network mature stake (SQK)</label><input id="mature" value={matureText} inputMode="decimal" onChange={e => setMatureText(e.target.value)} aria-invalid={mature === null} aria-describedby="fee-input-help" /></div><div className="field"><label htmlFor="recent">Exits in the last 7 UTC days (SQK)</label><input id="recent" value={recentText} inputMode="decimal" onChange={e => setRecentText(e.target.value)} aria-invalid={recent === null} aria-describedby="fee-input-help" /></div><p id="fee-input-help" className={`small ${mature === null || recent === null ? 'error-text' : 'muted'}`}>{mature === null || recent === null ? 'Use amounts from 0 to 2.1 billion, with up to 18 decimals and no commas.' : 'Custom inputs are hypothetical and do not describe the live network.'}</p><div className="scenario-presets"><button className="secondary" onClick={() => { setMatureText('21000000'); setRecentText('0'); }}>Quiet example</button><button className="secondary" onClick={() => { setMatureText('84000000'); setRecentText('21000000'); }}>Bank run example</button></div></div>}
    <div className="exit-grid">
      <div>
        <div className="fee-comparison">
          <div><h4>Exit now</h4><p className="fee-number" data-testid="fee-now">{feeNow !== null && stake !== null ? feeRate(feeNow, stake) : 'unknown'}</p><p className="small">{feeNow !== null ? `${amountText(feeNow, 4)} SQK burned` : mode === 'network' ? 'Current exit pressure unavailable' : 'Check your scenario inputs'}</p><p className="small muted">{feeNow !== null && stake !== null ? `${amountText(stake - feeNow, 4)} SQK returned` : 'Public reads only'}</p></div>
          <Icon name="arrow" size={20} />
          <div><h4>After the window</h4><p className="fee-number after" data-testid="fee-after">{feeAfter !== null && stake !== null ? feeRate(feeAfter, stake) : 'unknown'}</p><p className="small">{feeAfter !== null ? `${amountText(feeAfter, 4)} SQK burned` : 'Mature stake unavailable'}</p><p className="small muted">{feeAfter !== null && stake !== null ? `${amountText(stake - feeAfter, 4)} SQK returned` : 'Refresh or use custom inputs'}</p></div>
        </div>
        {showOutsidePool && <p className="small warning-text">Your scenario exceeds the observed mature pool. This is a hypothetical fee calculation, not an available unstake.</p>}
        <p className="small muted window-note"><Icon name="info" size={16} />By {date}, 00:00 UTC, today’s exits leave the window. The estimate assumes no further exits and unchanged mature stake.</p>
      </div>
      <div className="fee-chart"><div className="chart-heading"><span>Marginal exit fee</span><span className="muted small">Illustrative curve</span></div><svg viewBox="0 0 400 155" role="img" aria-label="Marginal exit fee starts at 2 percent, rises quadratically, and caps at 60 percent when exit pressure reaches 20 percent."><path d="M36 18H384M36 65H384M36 112H384" stroke="var(--line)" strokeDasharray="3 5" /><path d="M36 109 Q170 109 312 18H384" fill="none" stroke="var(--chart)" strokeWidth="3" /><text x="0" y="23">60%</text><text x="0" y="71">30%</text><text x="8" y="117">2%</text><text x="30" y="144">0%</text><text x="165" y="144">10%</text><text x="299" y="144">20%</text><text x="361" y="144">25%</text></svg><div className="chart-caption"><span className="small muted">Recent exits / pressure denominator</span><span className="small">{rateNow === null ? 'Current rate unknown' : `${mode === 'custom' ? 'Scenario' : 'Snapshot'}: ${rateNow.toFixed(2)}%`}</span></div></div>
    </div>
    <details className="formula-details fee-details"><summary>Understand the fee and its limits</summary><div className="details-columns"><div><p>Fees are burned in full. The marginal rate starts at 2%, reaches 60% at 20% exit pressure, and stays capped there. A large exit increases its own fee.</p><p>The denominator is mature stake plus recent exits, with a 21,000,000 SQK floor. Fresh stake is excluded. The comparison integrates the quadratic curve over your full exit amount.</p></div><div><p>The window contains today and the previous six UTC days. Old exits drop out at midnight, not continuously. Clearing prior exits does not guarantee a 2% total fee because your own exit still adds pressure.</p><p>These are mathematical estimates with integer rounding, not an executable quote. An actual unstake must use the contract’s account-specific quote and mature balance. No unstake is sent here.</p></div></div></details>
  </section>;
}
