import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ComplaintService } from "@/lib/services/compliance/complaint-service";
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

    const service = new ComplaintService();
    const stats = await service.getComplaintStatistics(startDate, endDate);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching complaint statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch complaint statistics" },
      { status: 500 }
    );
  }
}
