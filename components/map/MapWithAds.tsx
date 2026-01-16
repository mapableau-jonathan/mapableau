"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import { SponsoredMarker } from "./ads/SponsoredMarker";
import { BannerAd } from "./ads/BannerAd";
import { PopupAd } from "./ads/PopupAd";
import { useMapProvider } from "@/hooks/use-map-provider";
import { GoogleMap } from "./GoogleMap";
import { MapProviderToggle } from "./MapProviderToggle";
import { Map3DControls } from "./Map3DControls";
import { StreetView } from "./StreetView";
import type { MapProvider } from "@/lib/services/mapping/map-provider-service";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

export interface AdData {
  id: string;
  type: "BANNER" | "SPONSORED_MARKER" | "POPUP" | "SIDEBAR" | "SEARCH_RESULT";
  business: {
    id: string;
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    logoUrl?: string;
    verified?: boolean;
  };
  title: string;
  description?: string;
  imageUrl?: string;
  linkUrl?: string;
  callToAction?: string;
  tracking: {
    impressionUrl: string;
    clickUrl: string;
  };
}

export interface MapWithAdsProps {
  center?: LatLngExpression;
  zoom?: number;
  showBusinesses?: boolean;
  showAdvertisements?: boolean;
  businessCategory?: string;
  acceptsNDIS?: boolean;
  className?: string;
  height?: string;
  adUnitId?: string; // Ad unit code for ad serving
  provider?: MapProvider; // Override provider selection
  showProviderToggle?: boolean; // Show provider toggle UI
  enable3DBuildings?: boolean; // Enable 3D buildings (Google Maps only)
  enableStreetView?: boolean; // Enable StreetView (Google Maps only)
}

