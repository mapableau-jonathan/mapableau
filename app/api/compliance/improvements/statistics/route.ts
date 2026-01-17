import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ImprovementService } from "@/lib/services/compliance/improvement-service";
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

    const service = new ImprovementService();
    const stats = await service.getImprovementStatistics();

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching improvement statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
