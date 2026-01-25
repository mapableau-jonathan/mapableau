import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { QualityAnalyticsService } from "@/lib/services/quality/analytics-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

export async function GET(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    const user = await requireAuth();

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : new Date();

    const service = new QualityAnalyticsService();
    const metrics = await service.getQualityMetrics(startDate, endDate);

    return NextResponse.json(metrics);
  } catch (error) {
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("Error fetching quality metrics:", error);
    return NextResponse.json(
      { error: "Failed to fetch quality metrics" },
      { status: 500 }
    );
  }
}
