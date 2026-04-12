import { NextRequest, NextResponse } from "next/server";

import { getBoundingBox } from "@/app/utils/getBoundingBox";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const lat = parseFloat(searchParams.get("lat") || "");
    const lon = parseFloat(searchParams.get("lon") || "");
    const radius = parseFloat(searchParams.get("radius") || "5");

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: "Invalid latitude or longitude" },
        { status: 400 },
      );
    }

    const { minLat, maxLat, minLon, maxLon } = getBoundingBox(lat, lon, radius);

    // Bounding-box-only query
    const addressesWithProviders = await prisma.address.findMany({
      include: {
        providers: true,
        providerOutlets: true,
      },
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
      take: 100, // limit results for performance
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log("addressesWithProviders", addressesWithProviders);
    // console.log(
    //   "providers",
    //   addressesWithProviders.map((a) => a.providers),
    // );
    // console.log(
    //   "providerOutlets",
    //   addressesWithProviders.map((a) => a.providerOutlets),
    // );

    return NextResponse.json(addressesWithProviders);
  } catch (err: any) {
    console.error("Nearby search error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
