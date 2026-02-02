"use client";

import { Marker, Popup } from "react-leaflet";
import { CheckCircle2, MapPin } from "lucide-react";
import type { AdData } from "../MapWithAds";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";

interface SponsoredMarkerProps {
  ad: AdData;
  onClick: () => void;
}

export function SponsoredMarker({ ad, onClick }: SponsoredMarkerProps) {
  const position: LatLngExpression = [
    ad.business.latitude,
    ad.business.longitude,
  ];

  // Create custom icon with "Sponsored" badge
  const icon = L.divIcon({
    className: "sponsored-marker",
    html: `
      <div class="relative">
        <div class="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded z-10">
          Sponsored
        </div>
        <div class="bg-white rounded-full p-2 shadow-lg border-2 border-blue-500">
          ${ad.business.logoUrl
            ? `<img src="${ad.business.logoUrl}" class="w-6 h-6 rounded-full" />`
            : '<svg class="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>'}
        </div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 50],
  });

  return (
    <Marker position={position} icon={icon}>
      <Popup>
        <div className="p-2 min-w-[200px]">
          <div className="flex items-start gap-2">
            {ad.business.logoUrl && (
              <img
                src={ad.business.logoUrl}
                alt={ad.business.name}
                className="w-10 h-10 rounded object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1">
                <h3 className="font-semibold text-sm">{ad.title}</h3>
                {ad.business.verified && (
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                )}
                <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">
                  Sponsored
                </span>
              </div>
              <p className="text-xs text-muted-foreground capitalize mb-2">
                {ad.business.category.replace("_", " ").toLowerCase()}
              </p>
              {ad.description && (
                <p className="text-xs text-muted-foreground mb-2">
                  {ad.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mb-2" role="region" aria-label="Why am I seeing this?">
                This venue is a sponsored listing and meets your filters. Sponsored placement never overrides accessibility results.
              </p>
              {ad.callToAction && (
                <button
                  onClick={onClick}
                  className="w-full mt-2 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {ad.callToAction}
                </button>
              )}
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}
