// todo: include in database

/**
 * Approximate coordinates for Australian cities/suburbs.
 * Used for provider location maps when lat/lng not stored.
 */
export const LOCATION_COORDS: Record<string, [number, number]> = {
  "Melbourne VIC": [-37.8136, 144.9631],
  "Prahran VIC": [-37.8511, 144.9908],
  "Katoomba NSW": [-33.7156, 150.3072],
  "Broadbeach QLD": [-28.0278, 153.4306],
  "Tweed Heads NSW": [-28.1767, 153.5453],
  "Adelaide SA": [-34.9285, 138.6007],
  "Perth WA": [-31.9505, 115.8605],
  "Sydney NSW": [-33.8688, 151.2093],
  "Parramatta NSW": [-33.8148, 151.0033],
  "Footscray VIC": [-37.8, 144.9],
  "Morphett Vale SA": [-35.1167, 138.5167],
  "Bayswater WA": [-31.9167, 115.9167],
  "Chermside QLD": [-27.3833, 153.0333],
  "Civic ACT": [-35.2833, 149.1333],
  "Hobart TAS": [-42.8833, 147.3167],
  "Darwin City NT": [-12.4634, 130.8456],
  "Mildura VIC": [-34.1833, 142.15],
  "Newcastle NSW": [-32.9283, 151.7817],
  "Geelong VIC": [-38.15, 144.35],
};

export function getLocationCoords(
  city: string | null,
  state: string | null,
  _address?: string,
): [number, number] | null {
  if (city && state) {
    const key = `${city} ${state}`;
    if (LOCATION_COORDS[key]) return LOCATION_COORDS[key];
  }
  // Fallback: try city only
  if (city && LOCATION_COORDS[city]) return LOCATION_COORDS[city];
  return null;
}
