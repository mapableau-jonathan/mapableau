/**
 * Token Revocation Endpoint
 * Revokes JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { revokeToken } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth/jwt-service";

/**
 * POST /api/tokens/revoke
 * Revoke token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenId, serviceId } = body;

    // Validate required fields
    if (!tokenId || !serviceId) {
      return NextResponse.json(
        { error: "tokenId and serviceId are required" },
        { status: 400 }
      );
    }

    // Validate service
    if (!serviceRegistry.isEnabled(serviceId as ServiceId)) {
      return NextResponse.json(
        { error: "Service not found or disabled" },
        { status: 400 }
      );
    }

    // Try to get user ID from token if provided
    let userId: string | undefined;
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      const token = extractTokenFromHeader(authHeader);
      if (token) {
        try {
          const payload = verifyToken(token);
          userId = payload.sub;
        } catch {
          // Token invalid, but we can still revoke by tokenId
        }
      }
    }

    // Revoke via service
    const result = await revokeToken(tokenId, serviceId as ServiceId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Token revocation failed" },
        { status: 400 }
      );
    }

    logger.info("Token revoked via API", { tokenId, serviceId, userId });

    return NextResponse.json({
      success: true,
      message: "Token revoked successfully",
    });
  } catch (error) {
    logger.error("Token revocation endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token revocation failed" },
      { status: 500 }
    );
  }
}
