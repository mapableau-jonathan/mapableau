import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ComplaintService } from "@/lib/services/compliance/complaint-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const createResolutionSchema = z.object({
  action: z.string().min(1),
  outcome: z.string().optional(),
});

export async function POST(
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
    const data = createResolutionSchema.parse(body);

    const service = new ComplaintService();
    const resolution = await service.addResolution(params.id, {
      ...data,
      takenBy: session.user.id,
    });

    return NextResponse.json(resolution, { status: 201 });
  } catch (error) {
    console.error("Error adding resolution:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to add resolution" },
      { status: 500 }
    );
  }
}
