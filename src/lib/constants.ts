export const CHAIN_ID = 11155111;
export const API = 'https://api.squeekchain.com/v1';
export const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
export const RPC_FALLBACK = 'https://sepolia.drpc.org';
export const EXPLORER = 'https://sepolia.etherscan.io';
export const CONTRACTS = {
  core: '0xFD6C166D4B8E2962E65746a13e5a0797CD4dE0c4',
  nft: '0xC4C7982657f00509548F3a3a41db7FA439a6856B',
  token: '0xd78a3956cF63164d1Fa1C622ad3c66623162Fa1e',
  mining: '0x2dCcB11fcC2dEfdd188555e45aCb52231e82e218',
  staking: '0x50fd1780526C3186A0c037c7622203bC4fb611ca',
} as const;
export const WAD = 10n ** 18n;
export const BLOCK_UNITS = 1_000_000_000n;
export const STALE_MS = 120_000;
export const POLICY = { minBps: 200n, maxBps: 6000n, saturationBps: 2000n, windowDays: 7, floor: 21_000_000n * WAD };
