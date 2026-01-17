/**
 * Batch User Information API Endpoint
 * Provides user information for multiple users
 */

import { NextRequest, NextResponse } from "next/server";
import { getBatchUserInfo } from "@/lib/services/auth/user-info-service";
import { validateToken } from "@/lib/services/auth/token-issuance-service";
import { extractTokenFromHeader } from "@/lib/auth/jwt-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * POST /api/user-info/batch
 * Get batch user information
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userIds, fields } = body;

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      );
    }

    // Authenticate request
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    // Extract service ID
    const { verifyToken } = await import("@/lib/auth/jwt-service");
    let serviceId: ServiceId | null = null;

    try {
      const payload = verifyToken(token);
      serviceId = payload.serviceAccess?.[0] as ServiceId || null;
    } catch {
      serviceId = body.serviceId as ServiceId | null;
    }

    if (!serviceId) {
      return NextResponse.json(
        { error: "Service ID required" },
        { status: 400 }
      );
    }

    // Validate service
    if (!serviceRegistry.isEnabled(serviceId)) {
      return NextResponse.json(
        { error: "Service not found or disabled" },
        { status: 400 }
      );
    }

    // Validate token
    const tokenValidation = await validateToken(token, serviceId);
    if (!tokenValidation.valid) {
      return NextResponse.json(
        { error: tokenValidation.error || "Invalid token" },
        { status: 401 }
      );
    }

    // Get batch user info
    const userInfoList = await getBatchUserInfo(userIds, serviceId, fields);

    // Log access
    logger.info("Batch user info accessed", {
      userIds: userIds.length,
      serviceId,
      fields: fields?.join(","),
    });

    return NextResponse.json({
      users: userInfoList,
      count: userInfoList.length,
    });
  } catch (error) {
    logger.error("Batch user info endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
