export function getBoundingBox(lat: number, lon: number, radiusKm: number) {
  const latDelta = radiusKm / 111; // ~111 km per degree latitude
  const lonDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180)); // longitude scales with latitude

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}
