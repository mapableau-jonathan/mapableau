import { NextResponse } from "next/server";
import { z } from "zod";
import { IncidentService } from "@/lib/services/compliance/incident-service";
import { requireAdmin, requirePlanManager } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

const reportSchema = z.object({
  reportNumber: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require admin or plan manager role to report to NDIS
    try {
      await requireAdmin();
    } catch {
      await requirePlanManager();
    }

    const body = await req.json();
    const { reportNumber } = reportSchema.parse(body);

    const service = new IncidentService();
    const incident = await service.reportToNDIS(params.id, reportNumber);

    return NextResponse.json(incident);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Forbidden: Admin or Plan Manager access required" },
        { status: 403 }
      );
    }
    logger.error("Error reporting incident to NDIS", error);
    return NextResponse.json(
      { error: "Failed to report incident to NDIS" },
      { status: 500 }
    );
  }
}
