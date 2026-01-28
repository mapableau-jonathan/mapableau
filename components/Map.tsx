"use client";

import type { LatLngExpression } from "leaflet";
import { latLngBounds } from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import type { Provider } from "@/app/provider-finder/providers";
import "@/lib/leafletIcons";

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
};

// Default center: Sydney, Australia
const initialCenter: LatLngExpression = [-33.8688, 151.2093];
const initialZoom = 6;

// Component to adjust map bounds when markers change
function FitBounds({
  markers,
}: {
  markers: { provider: Provider; coords: LatLngExpression }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) {
      // If no markers, reset to default view
      map.setView(initialCenter, initialZoom);
      return;
    }

    if (markers.length === 1) {
      // If only one marker, center on it with a reasonable zoom
      map.setView(markers[0].coords, 13);
      return;
    }

    // Calculate bounds for all markers
    const bounds = latLngBounds(
      markers.map((m) => m.coords as [number, number]),
    );

    // Fit bounds with padding
    map.fitBounds(bounds, {
      padding: [50, 50], // Add padding so markers aren't at the edge
      maxZoom: 15, // Don't zoom in too much
    });
  }, [map, markers]);

  return null;
}

export default function Map({ providers = [] }: MapProps) {
  const markers = providers
    .map((provider) => {
      const coords = getProviderCoords(provider.suburb, provider.state);
      if (!coords) return null;
      return { provider, coords };
    })
    .filter(
      (m): m is { provider: Provider; coords: LatLngExpression } => m !== null,
    );

  return (
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      style={{ height: "500px", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds markers={markers} />
      {markers.map(({ provider, coords }) => (
        <Marker key={provider.id} position={coords}>
          <Popup>
            <div className="min-w-[200px]">
              <h3 className="font-semibold text-sm mb-1">{provider.name}</h3>
              <p className="text-xs text-muted-foreground mb-2">
                {provider.suburb === "Remote"
                  ? "Telehealth (Australia-wide)"
                  : `${provider.suburb} ${provider.state} ${provider.postcode}`}
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
