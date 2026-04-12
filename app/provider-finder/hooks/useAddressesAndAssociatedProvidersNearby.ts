"use client";

import { useQuery } from "@tanstack/react-query";

import { NearbyProviderResult } from "../../api/provider-finder/nearby/route";

export async function fetchAddressesAndAssociatedProvidersNearby(
  lat: number,
  lng: number,
  radius: number,
  signal?: AbortSignal,
): Promise<NearbyProviderResult[]> {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius),
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
  lat: number,
  lng: number,
  radius: number,
) => ["provider-finder-nearby", lat, lng, radius] as const;

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME_MS = 30 * 60 * 1000;

/**
 * Loads up to 100 providers nearest to the given coordinates from the database.
 * `enabled` should be false until coordinates are known (e.g. after geolocation).
 */
export function useAddressesAndAssociatedProvidersNearby(
  lat: number | undefined,
  lng: number | undefined,
  radius: number,
  enabled: boolean,
) {
  return useQuery({
    queryKey:
      lat != null && lng != null
        ? addressesAndAssociatedProvidersNearbyQueryKey(lat, lng, radius)
        : ["provider-finder-nearby", "pending"],
    queryFn: ({ signal }) =>
      fetchAddressesAndAssociatedProvidersNearby(lat!, lng!, radius, signal),
    enabled:
      enabled &&
      lat != null &&
      lng != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });
}
