"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useMapProvider } from "@/hooks/use-map-provider";
import { GoogleMap } from "./GoogleMap";
import { MapProviderToggle } from "./MapProviderToggle";
import type { MapProvider } from "@/lib/services/mapping/map-provider-service";

// Dynamically import react-leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// Fix for default marker icons in Next.js
if (typeof window !== "undefined") {
  const L = require("leaflet");
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
}

export interface MapMarker {
  position: LatLngExpression;
  title?: string;
  description?: string;
}

export interface MapProps {
  center?: LatLngExpression;
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  height?: string;
  provider?: MapProvider; // Override provider selection
  showProviderToggle?: boolean; // Show provider toggle UI
  enable3DBuildings?: boolean; // Enable 3D buildings (Google Maps only)
  enableStreetView?: boolean; // Enable StreetView (Google Maps only)
}

export default function Map({
  center = [-33.8688, 151.2093], // Default to Sydney, Australia
  zoom = 13,
  markers = [],
  className = "",
  height = "400px",
  provider: providerOverride,
  showProviderToggle = false,
  enable3DBuildings = false,
  enableStreetView = false,
}: MapProps) {
  const [isClient, setIsClient] = useState(false);
  const { provider: currentProvider } = useMapProvider();
  const provider = providerOverride || currentProvider;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Convert Leaflet center format [lat, lng] to Google Maps format {lat, lng}
  const getGoogleCenter = () => {
    if (Array.isArray(center)) {
      return { lat: center[0], lng: center[1] };
    }
    return center as { lat: number; lng: number };
  };

  if (!isClient) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ height }}
      >
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  // Render Google Maps if provider is Google
  if (provider === "google") {
    return (
      <div className={`relative ${className}`} style={{ height }}>
        {showProviderToggle && <MapProviderToggle className="absolute top-2 left-2 z-10" />}
        <GoogleMap
          center={getGoogleCenter()}
          zoom={zoom}
          markers={markers.map((m) => ({
            position: Array.isArray(m.position)
              ? [m.position[0], m.position[1]]
              : m.position,
            title: m.title,
            description: m.description,
          }))}
          className={className}
          height={height}
          enable3DBuildings={enable3DBuildings}
          enableStreetView={enableStreetView}
        />
      </div>
    );
  }

  // Default to Leaflet/OpenStreetMap
  return (
    <div className={`relative ${className}`} style={{ height }}>
      {showProviderToggle && <MapProviderToggle className="absolute top-2 left-2 z-10" />}
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full rounded-lg"
        style={{ zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((marker, index) => (
          <Marker key={index} position={marker.position}>
            {(marker.title || marker.description) && (
              <Popup>
                {marker.title && (
                  <h3 className="font-semibold mb-1">{marker.title}</h3>
                )}
                {marker.description && (
                  <p className="text-sm">{marker.description}</p>
                )}
              </Popup>
            )}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
