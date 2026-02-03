"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchProviderOutlets } from "@/lib/provider-outlets";

/** React Query key for provider-outlets; use for invalidation or prefetch. */
export const PROVIDER_OUTLETS_QUERY_KEY = ["provider-outlets"] as const;

/**
 * Caching: data is considered fresh for 5 minutes (staleTime), then refetched in background.
 * Cached in memory for 30 minutes (gcTime). Multiple components using this hook share one request.
 * Requires QueryClientProvider above in the tree (e.g. in root layout).
 */
const STALE_TIME_MS = 5 * 60 * 24 * 1000; // 5 days
const GC_TIME_MS = 10 * 60 * 24 * 1000; // 10 days

export function useProviderOutlets() {
  return useQuery({
    queryKey: PROVIDER_OUTLETS_QUERY_KEY,
    queryFn: () => fetchProviderOutlets(),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
