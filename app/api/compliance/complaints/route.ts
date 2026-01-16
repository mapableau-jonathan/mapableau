import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ComplaintService } from "@/lib/services/compliance/complaint-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { ComplaintStatus, ComplaintSource } from "@prisma/client";

const createComplaintSchema = z.object({
  source: z.enum(["PARTICIPANT", "FAMILY", "WORKER", "ANONYMOUS", "OTHER"]),
  description: z.string().min(1),
  participantId: z.string().optional(),
  workerId: z.string().optional(),
  serviceArea: z.string().optional(),
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
    const source = searchParams.get("source") as ComplaintSource | null;
    const status = searchParams.get("status") as ComplaintStatus | null;
    const participantId = searchParams.get("participantId") || undefined;
    const serviceArea = searchParams.get("serviceArea") || undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const service = new ComplaintService();
    const complaints = await service.getComplaints({
      source: source || undefined,
      status: status || undefined,
      participantId,
      serviceArea,
      startDate,
      endDate,
    });

    return NextResponse.json({ complaints });
  } catch (error) {
    console.error("Error fetching complaints:", error);
    return NextResponse.json(
      { error: "Failed to fetch complaints" },
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
    const data = createComplaintSchema.parse(body);

    const service = new ComplaintService();
    const complaint = await service.createComplaint(data);

    return NextResponse.json(complaint, { status: 201 });
  } catch (error) {
    console.error("Error creating complaint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create complaint" },
      { status: 500 }
    );
  }
}
