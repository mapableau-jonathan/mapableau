/**
 * Google Maps API Loading Hook
 * Handles loading Google Maps JavaScript API
 */

import { useState, useEffect } from "react";
import { isGoogleMapsAvailable, googleMapsConfig } from "@/lib/config/google-maps";

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps: () => void;
  }
}

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isGoogleMapsAvailable()) {
      setLoadError("Google Maps API key not configured");
      return;
    }

    // Check if already loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already being loaded
    if (document.querySelector(`script[src*="maps.googleapis.com"]`)) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);

      return () => clearInterval(checkLoaded);
    }

    // Load Google Maps API
    setIsLoading(true);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsConfig.apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
    };

    script.onerror = () => {
      setLoadError("Failed to load Google Maps API");
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup if component unmounts before script loads
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return {
    isLoaded,
    isLoading,
    loadError,
    isAvailable: isGoogleMapsAvailable(),
  };
}
