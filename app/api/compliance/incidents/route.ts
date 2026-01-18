import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { IncidentService } from "@/lib/services/compliance/incident-service";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { IncidentType, IncidentStatus } from "@prisma/client";

const createIncidentSchema = z.object({
  incidentType: z.enum([
    "SERIOUS_INCIDENT",
    "REPORTABLE_INCIDENT",
    "NEAR_MISS",
    "MINOR_INCIDENT",
    "OTHER",
  ]),
  description: z.string().min(1),
  occurredAt: z.string().transform((str) => new Date(str)),
  participantId: z.string().optional(),
  workerId: z.string().optional(),
  location: z.string().optional(),
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
    const incidentType = searchParams.get("incidentType") as IncidentType | null;
    const status = searchParams.get("status") as IncidentStatus | null;
    const participantId = searchParams.get("participantId") || undefined;
    const workerId = searchParams.get("workerId") || undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const service = new IncidentService();
    const incidents = await service.getIncidents({
      incidentType: incidentType || undefined,
      status: status || undefined,
      participantId,
      workerId,
      startDate,
      endDate,
    });

    return NextResponse.json({ incidents });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
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
    const data = createIncidentSchema.parse(body);

    const service = new IncidentService();
    const incident = await service.createIncident({
      ...data,
      reportedBy: session.user.id,
    });

    // Note: Notion sync is triggered in IncidentService.createIncident

    return NextResponse.json(incident, { status: 201 });
  } catch (error) {
    console.error("Error creating incident:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 }
    );
  }
}
