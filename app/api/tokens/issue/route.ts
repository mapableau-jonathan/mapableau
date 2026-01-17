/**
 * Token Issuance Endpoint
 * Issues JWT tokens for services
 */

import { NextRequest, NextResponse } from "next/server";
import { issueToken, TokenIssuanceRequest } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * POST /api/tokens/issue
 * Issue token for service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, serviceId, scopes, expiresIn, clientId, clientSecret } = body;

    // Validate required fields
    if (!userId || !serviceId) {
      return NextResponse.json(
        { error: "userId and serviceId are required" },
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

    // Authenticate service (using service credentials if provided)
    if (clientId && clientSecret) {
      if (!serviceRegistry.validateCredentials(serviceId as ServiceId, clientId, clientSecret)) {
        return NextResponse.json(
          { error: "Invalid service credentials" },
          { status: 401 }
        );
      }
    }

    // Issue token
    const result = await issueToken({
      userId,
      serviceId: serviceId as ServiceId,
      scopes: Array.isArray(scopes) ? scopes : [],
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
      { error: error instanceof Error ? error.message : "Token issuance failed" },
      { status: 500 }
    );
  }
}
