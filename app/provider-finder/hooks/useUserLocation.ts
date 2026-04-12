import { useEffect, useState } from "react";

import { getLocationAndPostcode, UserPosition } from "@/lib/geo";

const SYDNEY_FALLBACK: UserPosition = { lat: -33.8688, lng: 151.2093 };

export function useUserLocation({
  setPage,
}: {
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [searchCoords, setSearchCoords] = useState<UserPosition | null>(null);
  const [coordsReady, setCoordsReady] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState("");
  const [userLocation, setUserLocation] = useState<UserPosition | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { position, postcode } = await getLocationAndPostcode();
        if (!cancelled) {
          setSearchCoords(position);
          setUserLocation(position);
          setSelectedLocation(postcode);
        }
      } catch {
        if (!cancelled) {
          setSearchCoords(SYDNEY_FALLBACK);
          setUserLocation(SYDNEY_FALLBACK);
        }
      } finally {
        if (!cancelled) setCoordsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getUserLocation = async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { position, postcode } = await getLocationAndPostcode();
      setSearchCoords(position);
      setUserLocation(position);
      setSelectedLocation(postcode);
      setPage(1);
    } catch (e) {
      setLocationError(
        e instanceof Error ? e.message : "Could not get your location",
      );
    } finally {
      setLocationLoading(false);
    }
  };

  return {
    searchCoords,
    coordsReady,
    selectedLocation,
    setSelectedLocation,
    userLocation,
    getUserLocation,
    locationLoading,
    locationError,
  };
}
