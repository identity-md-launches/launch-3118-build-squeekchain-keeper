import { createConfig, http, fallback } from 'wagmi';
import { coinbaseWallet, injected } from 'wagmi/connectors';
import { sepolia } from 'wagmi/chains';
import { RPC_URL, RPC_FALLBACK } from './constants';
export const config = createConfig({
  chains: [sepolia],
  multiInjectedProviderDiscovery: true,
  connectors: [injected(), coinbaseWallet({ appName: 'Squeek Keeper', preference: { options: 'all' } })],
  transports: { [sepolia.id]: fallback([http(RPC_URL, { timeout: 10_000 }), http(RPC_FALLBACK, { timeout: 10_000 })]) },
});
