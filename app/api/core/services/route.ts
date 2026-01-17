/**
 * MapAble Core - Service Links API
 * GET /api/core/services - Get user service links
 * POST /api/core/services - Link user to a service
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next/auth";
import { z } from "zod";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { serviceLinkService } from "@/lib/services/core";
import { ServiceType } from "@prisma/client";
import { logger } from "@/lib/logger";

const linkServiceSchema = z.object({
  serviceType: z.nativeEnum(ServiceType),
  preferences: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const serviceLinks = await serviceLinkService.getUserServiceLinks(
      session.user.id,
      activeOnly
    );

    return NextResponse.json({ serviceLinks });
  } catch (error) {
    logger.error("Failed to get service links", error);
    return NextResponse.json(
      { error: "Failed to get service links" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = linkServiceSchema.parse(body);

    const serviceLink = await serviceLinkService.linkService({
      userId: session.user.id,
      serviceType: data.serviceType,
      preferences: data.preferences,
    });

    return NextResponse.json({ serviceLink }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    logger.error("Failed to link service", error);
    return NextResponse.json(
      { error: "Failed to link service" },
      { status: 500 }
    );
  }
}
