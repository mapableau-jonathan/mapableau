/**
 * Metrics Endpoint
 * Exposes authentication metrics in Prometheus format
 */

import { NextRequest, NextResponse } from "next/server";
import { getMetricsEndpointData } from "@/lib/monitoring/auth-metrics";
import { applySecurityHeaders } from "@/lib/security/security-headers";

/**
 * GET /api/metrics
 * Get authentication metrics in Prometheus format
 */
export async function GET(request: NextRequest) {
  try {
    const { metrics, prometheus } = getMetricsEndpointData();

    // Check if Prometheus format requested
    const acceptHeader = request.headers.get("accept");
    if (acceptHeader?.includes("text/plain") || request.nextUrl.searchParams.get("format") === "prometheus") {
      const response = NextResponse.text(prometheus, {
        headers: {
          "Content-Type": "text/plain; version=0.0.4",
        },
      });
      return applySecurityHeaders(response, { enableCSP: false });
    }

    // Return JSON format
    const response = NextResponse.json({
      metrics,
      timestamp: new Date().toISOString(),
    });

    return applySecurityHeaders(response);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve metrics" },
      { status: 500 }
    );
  }
}
