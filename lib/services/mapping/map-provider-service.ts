/**
 * Map Provider Service
 * Abstraction layer for switching between map providers
 */

import { isGoogleMapsAvailable } from "@/lib/config/google-maps";

export type MapProvider = "leaflet" | "google";

export interface MapProviderCapabilities {
  provider: MapProvider;
  supportsStreetView: boolean;
  supports3DBuildings: boolean;
  supportsCustomStyles: boolean;
  isFree: boolean;
}

export class MapProviderService {
  /**
   * Get available map providers
   */
  getAvailableProviders(): MapProvider[] {
    const providers: MapProvider[] = ["leaflet"]; // Always available

    if (isGoogleMapsAvailable()) {
      providers.push("google");
    }

    return providers;
  }

  /**
   * Get default provider
   */
  getDefaultProvider(): MapProvider {
    const envProvider = process.env.NEXT_PUBLIC_DEFAULT_MAP_PROVIDER as
      | MapProvider
      | undefined;

    if (envProvider && this.getAvailableProviders().includes(envProvider)) {
      return envProvider;
    }

    return "leaflet"; // Default to free option
  }

  /**
   * Get provider capabilities
   */
  getProviderCapabilities(provider: MapProvider): MapProviderCapabilities {
    switch (provider) {
      case "google":
        return {
          provider: "google",
          supportsStreetView: true,
          supports3DBuildings: true,
          supportsCustomStyles: true,
          isFree: false,
        };
      case "leaflet":
      default:
        return {
          provider: "leaflet",
          supportsStreetView: false,
          supports3DBuildings: false,
          supportsCustomStyles: true,
          isFree: true,
        };
    }
  }

  /**
   * Check if provider supports StreetView
   */
  supportsStreetView(provider: MapProvider): boolean {
    return this.getProviderCapabilities(provider).supportsStreetView;
  }

  /**
   * Check if provider supports 3D buildings
   */
  supports3DBuildings(provider: MapProvider): boolean {
    return this.getProviderCapabilities(provider).supports3DBuildings;
  }

  /**
   * Validate provider is available
   */
  isProviderAvailable(provider: MapProvider): boolean {
    return this.getAvailableProviders().includes(provider);
  }
}

export const mapProviderService = new MapProviderService();
