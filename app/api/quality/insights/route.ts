import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { QualityAnalyticsService } from "@/lib/services/quality/analytics-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

export async function GET(req: Request) {
  try {
    // requireAuth() throws an error if user is not authenticated, it never returns null
    const user = await requireAuth();

    const service = new QualityAnalyticsService();
    const insights = await service.getQualityInsights();

    return NextResponse.json(insights);
  } catch (error) {
    // Handle authentication errors properly - return 401 instead of 500
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.error("Error fetching quality insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch quality insights" },
      { status: 500 }
    );
  }
}
