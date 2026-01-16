"use client";

import { useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "@/hooks/use-google-maps";
import { X, MapPin } from "lucide-react";

export interface StreetViewProps {
  position: { lat: number; lng: number };
  heading?: number;
  pitch?: number;
  zoom?: number;
  fullscreen?: boolean;
  onClose?: () => void;
  onPositionChange?: (position: { lat: number; lng: number }) => void;
  className?: string;
  height?: string;
}

export function StreetView({
  position,
  heading = 0,
  pitch = 0,
  zoom = 1,
  fullscreen = false,
  onClose,
  onPositionChange,
  className = "",
  height = "400px",
}: StreetViewProps) {
  const panoramaRef = useRef<HTMLDivElement>(null);
  const panoramaInstanceRef = useRef<google.maps.StreetViewPanorama | null>(
    null
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const { isLoaded: apiLoaded, loadError } = useGoogleMaps();

  // Initialize StreetView
  useEffect(() => {
    if (!apiLoaded || !panoramaRef.current || panoramaInstanceRef.current) {
      return;
    }

    try {
      const panorama = new google.maps.StreetViewPanorama(panoramaRef.current, {
        position: new google.maps.LatLng(position.lat, position.lng),
        pov: {
          heading,
          pitch,
        },
        zoom,
        visible: true,
        enableCloseButton: !!onClose,
        addressControl: true,
        linksControl: true,
        panControl: true,
        zoomControl: true,
      });

      panoramaInstanceRef.current = panorama;

      // Listen for position changes
      if (onPositionChange) {
        panorama.addListener("position_changed", () => {
          const pos = panorama.getPosition();
          if (pos) {
            onPositionChange({
              lat: pos.lat(),
              lng: pos.lng(),
            });
          }
        });
      }

      setIsLoaded(true);
    } catch (error) {
      console.error("Error initializing StreetView:", error);
    }
  }, [apiLoaded, position, heading, pitch, zoom, onPositionChange]);

  // Update position
  useEffect(() => {
    if (!panoramaInstanceRef.current || !isLoaded) return;

    panoramaInstanceRef.current.setPosition(
      new google.maps.LatLng(position.lat, position.lng)
    );
  }, [position, isLoaded]);

  // Update POV
  useEffect(() => {
    if (!panoramaInstanceRef.current || !isLoaded) return;

    panoramaInstanceRef.current.setPov({
      heading,
      pitch,
    });
  }, [heading, pitch, isLoaded]);

  if (loadError) {
    return (
      <div
        className={`flex items-center justify-center bg-muted ${className}`}
        style={{ height }}
      >
        <p className="text-muted-foreground">
          StreetView unavailable: {loadError}
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
        <p className="text-muted-foreground">Loading StreetView...</p>
      </div>
    );
  }

  return (
    <div
      className={`relative ${fullscreen ? "fixed inset-0 z-50" : ""} ${className}`}
      style={fullscreen ? {} : { height }}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 p-2 bg-white rounded shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Close StreetView"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      <div
        ref={panoramaRef}
        style={{ height: fullscreen ? "100vh" : height, width: "100%" }}
        role="application"
        aria-label="Street View Panorama"
      />
    </div>
  );
}
