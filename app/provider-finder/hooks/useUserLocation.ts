import { useEffect, useRef, useState } from "react";

import { getCurrentPosition, UserPosition } from "@/lib/geo";

const SYDNEY_FALLBACK: UserPosition = { lat: -33.8688, lng: 151.2093 };

export function useUserLocation({
  setPage,
  onLocationChange,
}: {
  setPage: React.Dispatch<React.SetStateAction<number>>;
  onLocationChange: (position: UserPosition) => void;
}) {
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;
  const [userLocation, setUserLocation] =
    useState<UserPosition>(SYDNEY_FALLBACK);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(true);

  // Prevent race conditions
  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;

    void (async () => {
      try {
        const position = await getCurrentPosition();
        console.log("getting user location 1", position);

        if (!cancelled && requestId === requestIdRef.current) {
          setUserLocation(position);
          setIsFallback(false);
          setLocationError(null);
          onLocationChangeRef.current(position);
        }
      } catch (e) {
        console.log("getting user location 2", e);
        if (!cancelled && requestId === requestIdRef.current) {
          const message =
            e instanceof Error ? e.message : "Could not get your location";

          setUserLocation(SYDNEY_FALLBACK);
          setIsFallback(true);
          setLocationError(message);
          onLocationChangeRef.current(SYDNEY_FALLBACK);
        }
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setLocationLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onLocationChangeRef]);

  const getUserLocation = async () => {
    const requestId = ++requestIdRef.current;

    setLocationLoading(true);
    setLocationError(null);

    try {
      const position = await getCurrentPosition();

      if (requestId === requestIdRef.current) {
        setUserLocation(position);
        setIsFallback(false);
        setPage(1);
        onLocationChangeRef.current(position);
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Could not get your location";

      if (requestId === requestIdRef.current) {
        setUserLocation(SYDNEY_FALLBACK);
        setIsFallback(true);
        setLocationError(message);
        onLocationChangeRef.current(SYDNEY_FALLBACK);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLocationLoading(false);
      }
    }
  };

  return {
    userLocation,
    getUserLocation,
    locationLoading,
    locationError,
    isFallback,
  };
}
