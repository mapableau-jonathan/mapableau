/**
 * Map Provider Hook
 * State management for map provider selection
 */

import { useState, useEffect, useCallback } from "react";
import { mapProviderService, type MapProvider } from "@/lib/services/mapping/map-provider-service";

const STORAGE_KEY = "mapable_map_provider";

export function useMapProvider() {
  const [provider, setProviderState] = useState<MapProvider>(() => {
    // Initialize from localStorage or default
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY) as MapProvider | null;
      if (stored && mapProviderService.isProviderAvailable(stored)) {
        return stored;
      }
    }
    return mapProviderService.getDefaultProvider();
  });

  const [isLoading, setIsLoading] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, provider);
    }
  }, [provider]);

  const setProvider = useCallback((newProvider: MapProvider) => {
    if (!mapProviderService.isProviderAvailable(newProvider)) {
      console.warn(`Provider ${newProvider} is not available`);
      return;
    }

    setIsLoading(true);
    setProviderState(newProvider);

    // Small delay to allow smooth transition
    setTimeout(() => {
      setIsLoading(false);
    }, 100);
  }, []);

  const capabilities = mapProviderService.getProviderCapabilities(provider);
  const availableProviders = mapProviderService.getAvailableProviders();

  return {
    provider,
    setProvider,
    capabilities,
    availableProviders,
    isLoading,
    supportsStreetView: capabilities.supportsStreetView,
    supports3DBuildings: capabilities.supports3DBuildings,
  };
}
