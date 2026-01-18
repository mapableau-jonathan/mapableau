/**
 * JOSE Data Validation Endpoint
 * Validates and decodes JWT/JOSE tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { validateDataExchange } from "@/lib/services/auth/data-exchange-orchestrator";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * POST /api/jose/validate
 * Validate JWT/JOSE token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, toService, format } = body;

    if (!token || !toService) {
      return NextResponse.json(
        { error: "token and toService are required" },
        { status: 400 }
      );
    }

    // Validate service
    const service = serviceRegistry.get(toService as ServiceId);
    if (!service) {
      return NextResponse.json(
        { error: "Invalid service" },
        { status: 400 }
      );
    }

    // Validate data exchange
    const result = await validateDataExchange(
      token,
      toService as ServiceId,
      format
    );

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error || "Validation failed" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      data: result.data,
      fromService: result.fromService,
      toService: result.toService,
    });
  } catch (error) {
    logger.error("JOSE validation endpoint error", error);
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}
