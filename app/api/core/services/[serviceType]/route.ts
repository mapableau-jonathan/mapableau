/**
 * MapAble Core - Service Links API
 * GET /api/core/services/[serviceType] - Get service link
 * DELETE /api/core/services/[serviceType] - Unlink service
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { serviceLinkService } from "@/lib/services/core";
import { ServiceType } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(
  request: NextRequest,
  { params }: { params: { serviceType: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceLink = await serviceLinkService.getServiceLink(
      session.user.id,
      params.serviceType as ServiceType
    );

    if (!serviceLink) {
      return NextResponse.json(
        { error: "Service link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ serviceLink });
  } catch (error) {
    logger.error("Failed to get service link", error);
    return NextResponse.json(
      { error: "Failed to get service link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { serviceType: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceLink = await serviceLinkService.unlinkService(
      session.user.id,
      params.serviceType as ServiceType
    );

    return NextResponse.json({ serviceLink });
  } catch (error) {
    logger.error("Failed to unlink service", error);
    return NextResponse.json(
      { error: "Failed to unlink service" },
      { status: 500 }
    );
  }
}
