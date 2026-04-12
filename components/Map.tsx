"use client";

import L, { type LatLngExpression, latLngBounds } from "leaflet";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";

import "leaflet/dist/leaflet.css";
import {
  Address,
  Provider,
  ProviderOutlet,
} from "@/app/provider-finder/providers";
import { distanceKm } from "@/lib/geo";
import "@/lib/leafletIcons";

type ProviderWithAddress = {
  type: "provider";
  provider: Provider;
  address: Address;
  distanceKm: number;
};
type ProviderOutletWithAddress = {
  type: "outlet";
  providerOutlet: ProviderOutlet;
  address: Address;
  distanceKm: number;
};
type ProviderOrOutletWithAddress =
  | ProviderWithAddress
  | ProviderOutletWithAddress;

/** Center + radius used with `/api/provider-finder/nearby` when the map viewport changes. */
export type MapSearchView = {
  lat: number;
  lng: number;
  radiusKm: number;
};

function radiusKmCoveringVisibleMap(map: L.Map): number {
  const b = map.getBounds();
  const c = b.getCenter();
  const corners = [
    b.getNorthEast(),
    b.getSouthWest(),
    b.getNorthWest(),
    b.getSouthEast(),
  ];
  let maxD = 0;
  for (const pt of corners) {
    maxD = Math.max(maxD, distanceKm(c.lat, c.lng, pt.lat, pt.lng));
  }
  const padded = maxD * 1.08;
  return Math.min(250, Math.max(0.5, padded));
}

/** Reports map center and a radius that covers the visible bounds (debounced `moveend`). */
function MapViewReporter({
  onViewChange,
  debounceMs = 450,
}: {
  onViewChange: (view: MapSearchView) => void;
  debounceMs?: number;
}) {
  const map = useMap();
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const emit = () => {
      const center = map.getCenter();
      const radiusKm = radiusKmCoveringVisibleMap(map);
      console.log("lat", Number(center.lat.toFixed(4)));
      console.log("lng", Number(center.lng.toFixed(4)));
      console.log("radiusKm", radiusKm);
      console.log("center", center);
      onViewChangeRef.current({
        lat: Number(center.lat.toFixed(4)),
        lng: Number(center.lng.toFixed(4)),
        radiusKm: Math.round(radiusKm * 10) / 10,
      });
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(emit, debounceMs);
    };

    map.on("moveend", schedule);

    return () => {
      map.off("moveend", schedule);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [map, debounceMs]);

  return null;
}

