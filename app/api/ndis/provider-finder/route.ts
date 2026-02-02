/**
 * NDIS Provider Finder
 * GET /api/ndis/provider-finder
 * Query ingested NDIS provider finder data.
 * Query params: name, postcode, state, suburb, limit, offset
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get("name")?.trim() || undefined;
    const postcode = searchParams.get("postcode")?.trim() || undefined;
    const state = searchParams.get("state")?.trim() || undefined;
    const suburb = searchParams.get("suburb")?.trim() || undefined;
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
      100
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const where: {
      name?: { contains: string; mode: "insensitive" };
      postcode?: string;
      state?: { equals: string; mode: "insensitive" };
      suburb?: { contains: string; mode: "insensitive" };
    } = {};

    if (name) where.name = { contains: name, mode: "insensitive" };
    if (postcode) where.postcode = postcode;
    if (state) where.state = { equals: state, mode: "insensitive" };
    if (suburb) where.suburb = { contains: suburb, mode: "insensitive" };

    const [providers, total] = await Promise.all([
      prisma.ndisFinderProvider.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
      }),
      prisma.ndisFinderProvider.count({ where }),
    ]);

    return NextResponse.json({
      providers,
      total,
      limit,
      offset,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Query failed",
      },
      { status: 500 }
    );
  }
}
