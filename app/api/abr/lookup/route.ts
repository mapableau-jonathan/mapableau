import { NextResponse } from "next/server";

import { lookupAbn } from "@/lib/abr";

/**
 * GET /api/abr/lookup?abn=...
 * Calls ABR Lookup API (requires ABR_GUID in env).
 * Returns { success, abn?, entityName?, state?, postcode?, isActive? } or { success: false, message }.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const abn = searchParams.get("abn")?.trim();
  if (!abn) {
    return NextResponse.json(
      { success: false, message: "Missing abn query parameter." },
      { status: 400 },
    );
  }
  const guid = process.env.ABR_GUID ?? "";
  try {
    const result = await lookupAbn(abn, guid);
    if (result.success) {
      return NextResponse.json(result);
    }
    return NextResponse.json(result, { status: 400 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "ABR lookup failed.";
    return NextResponse.json(
      { success: false, message },
      { status: 502 },
    );
  }
}
