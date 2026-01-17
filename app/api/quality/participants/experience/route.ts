import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ExperienceAnalyticsService } from "@/lib/services/quality/experience-analytics";
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
    const participantId = searchParams.get("participantId");

    if (!participantId) {
      return NextResponse.json(
        { error: "participantId query parameter required" },
        { status: 400 }
      );
    }

    // Verify user has access to this participant
    if (participantId !== user.id && user.role !== "NDIA_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const analyticsService = new ExperienceAnalyticsService();
    const experience =
      await analyticsService.getParticipantExperience(participantId);
    const outcomes =
      await analyticsService.getOutcomeMeasurements(participantId);

    return NextResponse.json({
      experience,
      outcomes,
    });
  } catch (error) {
    console.error("Error fetching participant experience:", error);
    return NextResponse.json(
      { error: "Failed to fetch participant experience" },
      { status: 500 }
    );
  }
}
