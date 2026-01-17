/**
 * Service-Specific Logout Route
 * Logs out user from specific service
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth/jwt-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/logout/service/[serviceId]
 * Logout from specific service
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { serviceId: string } }
) {
  try {
    const serviceId = params.serviceId as ServiceId;

    // Validate service
    const service = serviceRegistry.get(serviceId);
    if (!service || !service.enabled) {
      return NextResponse.json(
        { error: "Service not found or disabled" },
        { status: 404 }
      );
    }

    // Get user from token
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { verifyToken } = await import("@/lib/auth/jwt-service");
    const payload = verifyToken(token);
    const userId = payload.sub;

    // Revoke tokens for this service
    // In a full implementation, you would:
    // 1. Query database for tokens for this user-service pair
    // 2. Add them to revocation list

    logger.info("Service logout", { userId, serviceId });

    // Optionally deactivate service link
    await prisma.serviceLink.updateMany({
      where: {
        userId,
        serviceType: serviceId.toUpperCase() as any,
      },
      data: {
        isActive: false,
      },
    });

    const response = NextResponse.json({
      success: true,
      message: `Logged out from ${service.name}`,
    });

    // Clear cookies if this was the active service
    if (payload.serviceAccess?.includes(serviceId)) {
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
    }

    return response;
  } catch (error) {
    logger.error("Service logout error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Logout failed" },
      { status: 500 }
    );
  }
}
