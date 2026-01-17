/**
 * Token Validation Endpoint
 * Validates JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { tokenIssuanceService } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, type ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";
import { extractTokenFromHeader } from "@/lib/auth/jwt-service";

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: "Token required" },
        { status: 401 }
      );
    }

    // Get serviceId from request body or header
    const body = await request.json().catch(() => ({}));
    const serviceId = (body.serviceId || request.headers.get("x-service-id")) as ServiceId;

    if (!serviceId) {
      return NextResponse.json(
        { error: "serviceId is required" },
        { status: 400 }
      );
    }

    // Validate service
    if (!serviceRegistry.isServiceEnabled(serviceId)) {
      return NextResponse.json(
        { error: "Service not found or disabled" },
        { status: 400 }
      );
    }

    // Validate token
    const result = await tokenIssuanceService.validateToken(token, serviceId);

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      payload: result,
    });
  } catch (error) {
    logger.error("Token validation endpoint error", error);
    return NextResponse.json(
      { error: "Failed to validate token" },
      { status: 500 }
    );
  }
}
