import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRead, isFresh, parseCore, parseEconomy, parseStatus } from './api';
import { readCheckpointEstimate, readExitSnapshot } from './reads';
export function useNetwork() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 10_000); return () => clearInterval(id); }, []);
  const options = { refetchInterval: 60_000, retry: false, staleTime: 45_000, refetchOnWindowFocus: true } as const;
  const coreQuery = useQuery({ queryKey: ['core'], queryFn: () => apiRead('core', parseCore), ...options });
  const statusQuery = useQuery({ queryKey: ['status'], queryFn: () => apiRead('status', parseStatus), ...options });
  const economyQuery = useQuery({ queryKey: ['economy'], queryFn: () => apiRead('economy/state', parseEconomy), ...options });
  const core = !coreQuery.isError && isFresh(coreQuery.dataUpdatedAt, now) ? coreQuery.data : undefined;
  const status = !statusQuery.isError && isFresh(statusQuery.dataUpdatedAt, now) ? statusQuery.data : undefined;
  const economy = !economyQuery.isError && isFresh(economyQuery.dataUpdatedAt, now) ? economyQuery.data : undefined;
  const checkpointQuery = useQuery({ queryKey: ['checkpoint-estimate', economy?.safeBlock.toString()], queryFn: () => readCheckpointEstimate(economy!.safeBlock), enabled: !!core && !!economy, retry: false, staleTime: 60_000 });
  const exitsQuery = useQuery({ queryKey: ['exit-snapshot', economy?.safeBlock.toString()], queryFn: () => readExitSnapshot(economy!.safeBlock), enabled: !!economy, retry: false, staleTime: 60_000 });
  const refresh = () => { void coreQuery.refetch(); void statusQuery.refetch(); void economyQuery.refetch(); if (economy) { void checkpointQuery.refetch(); void exitsQuery.refetch(); } };
  const busy = coreQuery.isFetching || statusQuery.isFetching || economyQuery.isFetching;
  return { core, status, economy, coreQuery, statusQuery, economyQuery, checkpointQuery, exitsQuery, refresh, busy, now };
}
export type Network = ReturnType<typeof useNetwork>;
