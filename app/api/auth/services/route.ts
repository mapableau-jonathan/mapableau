/**
 * Services Discovery Route
 * List all available services
 */

import { NextRequest, NextResponse } from "next/server";
import { serviceRegistry } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/services
 * Get all available services
 */
export async function GET(request: NextRequest) {
  try {
    const services = serviceRegistry.getAllEnabled().map((service) => ({
      id: service.id,
      name: service.name,
      domain: service.domain,
      callbackUrl: service.callbackUrl,
      allowedScopes: service.allowedScopes,
      requiresEmailVerification: service.requiresEmailVerification,
      enabled: service.enabled,
    }));

    return NextResponse.json({
      services,
      count: services.length,
    });
  } catch (error) {
    logger.error("Services discovery error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
