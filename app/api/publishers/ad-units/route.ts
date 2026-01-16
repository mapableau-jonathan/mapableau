/**
 * Ad Unit Management API
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/security/authorization-utils";
import { z } from "zod";
import { logger } from "@/lib/logger";

const createAdUnitSchema = z.object({
  name: z.string().min(1),
  format: z.enum(["BANNER", "SPONSORED_MARKER", "POPUP", "SIDEBAR", "SEARCH_RESULT"]),
  size: z.string(), // e.g., "300x250", "728x90"
  location: z.record(z.any()).optional(),
  targetingRules: z.record(z.any()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();

    const publisher = await prisma.publisher.findUnique({
      where: { userId: user.id },
    });

    if (!publisher) {
      return NextResponse.json(
        { error: "Publisher account not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const data = createAdUnitSchema.parse(body);

    // Generate unique ad unit code
    const code = `ad_${publisher.id.substring(0, 8)}_${Date.now().toString(36)}`;

    const adUnit = await prisma.adUnit.create({
      data: {
        publisherId: publisher.id,
        name: data.name,
        code,
        format: data.format,
        size: data.size,
        location: data.location,
        targetingRules: data.targetingRules,
        status: "ACTIVE",
      },
    });

    return NextResponse.json(adUnit, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Error creating ad unit", error);
    return NextResponse.json(
      { error: error.message || "Failed to create ad unit" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();

    const publisher = await prisma.publisher.findUnique({
      where: { userId: user.id },
    });

    if (!publisher) {
      return NextResponse.json(
        { error: "Publisher account not found" },
        { status: 404 }
      );
    }

    const adUnits = await prisma.adUnit.findMany({
      where: { publisherId: publisher.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ adUnits });
  } catch (error: any) {
    logger.error("Error fetching ad units", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch ad units" },
      { status: 500 }
    );
  }
}
