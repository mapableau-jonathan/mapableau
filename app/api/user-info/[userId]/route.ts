/**
 * User Information API Endpoint
 * Provides user information to MediaWiki and Cursor/Replit applications
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/lib/services/auth/user-info-service";
import { validateToken } from "@/lib/services/auth/token-issuance-service";
import { extractTokenFromHeader } from "@/lib/auth/jwt-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * GET /api/user-info/[userId]
 * Get user information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;
    const fields = request.nextUrl.searchParams.get("fields")?.split(",");
    const format = (request.nextUrl.searchParams.get("format") || "json") as "json" | "mediawiki";

    // Authenticate request
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    // Extract service ID from token
    const { verifyToken } = await import("@/lib/auth/jwt-service");
    let serviceId: ServiceId | null = null;

    try {
      const payload = verifyToken(token);
      // Get service ID from token's serviceAccess or extract from token claims
      serviceId = payload.serviceAccess?.[0] as ServiceId || null;
    } catch {
      // Try to get service ID from query parameter as fallback
      serviceId = request.nextUrl.searchParams.get("serviceId") as ServiceId | null;
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

    // Validate token for service
    const tokenValidation = await validateToken(token, serviceId);
    if (!tokenValidation.valid) {
      return NextResponse.json(
        { error: tokenValidation.error || "Invalid token" },
        { status: 401 }
      );
    }

    // Get user info
    const userInfo = await getUserInfo(userId, serviceId, fields, format);

    if (!userInfo) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Log access
    logger.info("User info accessed", {
      userId,
      serviceId,
      format,
      fields: fields?.join(","),
    });

    return NextResponse.json(userInfo);
  } catch (error) {
    logger.error("User info endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
