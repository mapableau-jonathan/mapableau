/**
 * Usage Tracking Middleware
 * Tracks API calls for billing purposes
 *
 * Uses getToken from next-auth/jwt (not getServerSession) so this module can run
 * in the Edge runtime without pulling in openid-client (which uses Node's util.inspect.custom).
 */

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { usageTracker } from "../services/usage/usage-tracker";
import { logger } from "../logger";

// Routes to exclude from usage tracking
const EXCLUDED_ROUTES = [
  "/api/admin/analytics",
  "/api/admin/billing",
  "/api/health",
  "/api/metrics",
  "/_next",
  "/favicon.ico",
];

/**
 * Check if route should be excluded from tracking
 */
function shouldExcludeRoute(pathname: string): boolean {
  return EXCLUDED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Usage tracking middleware
 * Tracks API calls for billing
 */
export async function trackUsage(
  request: NextRequest,
  response: NextResponse
): Promise<void> {
  // Check if tracking is enabled
  if (process.env.USAGE_TRACKING_ENABLED !== "true") {
    return;
  }

  const pathname = request.nextUrl.pathname;

  // Exclude certain routes
  if (shouldExcludeRoute(pathname)) {
    return;
  }

  // Only track API routes
  if (!pathname.startsWith("/api/")) {
    return;
  }

  try {
    // Get JWT payload (Edge-safe; does not pull in openid-client)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);

    const userId = token?.id ?? token?.sub;
    if (!userId) {
      return; // Don't track unauthenticated requests
    }

    const startTime = Date.now();
    const method = request.method;
    const endpoint = pathname;

    // Track after response (we'll need to hook into response)
    // For now, we'll track synchronously but this should be async
    response.headers.set("X-Usage-Tracked", "true");

    // Use setTimeout to track after response is sent (non-blocking)
    setTimeout(async () => {
      try {
        const duration = Date.now() - startTime;

        await usageTracker.trackApiCall(
          userId,
          endpoint,
          method,
          duration,
          {
            userAgent: request.headers.get("user-agent") || undefined,
            ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
          }
        );
      } catch (error) {
        // Don't fail request if tracking fails
        logger.warn("Failed to track API usage", { error, endpoint });
      }
    }, 0);
  } catch (error) {
    // Don't fail request if tracking fails
    logger.warn("Usage tracking error", { error, pathname });
  }
}

/**
 * Track usage from response time header
 * Call this after response is created
 */
export async function trackUsageFromResponse(
  request: NextRequest,
  responseTime: number
): Promise<void> {
  if (process.env.USAGE_TRACKING_ENABLED !== "true") {
    return;
  }

  const pathname = request.nextUrl.pathname;

  if (shouldExcludeRoute(pathname) || !pathname.startsWith("/api/")) {
    return;
  }

  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    }).catch(() => null);

    const userId = token?.id ?? token?.sub;
    if (!userId) {
      return;
    }

    await usageTracker.trackApiCall(
      userId,
      pathname,
      request.method,
      responseTime,
      {
        userAgent: request.headers.get("user-agent") || undefined,
      }
    );
  } catch (error) {
    logger.warn("Failed to track usage from response", { error });
  }
}
