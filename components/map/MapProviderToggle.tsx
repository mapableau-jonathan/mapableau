"use client";

import { Map, Globe } from "lucide-react";
import { useMapProvider } from "@/hooks/use-map-provider";
import type { MapProvider } from "@/lib/services/mapping/map-provider-service";

interface MapProviderToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function MapProviderToggle({
  className = "",
  showLabel = true,
}: MapProviderToggleProps) {
  const { provider, setProvider, availableProviders, capabilities } =
    useMapProvider();

  if (availableProviders.length <= 1) {
    return null; // Don't show toggle if only one provider available
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm text-muted-foreground">Map:</span>
      )}
      <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1">
        <button
          onClick={() => setProvider("leaflet")}
          className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
            provider === "leaflet"
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted"
          }`}
          aria-label="Switch to OpenStreetMap"
          title="OpenStreetMap (Free)"
        >
          <Globe className="w-3.5 h-3.5" />
          {showLabel && "OSM"}
        </button>
        {availableProviders.includes("google") && (
          <button
            onClick={() => setProvider("google")}
            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 ${
              provider === "google"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            aria-label="Switch to Google Maps"
            title="Google Maps (StreetView & 3D)"
          >
            <Map className="w-3.5 h-3.5" />
            {showLabel && "Google"}
          </button>
        )}
      </div>
      {capabilities.supportsStreetView && (
        <span className="text-xs text-muted-foreground" title="StreetView available">
          📷
        </span>
      )}
      {capabilities.supports3DBuildings && (
        <span className="text-xs text-muted-foreground" title="3D Buildings available">
          🏢
        </span>
      )}
    </div>
  );
}
