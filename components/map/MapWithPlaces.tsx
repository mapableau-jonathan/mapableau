"use client";

import { useEffect, useState, useCallback } from "react";
import type { LatLngExpression } from "leaflet";
import type { FeatureCollection } from "geojson";
import Map from "./Map";
import { MapProviderToggle } from "./MapProviderToggle";
import { useMapProvider } from "@/hooks/use-map-provider";
import type { MapMarker } from "./Map";

const HIDE_SPONSORED_KEY = "mapable_hide_sponsored";

export interface PlaceFromApi {
  id: string;
  name: string;
  description: string | null;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  accessibility?: unknown;
  amenities?: string[];
  acceptsNDIS?: boolean;
  verified?: boolean;
  logoUrl?: string | null;
  qualityScore?: number;
  isSponsored: boolean;
  verificationTier: string | null;
  sponsorshipTier: string | null;
  disclosureText: string | null;
  evidenceRefs: string[] | null;
  verifiedAt: string | null;
}

export interface MapWithPlacesProps {
  center?: LatLngExpression;
  zoom?: number;
  category?: string;
  /** e.g. ["ndis", "wheelchair"] for accessibility filters */
  accessibilityFilters?: string[];
  /** URL to fetch GeoJSON (e.g. /data/MapAble_enriched.geojson) to overlay on the map */
  geoJsonUrl?: string | null;
  className?: string;
  height?: string;
  showProviderToggle?: boolean;
  enable3DBuildings?: boolean;
  enableStreetView?: boolean;
  /** Link to venue detail on marker click */
  placeDetailPath?: (placeId: string) => string;
}

export function MapWithPlaces({
  center = [-33.8688, 151.2093],
  zoom = 13,
  category,
  accessibilityFilters,
  geoJsonUrl,
  className = "",
  height = "400px",
  showProviderToggle = true,
  enable3DBuildings = false,
  enableStreetView = false,
  placeDetailPath,
}: MapWithPlacesProps) {
  const [places, setPlaces] = useState<PlaceFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoJson, setGeoJson] = useState<FeatureCollection | null>(null);
  const [hideSponsored, setHideSponsoredState] = useState(false);
  const { provider } = useMapProvider();

  // Fetch imported JSON (GeoJSON) data
  useEffect(() => {
    if (!geoJsonUrl?.trim()) {
      setGeoJson(null);
      return;
    }
    let cancelled = false;
    fetch(geoJsonUrl)
      .then((res) => res.json())
      .then((data: FeatureCollection) => {
        if (cancelled || !data?.type || data.type !== "FeatureCollection") return;
        setGeoJson(data);
      })
      .catch((err) => {
        if (!cancelled) console.error("Error fetching GeoJSON:", err);
        setGeoJson(null);
      });
    return () => {
      cancelled = true;
    };
  }, [geoJsonUrl]);

  const setHideSponsored = useCallback((value: boolean) => {
    setHideSponsoredState(value);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(HIDE_SPONSORED_KEY, value ? "1" : "0");
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(HIDE_SPONSORED_KEY);
        setHideSponsoredState(stored === "1");
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const [lat, lng] = Array.isArray(center)
      ? center
      : [(center as { lat: number; lng: number }).lat, (center as { lat: number; lng: number }).lng];

    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: "5000",
      hideSponsored: String(hideSponsored),
    });
    if (category) params.set("category", category);
    if (accessibilityFilters?.length) {
      params.set("accessibility", accessibilityFilters.join(","));
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/map/places?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data.places) return;
        setPlaces(data.places);
      })
      .catch((err) => console.error("Error fetching map places:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [center, hideSponsored, category, accessibilityFilters]);

  const markers: MapMarker[] = places.map((p) => ({
    position: [p.latitude, p.longitude] as [number, number],
    title: p.name,
    description: p.description ?? undefined,
    isSponsored: p.isSponsored,
    disclosureText: p.disclosureText,
    placeId: p.id,
  }));

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      const id = marker.placeId;
      if (id && placeDetailPath) {
        window.location.href = placeDetailPath(id);
      }
    },
    [placeDetailPath]
  );

  const onMarkerClick = placeDetailPath ? handleMarkerClick : undefined;

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {showProviderToggle && (
        <MapProviderToggle className="absolute top-2 left-2 z-10" />
      )}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <label className="flex items-center gap-2 rounded bg-background/90 px-2 py-1.5 text-sm shadow border border-border">
          <input
            type="checkbox"
            checked={hideSponsored}
            onChange={(e) => setHideSponsored(e.target.checked)}
            aria-label="Hide sponsored results"
            className="h-4 w-4 rounded border-input"
          />
          <span>Hide sponsored</span>
        </label>
      </div>
      <Map
        center={center}
        zoom={zoom}
        markers={markers}
        geoJson={geoJson}
        className={className}
        height={height}
        showProviderToggle={false}
        enable3DBuildings={enable3DBuildings}
        enableStreetView={enableStreetView}
        onMarkerClick={onMarkerClick}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-[5] pointer-events-none">
          <p className="text-muted-foreground text-sm">Loading places...</p>
        </div>
      )}
    </div>
  );
}
