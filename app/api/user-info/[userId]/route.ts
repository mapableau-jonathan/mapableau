/**
 * User Information API Endpoint
 * Serves user data to MediaWiki and Cursor/Replit applications
 */

import { NextRequest, NextResponse } from "next/server";
import { userInfoService } from "@/lib/services/auth/user-info-service";
import { serviceRegistry, type ServiceId } from "@/lib/services/auth/service-registry";
import { logger } from "@/lib/logger";
import { extractTokenFromHeader } from "@/lib/auth/jwt-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    // Get serviceId from query params or header
    const serviceId = (request.nextUrl.searchParams.get("serviceId") ||
      request.headers.get("x-service-id")) as ServiceId;

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

    // Get fields and format from query params
    const fieldsParam = request.nextUrl.searchParams.get("fields");
    const fields = fieldsParam ? fieldsParam.split(",") : undefined;
    const format = (request.nextUrl.searchParams.get("format") || "json") as "json" | "mediawiki";

    // Get auth token
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    // Get user info
    const result = await userInfoService.getUserInfo(
      {
        userId,
        serviceId,
        fields,
        format,
      },
      token || undefined
    );

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: "error" in result && result.error.includes("not found") ? 404 : 401 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logger.error("User info endpoint error", error);
    return NextResponse.json(
      { error: "Failed to get user information" },
      { status: 500 }
    );
  }
}
