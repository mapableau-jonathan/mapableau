/**
 * Token Revocation Endpoint
 * Revokes JWT tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { tokenIssuanceService } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, type ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
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
    if (!serviceRegistry.isServiceEnabled(serviceId)) {
      return NextResponse.json(
        { error: "Service not found or disabled" },
        { status: 400 }
      );
    }

    // Authenticate service
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    // Extract service credentials
    const parts = authHeader.replace("Service ", "").split(":");
    if (parts.length !== 2) {
      return NextResponse.json(
        { error: "Invalid authorization format" },
        { status: 401 }
      );
    }

    const [clientId, clientSecret] = parts;
    
    // Validate service credentials
    if (!serviceRegistry.validateServiceCredentials(serviceId, clientId, clientSecret)) {
      return NextResponse.json(
        { error: "Invalid service credentials" },
        { status: 401 }
      );
    }

    // Revoke token
    const success = await tokenIssuanceService.revokeToken(tokenId, serviceId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to revoke token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token revoked",
    });
  } catch (error) {
    logger.error("Token revocation endpoint error", error);
    return NextResponse.json(
      { error: "Failed to revoke token" },
      { status: 500 }
    );
  }
}
