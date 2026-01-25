/**
 * Cron Job: Process Transport Reminders
 * GET /api/cron/transport/reminders
 * This endpoint should be called periodically (e.g., every 5 minutes) by a cron job
 */

import { NextRequest, NextResponse } from "next/server";
import { reminderScheduler } from "@/lib/services/transport/reminder-scheduler";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/transport/reminders
 * Process pending reminders (cron job endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const cronSecret = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await reminderScheduler.processPendingReminders();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error("Error processing transport reminders cron job", { error });
    return NextResponse.json(
      { error: error.message || "Failed to process reminders" },
      { status: 500 }
    );
  }
}
