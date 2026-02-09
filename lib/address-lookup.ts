/**
 * Address lookup by Google (Places API) or Amazon (Location Service).
 * Used for autocomplete and resolving suburb / state / postcode.
 * Set GOOGLE_MAPS_API_KEY for Google; AWS credentials + AMAZON_PLACE_INDEX for Amazon.
 */

import { parseResponseJson } from "@/lib/utils";

export type AddressSuggestion = {
  description: string;
  placeId?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  lat?: number;
  lng?: number;
};

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_PLACES_API_KEY ?? "";

/** Check if Google Places is configured. */
export function isGoogleAddressLookupConfigured(): boolean {
  return GOOGLE_KEY.length > 0;
}

/** Check if Amazon Location is configured (place index name must be set). */
export function isAmazonAddressLookupConfigured(): boolean {
  return !!(
    process.env.AWS_REGION &&
    process.env.AMAZON_PLACE_INDEX_NAME
  );
}

/**
 * Fetch address suggestions from Google Places Autocomplete (New).
 * Restricts to Australia when includedRegionCodes is used.
 */
async function googleSuggest(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_KEY,
    },
    body: JSON.stringify({
      input: trimmed,
      includedRegionCodes: ["au"],
      languageCode: "en",
    }),
  });

  if (!res.ok) return [];

  const data = await parseResponseJson<{
    suggestions?: Array<{
      placePrediction?: {
        placeId?: string;
        text?: { text?: string };
        structuredFormat?: {
          mainText?: { text?: string };
          secondaryText?: { text?: string };
        };
      };
    }>;
  }>(res);

  if (!data?.suggestions?.length) return [];

  return data.suggestions
    .filter((s): s is { placePrediction: NonNullable<typeof s.placePrediction> } => !!s.placePrediction)
    .map((s) => {
      const p = s.placePrediction;
      const description =
        p.structuredFormat?.secondaryText?.text ??
        p.text?.text ??
        "";
      return {
        description: description || p.text?.text ?? "",
        placeId: p.placeId,
      };
    })
    .filter((s) => s.description);
}

/**
 * Get address components (suburb, state, postcode) from Google Place Details.
 */
async function googlePlaceDetails(placeId: string): Promise<Omit<AddressSuggestion, "description"> | null> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?fields=addressComponents,location`,
    {
      headers: { "X-Goog-Api-Key": GOOGLE_KEY },
    }
  );

  if (!res.ok) return null;

  const data = await parseResponseJson<{
    addressComponents?: Array<{
      types?: string[];
      longText?: string;
      shortText?: string;
    }>;
    location?: { latitude?: number; longitude?: number };
  }>(res);

  if (!data?.addressComponents) return null;

  let suburb = "";
  let state = "";
  let postcode = "";

  for (const c of data.addressComponents) {
    const types = c.types ?? [];
    const value = c.longText ?? c.shortText ?? "";
    if (types.includes("postal_code")) postcode = value;
    if (types.includes("administrative_area_level_1")) state = c.shortText ?? value;
    if (types.includes("locality") || types.includes("sublocality")) {
      if (!suburb) suburb = value;
    }
  }

  const lat = data.location?.latitude;
  const lng = data.location?.longitude;

  return {
    placeId,
    suburb: suburb || undefined,
    state: state || undefined,
    postcode: postcode || undefined,
    lat: lat != null ? Number(lat) : undefined,
    lng: lng != null ? Number(lng) : undefined,
  };
}

/**
 * Get address suggestions (Google or Amazon). Prefers Google if both are configured.
 * Amazon is handled in the API route (GET /api/address/lookup) via AWS SDK when configured.
 */
export async function suggestAddresses(query: string): Promise<AddressSuggestion[]> {
  if (isGoogleAddressLookupConfigured()) {
    return googleSuggest(query);
  }
  // Amazon: use API route /api/address/lookup which can call Amazon Location Service.
  return [];
}

/**
 * Get address details (suburb, state, postcode, lat/lng) for a place ID.
 * Only supported when Google is configured (Google Place Details).
 */
export async function getAddressDetails(placeId: string): Promise<AddressSuggestion | null> {
  if (!placeId) return null;
  if (isGoogleAddressLookupConfigured()) {
    const details = await googlePlaceDetails(placeId);
    if (!details) return null;
    return {
      description: [details.suburb, details.state, details.postcode].filter(Boolean).join(", ") || placeId,
      ...details,
    };
  }
  return null;
}
