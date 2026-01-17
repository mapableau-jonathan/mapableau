import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { IncidentService } from "@/lib/services/compliance/incident-service";
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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const service = new IncidentService();
    const stats = await service.getIncidentStatistics(startDate, endDate);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching incident statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident statistics" },
      { status: 500 }
    );
  }
}
