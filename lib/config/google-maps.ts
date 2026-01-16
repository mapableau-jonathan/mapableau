/**
 * Google Maps Configuration
 * API key management and map options
 */

export interface GoogleMapsConfig {
  apiKey: string;
  enabled: boolean;
  streetViewEnabled: boolean;
  buildings3DEnabled: boolean;
  mapOptions: {
    defaultZoom: number;
    defaultCenter: {
      lat: number;
      lng: number;
    };
    mapTypeId: "roadmap" | "satellite" | "hybrid" | "terrain";
    tilt: number; // For 3D buildings (0-45 degrees)
    heading: number; // Rotation (0-360 degrees)
    mapTypeControl: boolean;
    streetViewControl: boolean;
    fullscreenControl: boolean;
    zoomControl: boolean;
  };
  streetViewOptions: {
    position: {
      lat: number;
      lng: number;
    };
    pov: {
      heading: number;
      pitch: number;
    };
    visible: boolean;
    enableCloseButton: boolean;
  };
}

export function getGoogleMapsConfig(): GoogleMapsConfig {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const enabled = process.env.GOOGLE_MAPS_ENABLED === "true" && !!apiKey;
  const streetViewEnabled =
    process.env.GOOGLE_MAPS_STREETVIEW_ENABLED !== "false" && enabled;
  const buildings3DEnabled =
    process.env.GOOGLE_MAPS_3D_BUILDINGS_ENABLED !== "false" && enabled;

  return {
    apiKey,
    enabled,
    streetViewEnabled,
    buildings3DEnabled,
    mapOptions: {
      defaultZoom: parseInt(process.env.GOOGLE_MAPS_DEFAULT_ZOOM || "13", 10),
      defaultCenter: {
        lat: parseFloat(process.env.GOOGLE_MAPS_DEFAULT_LAT || "-33.8688"),
        lng: parseFloat(process.env.GOOGLE_MAPS_DEFAULT_LNG || "151.2093"),
      },
      mapTypeId: (process.env.GOOGLE_MAPS_DEFAULT_TYPE ||
        "roadmap") as "roadmap" | "satellite" | "hybrid" | "terrain",
      tilt: buildings3DEnabled
        ? parseInt(process.env.GOOGLE_MAPS_3D_TILT || "45", 10)
        : 0,
      heading: parseInt(process.env.GOOGLE_MAPS_3D_HEADING || "0", 10),
      mapTypeControl: process.env.GOOGLE_MAPS_MAP_TYPE_CONTROL !== "false",
      streetViewControl: streetViewEnabled,
      fullscreenControl: true,
      zoomControl: true,
    },
    streetViewOptions: {
      position: {
        lat: parseFloat(process.env.GOOGLE_MAPS_DEFAULT_LAT || "-33.8688"),
        lng: parseFloat(process.env.GOOGLE_MAPS_DEFAULT_LNG || "151.2093"),
      },
      pov: {
        heading: 0,
        pitch: 0,
      },
      visible: false,
      enableCloseButton: true,
    },
  };
}

export const googleMapsConfig = getGoogleMapsConfig();

/**
 * Check if Google Maps is available and configured
 */
export function isGoogleMapsAvailable(): boolean {
  return googleMapsConfig.enabled && !!googleMapsConfig.apiKey;
}
