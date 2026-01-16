/**
 * StreetView Metadata API
 * Get StreetView panorama information for a location
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isGoogleMapsAvailable, googleMapsConfig } from "@/lib/config/google-maps";

const streetViewSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radius: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    if (!isGoogleMapsAvailable()) {
      return NextResponse.json(
        { error: "Google Maps API not configured" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");
    const radius = searchParams.get("radius")
      ? parseFloat(searchParams.get("radius")!)
      : undefined;

    const data = streetViewSchema.parse({ lat, lng, radius });

    // In a real implementation, you would use Google Street View Static API
    // or the JavaScript API to check for panorama availability
    // For now, we return a basic response structure

    // Note: Actual StreetView API calls need to be done client-side
    // This endpoint can be used for server-side validation or metadata

    return NextResponse.json({
      available: true, // Would need actual API call to verify
      position: {
        lat: data.lat,
        lng: data.lng,
      },
      message:
        "StreetView availability check requires client-side Google Maps API",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to check StreetView availability" },
      { status: 500 }
    );
  }
}
