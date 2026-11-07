Squeek Keeper is a community project for the Squeekchain Buildooooor badge. It is Sepolia only. SQK has not launched. This project makes no airdrop or whitelist promise. Testnet SQK and Squeeks have no monetary value.

# Squeek Keeper

A single-page keeper and staking optimizer built with React, TypeScript, Vite, wagmi and viem. The finished static site is in **`dist/`**, alongside its source and npm lockfile. It has a dark hamster theme, local fonts and images, and no application server, private credentials or relay service.

## Install, build and preview

Use Node **22.12 or newer** and npm. From the repository root:

```sh
npm run setup
npm run typecheck
npm run test
npm run test:interactions
npm run build
node scripts/check-export.mjs
npm run preview
```

Open the preview URL printed by Vite (normally `http://127.0.0.1:4173/`). Stop the preview with Ctrl+C. Serve `dist/` with any static HTTP host or IPFS gateway; opening the HTML through `file://` is not supported by browser ES modules.

`setup` installs the exact lockfile into disposable `test/scratch/toolchain/`. Build/typecheck stage the delivered files in `test/scratch/project/` and rebuild `dist/`; these staging folders contain no unique source. This layout respects the assignment's restriction on modifying `node_modules/` outside scratch. A conventional `npm ci` at the repository root also works: the scripts prefer that installation when present. Deleting scratch never deletes source or the static export; rerun `setup` if dependencies were removed.

Vite uses `base: './'`. Scripts, CSS, font, icons, favicon and share artwork use relative URLs. Navigation uses page anchors. There is no server rewrite requirement or service worker. All dynamically imported Coinbase SDK chunks must stay with the export. No publication or deployment command is part of this project.

## Use the tool

- **Keeper:** watch settled height, closed-round pending work, the configured work-per-round cap and its difficulty-based target, difficulty, and estimated checkpoint issuance. Refresh manually or let the minute interval update public data. Pending queue work is monitoring context only and is never included in issuance or power calculations.
- **Optimizer:** enter Level 1–10, the number of Squeeks at that level, and a staked SQK amount. The initial two Level 1 Squeeks and 40,000 SQK are explicitly labeled illustrative inputs, not a wallet balance. Inputs stay on the page.
- **Merge:** compare replacing two same-level Squeeks with one at the next level. Other Squeeks in the scenario stay in the total. The cooldown comes from the API's **resulting level**. Level 10 cannot merge again. NFT-specific eligibility is not inferred without token IDs.
- **Exit comparison:** use public network inputs, or explicitly choose a custom scenario. The fee model includes the pressure caused by the proposed exit. The waiting column assumes no further exits and unchanged mature stake. It does not promise a 2% total fee for a large exit.
- **Checkpoint:** connect a Sepolia wallet, select Checkpoint, review the network, sender, contract and gas consequence, then select Send checkpoint. The wallet must approve the transaction. The page displays the full hash, explorer link and receipt result after two confirmations.

The optimizer never sends transactions, transfers tokens or requests approvals. Only the reviewed `checkpoint()` flow can write. No private key or seed phrase is requested. All calculations work without a wallet; live inputs use public HTTP APIs, including read-only JSON-RPC. Offline or unavailable public services produce **unknown**, while local power calculations and custom fee scenarios remain usable.

## Data and calculations

`src/lib/constants.ts` pins the requested five addresses and chain **11155111**. API data cannot change the transaction destination.

| Contract | Sepolia address |
| --- | --- |
| SqueekCore | `0xFD6C166D4B8E2962E65746a13e5a0797CD4dE0c4` |
| SqueekNFT | `0xC4C7982657f00509548F3a3a41db7FA439a6856B` |
| SqueekToken | `0xd78a3956cF63164d1Fa1C622ad3c66623162Fa1e` |
| SqueekMining | `0x2dCcB11fcC2dEfdd188555e45aCb52231e82e218` |
| SqueekStaking | `0x50fd1780526C3186A0c037c7622203bC4fb611ca` |

Public reads:

| Source | Use |
| --- | --- |
| `https://api.squeekchain.com/v1/core` | Settled block units, height, difficulty, frontier, round configuration |
| `https://api.squeekchain.com/v1/status` | Closed-round settlement queue only |
| `https://api.squeekchain.com/v1/economy/state` | Deployment validation, snapshot block, mature/fresh stake, fee policy and merge cooldown table |
| `https://ethereum-sepolia-rpc.publicnode.com` with `https://sepolia.drpc.org` fallback | Read-only checkpoint projection and recent exits at the economy snapshot's block; live simulation and receipt confirmation |

