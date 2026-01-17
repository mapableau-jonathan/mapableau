import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ProviderScoringService } from "@/lib/services/quality/provider-scoring";
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

    const { searchParams } = new URL(req.url);
    const providerId = searchParams.get("providerId");

    if (!providerId) {
      return NextResponse.json(
        { error: "providerId query parameter required" },
        { status: 400 }
      );
    }

    const scoringService = new ProviderScoringService();
    const score = await scoringService.calculateProviderScore(providerId);
    const breakdown = await scoringService.getProviderScoreBreakdown(providerId);
    const benchmarks = await scoringService.compareWithBenchmarks(providerId);

    return NextResponse.json({
      score,
      breakdown,
      benchmarks,
    });
  } catch (error) {
    console.error("Error calculating provider score:", error);
    return NextResponse.json(
      { error: "Failed to calculate provider score" },
      { status: 500 }
    );
  }
}
