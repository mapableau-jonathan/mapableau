/**
 * Token Issuance Endpoint
 * Issues JWT tokens for services
 */

import { NextRequest, NextResponse } from "next/server";
import { issueToken, TokenIssuanceRequest } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";
import { authenticate } from "@/lib/auth/middleware";

/**
 * POST /api/tokens/issue
 * Issue token for service
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate service (using service credentials or service token)
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, serviceId, scopes, expiresIn, clientId, clientSecret } = body;

    if (!userId || !serviceId) {
      return NextResponse.json(
        { error: "userId and serviceId are required" },
        { status: 400 }
      );
    }

    // Validate service credentials if provided
    if (clientId && clientSecret) {
      if (!serviceRegistry.validateCredentials(serviceId, clientId, clientSecret)) {
        return NextResponse.json(
          { error: "Invalid service credentials" },
          { status: 401 }
        );
      }
    }

    // Issue token
    const result = await issueToken({
      userId,
      serviceId,
      scopes: scopes || [],
      expiresIn,
      clientId,
      clientSecret,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Token issuance failed" },
        { status: 400 }
      );
    }

    // Log token issuance
    logger.info("Token issued via API", {
      userId,
      serviceId,
      tokenId: result.tokenId,
    });

    return NextResponse.json({
      success: true,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
      tokenId: result.tokenId,
    });
  } catch (error) {
    logger.error("Token issuance endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