The API is indexed 12 Ethereum confirmations behind the tip. Schema, chain, contract identities and consumed fields are validated. The API's projected state, wheel speed, open-round measurements and live wheel totals are never calculation inputs. Cumulative amounts use `bigint`; SQK has 18 decimals. Fetches time out, failed refreshes clear live values, and client data expires after two minutes. Stale pipeline/economy timestamps are rejected. No historical fixtures are bundled as a live fallback.

Power uses exact rational rounding for `round(1000 × 2.2^(L − 1))`. Total Squeek power is `P`; token power is `Q = S / 40 × (1 + P / 1000)`. Total account power is `P + Q`.

The exit estimate uses `D = max(mature stake + recent exits, 21,000,000 SQK)`, saturation at 20% of `D`, and integrates a quadratic marginal rate from 2% to 60% over the proposed amount. All fees are burned. The window is today plus the previous six UTC days. Integer rounding may differ from an account-specific executable contract quote by small base-unit amounts. This tool does not call unstake or imply that an entered amount is an available mature balance.

Checkpoint projection reads one Ethereum block, skips empty rounds, and counts at most 32 **earning** rounds using `blockInfo` and `roundPage`. `issued()` supplies the schedule amount. If contract reads fail, only a consistent, same-block, already-funded API snapshot can establish zero issuance; other estimates remain unknown. Before sending, the app rechecks Sepolia, the Core binding, paused/started state and settled-round readiness, then simulates from the connected address. It does not submit automatically after connecting. A pending hash is retained in session storage; unknown confirmation offers a status retry instead of a duplicate submission. Wallet connection persistence is handled by wagmi.

Protocol references checked during implementation: [deployment and power parameters](https://docs.squeekchain.com/developers/), [API schemas and units](https://docs.squeekchain.com/developers/api/), [checkpoint behavior](https://docs.squeekchain.com/developers/mining/), [merge eligibility and cooldowns](https://docs.squeekchain.com/developers/nft/), [exit fee integral](https://docs.squeekchain.com/developers/staking/).

## Wallet support

One connect control discovers named browser wallets through EIP-6963 and hides the generic row when named providers are present. Coinbase Wallet supports the passkey Smart Wallet path. Mobile browsers without a provider show MetaMask, Coinbase Wallet, Rabby and Phantom open-in links. A native dialog provides the modal structure and becomes a bottom sheet below 640px. No WalletConnect relay or project ID is used. Phone app handoffs and an actual Coinbase passkey session were not exercised on this machine.

## Validation performed

On 2026-11-07:

| Command / check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, TypeScript no-emit check |
| `npm run test` | Passed, 21 math and API validation tests |
| `npm run test:interactions` | Passed, 20 React DOM interactions with synthetic public API/RPC and EIP-6963 responses |
| `npm run build` | Passed, complete Vite production export |
| `node scripts/check-export.mjs` | Passed, all 13 export files served from a nested static subpath; 5 relative asset references and required metadata verified |
| Public REST endpoints | Core, status and economy returned HTTP 200; actual schemas were inspected |
| Public RPC endpoints | Primary and fallback returned HTTP 403 from this environment; no real contract simulation/transaction was certified |
| Pinned `taste.mjs --out test/scratch/taste` | Attempted, exit 2 before measurement: Chromium could not launch |
| Supplied browser tool | Attempted; Chromium failed with “Socket path too long” |
| Local Playwright fallback | Attempted with supplied and separately installed Chromium; launch terminated with SIGTRAP. WebKit installation reported missing system libraries |

The interaction suite checks paper-mode arithmetic, invalid inputs, merge caps, fee examples, API loss/recovery, wallet discovery, wrong-chain blocking, switching, transaction review, exact checkpoint calldata/destination/sender, a simulated confirmed receipt and a rejected signature. It uses Happy DOM, **not a rendered browser**. No actual wallet was connected and no real transaction was signed or sent. Browser screenshots, rendered reflow/overlap, physical-device behavior, actual font rendering, native modal focus and screen-reader use remain unverified. The 390px first-screen layout is implemented but could not be visually certified. The share image was rasterized from original SVG and visually inspected; it is not a website screenshot.

See [DESIGN.md](DESIGN.md), the six-domain [review and limitations](artifacts/validation.md), and the explicit [submission path budget](artifacts/path-budget.md). These are worker checks, not independent certification.
