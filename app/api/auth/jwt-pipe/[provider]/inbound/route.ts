/**
 * JWT Pipe Inbound Route
 * Validates JWTs from MediaWiki/Wix and authenticates users
 */

import { NextRequest, NextResponse } from "next/server";
import { validateInboundJWT } from "@/lib/services/auth/jwt-pipe-service";
import { logger } from "@/lib/logger";
import { ServiceId } from "@/lib/services/auth/service-registry";

/**
 * POST /api/auth/jwt-pipe/{provider}/inbound
 * Validate JWT from MediaWiki/Wix and authenticate user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider as "mediawiki" | "wix";
    if (provider !== "mediawiki" && provider !== "wix") {
      return NextResponse.json(
        { error: `Unsupported provider: ${provider}. Supported: mediawiki, wix` },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const token = body.token || body.jwt;

    if (!token) {
      return NextResponse.json(
        { error: "JWT token is required" },
        { status: 400 }
      );
    }

    const serviceId = (body.serviceId || "mapable") as ServiceId;

    // Validate inbound JWT
    const result = await validateInboundJWT({
      token,
      provider,
      serviceId,
    });

    if (!result.success) {
      logger.error("Inbound JWT validation failed", { provider, error: result.error });
      return NextResponse.json(
        { error: result.error || "JWT validation failed" },
        { status: 401 }
      );
    }

    // Build callback URL with token
    const callbackUrl = new URL(body.callbackUrl || "/dashboard", request.url);
    if (result.tokens?.accessToken) {
      callbackUrl.searchParams.set("token", result.tokens.accessToken);
      callbackUrl.searchParams.set("serviceId", serviceId);
    }

    // Set cookies for token storage
    const response = NextResponse.json({
      success: true,
      userId: result.userId,
      profile: result.profile,
      callbackUrl: callbackUrl.toString(),
    });

    if (result.tokens?.accessToken) {
      response.cookies.set("access_token", result.tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: result.tokens.expiresIn || 3600,
        path: "/",
      });
    }

    if (result.tokens?.refreshToken) {
      response.cookies.set("refresh_token", result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: "/",
      });
    }

    logger.info("Inbound JWT validated and processed", {
      provider,
      userId: result.userId,
      email: result.profile?.email,
    });

    return response;
  } catch (error) {
    logger.error("JWT pipe inbound error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "JWT validation failed" },
      { status: 500 }
    );
  }
}
