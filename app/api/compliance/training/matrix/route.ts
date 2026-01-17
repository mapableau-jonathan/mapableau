import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { TrainingService } from "@/lib/services/compliance/training-service";
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

    const service = new TrainingService();
    const matrix = await service.getTrainingMatrix();

    return NextResponse.json({ matrix });
  } catch (error) {
    console.error("Error fetching training matrix:", error);
    return NextResponse.json(
      { error: "Failed to fetch training matrix" },
      { status: 500 }
    );
  }
}
