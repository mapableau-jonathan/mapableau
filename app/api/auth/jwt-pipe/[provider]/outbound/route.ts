/**
 * JWT Pipe Outbound Route
 * Issues JWTs for MediaWiki/Wix to validate
 */

import { NextRequest, NextResponse } from "next/server";
import { issueOutboundJWT } from "@/lib/services/auth/jwt-pipe-service";
import { logger } from "@/lib/logger";
import { requireAuth } from "@/lib/security/authorization-utils";
import { ServiceId } from "@/lib/services/auth/service-registry";

/**
 * POST /api/auth/jwt-pipe/{provider}/outbound
 * Issue JWT token for MediaWiki/Wix
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    const provider = params.provider as "mediawiki" | "wix";
    if (provider !== "mediawiki" && provider !== "wix") {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}. Supported: mediawiki, wix` },
        { status: 400 }
      );
    }

    // Parse request body for additional claims
    let additionalClaims: Record<string, any> = {};
    try {
      const body = await request.json();
      if (body.additionalClaims) {
        additionalClaims = body.additionalClaims;
      }
      if (body.serviceId) {
        additionalClaims.serviceId = body.serviceId;
      }
    } catch {
      // Body is optional
    }

    // Issue outbound JWT
    const result = await issueOutboundJWT({
      userId: user.id,
      provider,
      serviceId: additionalClaims.serviceId as ServiceId | undefined,
      additionalClaims,
    });

    if (!result.success) {
      logger.error("Outbound JWT issuance failed", { provider, userId: user.id, error: result.error });
      return NextResponse.json(
        { error: result.error || "Failed to issue JWT" },
        { status: 500 }
      );
    }

    logger.info("Outbound JWT issued", {
      provider,
      userId: user.id,
      expiresIn: result.expiresIn,
    });

    return NextResponse.json({
      token: result.token,
      expiresIn: result.expiresIn,
      provider,
    });
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    logger.error("JWT pipe outbound error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "JWT issuance failed" },
      { status: 500 }
    );
  }
}
