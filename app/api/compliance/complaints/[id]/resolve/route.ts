import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ComplaintService } from "@/lib/services/compliance/complaint-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const resolveSchema = z.object({
  resolution: z.string().min(1),
  satisfactionRating: z.number().min(1).max(5).optional(),
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
    const { resolution, satisfactionRating } = resolveSchema.parse(body);

    const service = new ComplaintService();
    const complaint = await service.resolveComplaint(
      params.id,
      resolution,
      session.user.id,
      satisfactionRating
    );

    return NextResponse.json(complaint);
  } catch (error) {
    console.error("Error resolving complaint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to resolve complaint" },
      { status: 500 }
    );
  }
}
