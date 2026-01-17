import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { RiskService } from "@/lib/services/compliance/risk-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const service = new RiskService();
    const byLevel = await service.getRisksByLevel();
    const allRisks = await service.getRisks();

    const stats = {
      total: allRisks.length,
      byLevel,
      critical: byLevel.CRITICAL || 0,
      high: byLevel.HIGH || 0,
      mitigated: allRisks.filter((r) => r.status === "MITIGATED").length,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching risk statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch risk statistics" },
      { status: 500 }
    );
  }
}