export function MapWithAds({
  center = [-33.8688, 151.2093],
  zoom = 13,
  showBusinesses = true,
  showAdvertisements = true,
  businessCategory,
  acceptsNDIS,
  className = "",
  height = "400px",
  adUnitId,
  provider: providerOverride,
  showProviderToggle = true,
  enable3DBuildings = false,
  enableStreetView = false,
}: MapWithAdsProps) {
  const [ads, setAds] = useState<AdData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [popupAd, setPopupAd] = useState<AdData | null>(null);
  const [showStreetView, setShowStreetView] = useState(false);
  const [streetViewPosition, setStreetViewPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapTilt, setMapTilt] = useState(0);
  const [mapHeading, setMapHeading] = useState(0);
  const { provider: currentProvider, capabilities } = useMapProvider();
  const provider = providerOverride || currentProvider;

  useEffect(() => {
    const fetchAds = async () => {
      if (!showAdvertisements || !adUnitId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const [lat, lng] = center as [number, number];

      try {
        const response = await fetch("/api/ads/serve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adUnitId,
            location: {
              lat,
              lng,
              radius: 5000,
            },
            pageContext: {
              category: businessCategory,
              keywords: acceptsNDIS ? ["NDIS", "accessible"] : [],
            },
          }),
        });

        const data = await response.json();

        if (data.ad) {
          // Transform ad data to match AdData interface
          const adData: AdData = {
            id: data.ad.id,
            type: data.ad.type,
            business: data.ad.business || {
              id: data.ad.businessId,
              name: data.ad.title,
              category: data.ad.targetCategory || "OTHER",
              latitude: 0,
              longitude: 0,
            },
            title: data.ad.title,
            description: data.ad.description,
            imageUrl: data.ad.imageUrl,
            linkUrl: data.ad.linkUrl,
            callToAction: data.ad.callToAction,
            tracking: data.tracking,
          };

          // Track impression
          if (data.tracking.impressionUrl) {
            fetch(data.tracking.impressionUrl).catch(console.error);
          }

          // Show popup ad on first load
          if (data.ad.type === "POPUP" && !showPopup) {
            setPopupAd(adData);
            setShowPopup(true);
          }

          setAds([adData]);
        }
      } catch (error) {
        console.error("Error fetching ads:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAds();
  }, [center, showAdvertisements, adUnitId, businessCategory, acceptsNDIS, showPopup]);

  const handleAdClick = (ad: AdData) => {
    if (ad.tracking.clickUrl) {
      window.open(ad.tracking.clickUrl, "_blank");
    } else if (ad.linkUrl) {
      window.open(ad.linkUrl, "_blank");
    }
  };

  const handleMapClick = (location: { lat: number; lng: number }) => {
    if (capabilities.supportsStreetView && enableStreetView) {
      setStreetViewPosition(location);
      setShowStreetView(true);
    }
  };

  const handleMarkerClick = (ad: AdData) => {
    handleAdClick(ad);
    // Also open StreetView if available
    if (capabilities.supportsStreetView && enableStreetView) {
      setStreetViewPosition({
        lat: ad.business.latitude,
        lng: ad.business.longitude,
      });
      setShowStreetView(true);
    }
  };

  // Convert Leaflet center format to Google Maps format
  const getGoogleCenter = () => {
    if (Array.isArray(center)) {
      return { lat: center[0], lng: center[1] };
    }
    return center as { lat: number; lng: number };
  };

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    const googleMarkers = showAdvertisements
      ? ads
          .filter((ad) => ad.type === "SPONSORED_MARKER")
          .map((ad) => ({
            position: [ad.business.latitude, ad.business.longitude] as [
              number,
              number
            ],
            title: ad.title,
            description: ad.description,
          }))
      : [];

    return (
      <div className={`relative ${className}`} style={{ height }}>
        {showProviderToggle && (
          <MapProviderToggle className="absolute top-2 left-2 z-10" />
        )}
        {capabilities.supports3DBuildings && enable3DBuildings && (
          <Map3DControls
            currentTilt={mapTilt}
            currentHeading={mapHeading}
            onTiltChange={setMapTilt}
            onHeadingChange={setMapHeading}
            onReset={() => {
              setMapTilt(0);
              setMapHeading(0);
            }}
          />
        )}
        <GoogleMap
          center={getGoogleCenter()}
          zoom={zoom}
          markers={googleMarkers}
          className={className}
          height={height}
          enable3DBuildings={enable3DBuildings}
          enableStreetView={enableStreetView}
          tilt={mapTilt}
          heading={mapHeading}
          onMapClick={handleMapClick}
          onMarkerClick={(marker) => {
            const ad = ads.find(
              (a) =>
                a.business.latitude === marker.position[0] &&
                a.business.longitude === marker.position[1]
            );
            if (ad) {
              handleMarkerClick(ad);
            }
          }}
          onTiltChange={setMapTilt}
          onHeadingChange={setMapHeading}
        />
        {showStreetView && streetViewPosition && (
          <StreetView
            position={streetViewPosition}
            fullscreen={true}
            onClose={() => {
              setShowStreetView(false);
              setStreetViewPosition(null);
            }}
            onPositionChange={setStreetViewPosition}
          />
        )}
        {/* Banner Ads */}
        {showAdvertisements &&
          ads
            .filter((ad) => ad.type === "BANNER")
            .map((ad) => (
              <BannerAd
                key={ad.id}
                ad={ad}
                position="top"
                onClose={() => setAds(ads.filter((a) => a.id !== ad.id))}
              />
            ))}
        {/* Popup Ad */}
        {showPopup && popupAd && (
          <PopupAd
            ad={popupAd}
            onClose={() => {
              setShowPopup(false);
              setPopupAd(null);
            }}
            onClick={() => handleAdClick(popupAd)}
          />
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
            <p className="text-muted-foreground">Loading map data...</p>
          </div>
        )}
      </div>
    );
  }

  // Default to Leaflet/OpenStreetMap
  return (
    <div className={`relative ${className}`} style={{ height }}>
      {showProviderToggle && (
        <MapProviderToggle className="absolute top-2 left-2 z-10" />
      )}
      <div className={className} style={{ height }}>
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
          {showAdvertisements &&
            ads
              .filter((ad) => ad.type === "SPONSORED_MARKER")
              .map((ad) => (
                <SponsoredMarker
                  key={ad.id}
                  ad={ad}
                  onClick={() => handleAdClick(ad)}
                />
              ))}
        </MapContainer>
      </div>

      {/* Banner Ads */}
      {showAdvertisements &&
        ads
          .filter((ad) => ad.type === "BANNER")
          .map((ad) => (
            <BannerAd
              key={ad.id}
              ad={ad}
              position="top"
              onClose={() => setAds(ads.filter((a) => a.id !== ad.id))}
            />
          ))}

      {/* Popup Ad */}
      {showPopup && popupAd && (
        <PopupAd
          ad={popupAd}
          onClose={() => {
            setShowPopup(false);
            setPopupAd(null);
          }}
          onClick={() => handleAdClick(popupAd)}
        />
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
          <p className="text-muted-foreground">Loading map data...</p>
        </div>
      )}
    </div>
  );
}
