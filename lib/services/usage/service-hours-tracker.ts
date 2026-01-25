/**
 * Service Hours Tracker
 * Tracks worker service delivery hours for billing
 */

import { prisma } from "@/lib/prisma";
import { usageTracker, UsageType } from "./usage-tracker";
import { logger } from "@/lib/logger";

export interface ServiceHoursData {
  workerId: string;
  participantId: string;
  carePlanId?: string;
  serviceType: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Service Hours Tracker
 */
export class ServiceHoursTracker {
  /**
   * Track service hours from care note or manual entry
   */
  async trackServiceHours(data: ServiceHoursData): Promise<void> {
    try {
      // Calculate hours
      const durationMs = data.endTime.getTime() - data.startTime.getTime();
      const hours = durationMs / (1000 * 60 * 60); // Convert to hours

      if (hours <= 0) {
        logger.warn("Invalid service hours: endTime must be after startTime", data);
        return;
      }

      // Get worker's user ID
      const worker = await prisma.worker.findUnique({
        where: { id: data.workerId },
        select: { userId: true },
      });

      if (!worker) {
        logger.error("Worker not found", { workerId: data.workerId });
        return;
      }

      // Track usage
      await usageTracker.trackServiceHours(
        worker.userId,
        hours,
        data.serviceType,
        data.carePlanId || data.workerId,
        {
          workerId: data.workerId,
          participantId: data.participantId,
          carePlanId: data.carePlanId,
          startTime: data.startTime.toISOString(),
          endTime: data.endTime.toISOString(),
          durationMs,
          notes: data.notes,
          ...data.metadata,
        }
      );

      logger.info("Service hours tracked", {
        workerId: data.workerId,
        participantId: data.participantId,
        hours,
        serviceType: data.serviceType,
      });
    } catch (error) {
      logger.error("Error tracking service hours", { error, data });
      throw error;
    }
  }

  /**
   * Track service hours from care note
   */
  async trackFromCareNote(careNoteId: string): Promise<void> {
    try {
      const careNote = await prisma.careNote.findUnique({
        where: { id: careNoteId },
        include: {
          carePlan: {
            include: {
              participant: true,
            },
          },
          worker: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!careNote) {
        logger.warn("Care note not found", { careNoteId });
        return;
      }

      // Extract service hours from metadata if available
      const metadata = careNote.metadata as any;
      if (metadata?.serviceHours) {
        const startTime = metadata.startTime
          ? new Date(metadata.startTime)
          : careNote.createdAt;
        const endTime = metadata.endTime
          ? new Date(metadata.endTime)
          : new Date(careNote.createdAt.getTime() + (metadata.durationMinutes || 60) * 60 * 1000);

        await this.trackServiceHours({
          workerId: careNote.workerId,
          participantId: careNote.carePlan.participantId,
          carePlanId: careNote.carePlanId,
          serviceType: careNote.noteType.toLowerCase(),
          startTime,
          endTime,
          notes: careNote.content,
          metadata: {
            careNoteId,
            noteType: careNote.noteType,
          },
        });
      }
    } catch (error) {
      logger.error("Error tracking service hours from care note", { error, careNoteId });
      throw error;
    }
  }

  /**
   * Get service hours summary for worker
   */
  async getWorkerServiceHours(
    workerId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalHours: number;
    hoursByServiceType: Record<string, number>;
    totalCost: number;
  }> {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      select: { userId: true },
    });

    if (!worker) {
      throw new Error("Worker not found");
    }

    const summary = await usageTracker.getUserUsageSummary(worker.userId, startDate, endDate);

    // Get breakdown by service type
    const where: any = {
      userId: worker.userId,
      usageType: UsageType.SERVICE_HOUR,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const records = await prisma.usageRecord.findMany({
      where,
      select: {
        quantity: true,
        cost: true,
        metadata: true,
      },
    });

    const hoursByServiceType: Record<string, number> = {};
    let totalCost = 0;

    for (const record of records) {
      const metadata = record.metadata as any;
      const serviceType = metadata?.serviceType || "default";
      hoursByServiceType[serviceType] =
        (hoursByServiceType[serviceType] || 0) + Number(record.quantity);
      totalCost += Number(record.cost);
    }

    return {
      totalHours: summary.totalServiceHours,
      hoursByServiceType,
      totalCost,
    };
  }

  /**
   * Get service hours summary for participant
   */
  async getParticipantServiceHours(
    participantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalHours: number;
    hoursByWorker: Record<string, number>;
    totalCost: number;
  }> {
    const where: any = {
      usageType: UsageType.SERVICE_HOUR,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Filter by participant ID in metadata
    const records = await prisma.usageRecord.findMany({
      where,
      select: {
        quantity: true,
        cost: true,
        metadata: true,
      },
    });

    const hoursByWorker: Record<string, number> = {};
    let totalHours = 0;
    let totalCost = 0;

    for (const record of records) {
      const metadata = record.metadata as any;
      if (metadata?.participantId === participantId) {
        const workerId = metadata.workerId || "unknown";
        hoursByWorker[workerId] = (hoursByWorker[workerId] || 0) + Number(record.quantity);
        totalHours += Number(record.quantity);
        totalCost += Number(record.cost);
      }
    }

    return {
      totalHours,
      hoursByWorker,
      totalCost,
    };
  }
}

// Export singleton instance
export const serviceHoursTracker = new ServiceHoursTracker();
