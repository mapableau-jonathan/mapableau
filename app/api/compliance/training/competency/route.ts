import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { TrainingService } from "@/lib/services/compliance/training-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const validateCompetencySchema = z.object({
  workerId: z.string().min(1),
  trainingType: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { workerId, trainingType } =
      validateCompetencySchema.parse(body);

    const service = new TrainingService();
    const validation = await service.validateCompetency(workerId, trainingType);

    return NextResponse.json(validation);
  } catch (error) {
    console.error("Error validating competency:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to validate competency" },
      { status: 500 }
    );
  }
}
