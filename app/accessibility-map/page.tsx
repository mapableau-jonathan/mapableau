"use client";

import { MapWithAds } from "@/components/map/MapWithAds";

export default function AccessibilityMapPage() {
  // Example ad unit ID - in production, this would come from publisher settings
  const adUnitId =
    process.env.NEXT_PUBLIC_DEFAULT_AD_UNIT_ID || "map_accessibility";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold mb-2">
          Accessibility Map
        </h1>
        <p className="text-muted-foreground">
          Explore accessible locations and venues in your area. Switch to Google
          Maps for StreetView and 3D building visualization.
        </p>
      </div>

      <div className="rounded-lg overflow-hidden border border-border shadow-lg">
        <MapWithAds
          center={[-33.8688, 151.2093]} // Sydney, Australia
          zoom={13}
          showBusinesses={true}
          showAdvertisements={true}
          acceptsNDIS={true}
          height="600px"
          adUnitId={adUnitId}
          showProviderToggle={true}
          enable3DBuildings={true}
          enableStreetView={true}
        />
      </div>
    </div>
  );
}
