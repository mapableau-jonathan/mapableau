import { NextResponse } from "next/server";
import { z } from "zod";
import { IncidentService } from "@/lib/services/compliance/incident-service";
import { NDISCommissionClient } from "@/lib/services/compliance/ndis-commission-client";
import { hasAdminOrPlanManagerAccess } from "@/lib/security/authorization-utils";
import { logger } from "@/lib/logger";

const reportSchema = z.object({
  reportNumber: z.string().optional(), // Optional if auto-reporting
  autoReport: z.boolean().optional().default(false), // Auto-report using NDIS Commission client
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // SECURITY: Require admin or plan manager role to report to NDIS
    // Optimized: Single function call instead of multiple try-catch blocks
    const { hasAccess, user } = await hasAdminOrPlanManagerAccess(req);

    if (!hasAccess || !user) {
      return NextResponse.json(
        { error: "Forbidden: Admin or Plan Manager access required" },
        { status: 403 }
      );
    }

    const body = await reportSchema.parse(await req.json());
    const incidentService = new IncidentService();
    const incident = await incidentService.getIncident(params.id);

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    let reportNumber = body.reportNumber;

    // If auto-reporting, use NDIS Commission client
    if (body.autoReport || !reportNumber) {
      const ndisClient = new NDISCommissionClient();
      
      // Validate report
      const validation = ndisClient.validateReport({
        incidentId: incident.id,
        incidentType: incident.incidentType,
        description: incident.description,
        occurredAt: incident.occurredAt,
        participantId: incident.participantId || undefined,
        location: incident.location || undefined,
        reportedBy: incident.reportedBy,
      });

      if (!validation.valid) {
        return NextResponse.json(
          { error: "Invalid report data", details: validation.errors },
          { status: 400 }
        );
      }

      // Report to NDIS Commission
      const reportResponse = await ndisClient.reportIncident({
        incidentId: incident.id,
        incidentType: incident.incidentType,
        description: incident.description,
        occurredAt: incident.occurredAt,
        participantId: incident.participantId || undefined,
        location: incident.location || undefined,
        reportedBy: incident.reportedBy,
      });

      if (!reportResponse.success) {
        return NextResponse.json(
          { error: reportResponse.error || "Failed to report to NDIS Commission" },
          { status: 500 }
        );
      }

      reportNumber = reportResponse.reportNumber!;
      logger.info(`Incident ${params.id} automatically reported to NDIS Commission`, {
        reportNumber,
      });
    }

    if (!reportNumber) {
      return NextResponse.json(
        { error: "Report number is required" },
        { status: 400 }
      );
    }

    // Update incident with report number
    const updatedIncident = await incidentService.reportToNDIS(
      params.id,
      reportNumber
    );

    return NextResponse.json(updatedIncident);
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
