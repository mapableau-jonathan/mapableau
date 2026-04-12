"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { AutocompleteResponse } from "@/app/api/provider-finder/autocomplete/types";
import { getBoundingBox } from "@/app/utils/getBoundingBox";

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

function cacheKeyForQuery(query: string) {
  return query.trim().toLowerCase();
}

async function fetchProviderOutletAutocomplete(
  query: string,
  lat: number,
  lon: number,
  searchRadiusKm: number,
  signal?: AbortSignal,
): Promise<AutocompleteResponse> {
  try {
    const controller = new AbortController();

    // If React Query cancels → abort this controller too
    signal?.addEventListener("abort", () => {
      controller.abort();
    });

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, FETCH_TIMEOUT_MS);

    const { minLat, maxLat, minLon, maxLon } = getBoundingBox(
      lat,
      lon,
      searchRadiusKm,
    );

    const params = new URLSearchParams({
      q: query,
      // todo: clean up
      lat: lat.toString(),
      lon: lon.toString(),
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

export function useProviderOutletAutocomplete(
  query: string,
  lat: number,
  lon: number,
  searchRadiusKm: number,
  enabled = true,
) {
  const trimmed = query.trim();
  const debouncedQuery = useDebouncedValue(trimmed, DEBOUNCE_MS);
  const shouldFetch = enabled && debouncedQuery.length >= MIN_CHARS;

  const queryResult = useQuery({
    queryKey: [
      "provider-outlet-autocomplete",
      debouncedQuery,
      lat,
      lon,
      searchRadiusKm,
    ],
    queryFn: ({ signal }) =>
      fetchProviderOutletAutocomplete(
        debouncedQuery,
        lat,
        lon,
        searchRadiusKm,
        signal,
      ),
    enabled: shouldFetch,
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
