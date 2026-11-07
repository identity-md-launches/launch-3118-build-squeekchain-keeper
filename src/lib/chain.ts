import { createPublicClient, fallback, http } from 'viem';
import { sepolia } from 'viem/chains';
import { RPC_URL, RPC_FALLBACK } from './constants';
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: fallback([http(RPC_URL, { timeout: 10_000, retryCount: 0 }), http(RPC_FALLBACK, { timeout: 10_000, retryCount: 0 })], { retryCount: 0 }),
});
