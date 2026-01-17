/**
 * Service Information Route
 * Get detailed information about a specific service
 */

import { NextRequest, NextResponse } from "next/server";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";

/**
 * GET /api/auth/services/[serviceId]/info
 * Get service information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { serviceId: string } }
) {
  try {
    const serviceId = params.serviceId as ServiceId;
    const service = serviceRegistry.get(serviceId);

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: service.id,
      name: service.name,
      domain: service.domain,
      callbackUrl: service.callbackUrl,
      allowedScopes: service.allowedScopes,
      tokenExpiration: service.tokenExpiration,
      requiresEmailVerification: service.requiresEmailVerification,
      enabled: service.enabled,
      authUrl: `/api/auth/service/${serviceId}/login`,
      providersUrl: `/api/auth/service/${serviceId}/providers`,
    });
  } catch (error) {
    logger.error("Service info error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
