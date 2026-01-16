import { NextResponse } from "next/server";
import { VerificationMonitor } from "@/lib/jobs/verification-monitor";

// This endpoint should be protected and called by a cron job
// For example, using Vercel Cron, or a scheduled task

export async function GET(req: Request) {
  try {
    // Verify cron secret if configured
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const monitor = new VerificationMonitor();
    await monitor.runAllTasks();

    return NextResponse.json({
      success: true,
      message: "Verification monitoring completed",
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      { error: "Monitoring job failed" },
      { status: 500 }
    );
  }
}
