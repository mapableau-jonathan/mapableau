"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { googleMapsConfig } from "@/lib/config/google-maps";
import type { FeatureCollection } from "geojson";
import type { MapMarker } from "./Map";

export interface GoogleMapMarker extends MapMarker {
  position: [number, number] | { lat: number; lng: number };
  isSponsored?: boolean;
  disclosureText?: string | null;
  placeId?: string;
}

export interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: GoogleMapMarker[];
  /** Optional GeoJSON overlay (e.g. imported JSON data). */
  geoJson?: FeatureCollection | null;
  className?: string;
  height?: string;
  enable3DBuildings?: boolean;
  enableStreetView?: boolean;
  tilt?: number; // Custom tilt angle (0-45)
  heading?: number; // Custom heading/rotation (0-360)
  onMarkerClick?: (marker: MapMarker) => void;
  onMapClick?: (location: { lat: number; lng: number }) => void;
  onTiltChange?: (tilt: number) => void;
  onHeadingChange?: (heading: number) => void;
}

export function GoogleMap({
  center = {
    lat: googleMapsConfig.mapOptions.defaultCenter.lat,
    lng: googleMapsConfig.mapOptions.defaultCenter.lng,
  },
  zoom = googleMapsConfig.mapOptions.defaultZoom,
  markers = [],
  geoJson,
  className = "",
  height = "400px",
  enable3DBuildings = googleMapsConfig.buildings3DEnabled,
  enableStreetView = googleMapsConfig.streetViewEnabled,
  tilt: tiltOverride,
  heading: headingOverride,
  onMarkerClick,
  onMapClick,
  onTiltChange,
  onHeadingChange,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { isLoaded: apiLoaded, loadError } = useGoogleMaps();

  // Initialize map
  useEffect(() => {
    if (!apiLoaded || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    try {
      const initialTilt =
        tiltOverride !== undefined
          ? tiltOverride
          : enable3DBuildings
          ? googleMapsConfig.mapOptions.tilt
          : 0;
      const initialHeading =
        headingOverride !== undefined
          ? headingOverride
          : enable3DBuildings
          ? googleMapsConfig.mapOptions.heading
          : 0;

      const mapOptions: google.maps.MapOptions = {
        center: new google.maps.LatLng(center.lat, center.lng),
        zoom,
        mapTypeId: enable3DBuildings ? "satellite" : googleMapsConfig.mapOptions.mapTypeId,
        tilt: initialTilt,
        heading: initialHeading,
        mapTypeControl: googleMapsConfig.mapOptions.mapTypeControl,
        streetViewControl: enableStreetView && googleMapsConfig.mapOptions.streetViewControl,
        fullscreenControl: googleMapsConfig.mapOptions.fullscreenControl,
        zoomControl: googleMapsConfig.mapOptions.zoomControl,
        disableDefaultUI: false,
        keyboardShortcuts: true,
        gestureHandling: "greedy",
      };

      const map = new google.maps.Map(mapRef.current, mapOptions);
      mapInstanceRef.current = map;

      // Add click handler
      if (onMapClick) {
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            onMapClick({
              lat: e.latLng.lat(),
              lng: e.latLng.lng(),
            });
          }
        });
      }

      setIsLoaded(true);
    } catch (error) {
      console.error("Error initializing Google Map:", error);
    }
  }, [apiLoaded, center, zoom, enable3DBuildings, enableStreetView, onMapClick]);

  // Update map center and zoom
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    mapInstanceRef.current.setCenter(new google.maps.LatLng(center.lat, center.lng));
    mapInstanceRef.current.setZoom(zoom);
  }, [center, zoom, isLoaded]);

  // Update 3D buildings and tilt/heading
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const targetTilt =
      tiltOverride !== undefined
        ? tiltOverride
        : enable3DBuildings
        ? googleMapsConfig.mapOptions.tilt
        : 0;
    const targetHeading =
      headingOverride !== undefined
        ? headingOverride
        : enable3DBuildings
        ? googleMapsConfig.mapOptions.heading
        : 0;

    mapInstanceRef.current.setTilt(targetTilt);
    mapInstanceRef.current.setHeading(targetHeading);

    if (enable3DBuildings && mapInstanceRef.current.getMapTypeId() !== "satellite") {
      mapInstanceRef.current.setMapTypeId("satellite");
    }
  }, [enable3DBuildings, tiltOverride, headingOverride, isLoaded]);

  // Listen for tilt/heading changes from user interaction
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const map = mapInstanceRef.current;

    if (onTiltChange) {
      map.addListener("tilt_changed", () => {
        onTiltChange(map.getTilt() || 0);
      });
    }

    if (onHeadingChange) {
      map.addListener("heading_changed", () => {
        onHeadingChange(map.getHeading() || 0);
      });
    }

    return () => {
      if (onTiltChange) {
        google.maps.event.clearListeners(map, "tilt_changed");
      }
      if (onHeadingChange) {
        google.maps.event.clearListeners(map, "heading_changed");
      }
    };
  }, [isLoaded, onTiltChange, onHeadingChange]);

  // Update markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => {
      marker.setMap(null);
    });
    markersRef.current = [];

    // Add new markers
    markers.forEach((markerData) => {
      const position = markerData.position as [number, number];
      const lat = Array.isArray(position) ? position[0] : position.lat;
      const lng = Array.isArray(position) ? position[1] : position.lng;
      const isSponsored = markerData.isSponsored ?? false;
      const marker = new google.maps.Marker({
        position: new google.maps.LatLng(lat, lng),
        map: mapInstanceRef.current!,
        title: markerData.title,
        animation: google.maps.Animation.DROP,
        icon: isSponsored
          ? undefined
          : undefined,
        label: isSponsored ? "S" : undefined,
      });

      // Add info window if title or description or disclosure
      if (markerData.title || markerData.description || markerData.disclosureText) {
        const sponsoredPill = isSponsored
          ? '<span style="display:inline-block;font-size:11px;background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:4px;margin-bottom:6px;">Sponsored</span>'
          : "";
        const disclosureBlock = markerData.disclosureText
          ? `<p style="margin:6px 0 0;font-size:12px;color:#6b7280;" role="region" aria-label="Why am I seeing this?">${markerData.disclosureText}</p>`
          : "";
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              ${sponsoredPill}
              ${markerData.title ? `<h3 style="margin: 0 0 4px 0; font-weight: 600;">${markerData.title}</h3>` : ""}
              ${markerData.description ? `<p style="margin: 0; font-size: 14px; color: #666;">${markerData.description}</p>` : ""}
              ${disclosureBlock}
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(mapInstanceRef.current!, marker);
          if (onMarkerClick) {
            onMarkerClick(markerData as MapMarker);
          }
        });
      } else if (onMarkerClick) {
        marker.addListener("click", () => {
          onMarkerClick(markerData as MapMarker);
        });
      }

      markersRef.current.push(marker);
    });
  }, [markers, isLoaded, onMarkerClick]);

  // GeoJSON overlay (imported JSON data)
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const map = mapInstanceRef.current;

    // Remove existing data layer
    if (dataLayerRef.current) {
      dataLayerRef.current.setMap(null);
      dataLayerRef.current = null;
    }

    if (geoJson?.features?.length) {
      const dataLayer = new google.maps.Data({ map });
      dataLayer.addGeoJson(geoJson as google.maps.Data.GeoJsonOptions);
      dataLayer.setStyle({
        strokeColor: "#1e40af",
        strokeWeight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.2,
      });
      dataLayerRef.current = dataLayer;
    }

    return () => {
      if (dataLayerRef.current) {
        dataLayerRef.current.setMap(null);
        dataLayerRef.current = null;
      }
    };
  }, [geoJson, isLoaded]);

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ height }}
      >
        <p className="text-muted-foreground">
          Google Maps unavailable: {loadError}
        </p>
      </div>
    );
  }

  if (!apiLoaded) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ height }}
      >
        <p className="text-muted-foreground">Loading Google Maps...</p>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className={`${className}`}
      style={{ height, width: "100%" }}
      role="application"
      aria-label="Google Map"
    />
  );
}
