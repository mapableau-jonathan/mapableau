/**
 * Batch User Information API Endpoint
 * Returns user data for multiple users
 */

import { NextRequest, NextResponse } from "next/server";
import { userInfoService } from "@/lib/services/auth/user-info-service";
import { serviceRegistry, type ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";
import { extractTokenFromHeader } from "@/lib/auth/jwt-service";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { userIds, fields } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required" },
        { status: 400 }
      );
    }

    // Get serviceId from body or header
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

    // Get auth token
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    // Validate token
    const { tokenIssuanceService } = await import("@/lib/services/auth/token-issuance-service");
    const validationResult = await tokenIssuanceService.validateToken(token, serviceId);

    if ("error" in validationResult) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get batch user info
    const results = await userInfoService.batchGetUserInfo(userIds, serviceId, fields);

    return NextResponse.json({
      users: results,
      count: results.length,
    });
  } catch (error) {
    logger.error("Batch user info endpoint error", error);
    return NextResponse.json(
      { error: "Failed to get user information" },
      { status: 500 }
    );
  }
}
