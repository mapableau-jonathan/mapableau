/**
 * Token Issuance Endpoint
 * Issues JWT tokens for services
 */

import { NextRequest, NextResponse } from "next/server";
import { tokenIssuanceService } from "@/lib/services/auth/token-issuance-service";
import { serviceRegistry, type ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { userId, serviceId, scopes, expiresIn } = body;

    // Validate required fields
    if (!userId || !serviceId) {
      return NextResponse.json(
        { error: "userId and serviceId are required" },
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

    // Authenticate service (check Authorization header)
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization required" },
        { status: 401 }
      );
    }

    // Extract service credentials from header
    // Format: "Service <serviceId>:<clientSecret>"
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

    // Issue token
    const result = await tokenIssuanceService.issueToken({
      userId,
      serviceId,
      scopes: scopes || serviceRegistry.getAllowedScopes(serviceId),
      expiresIn,
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Token issuance endpoint error", error);
    return NextResponse.json(
      { error: "Failed to issue token" },
      { status: 500 }
    );
  }
}
