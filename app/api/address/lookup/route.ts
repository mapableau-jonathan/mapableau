import { NextResponse } from "next/server";

import { suggestAddresses } from "@/lib/address-lookup";

/**
 * GET /api/address/lookup?q=...
 * Returns address suggestions (Google Places or Amazon Location when configured).
 * Response: { suggestions: AddressSuggestion[] }
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  try {
    const suggestions = await suggestAddresses(q);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Address lookup failed.";
    return NextResponse.json(
      { suggestions: [], error: message },
      { status: 502 },
    );
  }
}
