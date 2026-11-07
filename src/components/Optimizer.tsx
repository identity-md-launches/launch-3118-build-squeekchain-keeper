import { useState } from 'react';
import { amountText, mergeScenario, parseAmount, sqkPower, squeekPower } from '../lib/math';
import { WAD } from '../lib/constants';
import type { Network } from '../lib/useNetwork';
import { Icon } from './Icon';
import { Hamster } from './Hamster';
import { ExitFees } from './ExitFees';
export function Optimizer({ network }: { network: Network }) {
  const [level, setLevel] = useState(1); const [countText, setCountText] = useState('2'); const [stakeText, setStakeText] = useState('40000');
  const count = /^\d+$/.test(countText) ? Number(countText) : NaN;
  const validCount = Number.isInteger(count) && count >= 1 && count <= 9999;
  const stake = parseAmount(stakeText); const valid = validCount && stake !== null;
  const one = squeekPower(level); const p = validCount ? one * BigInt(count) : null;
  const q = valid && p !== null ? sqkPower(stake!, p) : null;
  const merge = valid ? mergeScenario(level, count, stake!) : null;
  const cooldown = level < 10 ? network.economy?.cooldowns[level] : undefined;
  return <section id="optimizer" className="optimizer" aria-labelledby="optimizer-heading">
    <div className="optimizer-header"><div><h2 id="optimizer-heading">Staking optimizer</h2></div><span className="paper-label"><Icon name="seed" size={16} />Paper mode</span></div>
    <div className="optimizer-grid">
      <section className="position-panel panel" aria-labelledby="position-heading">
        <div className="section-top"><h3 id="position-heading">Your scenario</h3><button className="text-button" onClick={() => { setLevel(1); setCountText('2'); setStakeText('40000'); }}>Reset</button></div>
        <p className="small muted">Illustrative inputs, not your wallet balance.</p>
        <div className="field-grid">
          <div className="field"><label htmlFor="level">Squeek level</label><select id="level" value={level} onChange={e => setLevel(Number(e.target.value))}>{Array.from({ length: 10 }, (_, i) => <option key={i} value={i + 1}>Level {i + 1}</option>)}</select></div>
          <div className="field"><label htmlFor="count">Squeeks at this level</label><input id="count" name="squeek-count" inputMode="numeric" value={countText} onChange={e => setCountText(e.target.value)} aria-invalid={!validCount} aria-describedby={!validCount ? 'count-error' : undefined} /></div>
          <div className="field stake-field"><label htmlFor="stake">Staked SQK</label><div className="input-unit"><input id="stake" name="stake" inputMode="decimal" value={stakeText} onChange={e => setStakeText(e.target.value)} aria-invalid={stake === null} aria-describedby={stake === null ? 'stake-error' : 'stake-help'} autoComplete="off" /><span>SQK</span></div><span id="stake-help" className="small muted">Your amount stays local to this page.</span></div>
        </div>
        {!validCount && <p id="count-error" className="error-text small">Enter a whole number from 1 to 9,999.</p>}
        {stake === null && <p id="stake-error" className="error-text small">Enter 0 to 2.1 billion SQK, with up to 18 decimal places. Use a decimal point, without commas.</p>}
        <dl className="power-results" aria-live="polite">
          <div><dt>Squeek power <span className="muted">P</span></dt><dd data-testid="nft-power">{p === null ? 'Enter a count' : p.toLocaleString('en-US')}</dd></div>
          <div><dt>SQK power <span className="muted">Q</span></dt><dd data-testid="sqk-power">{q === null ? 'Check inputs' : amountText(q, 4)}</dd></div>
          <div className="power-total"><dt>Total power</dt><dd data-testid="total-power">{q === null || p === null ? 'Check inputs' : amountText(p * WAD + q, 4)}</dd></div>
        </dl>
        <details className="formula-details"><summary>How power is calculated</summary><p className="small muted">One Level {level} Squeek has {one.toLocaleString('en-US')} power. P is the sum of all Squeeks in this scenario.</p><code>power = round(1000 × 2.2^(L − 1))</code><code>Q = S / 40 × (1 + P / 1000)</code><p className="small muted">This is power, not an earnings or price forecast.</p></details>
      </section>
      <section className="merge-panel panel" aria-labelledby="merge-heading">
        <div className="section-top"><h3 id="merge-heading">Compare a merge</h3><Icon name="bolt" /></div>
        <p className="small muted">Compare one merge within your scenario.</p>
        <div className="merge-art" aria-hidden="true"><div className="hamster-pair"><Hamster /><Hamster /></div><Icon name="arrow" size={24} /><Hamster className="merged-hamster" /></div>
        <div className="merge-labels"><span>2 × Level {level}</span><span>{level < 10 ? `1 × Level ${level + 1}` : 'Level cap reached'}</span></div>
        {level === 10 ? <div className="merge-empty"><h3>Maximum level</h3><p className="muted">Level 10 Squeeks cannot merge higher. Try a lower level to compare a merge.</p></div> : !valid ? <p className="merge-empty muted">Check your inputs to compare a merge.</p> : count < 2 ? <p className="merge-empty muted">Set at least two Squeeks of the same level to compare a merge.</p> : merge && <>
          <div className="merge-gain"><strong data-testid="merge-gain">+{merge.percent.toFixed(2)}%</strong><span>pair’s Squeek power</span></div>
          <dl className="merge-results"><div><dt>Squeek power gained</dt><dd>+{merge.gain.toLocaleString('en-US')}</dd></div><div><dt>SQK power gained</dt><dd>+{amountText(merge.qGain, 4)}</dd></div><div><dt>Next merge cooldown</dt><dd data-testid="cooldown">{level + 1 === 10 ? 'No further merge' : cooldown !== undefined ? `${cooldown.toLocaleString('en-US')} blocks` : 'unknown'}</dd></div></dl>
          <p className="small muted">{level + 1 === 10 ? 'The survivor reaches Level 10. It cannot merge again.' : 'Cooldown starts after this merge, in completed Squeek blocks. It is not a wall-clock timer.'}</p>
        </>}
        <details className="formula-details"><summary>Before a real merge</summary><p className="small muted">Both NFTs must be at the same level and past their own next-merge heights. One is permanently burned. The survivor keeps its identity and earns the new power immediately.</p><p className="small muted">Merge gate: {network.economy ? network.economy.mergesOpen ? 'open at the API snapshot.' : 'closed at the API snapshot.' : 'unknown.'} This tool does not execute merges or verify your NFTs.</p></details>
      </section>
    </div>
    <ExitFees stake={stake} network={network} />
  </section>;
}
