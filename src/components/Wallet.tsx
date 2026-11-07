import { useState } from 'react';
import { getAddress } from 'viem';
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain, type Connector } from 'wagmi';
import { CHAIN_ID } from '../lib/constants';
import { mobileBrowser, OPEN_IN } from '../lib/open-in';
import { Icon } from './Icon';
import { Modal } from './Modal';
export function Wallet({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { address, chainId, isConnected } = useConnection();
  const connectors = useConnectors(); const connect = useConnect(); const disconnect = useDisconnect(); const switchChain = useSwitchChain();
  const [note, setNote] = useState('');
  const named = connectors.some(c => c.type === 'injected' && c.id !== 'injected');
  const mobile = mobileBrowser() && !named && !(window as Window & { ethereum?: unknown }).ethereum;
  const listed = [...connectors.filter(c => c.type === 'injected'), ...connectors.filter(c => c.type !== 'injected')].filter(c => !(c.id === 'injected' && named) && !(mobile && c.type === 'injected'));
  const label = (c: Connector) => c.id === 'injected' ? 'Browser wallet' : c.id === 'coinbaseWalletSDK' ? mobile ? 'Coinbase Smart Wallet' : 'Coinbase Wallet' : c.name;
  async function switchNetwork() {
    setNote('');
    try { await switchChain.mutateAsync({ chainId: CHAIN_ID }); }
    catch { setNote('Network switch was not completed. Select Sepolia in your wallet and try again.'); setOpen(true); }
  }
  const short = address ? `${getAddress(address).slice(0, 6)}…${getAddress(address).slice(-4)}` : '';
  return <>
    <button className="wallet-button" onClick={() => { if (isConnected && chainId !== CHAIN_ID) void switchNetwork(); else { setNote(''); setOpen(true); } }} disabled={switchChain.isPending}>
      <Icon name="wallet" size={18} /><span>{switchChain.isPending ? 'Switching…' : isConnected ? chainId !== CHAIN_ID ? 'Switch to Sepolia' : short : 'Connect'}</span>
    </button>
    {open && <Modal title={isConnected ? 'Your wallet' : 'Connect a wallet'} close={() => setOpen(false)}>
      <p className="muted">{isConnected ? 'Connected for checkpointing on Sepolia.' : 'Only checkpointing needs a wallet. The optimizer stays in paper mode.'}</p>
      {isConnected ? <>
        <p className="full-address">{address && getAddress(address)}</p>
        {chainId !== CHAIN_ID && <button className="primary full" onClick={() => void switchNetwork()} disabled={switchChain.isPending}>Switch to Sepolia</button>}
        <button className="wallet-row" onClick={() => { disconnect.mutate(); setOpen(false); }}>Disconnect wallet<Icon name="arrow" /></button>
      </> : <div className="wallet-list">
        {mobile && OPEN_IN.map(w => <a className="wallet-row" key={w.id} href={w.href(location.href)}><img width="28" height="28" src={`./icons/${w.id}.svg`} alt="" /><span>Open in {w.name}</span><Icon name="external" size={18} /></a>)}
        {listed.map(c => <button className="wallet-row" key={c.uid} disabled={connect.isPending} onClick={async () => {
          setNote('');
          try { await connect.mutateAsync({ connector: c, chainId: CHAIN_ID }); setOpen(false); }
          catch { setNote(c.id === 'injected' ? 'No browser wallet responded. Enable your extension or choose Coinbase Wallet.' : 'Connection was not completed. Try your wallet again.'); }
        }}>
          {c.icon ? <img width="28" height="28" src={c.icon} alt="" /> : c.id === 'coinbaseWalletSDK' ? <img width="28" height="28" src="./icons/coinbase.svg" alt="" /> : <Icon name="wallet" size={28} />}
          <span>{label(c)}{connect.isPending && connect.variables?.connector === c ? ' · opening…' : ''}</span><Icon name="chevron" size={18} />
        </button>)}
      </div>}
      <p className="error-text" role="status">{note}</p>
      <p className="small muted">Sepolia only · No approvals or private keys</p>
    </Modal>}
  </>;
}
