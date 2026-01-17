/**
 * Token Exchange Route
 * Exchange different token types
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractTokenFromHeader } from "@/lib/auth/jwt-service";
import { issueToken } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/token/exchange
 * Exchange token type or format
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      token,
      targetServiceId,
      targetFormat,
      scopes,
    }: {
      token?: string;
      targetServiceId?: ServiceId;
      targetFormat?: "jwt" | "opaque";
      scopes?: string[];
    } = body;

    // Get token from body or header
    let sourceToken = token;
    if (!sourceToken) {
      const authHeader = request.headers.get("authorization");
      sourceToken = extractTokenFromHeader(authHeader);
    }

    if (!sourceToken) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Verify source token
    const { verifyToken } = await import("@/lib/auth/jwt-service");
    const payload = verifyToken(sourceToken);
    const userId = payload.sub;

    // If exchanging for different service
    if (targetServiceId) {
      const service = serviceRegistry.get(targetServiceId);
      if (!service || !service.enabled) {
        return NextResponse.json(
          { error: "Target service not found or disabled" },
          { status: 400 }
        );
      }

      // Issue new token for target service
      const tokenResult = await issueToken({
        userId,
        serviceId: targetServiceId,
        scopes: scopes || service.allowedScopes,
      });

      if (!tokenResult.success) {
        return NextResponse.json(
          { error: tokenResult.error || "Token exchange failed" },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken,
        expiresIn: tokenResult.expiresIn,
        serviceId: targetServiceId,
      });
    }

    // If just converting format (for now, only JWT is supported)
    if (targetFormat && targetFormat !== "jwt") {
      return NextResponse.json(
        { error: "Only JWT format is currently supported" },
        { status: 400 }
      );
    }

    // Return same token (no conversion needed for JWT)
    return NextResponse.json({
      success: true,
      token: sourceToken,
      format: "jwt",
    });
  } catch (error) {
    logger.error("Token exchange error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Token exchange failed" },
      { status: 500 }
    );
  }
}
