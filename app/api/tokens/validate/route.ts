/**
 * Token Validation Endpoint
 * Validates JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { validateToken } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { extractTokenFromHeader } from "@/lib/auth/jwt-service";
import { logger } from "@/lib/logger";

/**
 * POST /api/tokens/validate
 * Validate token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, serviceId } = body;

    if (!token || !serviceId) {
      return NextResponse.json(
        { error: "token and serviceId are required" },
        { status: 400 }
      );
    }

    // Validate token
    const result = await validateToken(token, serviceId as ServiceId);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error || "Token validation failed" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      payload: result.payload,
    });
  } catch (error) {
    logger.error("Token validation endpoint error", error);
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tokens/validate
 * Validate token from Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);
    const serviceId = request.nextUrl.searchParams.get("serviceId") as ServiceId | null;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "Token is required" },
        { status: 400 }
      );
    }

    if (!serviceId) {
      return NextResponse.json(
        { valid: false, error: "serviceId query parameter is required" },
        { status: 400 }
      );
    }

    // Validate token
    const result = await validateToken(token, serviceId);

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error || "Token validation failed" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      payload: result.payload,
    });
  } catch (error) {
    logger.error("Token validation endpoint error", error);
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}
