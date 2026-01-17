/**
 * Token Revocation Endpoint
 * Revokes JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { revokeToken } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * POST /api/tokens/revoke
 * Revoke token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenId, serviceId } = body;

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

    // Revoke token
    const result = await revokeToken(tokenId, serviceId as ServiceId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Token revocation failed" },
        { status: 400 }
      );
    }

    logger.info("Token revoked via API", { tokenId, serviceId });

    return NextResponse.json({
      success: true,
      message: "Token revoked successfully",
    });
  } catch (error) {
    logger.error("Token revocation endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
