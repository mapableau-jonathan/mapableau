"use client";

import {
  type LatLngExpression,
  divIcon,
  latLngBounds,
} from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { Provider } from "@/app/provider-finder/providers";
import { formatPlace } from "@/lib/place";
import "@/lib/leafletIcons";

// Use divIcons for all markers so we never rely on L.Icon.Default (avoids createIcon undefined in some envs)
const defaultMarkerIcon = divIcon({
  className: "default-marker-icon",
  html: `<div style="width:22px;height:22px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const redMarkerIcon = divIcon({
  className: "red-marker-icon",
  html: `<div style="width:24px;height:24px;background:#dc2626;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const userPositionIcon = divIcon({
  className: "user-marker-icon",
  html: `<div style="width:20px;height:20px;background:#16a34a;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Approximate coordinates for Australian locations
// In production, you'd use a geocoding service
const locationToCoords: Record<string, LatLngExpression> = {
  "Parramatta NSW": [-33.8148, 151.0033],
  "Footscray VIC": [-37.8, 144.9],
  "Morphett Vale SA": [-35.1167, 138.5167],
  "Bayswater WA": [-31.9167, 115.9167],
  "Chermside QLD": [-27.3833, 153.0333],
  "Civic ACT": [-35.2833, 149.1333],
  "Hobart TAS": [-42.8833, 147.3167],
  "Darwin City NT": [-12.4634, 130.8456],
  "Mildura VIC": [-34.1833, 142.15],
  "Newcastle NSW": [-32.9283, 151.7817],
  "Geelong VIC": [-38.15, 144.35],
};

function getProviderCoords(
  suburb: string,
  state: string,
): LatLngExpression | null {
  if (suburb === "Remote") return null;
  const key = `${suburb} ${state}`;
  return locationToCoords[key] || null;
}

type MapProps = {
  providers?: Provider[];
  /** When set, show user position and fit bounds to include it */
  userPosition?: { lat: number; lng: number } | null;
  /** When set, fly map to this provider's position (uses lat/lng or geocode lookup) */
  centerOnProvider?: Provider | null;
};

// Default center: Sydney, Australia
const initialCenter: LatLngExpression = [-33.8688, 151.2093];
const initialZoom = 6;

// Component to adjust map bounds when markers change
function FitBounds({
  markers,
  userPosition,
}: {
  markers: { provider: Provider; coords: LatLngExpression }[];
  userPosition: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = markers.map((m) => m.coords as [number, number]);
    if (userPosition) {
      points.push([userPosition.lat, userPosition.lng]);
    }
    if (points.length === 0) {
      map.setView(initialCenter, initialZoom);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    const bounds = latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
    });
  }, [map, markers, userPosition]);

  return null;
}

const CENTER_ZOOM = 14;

function getCoords(provider: Provider): [number, number] | null {
  if (
    provider.latitude != null &&
    provider.longitude != null &&
    (provider.latitude !== 0 || provider.longitude !== 0)
  ) {
    return [provider.latitude, provider.longitude];
  }
  const coords = getProviderCoords(provider.suburb, provider.state);
  if (!coords) return null;
  return coords as [number, number];
}

// Fly map to a provider when centerOnProvider changes
function FlyToProvider({
  centerOnProvider,
}: {
  centerOnProvider: Provider | null | undefined;
}) {
  const map = useMap();

  useEffect(() => {
    if (!centerOnProvider) return;
    const coords = getCoords(centerOnProvider);
    if (!coords) return;
    map.flyTo(coords, CENTER_ZOOM, { duration: 0.5 });
  }, [map, centerOnProvider]);

  return null;
}

export default function Map({
  providers = [],
  userPosition = null,
  centerOnProvider = null,
}: MapProps) {
  const markers = providers
    .map((provider) => {
      const coords =
        provider.latitude != null &&
        provider.longitude != null &&
        (provider.latitude !== 0 || provider.longitude !== 0)
          ? ([provider.latitude, provider.longitude] as LatLngExpression)
          : getProviderCoords(provider.suburb, provider.state);
      if (!coords) return null;
      return { provider, coords };
    })
    .filter(
      (m): m is { provider: Provider; coords: LatLngExpression } => m !== null,
    );

  return (
    <MapContainer
      center={
        userPosition
          ? ([userPosition.lat, userPosition.lng] as LatLngExpression)
          : initialCenter
      }
      zoom={initialZoom}
      style={{ height: "500px", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds markers={markers} userPosition={userPosition ?? null} />
      <FlyToProvider centerOnProvider={centerOnProvider ?? null} />
      {userPosition ? (
        <Marker position={[userPosition.lat, userPosition.lng]} icon={userPositionIcon}>
          <Popup>You are here</Popup>
        </Marker>
      ) : null}
      {markers.map(({ provider, coords }) => (
        <Marker
          key={provider.id}
          position={coords}
          icon={
            centerOnProvider?.id === provider.id ? redMarkerIcon : defaultMarkerIcon
          }
        >
          <Popup>
            <div className="min-w-[200px]">
              <h3 className="font-semibold text-sm mb-1">{provider.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">
                {formatPlace(provider) ?? "—"}
              </p>
              <div className="flex items-center gap-2 text-xs mb-2">
                <span className="font-medium">
                  ⭐ {provider.rating.toFixed(1)}
                </span>
                <span className="text-muted-foreground">
                  ({provider.reviewCount} reviews)
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {provider.categories.slice(0, 2).map((cat) => (
                  <span
                    key={cat}
                    className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
