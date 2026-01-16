import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ComplaintService } from "@/lib/services/compliance/complaint-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const updateComplaintSchema = z.object({
  status: z
    .enum([
      "RECEIVED",
      "ACKNOWLEDGED",
      "UNDER_INVESTIGATION",
      "RESOLVED",
      "CLOSED",
      "ESCALATED",
    ])
    .optional(),
  resolution: z.string().optional(),
  resolvedAt: z.string().transform((str) => new Date(str)).optional(),
  resolvedBy: z.string().optional(),
  satisfactionRating: z.number().min(1).max(5).optional(),
});

export async function GET(
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

    const service = new ComplaintService();
    const complaint = await service.getComplaint(params.id);

    if (!complaint) {
      return NextResponse.json(
        { error: "Complaint not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(complaint);
  } catch (error) {
    console.error("Error fetching complaint:", error);
    return NextResponse.json(
      { error: "Failed to fetch complaint" },
      { status: 500 }
    );
  }
}

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
    const data = updateComplaintSchema.parse(body);

    // Auto-set resolvedBy if resolving
    if (data.status === "RESOLVED" || data.status === "CLOSED") {
      if (!data.resolvedBy) {
        data.resolvedBy = session.user.id;
      }
      if (!data.resolvedAt) {
        data.resolvedAt = new Date();
      }
    }

    const service = new ComplaintService();
    const complaint = await service.updateComplaint(params.id, data);

    return NextResponse.json(complaint);
  } catch (error) {
    console.error("Error updating complaint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update complaint" },
      { status: 500 }
    );
  }
}
