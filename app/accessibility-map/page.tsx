"use client";

import { MapWithPlaces } from "@/components/map/MapWithPlaces";

const DEFAULT_CENTER: [number, number] = [-33.8688, 151.2093];
const DEFAULT_ZOOM = 13;

export default function AccessibilityMapPage() {
  return (
    <>
      <header className="shrink-0 px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-4xl rounded-lg border border-border bg-white/75 px-4 py-3 shadow-sm backdrop-blur-sm sm:px-5 sm:py-4">
          <h1 id="accessibility-map-heading" className="text-2xl font-heading font-bold text-foreground sm:text-3xl">
            Accessibility Map
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
            Explore accessible locations and venues in your area. Sponsored
            markers are clearly disclosed and never override your filters. Switch
            to Google Maps for Street View and 3D building visualization.
          </p>
        </div>
      </header>

      <section
        className="flex min-h-0 flex-1 flex-col px-4 pb-4 sm:px-6 sm:pb-6"
        aria-labelledby="accessibility-map-heading"
        aria-describedby="accessibility-map-desc"
      >
        <p id="accessibility-map-desc" className="sr-only">
          Interactive map showing accessible venues. Use filters and map
          controls to explore. Click a marker to open venue details.
        </p>
        <div className="min-h-[480px] flex-1 overflow-hidden rounded-lg border border-border shadow-lg sm:min-h-[60vh]">
          <MapWithPlaces
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            height="100%"
            showProviderToggle={true}
            enable3DBuildings={true}
            enableStreetView={true}
            accessibilityFilters={["ndis", "wheelchair"]}
            geoJsonUrl="/data/MapAble_enriched.geojson"
            placeDetailPath={(id) => `/places/${id}`}
          />
        </div>
      </section>
    </>
  );
}
