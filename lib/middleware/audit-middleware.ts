/**
 * Audit Middleware
 * Automatically logs API requests for audit trail
 */

import { NextRequest, NextResponse } from "next/server";
import { AuditLogger, AuditAction, AuditResourceType } from "../services/audit/audit-logger";

export function createAuditMiddleware(auditLogger: AuditLogger) {
  return async (req: NextRequest, res: NextResponse, next: () => Promise<void>) => {
    // Extract user ID from session (would need to be passed in)
    const userId = req.headers.get("x-user-id") || "system";

    // Determine action from HTTP method
    let action: AuditAction;
    switch (req.method) {
      case "GET":
        action = AuditAction.READ;
        break;
      case "POST":
        action = AuditAction.CREATE;
        break;
      case "PATCH":
      case "PUT":
        action = AuditAction.UPDATE;
        break;
      case "DELETE":
        action = AuditAction.DELETE;
        break;
      default:
        action = AuditAction.READ;
    }

    // Extract resource type and ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter((p) => p);
    
    // Map common paths to resource types
    const resourceTypeMap: Record<string, AuditResourceType> = {
      policies: AuditResourceType.POLICY,
      incidents: AuditResourceType.INCIDENT,
      complaints: AuditResourceType.COMPLAINT,
      risks: AuditResourceType.RISK,
      training: AuditResourceType.TRAINING,
      "care-plans": AuditResourceType.CARE_PLAN,
      "care-notes": AuditResourceType.CARE_NOTE,
      payments: AuditResourceType.PAYMENT,
      redemptions: AuditResourceType.REDEMPTION,
      providers: AuditResourceType.PROVIDER,
      workers: AuditResourceType.WORKER,
      "ndis-plans": AuditResourceType.NDIS_PLAN,
      "transport-bookings": AuditResourceType.TRANSPORT_BOOKING,
      "job-listings": AuditResourceType.JOB_LISTING,
      "job-applications": AuditResourceType.JOB_APPLICATION,
    };

    let resourceType = AuditResourceType.USER;
    let resourceId = "";

    // Try to identify resource type from URL
    for (let i = 0; i < pathParts.length; i++) {
      if (resourceTypeMap[pathParts[i]]) {
        resourceType = resourceTypeMap[pathParts[i]];
        if (i + 1 < pathParts.length) {
          resourceId = pathParts[i + 1];
        }
        break;
      }
    }

    // Log the audit event
    try {
      await auditLogger.log({
        userId,
        action,
        resourceType,
        resourceId: resourceId || url.pathname,
        ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
        timestamp: new Date(),
        details: {
          method: req.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
        },
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error("Audit logging failed:", error);
    }

    await next();
  };
}
