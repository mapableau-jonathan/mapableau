/**
 * Usage Tracking Middleware
 * Tracks API calls for billing purposes
 */

import { NextRequest, NextResponse } from "next/server";
import { usageTracker } from "../services/usage/usage-tracker";
import { logger } from "../logger";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
    // Get user session (non-blocking)
    const session = await getServerSession(authOptions).catch(() => null);

    if (!session?.user?.id) {
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
          session.user.id,
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
    const session = await getServerSession(authOptions).catch(() => null);

    if (!session?.user?.id) {
      return;
    }

    await usageTracker.trackApiCall(
      session.user.id,
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
