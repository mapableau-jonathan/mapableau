/**
 * Metrics API
 * GET /api/abilitypay/metrics - Get system and payment metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/security/authorization-utils";
import { metricsService } from "@/lib/monitoring";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin role for metrics access
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "all";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    if (type === "payments" || type === "all") {
      const paymentMetrics = await metricsService.getPaymentMetrics(start, end);
      
      if (type === "payments") {
        return NextResponse.json({
          type: "payments",
          metrics: paymentMetrics,
        });
      }

      const systemMetrics = await metricsService.getSystemMetrics();
      
      return NextResponse.json({
        type: "all",
        paymentMetrics,
        systemMetrics,
        timestamp: new Date().toISOString(),
      });
    }

    if (type === "system") {
      const systemMetrics = await metricsService.getSystemMetrics();
      return NextResponse.json({
        type: "system",
        metrics: systemMetrics,
      });
    }

    return NextResponse.json(
      { error: `Unknown metrics type: ${type}` },
      { status: 400 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }
    logger.error("Error fetching metrics", error);
    return NextResponse.json(
      { error: "Failed to get metrics" },
      { status: 500 }
    );
  }
}
