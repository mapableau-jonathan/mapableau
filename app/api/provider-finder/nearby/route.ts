import { NextRequest, NextResponse } from "next/server";

import { getBoundingBox } from "@/app/utils/getBoundingBox";
import { distanceKm } from "@/lib/geo";
import { prisma, type Prisma } from "@/lib/prisma";

import { providerOutletFinderInclude } from "./prisma-types";

// todo: review this file

const MAX_LIMIT = 100;

export type NearbyProviderResult = {
  address: Prisma.AddressGetPayload<{
    include: typeof providerOutletFinderInclude;
  }>;
  distanceKm: number;
};

export type NearbyProviderResponse = NearbyProviderResult[] | { error: string };

export async function GET(
  req: NextRequest,
): Promise<NextResponse<NearbyProviderResult[] | { error: string }>> {
  try {
    // todo: limit radius
    const { searchParams } = new URL(req.url);

    const lat = parseFloat(searchParams.get("lat") || "");
    const lon = parseFloat(searchParams.get("lng") || "");
    const radius = parseFloat(searchParams.get("radius") || "5");

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json(
        { error: "Valid lat and lng query parameters are required." },
        { status: 400 },
      );
    }

    const { minLat, maxLat, minLon, maxLon } = getBoundingBox(lat, lon, radius);

    const addressesWithProviders = await prisma.address.findMany({
      include: providerOutletFinderInclude,
      where: {
        latitude: {
          gte: minLat,
          lte: maxLat,
        },
        longitude: {
          gte: minLon,
          lte: maxLon,
        },
      },
      take: MAX_LIMIT,
    });

    const addressesWithProvidersAndDistance = addressesWithProviders
      .map((a) => ({
        address: a,
        distanceKm: distanceKm(lat, lon, a.latitude!, a.longitude!),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return NextResponse.json(addressesWithProvidersAndDistance);
  } catch (err) {
    console.error("provider-finder nearby:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
