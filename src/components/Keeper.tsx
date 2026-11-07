import { useState, useRef } from 'react';
import { useConnection, useWalletClient } from 'wagmi';
import { parseEventLogs, type Hash } from 'viem';
import { CONTRACTS, CHAIN_ID, EXPLORER } from '../lib/constants';
import { publicClient } from '../lib/chain';
import { miningAbi } from '../lib/abi';
import { amountText } from '../lib/math';
import { simpleCheckpointEstimate } from '../lib/api';
import type { Network } from '../lib/useNetwork';
import { Hamster } from './Hamster';
import { Icon } from './Icon';
import { Modal } from './Modal';

type Tx = { state: 'idle' | 'checking' | 'signing' | 'pending' | 'confirmed' | 'reverted' | 'unknown' | 'error'; hash?: Hash; message: string };
function savedTx(): Tx {
  try { const hash = sessionStorage.getItem('squeek-keeper-pending'); if (hash && /^0x[\da-f]{64}$/i.test(hash)) return { state: 'unknown', hash: hash as Hash, message: 'A submitted checkpoint is saved in this tab. Check its confirmation before sending another.' }; } catch { /* Storage may be disabled. */ }
  return { state: 'idle', message: '' };
}
function saveHash(hash?: Hash) { try { if (hash) sessionStorage.setItem('squeek-keeper-pending', hash); else sessionStorage.removeItem('squeek-keeper-pending'); } catch { /* Receipt remains visible without storage. */ } }
export function Keeper({ network: n, connect }: { network: Network; connect: () => void }) {
  const { address, isConnected, chainId } = useConnection(); const wallet = useWalletClient();
  const [review, setReview] = useState(false); const [tx, setTx] = useState<Tx>(savedTx); const busyRef = useRef(false);
  const { core, status, economy } = n;
  const estimate = core && economy && !n.checkpointQuery.isError ? n.checkpointQuery.data : undefined;
  const fallback = core && economy ? simpleCheckpointEstimate(core, economy) : null;
  const amount = estimate ? estimate.amount : fallback;
  const busy = ['checking', 'signing', 'pending', 'unknown'].includes(tx.state);
  const paused = core?.paused || economy?.paused;
  const fullStatus = !!core && !!status && !!economy;
  async function waitForReceipt(hash: Hash) {
    setTx({ state: 'pending', hash, message: 'Checkpoint submitted. Waiting for two Sepolia confirmations…' });
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 2, timeout: 180_000,
        onReplaced: replacement => { hash = replacement.transaction.hash; saveHash(hash); setTx({ state: 'pending', hash, message: 'Transaction replaced. Checking the replacement…' }); },
      });
      saveHash();
      if (receipt.status === 'reverted') setTx({ state: 'reverted', hash: receipt.transactionHash, message: 'Checkpoint reverted. No checkpoint changes were applied; gas may have been spent.' });
      else {
        const logs = parseEventLogs({ abi: miningAbi, eventName: 'Checkpointed', logs: receipt.logs.filter(l => l.address.toLowerCase() === CONTRACTS.mining.toLowerCase()), strict: false });
        const event = logs[0];
        setTx({ state: 'confirmed', hash: receipt.transactionHash, message: event?.args.amount !== undefined ? `Confirmed at Sepolia block ${receipt.blockNumber.toLocaleString('en-US')}. Issued ${amountText(event.args.amount, 4)} SQK to Staking through round ${event.args.throughRound?.toString()}.` : `Confirmed at Sepolia block ${receipt.blockNumber.toLocaleString('en-US')}. No Checkpointed event was emitted; this transaction did not advance a checkpoint.` });
      }
      n.refresh();
    } catch { setTx({ state: 'unknown', hash, message: 'Confirmation is unknown. Your transaction may still confirm. Check its status or open the explorer; do not submit it again.' }); }
  }
  async function send() {
    if (busyRef.current) return; busyRef.current = true; setReview(false);
    let walletPromptOpened = false;
    try {
      if (!address || !wallet.data || chainId !== CHAIN_ID) throw new Error('Connect your Sepolia wallet before checkpointing.');
      setTx({ state: 'checking', message: 'Checking the settled round and simulating the checkpoint…' });
      if (await wallet.data.getChainId() !== CHAIN_ID || await publicClient.getChainId() !== CHAIN_ID) throw new Error('Switch your wallet to Sepolia and try again.');
      const blockNumber = await publicClient.getBlockNumber();
      const [statusNow, mining, boundCore] = await Promise.all([
        publicClient.readContract({ address: CONTRACTS.mining, abi: miningAbi, functionName: 'checkpointStatus', blockNumber }),
        publicClient.readContract({ address: CONTRACTS.mining, abi: miningAbi, functionName: 'state', blockNumber }),
        publicClient.readContract({ address: CONTRACTS.mining, abi: miningAbi, functionName: 'core', blockNumber }),
      ]);
      if (boundCore.toLowerCase() !== CONTRACTS.core.toLowerCase()) throw new Error('Mining no longer points to the expected Core. Checkpoint stopped.');
      if (statusNow[0] || mining.paused) throw new Error('Checkpointing is paused. Refresh later.');
      if (statusNow[1] === 0n || !mining.active) throw new Error('Mining has not started. No transaction was sent.');
      if (!statusNow[2]) throw new Error('No new settled round to checkpoint. Refresh later.');
      const simulation = await publicClient.simulateContract({ address: CONTRACTS.mining, abi: miningAbi, functionName: 'checkpoint', account: address, chain: wallet.data.chain });
      if (await wallet.data.getChainId() !== CHAIN_ID || wallet.data.account.address.toLowerCase() !== address.toLowerCase()) throw new Error('Wallet changed. Review the connected Sepolia account and try again.');
      setTx({ state: 'signing', message: 'Review the checkpoint in your wallet. You pay Sepolia ETH gas.' });
      walletPromptOpened = true;
      const hash = await wallet.data.writeContract({ ...simulation.request, account: address, chain: wallet.data.chain });
      saveHash(hash); await waitForReceipt(hash);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const friendly = /rejected|denied|cancelled/i.test(message) ? 'Request cancelled in your wallet. No checkpoint was sent.' : walletPromptOpened ? 'Your wallet did not return a transaction hash. Check its Sepolia activity before retrying; submission status is unknown.' : /RPC|HTTP|fetch|network|timeout|request failed/i.test(message) ? 'Unable to verify the checkpoint with the public RPC. No transaction was sent. Refresh and try again.' : message.length < 220 ? message : 'Checkpoint could not be prepared. Check your wallet, Sepolia balance and network, then retry.';
      setTx({ state: 'error', message: friendly });
    } finally { busyRef.current = false; }
  }
  return <section className="keeper panel" id="keeper" aria-labelledby="keeper-heading">
    <div className="keeper-data">
      <div className="section-top"><h2 id="keeper-heading"><Icon name="cube" /> Keeper</h2><span className={`status-badge ${fullStatus ? 'good' : ''}`}><span className="status-dot" />{n.busy ? 'Refreshing' : fullStatus ? 'API available' : 'Data incomplete'}</span></div>
      <p className="muted section-description">The settled state of the hamster economy.</p>
      <dl className="metrics">
        <div><dt>Settled block height</dt><dd data-testid="height">{core ? core.height.toLocaleString('en-US') : 'unknown'}</dd><span>Completed Squeek blocks</span></div>
        <div><dt>Pending work</dt><dd data-testid="pending">{status ? status.pending.toLocaleString('en-US') : 'unknown'}</dd><span>Queued units · not yet settled</span></div>
        <div><dt>Work per round (cap)</dt><dd data-testid="round-work">{core ? core.maxWork.toLocaleString('en-US') : 'unknown'}</dd><span>{core ? `Target: ${amountText(core.difficulty * core.targetBlocks * 10n ** 15n, 2)} units` : 'Target: unknown'}</span></div>
        <div><dt>Difficulty</dt><dd data-testid="difficulty">{core ? core.difficulty.toLocaleString('en-US') : 'unknown'}</dd><span>Work units / 1,000 blocks</span></div>
      </dl>
      <div className="keeper-source"><span><Icon name="lock" size={14} />{core ? `Settled through round ${core.settledRound.toLocaleString('en-US')}` : 'Settled state unavailable'}</span><button className="text-button" disabled={n.busy} onClick={n.refresh}><Icon name="refresh" size={15} />{n.busy ? 'Refreshing…' : 'Refresh'}</button></div>
    </div>
    <div className="checkpoint-pane">
      <div className="checkpoint-heading"><h3>Next checkpoint</h3><Hamster className="checkpoint-hamster" /></div>
      <p className="issuance"><span data-testid="issuance">{amount != null ? amountText(amount, 2) : 'unknown'}</span> <span className="unit">SQK</span></p>
      <p className="small muted">{estimate?.reason || (amount === 0n ? 'No new settled blocks to fund.' : n.checkpointQuery.isError ? 'Public RPC unavailable. Refresh to retry.' : 'Estimated issuance from settled blocks only.')}</p>
      <button className="primary checkpoint-button" disabled={busy || !!paused || (isConnected && chainId !== CHAIN_ID)} onClick={() => { if (!isConnected) connect(); else setReview(true); }}><Icon name="bolt" size={18} />{tx.state === 'checking' ? 'Checking…' : tx.state === 'signing' ? 'Check your wallet' : tx.state === 'pending' ? 'Confirming…' : tx.state === 'unknown' ? 'Confirmation unknown' : paused ? 'Checkpoint paused' : 'Checkpoint'}{!busy && <Icon name="arrow" size={18} />}</button>
      <p className="small muted action-note">{isConnected && chainId !== CHAIN_ID ? 'Switch to Sepolia using the wallet control.' : isConnected ? 'You pay Sepolia gas. No caller reward.' : 'Connect your Sepolia wallet to submit.'}</p>
    </div>
    {(!core || !status || !economy) && !n.busy && <p className="network-note"><Icon name="info" size={16} />Some public data is unavailable. Unknown values are never treated as zero. Refresh to retry.</p>}
    {tx.state !== 'idle' && <div className={`transaction ${tx.state === 'confirmed' ? 'success-text' : ''}`}><p role="status">{tx.message}</p>{tx.hash && <a className="hash" href={`${EXPLORER}/tx/${tx.hash}`} target="_blank" rel="noreferrer">{tx.hash}<Icon name="external" size={16} /></a>}{tx.state === 'unknown' && tx.hash && <button className="secondary" onClick={() => void waitForReceipt(tx.hash!)}>Check confirmation</button>}</div>}
    {review && <Modal title="Review checkpoint" close={() => setReview(false)}>
      <p>Submit settled rounds to SqueekMining on Sepolia. Issued SQK goes to Staking. This action pays no reward to the caller.</p>
      <dl className="review-rows"><div><dt>Network</dt><dd>Sepolia · 11155111</dd></div><div><dt>Function</dt><dd><code>checkpoint()</code></dd></div><div><dt>Contract</dt><dd className="full-address">{CONTRACTS.mining}</dd></div><div><dt>From</dt><dd className="full-address">{address}</dd></div><div><dt>Token payment</dt><dd>None · Sepolia ETH gas only</dd></div></dl>
      <p className="small muted">The settled state is rechecked before your wallet opens. Your wallet shows the gas estimate for approval.</p>
      <button className="primary full" onClick={() => void send()} disabled={!wallet.data}>Send checkpoint<Icon name="arrow" /></button>
    </Modal>}
  </section>;
}
