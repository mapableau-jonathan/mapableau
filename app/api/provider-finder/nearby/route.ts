import { NextRequest, NextResponse } from "next/server";

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
    const { searchParams } = new URL(req.url);

    // todo: should center be based on user location?
    const minLat = parseFloat(searchParams.get("minLat") || "");
    const maxLat = parseFloat(searchParams.get("maxLat") || "");
    const minLon = parseFloat(searchParams.get("minLon") || "");
    const maxLon = parseFloat(searchParams.get("maxLon") || "");

    if (isNaN(minLat) || isNaN(maxLat) || isNaN(minLon) || isNaN(maxLon)) {
      return NextResponse.json(
        { error: "Invalid minLat, maxLat, minLon, maxLon" },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(minLat) ||
      !Number.isFinite(maxLat) ||
      !Number.isFinite(minLon) ||
      !Number.isFinite(maxLon)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid minLat, maxLat, minLon, maxLon query parameters are required.",
        },
        { status: 400 },
      );
    }

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

    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    const addressesWithProvidersAndDistance = addressesWithProviders
      .map((a) => ({
        address: a,
        distanceKm: distanceKm(centerLat, centerLon, a.latitude!, a.longitude!),
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
