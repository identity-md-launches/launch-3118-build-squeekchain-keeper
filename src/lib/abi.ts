import { parseAbi } from 'viem';
// Minimal ABI signatures, verified against the published Squeekchain contract references.
export const miningAbi = parseAbi([
  'function checkpoint()',
  'function checkpointStatus() view returns (bool corePaused, uint64 nextRound, bool roundSettled)',
  'function state() view returns ((uint256 minted, uint64 processedThroughRound, uint64 startRound, uint64 startHeight, uint64 fundedBlocks, address guardian, bool bootstrapped, bool startCaptured, bool paused, bool active))',
  'function core() view returns (address)',
  'function issued(uint64 blocksSinceStart) view returns (uint256)',
  'event Checkpointed(uint64 indexed throughRound, uint64 fundedBlocks, uint256 amount)',
  'error EmergencyPaused()', 'error CorePaused()', 'error StartNotScheduled()',
]);
export const coreAbi = parseAbi([
  'function state() view returns ((uint64 settledThroughRound, uint64 cumulativeWork, uint96 cumulativeBlockUnits, uint64 blockHeight, uint96 blockProgress, uint32 workPerThousandBlocks, uint256 authorizationNonce, bool paused))',
  'function roundPage(uint64 afterRound, uint64 throughRound, uint256 maxRecords) view returns ((uint64 certifiedThroughRound, (uint64 cumulativeWork, uint96 cumulativeBlockUnits, uint32 workPerThousandBlocks) start, (uint64 cumulativeWork, uint96 cumulativeBlockUnits, uint32 workPerThousandBlocks) end, (uint64 roundId, uint64 cumulativeWork, uint96 cumulativeBlockUnits, uint32 workPerThousandBlocks, bytes32 dataHash)[] rounds))',
  'function blockInfo(uint64 squeekBlock) view returns ((uint64 roundId, uint64 workThreshold))',
]);
export const stakingAbi = parseAbi([
  'function recentExits() view returns (uint256)',
  'function totalStaked() view returns (uint256)',
  'function totalFresh() view returns (uint256 freshPrincipal, uint64 freshUntilRound)',
]);
