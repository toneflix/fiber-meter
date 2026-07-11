/*
 * Reports the API's Fiber provider mode ('simulated' | 'live').
 *
 * Live-only surfaces (Preflight, Verify-on-Fiber) are hidden unless the API
 * explicitly reports `live`. If the API is unreachable (e.g. pure demo mode) or
 * hasn't answered yet, we default to 'simulated' so those surfaces stay hidden.
 */
import { useQuery } from '@tanstack/react-query';
import { getFiberConfig } from './live';

export function useFiberConfig() {
  const query = useQuery({
    queryKey: ['fiberConfig'],
    queryFn: getFiberConfig,
    staleTime: 60_000,
    retry: false,
  });

  const provider = query.data?.provider ?? 'simulated';
  return { provider, isLive: provider === 'live', config: query.data ?? null };
}
