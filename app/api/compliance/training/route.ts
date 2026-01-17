import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { TrainingService } from "@/lib/services/compliance/training-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const createTrainingRecordSchema = z.object({
  workerId: z.string().min(1),
  trainingType: z.string().min(1),
  trainingName: z.string().min(1),
  provider: z.string().optional(),
  completedAt: z.string().transform((str) => new Date(str)),
  expiryDate: z.string().transform((str) => new Date(str)).optional(),
  certificateNumber: z.string().optional(),
  competencyLevel: z
    .enum(["Beginner", "Intermediate", "Advanced", "Expert"])
    .optional(),
  notes: z.string().optional(),
});

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
    const workerId = searchParams.get("workerId") || undefined;
    const trainingType = searchParams.get("trainingType") || undefined;
    const competencyLevel = searchParams.get("competencyLevel") || undefined;

    const service = new TrainingService();
    const records = await service.getTrainingRecords({
      workerId,
      trainingType,
      competencyLevel,
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Error fetching training records:", error);
    return NextResponse.json(
      { error: "Failed to fetch training records" },
      { status: 500 }
    );
  }
}

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
    const data = createTrainingRecordSchema.parse(body);

    const service = new TrainingService();
    const record = await service.createTrainingRecord(data);

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Error creating training record:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create training record" },
      { status: 500 }
    );
  }
}
