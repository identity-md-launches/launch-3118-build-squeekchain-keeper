import { useState } from 'react';
import { useConnection } from 'wagmi';
import { useNetwork } from './lib/useNetwork';
import { CONTRACTS, EXPLORER } from './lib/constants';
import { Keeper } from './components/Keeper';
import { Optimizer } from './components/Optimizer';
import { Wallet } from './components/Wallet';
import { Hamster } from './components/Hamster';
import { Icon } from './components/Icon';
export default function App() {
  const [walletOpen, setWalletOpen] = useState(false); const network = useNetwork(); const { isConnected } = useConnection();
  return <>
    <a className="skip-link" href="#main">Skip to the keeper</a>
    <header className="site-header"><div className="header-inner"><a className="brand" href="#" aria-label="Squeek Keeper home"><Hamster /><span>Squeek Keeper<span className="brand-period">.</span></span></a><nav aria-label="Main navigation"><a href="#keeper">Keeper</a><a href="#optimizer">Optimizer</a><a href="#about">About</a></nav><div className="header-tools"><span className="network-chip"><span />Sepolia</span><Wallet open={walletOpen} setOpen={setWalletOpen} /></div></div></header>
    <main id="main" className="container">
      <div className="intro"><div><h1>Keep Squeekchain moving.</h1><p>Monitor settled work and plan your staking.</p></div><div className="intro-art"><span>Powered by tiny paws.</span><Hamster helmet /></div></div>
      <Keeper network={network} connect={() => setWalletOpen(true)} />
      <div className="paper-strip"><span><Icon name="seed" size={18} /><strong>{isConnected ? 'Your optimizer stays in paper mode.' : 'Start in paper mode.'}</strong> Explore without a wallet.</span><span className="small muted">No payments. No approvals.</span></div>
      <Optimizer network={network} />
      <section id="about" className="about-section" aria-labelledby="about-heading"><div><h2 id="about-heading">Built on settled work.</h2><p className="muted">Squeek Keeper reads the public Squeekchain API and Sepolia’s public RPC. Wheel speed and projected blocks never enter its calculations. API state is 12 Ethereum confirmations behind the chain; the page refreshes every minute.</p><a className="doc-link" href="https://docs.squeekchain.com/developers/" target="_blank" rel="noreferrer">Read the protocol docs<Icon name="external" size={16} /></a></div><div className="about-notes"><details><summary>What does a checkpoint do?</summary><p className="small muted">It processes settled Squeek rounds and issues their scheduled SQK to Staking, up to 32 earning rounds at a time. Anyone can submit one. The caller pays Sepolia gas and receives no keeper payment.</p></details><details><summary>How are work units shown?</summary><p className="small muted">Height is completed, settled Squeek blocks. Pending work is the closed-round settlement queue and is displayed for monitoring only. Work per round shows the configured cap. Its target is difficulty × target blocks / 1,000, using settled difficulty. Neither value is measured work in the open round.</p><p className="small muted">{network.core ? `The configured round lasts ${network.core.roundSeconds.toString()} seconds and accepts at most ${network.core.maxWork.toLocaleString('en-US')} work units.` : 'Round configuration is currently unknown.'}</p></details><details><summary>View the Sepolia contracts</summary><dl className="contract-list">{Object.entries(CONTRACTS).map(([name, address]) => <div key={name}><dt>Squeek{name === 'nft' ? 'NFT' : name[0].toUpperCase() + name.slice(1)}</dt><dd><a href={`${EXPLORER}/address/${address}`} target="_blank" rel="noreferrer">{address}<Icon name="external" size={14} /></a></dd></div>)}</dl></details></div></section>
    </main>
    <footer className="container"><div className="footer-brand"><Hamster /><span>A community-built keeper.</span></div><p>For the Squeekchain Buildooooor badge. Sepolia only. SQK has not launched.<br />No airdrop or whitelist promise. Testnet assets have no monetary value.</p><a href="#main" className="text-button">Back to top<Icon name="arrow" size={16} style={{ transform: 'rotate(-90deg)' }} /></a></footer>
  </>;
}
