"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { googleMapsConfig } from "@/lib/config/google-maps";
import type { MapMarker } from "./Map";

export interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
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
      const marker = new google.maps.Marker({
        position: new google.maps.LatLng(position[0], position[1]),
        map: mapInstanceRef.current!,
        title: markerData.title,
        animation: google.maps.Animation.DROP,
      });

      // Add info window if title or description
      if (markerData.title || markerData.description) {
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              ${markerData.title ? `<h3 style="margin: 0 0 4px 0; font-weight: 600;">${markerData.title}</h3>` : ""}
              ${markerData.description ? `<p style="margin: 0; font-size: 14px; color: #666;">${markerData.description}</p>` : ""}
            </div>
          `,
        });

        marker.addListener("click", () => {
          infoWindow.open(mapInstanceRef.current!, marker);
          if (onMarkerClick) {
            onMarkerClick(markerData);
          }
        });
      } else if (onMarkerClick) {
        marker.addListener("click", () => {
          onMarkerClick(markerData);
        });
      }

      markersRef.current.push(marker);
    });
  }, [markers, isLoaded, onMarkerClick]);

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
