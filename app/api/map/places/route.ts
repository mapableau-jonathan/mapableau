/**
 * GET /api/map/places
 * Returns organic + sponsored places for map viewport with PRD ranking.
 */

import { NextRequest, NextResponse } from "next/server";
import { RankingService } from "@/lib/services/sponsored-markers/ranking-service";
import type { BusinessCategory } from "@prisma/client";
import { logger } from "@/lib/logger";

const businessCategories: BusinessCategory[] = [
  "RESTAURANT",
  "RETAIL",
  "HEALTHCARE",
  "TRANSPORT",
  "ACCOMMODATION",
  "ENTERTAINMENT",
  "SERVICES",
  "ACCESSIBLE_VENUE",
  "NDIS_PROVIDER",
  "OTHER",
];

function parseCategory(value: string | null): BusinessCategory | undefined {
  if (!value) return undefined;
  const u = value.toUpperCase().replace(/-/g, "_");
  return businessCategories.includes(u as BusinessCategory)
    ? (u as BusinessCategory)
    : undefined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = searchParams.get("radius");
    const minLat = searchParams.get("minLat");
    const maxLat = searchParams.get("maxLat");
    const minLng = searchParams.get("minLng");
    const maxLng = searchParams.get("maxLng");
    const category = parseCategory(searchParams.get("category"));
    const accessibilityStr = searchParams.get("accessibility");
    const hideSponsored = searchParams.get("hideSponsored") === "true";
    const limitParam = searchParams.get("limit");

    const accessibilityFilters = accessibilityStr
      ? accessibilityStr.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    if (limit !== undefined && (Number.isNaN(limit) || limit < 1 || limit > 100)) {
      return NextResponse.json(
        { error: "Invalid limit; use 1-100" },
        { status: 400 }
      );
    }

    let context: Parameters<RankingService["getPlaces"]>[0];
    if (minLat != null && maxLat != null && minLng != null && maxLng != null) {
      const minLatN = parseFloat(minLat);
      const maxLatN = parseFloat(maxLat);
      const minLngN = parseFloat(minLng);
      const maxLngN = parseFloat(maxLng);
      if (
        Number.isNaN(minLatN) ||
        Number.isNaN(maxLatN) ||
        Number.isNaN(minLngN) ||
        Number.isNaN(maxLngN)
      ) {
        return NextResponse.json(
          { error: "Invalid bounds (minLat, maxLat, minLng, maxLng)" },
          { status: 400 }
        );
      }
      context = {
        bounds: { minLat: minLatN, maxLat: maxLatN, minLng: minLngN, maxLng: maxLngN },
        category,
        accessibilityFilters,
        hideSponsored,
        limit,
      };
    } else if (lat != null && lng != null) {
      const latN = parseFloat(lat);
      const lngN = parseFloat(lng);
      if (Number.isNaN(latN) || Number.isNaN(lngN)) {
        return NextResponse.json(
          { error: "Invalid center (lat, lng)" },
          { status: 400 }
        );
      }
      const radiusMeters = radius ? parseInt(radius, 10) : 5000;
      context = {
        center: { lat: latN, lng: lngN, radiusMeters: Number.isNaN(radiusMeters) ? 5000 : radiusMeters },
        category,
        accessibilityFilters,
        hideSponsored,
        limit,
      };
    } else {
      return NextResponse.json(
        { error: "Provide either center (lat, lng) or bounds (minLat, maxLat, minLng, maxLng)" },
        { status: 400 }
      );
    }

    const rankingService = new RankingService();
    const places = await rankingService.getPlaces(context);

    return NextResponse.json({
      places: places.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        latitude: p.latitude,
        longitude: p.longitude,
        address: p.address,
        city: p.city,
        state: p.state,
        postcode: p.postcode,
        accessibility: p.accessibility,
        amenities: p.amenities,
        acceptsNDIS: p.acceptsNDIS,
        verified: p.verified,
        logoUrl: p.logoUrl,
        qualityScore: p.qualityScore,
        isSponsored: p.isSponsored,
        verificationTier: p.verificationTier,
        sponsorshipTier: p.sponsorshipTier,
        disclosureText: p.disclosureText,
        evidenceRefs: p.evidenceRefs,
        verifiedAt: p.verifiedAt?.toISOString() ?? null,
      })),
    });
  } catch (error: unknown) {
    logger.error("Error fetching map places", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch places" },
      { status: 500 }
    );
  }
}
