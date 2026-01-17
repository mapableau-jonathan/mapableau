/**
 * Comprehensive Audit Logger
 * Logs all user actions, data access, and system changes for NDIS compliance
 */

import { prisma } from "../../prisma";
import { createHash } from "crypto";

export enum AuditAction {
  CREATE = "CREATE",
  READ = "READ",
  UPDATE = "UPDATE",
  DELETE = "DELETE",
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  EXPORT = "EXPORT",
  APPROVE = "APPROVE",
  REJECT = "REJECT",
  ASSIGN = "ASSIGN",
  ACKNOWLEDGE = "ACKNOWLEDGE",
  REPORT = "REPORT",
  SYNC = "SYNC",
  PAYMENT = "PAYMENT",
  REDEMPTION = "REDEMPTION",
}

export enum AuditResourceType {
  USER = "USER",
  POLICY = "POLICY",
  INCIDENT = "INCIDENT",
  COMPLAINT = "COMPLAINT",
  RISK = "RISK",
  TRAINING = "TRAINING",
  CARE_PLAN = "CARE_PLAN",
  CARE_NOTE = "CARE_NOTE",
  PAYMENT = "PAYMENT",
  REDEMPTION = "REDEMPTION",
  PROVIDER = "PROVIDER",
  WORKER = "WORKER",
  NDIS_PLAN = "NDIS_PLAN",
  TRANSPORT_BOOKING = "TRANSPORT_BOOKING",
  JOB_LISTING = "JOB_LISTING",
  JOB_APPLICATION = "JOB_APPLICATION",
}

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  hash: string; // Cryptographic hash for immutability
  createdAt: Date;
}

export class AuditLogger {
  /**
   * Log an audit event
   */
  async log(entry: AuditLogEntry): Promise<string> {
    // Create cryptographic hash for immutability
    const hashInput = JSON.stringify({
      userId: entry.userId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      timestamp: entry.timestamp.toISOString(),
      details: entry.details,
    });

    const hash = createHash("sha256").update(hashInput).digest("hex");

    // TODO: When AuditLog model is added to schema:
    // const auditLog = await prisma.auditLog.create({
    //   data: {
    //     userId: entry.userId,
    //     action: entry.action,
    //     resourceType: entry.resourceType,
    //     resourceId: entry.resourceId,
    //     details: entry.details as any,
    //     ipAddress: entry.ipAddress,
    //     userAgent: entry.userAgent,
    //     hash,
    //   },
    // });
    //
    // return auditLog.id;

    // For now, return a mock ID
    const logId = `audit_${Date.now()}_${hash.substring(0, 8)}`;
    
    // In production, this would be stored in the database
    console.log("AUDIT LOG:", {
      id: logId,
      ...entry,
      hash,
    });

    return logId;
  }

  /**
   * Log user login
   */
  async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    return this.log({
      userId,
      action: AuditAction.LOGIN,
      resourceType: AuditResourceType.USER,
      resourceId: userId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(
    userId: string,
    resourceType: AuditResourceType,
    resourceId: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log({
      userId,
      action: AuditAction.READ,
      resourceType,
      resourceId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Log data modification
   */
  async logDataModification(
    userId: string,
    action: AuditAction,
    resourceType: AuditResourceType,
    resourceId: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ) {
    return this.log({
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters?: {
    userId?: string;
    action?: AuditAction;
    resourceType?: AuditResourceType;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<AuditLog[]> {
    // TODO: Implement with AuditLog model
    // const where: any = {};
    //
    // if (filters?.userId) where.userId = filters.userId;
    // if (filters?.action) where.action = filters.action;
    // if (filters?.resourceType) where.resourceType = filters.resourceType;
    // if (filters?.resourceId) where.resourceId = filters.resourceId;
    // if (filters?.startDate || filters?.endDate) {
    //   where.createdAt = {};
    //   if (filters.startDate) where.createdAt.gte = filters.startDate;
    //   if (filters.endDate) where.createdAt.lte = filters.endDate;
    // }
    //
    // return await prisma.auditLog.findMany({
    //   where,
    //   orderBy: { createdAt: "desc" },
    //   take: 1000,
    // });

    return [];
  }

  /**
   * Verify audit log integrity
   */
  async verifyAuditLogIntegrity(logId: string): Promise<boolean> {
    // TODO: Recalculate hash and compare with stored hash
    // This ensures audit logs haven't been tampered with
    return true;
  }

  /**
   * Export audit logs for NDIS audit
   */
  async exportAuditLogs(
    startDate: Date,
    endDate: Date,
    format: "json" | "csv" | "pdf" = "json"
  ): Promise<string> {
    const logs = await this.getAuditLogs({ startDate, endDate });

    if (format === "json") {
      return JSON.stringify(logs, null, 2);
    } else if (format === "csv") {
      const header = "ID,User ID,Action,Resource Type,Resource ID,Timestamp,IP Address,Hash\n";
      const rows = logs.map((log) =>
        [
          log.id,
          log.userId,
          log.action,
          log.resourceType,
          log.resourceId,
          log.createdAt.toISOString(),
          log.ipAddress || "",
          log.hash,
        ].join(",")
      );
      return header + rows.join("\n");
    }

    // PDF would require a PDF library
    return JSON.stringify(logs, null, 2);
  }
}
