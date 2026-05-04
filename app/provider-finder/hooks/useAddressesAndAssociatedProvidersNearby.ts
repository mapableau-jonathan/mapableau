"use client";

import { useQuery } from "@tanstack/react-query";

import { Provider } from "@/components/provider/types";
import { ProviderOutlet } from "@/data/provider-outlets.types";

import { NearbyProviderResult } from "../../api/provider-finder/nearby/route";

export async function fetchAddressesAndAssociatedProvidersNearby(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  signal?: AbortSignal,
): Promise<NearbyProviderResult[]> {
  const params = new URLSearchParams({
    minLat: String(minLat),
    maxLat: String(maxLat),
    minLon: String(minLon),
    maxLon: String(maxLon),
  });
  const base =
    typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_ORIGIN ?? "");
  const res = await fetch(`${base}/api/provider-finder/nearby?${params}`, {
    signal: signal,
  });
  if (!res.ok) {
    const err = (await res.json().catch((err) => {
      console.error(err);
    })) as { error?: string };
    throw new Error(
      err.error ?? `Failed to load nearby providers: ${res.status}`,
    );
  }
  const body = await res.json();
  return body;
}

export type {
  ProviderOutlet,
  OutletFlag,
  StateCode,
} from "@/data/provider-outlets.types";

export const addressesAndAssociatedProvidersNearbyQueryKey = (
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
) => ["provider-finder-nearby", minLat, maxLat, minLon, maxLon] as const;

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 30 * 60 * 1000;

/**
 * Loads up to 100 providers nearest to the given coordinates from the database.
 * `enabled` should be false until coordinates are known (e.g. after geolocation).
 */
export function useAddressesAndAssociatedProvidersNearby(
  minLat: number | undefined,
  maxLat: number | undefined,
  minLon: number | undefined,
  maxLon: number | undefined,
  enabled: boolean,
  select: (data: NearbyProviderResult[]) => {
    providers: any[];
    providerOutlets: any[];
  },
) {
  return useQuery({
    queryKey:
      minLat != null && maxLat != null && minLon != null && maxLon != null
        ? addressesAndAssociatedProvidersNearbyQueryKey(
            minLat,
            maxLat,
            minLon,
            maxLon,
          )
        : ["provider-finder-nearby", "pending"],
    queryFn: ({ signal }) =>
      fetchAddressesAndAssociatedProvidersNearby(
        minLat!,
        maxLat!,
        minLon!,
        maxLon!,
        signal,
      ),
    enabled:
      enabled &&
      minLat != null &&
      maxLat != null &&
      minLon != null &&
      maxLon != null &&
      Number.isFinite(minLat) &&
      Number.isFinite(maxLat) &&
      Number.isFinite(minLon) &&
      Number.isFinite(maxLon),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    select: select,
  });
}
