import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { QualityAnalyticsService } from "@/lib/services/quality/analytics-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { requireAuth } from "@/lib/security/authorization-utils";

export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const service = new QualityAnalyticsService();
    const insights = await service.getQualityInsights();

    return NextResponse.json(insights);
  } catch (error) {
    console.error("Error fetching quality insights:", error);
    return NextResponse.json(
      { error: "Failed to fetch quality insights" },
      { status: 500 }
    );
  }
}
