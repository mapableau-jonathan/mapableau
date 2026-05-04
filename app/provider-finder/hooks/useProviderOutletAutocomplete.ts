"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AutocompleteResponse } from "@/app/api/provider-finder/autocomplete/types";
import { MapSearchView } from "@/components/Map";

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;
const STALE_TIME_MS = 20 * 60 * 1000;
const GC_TIME_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2500;

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}

async function fetchProviderOutletAutocomplete({
  query,
  mapSearchView,
  latitude,
  longitude,
  signal,
}: {
  query: string;
  mapSearchView: MapSearchView;
  latitude: number;
  longitude: number;
  signal?: AbortSignal;
}): Promise<AutocompleteResponse> {
  try {
    const controller = new AbortController();

    // If React Query cancels → abort this controller too
    signal?.addEventListener("abort", () => {
      controller.abort();
    });

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    const { minLat, maxLat, minLon, maxLon } = mapSearchView;

    const params = new URLSearchParams({
      q: query,
      lat: latitude.toString(),
      lon: longitude.toString(),
      minLat: minLat.toString(),
      maxLat: maxLat.toString(),
      minLon: minLon.toString(),
      maxLon: maxLon.toString(),
    });

    console.log("params", params.toString());
    try {
      const response = await fetch(
        `/api/provider-finder/autocomplete?${params}`,
        {
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        // todo: refactor this logic
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          body?.error ??
            `Failed to fetch autocomplete results (${response.status})`,
        );
      }

      // todo: fix type
      const payload = (await response.json()) as AutocompleteResponse;

      return payload;
    } catch (error) {
      if (error instanceof Error && error.message === "AbortError") {
        throw new Error("Query timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      // todo: is this necessary?
      signal?.removeEventListener("abort", () => {
        controller.abort();
      });
    }
  } catch (error) {
    console.error("provider-finder autocomplete:", error);
    if (error instanceof Error && error.message === "Query timed out") {
      throw new Error("Query timed out");
    }
    throw error;
  }
}

export function useProviderOutletAutocomplete({
  query,
  mapSearchView,
  latitude,
  longitude,
  enabled = true,
}: {
  query: string;
  mapSearchView: MapSearchView | null;
  latitude?: number;
  longitude?: number;
  enabled?: boolean;
}) {
  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const shouldFetch = enabled && debouncedQuery.length >= MIN_CHARS;

  const queryResult = useQuery({
    queryKey: [
      "provider-outlet-autocomplete",
      debouncedQuery,
      latitude,
      longitude,
      mapSearchView,
    ],
    queryFn: ({ signal }) => {
      if (!mapSearchView || !latitude || !longitude) {
        throw new Error("Missing map search view, latitude, or longitude");
      }
      return fetchProviderOutletAutocomplete({
        query: debouncedQuery,
        mapSearchView,
        latitude,
        longitude,
        signal,
      });
    },
    enabled:
      shouldFetch &&
      mapSearchView != null &&
      latitude != null &&
      longitude != null,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  });

  return {
    queryResult,
    debouncedQuery,
    minChars: MIN_CHARS,
    keepTyping: trimmed.length > 0 && trimmed.length < MIN_CHARS,
    fallback: queryResult.data?.fallback ?? false,
    items: queryResult.data?.items ?? [],
  };
}
