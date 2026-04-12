"use client";

import L, { latLngBounds } from "leaflet";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import { getLocationCoords } from "@/lib/locationCoords";

import type { Provider } from "./types";

const markerIcon = L.divIcon({
  className: "provider-location-marker",
  html: `<div style="width:22px;height:22px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const DEFAULT_CENTER: [number, number] = [-33.8688, 151.2093];
const DEFAULT_ZOOM = 6;

function FitBounds({
  markers,
}: {
  markers: { coords: [number, number]; label: string }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (markers.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (markers.length === 1) {
      map.setView(markers[0].coords, 13);
      return;
    }
    const bounds = latLngBounds(markers.map((m) => m.coords));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [map, markers]);

  return null;
}

type ProviderLocationMapProps = {
  provider: Provider;
};

export default function ProviderLocationMap({
  provider,
}: ProviderLocationMapProps) {
  const markers = provider.locations
    .map((loc) => {
      const address = loc.address ?? null;
      if (!address) return null;
      const coords = getLocationCoords(
        address.city,
        address.state,
        address.street,
      );
      if (!coords) return null;
      const label = [
        address.street,
        address.suburb,
        address.city,
        address.state,
        address.postcode,
      ]
        .filter(Boolean)
        .join(", ");
      return { coords, label };
    })
    .filter(
      (m): m is { coords: [number, number]; label: string } => m !== null,
    );

  if (provider.locations.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg">Service Areas</h2>
      <div className="overflow-hidden rounded-xl border border-border">
        <div style={{ height: "320px", width: "100%" }}>
          <MapContainer
            center={markers[0]?.coords ?? DEFAULT_CENTER}
            zoom={markers.length === 1 ? 13 : DEFAULT_ZOOM}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {markers.length > 0 && <FitBounds markers={markers} />}
            {markers.map(({ coords, label }, i) => (
              <Marker key={i} position={coords} icon={markerIcon}>
                <Popup>{label}</Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {provider.locations.map((loc) => {
          const address = loc.address ?? null;
          if (!address) return null;
          return (
            <li key={loc.id}>
              {[
                address.street,
                address.suburb,
                address.city,
                address.state,
                address.postcode,
              ].join(", ")}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
