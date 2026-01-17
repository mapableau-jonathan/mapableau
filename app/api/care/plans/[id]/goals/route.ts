import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { CarePlanService } from "@/lib/services/care/care-plan-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const updateGoalSchema = z.object({
  goalIndex: z.number().int().min(0),
  progress: z.number().min(0).max(100).optional(),
  status: z.enum(["ACTIVE", "ACHIEVED", "ON_HOLD"]).optional(),
  description: z.string().optional(),
  targetDate: z.string().transform((str) => new Date(str)).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const data = updateGoalSchema.parse(body);

    const service = new CarePlanService();
    const carePlan = await service.updateGoal(params.id, {
      goalIndex: data.goalIndex,
      progress: data.progress,
      status: data.status,
      description: data.description,
      targetDate: data.targetDate,
    });

    return NextResponse.json(carePlan);
  } catch (error) {
    console.error("Error updating goal:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}
