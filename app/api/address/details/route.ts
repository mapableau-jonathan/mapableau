import { NextResponse } from "next/server";

import { getAddressDetails } from "@/lib/address-lookup";

/**
 * GET /api/address/details?placeId=...
 * Returns address details (suburb, state, postcode, lat/lng) for a Google place ID.
 * Response: AddressSuggestion | { error: string }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId")?.trim();
  if (!placeId) {
    return NextResponse.json(
      { error: "Missing placeId query parameter." },
      { status: 400 },
    );
  }
  try {
    const details = await getAddressDetails(placeId);
    if (!details) {
      return NextResponse.json(
        { error: "Address details not available." },
        { status: 404 },
      );
    }
    return NextResponse.json(details);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Address details failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
