/**
 * JOSE Data Exchange Endpoint
 * Orchestrates JWT/JOSE data exchange between services
 */

import { NextRequest, NextResponse } from "next/server";
import { orchestrateDataExchange } from "@/lib/services/auth/data-exchange-orchestrator";
import { serviceRegistry, ServiceId } from "@/lib/services/auth/service-registry";
import { authenticate } from "@/lib/auth/middleware";
import { logger } from "@/lib/logger";

/**
 * POST /api/jose/exchange
 * Exchange data between services using JWT/JOSE
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate requesting service
    const authResult = authenticate(request, { required: true });
    if (authResult.error) {
      return authResult.error;
    }

    const user = authResult.user;
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      fromService,
      toService,
      data,
      options,
    }: {
      fromService: ServiceId;
      toService: ServiceId;
      data: Record<string, any>;
      options?: {
        sign?: boolean;
        encrypt?: boolean;
        algorithm?: string;
        encryptionAlgorithm?: string;
        keyId?: string;
      };
    } = body;

    // Validate services
    if (!fromService || !toService) {
      return NextResponse.json(
        { error: "fromService and toService are required" },
        { status: 400 }
      );
    }

    const fromServiceConfig = serviceRegistry.get(fromService);
    const toServiceConfig = serviceRegistry.get(toService);

    if (!fromServiceConfig || !toServiceConfig) {
      return NextResponse.json(
        { error: "Invalid service specified" },
        { status: 400 }
      );
    }

    // Validate user has access to fromService
    if (!user.serviceAccess?.includes(fromService)) {
      return NextResponse.json(
        { error: "User does not have access to fromService" },
        { status: 403 }
      );
    }

    // Orchestrate data exchange
    const result = await orchestrateDataExchange({
      fromService,
      toService,
      data,
      options,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Data exchange failed" },
        { status: 400 }
      );
    }

    logger.info("Data exchange completed", {
      fromService,
      toService,
      format: result.format,
      keyId: result.keyId,
    });

    return NextResponse.json({
      success: true,
      token: result.token,
      format: result.format,
      keyId: result.keyId,
      expiresIn: 3600, // 1 hour
    });
  } catch (error) {
    logger.error("JOSE exchange endpoint error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
