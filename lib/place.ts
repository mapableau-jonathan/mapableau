/**
 * Shared place/location formatting for provider and participant profiles.
 * Australian style: Suburb, STATE Postcode (e.g. "Parramatta, NSW 2150").
 */

export type PlaceInput = {
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
};

/** Australian state/territory codes to display in uppercase. */
const STATE_CODES = new Set([
  "ACT",
  "NSW",
  "NT",
  "QLD",
  "SA",
  "TAS",
  "VIC",
  "WA",
]);

function normalizeState(state: string | null | undefined): string {
  if (!state || !state.trim()) return "";
  const s = state.trim().toUpperCase();
  return STATE_CODES.has(s) ? s : state.trim();
}

/**
 * Format place for display (provider or participant).
 * - "Remote" suburb → "Telehealth (Australia-wide)"
 * - Otherwise: "Suburb, STATE Postcode" (Australian style).
 */
export function formatPlace(place: PlaceInput): string | null {
  const suburb = place.suburb?.trim() ?? "";
  const state = place.state?.trim() ?? "";
  const postcode = place.postcode?.trim() ?? "";

  if (suburb === "Remote") {
    return "Telehealth (Australia-wide)";
  }

  const parts: string[] = [];
  if (suburb) parts.push(suburb);
  const stateNorm = normalizeState(state);
  if (stateNorm || postcode) {
    parts.push([stateNorm, postcode].filter(Boolean).join(" "));
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

/** Label for the place section in profile UIs (place-based provider/participant). */
export const PLACE_LABEL = "Place";