// Use divIcons for all markers so we never rely on L.Icon.Default (avoids createIcon undefined in some envs)
const defaultMarkerIcon = L.divIcon({
  className: "default-marker-icon",
  html: `<div style="width:22px;height:22px;background:#2563eb;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const redMarkerIcon = L.divIcon({
  className: "red-marker-icon",
  html: `<div style="width:24px;height:24px;background:#dc2626;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const userPositionIcon = L.divIcon({
  className: "user-marker-icon",
  html: `<div style="width:20px;height:20px;background:#16a34a;border:2px solid white;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

type MapProps = {
  providers: ProviderWithAddress[];
  providerOutlets: ProviderOutletWithAddress[];
  /** When set, show user position and fit bounds to include it */
  userPosition?: { lat: number; lng: number } | null;
  /** When set, fly map to this provider's position (uses lat/lng or geocode lookup) */
  addressToCenterOn?: ProviderOrOutletWithAddress | null;
  /**
   * Called after the map finishes moving (debounced). Use with nearby-provider queries
   * scoped to the visible viewport.
   */
  onViewChange?: (view: MapSearchView) => void;
  /**
   * `always` — refit whenever marker props change (default for simple map pages).
   * `initial-only` — fit to markers once when they first appear; later marker updates
   * do not move the map (avoids feedback loops when markers come from the map viewport).
   */
  fitBoundsPolicy?: "always" | "initial-only";
};

// Default center: Sydney, Australia
const initialCenter: LatLngExpression = [-33.8688, 151.2093];
const initialZoom = 6;

// Component to adjust map bounds when markers change
function FitBounds({
  markers,
  userPosition,
  fitBoundsPolicy,
}: {
  markers: {
    coords: LatLngExpression;
    providerOrOutletWithAddress: ProviderOrOutletWithAddress;
  }[];
  userPosition: { lat: number; lng: number } | null;
  fitBoundsPolicy: "always" | "initial-only";
}) {
  const map = useMap();
  const didFitRef = useRef(false);

  useEffect(() => {
    const points: [number, number][] = markers.map(
      (m) => m.coords as [number, number],
    );
    if (userPosition) {
      points.push([userPosition.lat, userPosition.lng]);
    }
    if (points.length === 0) {
      didFitRef.current = false;
      map.setView(initialCenter, initialZoom);
      return;
    }
    if (fitBoundsPolicy === "initial-only" && didFitRef.current) {
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      const bounds = latLngBounds(points);
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    }
    if (fitBoundsPolicy === "initial-only") {
      didFitRef.current = true;
    }
  }, [map, markers, userPosition, fitBoundsPolicy]);

  return null;
}

const CENTER_ZOOM = 14;

function getCoords(address: Address): [number, number] | null {
  if (
    address.latitude != null &&
    address.longitude != null &&
    (address.latitude !== 0 || address.longitude !== 0)
  ) {
    return [address.latitude, address.longitude];
  }
  return null;
}

// Fly map to a provider when centerOnProvider changes
function FlyToProvider({
  providerOrOutlet,
}: {
  providerOrOutlet: ProviderOrOutletWithAddress | null;
}) {
  const map = useMap();

  useEffect(() => {
    const address = providerOrOutlet?.address;
    if (!address) return;
    const coords = getCoords(address);
    if (!coords) return;
    map.flyTo(coords, CENTER_ZOOM, { duration: 0.5 });
  }, [map, providerOrOutlet]);

  return null;
}

export default function Map({
  providers = [],
  providerOutlets = [],
  userPosition = null,
  addressToCenterOn = null,
  onViewChange,
  fitBoundsPolicy = "always",
}: MapProps) {
  const markers = [...providers, ...providerOutlets]
    .map((p) => {
      const address = p.address;
      const coords =
        address.latitude != null &&
        address.longitude != null &&
        (address.latitude !== 0 || address.longitude !== 0)
          ? ([address.latitude, address.longitude] as LatLngExpression)
          : null;
      if (!coords) return null;
      return { coords, providerOrOutletWithAddress: p };
    })
    .filter((m) => m !== null);

  return (
    <MapContainer
      center={
        userPosition
          ? ([userPosition.lat, userPosition.lng] as LatLngExpression)
          : initialCenter
      }
      zoom={initialZoom}
      style={{ height: "500px", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds
        markers={markers}
        userPosition={userPosition ?? null}
        fitBoundsPolicy={fitBoundsPolicy}
      />
      <FlyToProvider providerOrOutlet={addressToCenterOn ?? null} />
      {onViewChange ? <MapViewReporter onViewChange={onViewChange} /> : null}
      {userPosition ? (
        <Marker
          position={[userPosition.lat, userPosition.lng]}
          icon={userPositionIcon}
        >
          <Popup>You are here</Popup>
        </Marker>
      ) : null}
      {markers.map(({ coords, providerOrOutletWithAddress }) => {
        const entity =
          "provider" in providerOrOutletWithAddress
            ? providerOrOutletWithAddress.provider
            : providerOrOutletWithAddress.providerOutlet;
        // if ("provider" in providerOrOutletWithAddress) {
        //   const provider = providerOrOutletWithAddress.provider;
        //   const address = providerOrOutletWithAddress.address;
        //   const distanceKm = providerOrOutletWithAddress.distanceKm;
        // } else {
        //   const outlet = providerOrOutletWithAddress.outlet;
        //   const address = providerOrOutletWithAddress.address;
        //   const distanceKm = providerOrOutletWithAddress.distanceKm;
        // }

        return (
          <Marker
            key={entity.id}
            position={coords}
            icon={
              entity.id === addressToCenterOn?.address.id
                ? redMarkerIcon
                : defaultMarkerIcon
            }
          >
            <Popup>
              <div className="min-w-[220px] max-w-[280px] text-xs leading-tight">
                <h3 className="font-semibold text-sm mb-0.5">{entity.name}</h3>
                <p className="text-muted-foreground mb-1">
                  {providerOrOutletWithAddress.address.suburb === "Remote"
                    ? "Telehealth (Australia-wide)"
                    : `${providerOrOutletWithAddress.address.addressString}`}
                </p>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-medium">
                    ⭐ {(entity.rating ?? 0).toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({entity.reviewCount} reviews)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {entity.services.slice(0, 3).map((sd) => (
                    <span
                      key={sd.serviceDefinition.id}
                      className="px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                    >
                      {sd.serviceDefinition.name}
                    </span>
                  ))}
                </div>
                {entity.phone ? (
                  <p className="mb-0.5">
                    <span className="text-muted-foreground">Ph: </span>
                    <a
                      href={`tel:${entity.phone}`}
                      className="text-primary hover:underline"
                    >
                      {entity.phone}
                    </a>
                  </p>
                ) : null}
                {entity.email ? (
                  <p className="mb-0.5 truncate">
                    <span className="text-muted-foreground">Email: </span>
                    <a
                      href={`mailto:${entity.email}`}
                      className="text-primary hover:underline truncate block"
                      title={entity.email}
                    >
                      {entity.email}
                    </a>
                  </p>
                ) : null}
                {entity.website ? (
                  <p className="mb-0.5 truncate">
                    <span className="text-muted-foreground">Web: </span>
                    <a
                      href={
                        entity.website.startsWith("http")
                          ? entity.website
                          : `https://${entity.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                      title={entity.website}
                    >
                      {entity.website}
                    </a>
                  </p>
                ) : null}
                {entity.abn ? (
                  <p className="mb-1">
                    <span className="text-muted-foreground">ABN: </span>
                    {entity.abn}
                  </p>
                ) : null}
                {/* {entity.businessHours.length > 0 ? (
                  <div className="mt-1 pt-1 border-t border-border">
                    <p className="font-medium text-muted-foreground mb-0.5">
                      Hours
                    </p>
                    <div className="grid grid-cols-[max-content_1fr] gap-x-2 gap-y-0.5 tabular-nums">
                      {entity.businessHours.map((bh) => (
                        <Fragment key={bh.id}>
                          <span className="text-muted-foreground">
                            {bh.dayOfWeek}
                          </span>
                          <span>
                            {getDbTimeString(bh.openTime)} -{" "}
                            {getDbTimeString(bh.closeTime)}
                          </span>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                ) : null} */}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
