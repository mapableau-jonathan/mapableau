import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { IncidentService } from "@/lib/services/compliance/incident-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const updateIncidentSchema = z.object({
  description: z.string().optional(),
  status: z
    .enum([
      "REPORTED",
      "UNDER_INVESTIGATION",
      "RESOLVED",
      "CLOSED",
      "NDIS_REPORTED",
    ])
    .optional(),
  actionsTaken: z
    .array(
      z.object({
        action: z.string(),
        takenBy: z.string(),
        takenAt: z.string().transform((str) => new Date(str)),
      })
    )
    .optional(),
  resolution: z.string().optional(),
  resolvedAt: z.string().transform((str) => new Date(str)).optional(),
  resolvedBy: z.string().optional(),
  ndisReported: z.boolean().optional(),
  ndisReportNumber: z.string().optional(),
  ndisReportedAt: z.string().transform((str) => new Date(str)).optional(),
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

    const service = new IncidentService();
    const incident = await service.getIncident(params.id);

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error("Error fetching incident:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
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
    const data = updateIncidentSchema.parse(body);

    // If resolving, set resolvedBy
    if (data.status === "RESOLVED" || data.status === "CLOSED") {
      if (!data.resolvedBy) {
        data.resolvedBy = session.user.id;
      }
      if (!data.resolvedAt) {
        data.resolvedAt = new Date();
      }
    }

    const service = new IncidentService();
    const incident = await service.updateIncident(params.id, data);

    return NextResponse.json(incident);
  } catch (error) {
    console.error("Error updating incident:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update incident" },
      { status: 500 }
    );
  }
}
