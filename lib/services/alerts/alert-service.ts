import { prisma } from "../../prisma";
import type { AlertType, VerificationStatus } from "@prisma/client";
import { differenceInDays } from "date-fns";

export class AlertService {
  /**
   * Check for expiring verifications and create alerts
   */
  async checkExpiringVerifications(): Promise<void> {
    const now = new Date();
    const days90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const days60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const days30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Find verifications expiring in the next 90 days
    const expiringVerifications = await prisma.verificationRecord.findMany({
      where: {
        status: "VERIFIED",
        expiresAt: {
          gte: now,
          lte: days90,
        },
      },
      include: {
        worker: true,
        alerts: {
          where: {
            acknowledgedAt: null,
          },
        },
      },
    });

    for (const verification of expiringVerifications) {
      if (!verification.expiresAt) continue;

      const daysUntilExpiry = differenceInDays(verification.expiresAt, now);

      let alertType: AlertType | null = null;
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        alertType = "VERIFICATION_EXPIRING_30_DAYS";
      } else if (daysUntilExpiry <= 60 && daysUntilExpiry > 30) {
        alertType = "VERIFICATION_EXPIRING_60_DAYS";
      } else if (daysUntilExpiry <= 90 && daysUntilExpiry > 60) {
        alertType = "VERIFICATION_EXPIRING_90_DAYS";
      }

      if (alertType) {
        // Check if alert already exists
        const existingAlert = verification.alerts.find(
          (a) => a.alertType === alertType
        );

        if (!existingAlert) {
          await this.createAlert(
            verification.workerId,
            verification.id,
            alertType,
            `${this.getVerificationTypeName(verification.verificationType)} expires in ${daysUntilExpiry} days`
          );
        }
      }
    }
  }

  /**
   * Check for expired verifications
   */
  async checkExpiredVerifications(): Promise<void> {
    const now = new Date();

    const expiredVerifications = await prisma.verificationRecord.findMany({
      where: {
        status: "VERIFIED",
        expiresAt: {
          lt: now,
        },
      },
      include: {
        alerts: {
          where: {
            alertType: "VERIFICATION_EXPIRED",
            acknowledgedAt: null,
          },
        },
      },
    });

    for (const verification of expiredVerifications) {
      // Update status to expired
      await prisma.verificationRecord.update({
        where: { id: verification.id },
        data: {
          status: "EXPIRED",
        },
      });

      // Create alert if not already exists
      if (verification.alerts.length === 0) {
        await this.createAlert(
          verification.workerId,
          verification.id,
          "VERIFICATION_EXPIRED",
          `${this.getVerificationTypeName(verification.verificationType)} has expired`
        );
      }
    }
  }

  /**
   * Create an alert
   */
  async createAlert(
    workerId: string,
    verificationRecordId: string | null,
    alertType: AlertType,
    message: string
  ): Promise<void> {
    await prisma.verificationAlert.create({
      data: {
        workerId,
        verificationRecordId,
        alertType,
        message,
      },
    });

    // Send notification (email, in-app, etc.)
    await this.sendNotification(workerId, alertType, message);
  }

  /**
   * Send notification (email, in-app, SMS)
   */
  private async sendNotification(
    workerId: string,
    alertType: AlertType,
    message: string
  ): Promise<void> {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: {
        user: true,
      },
    });

    if (!worker?.user?.email) {
      return;
    }

    // TODO: Implement email sending
    // For now, just log
    console.log(`Alert sent to ${worker.user.email}: ${message}`);

    // In a real implementation, you would:
    // 1. Send email via SendGrid, AWS SES, etc.
    // 2. Send in-app notification
    // 3. Optionally send SMS
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<void> {
    await prisma.verificationAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    });
  }

  /**
   * Get unacknowledged alerts for a worker
   */
  async getWorkerAlerts(workerId: string) {
    return prisma.verificationAlert.findMany({
      where: {
        workerId,
        acknowledgedAt: null,
      },
      include: {
        verificationRecord: {
          select: {
            id: true,
            verificationType: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * Get verification type name for display
   */
  private getVerificationTypeName(type: string): string {
    const names: Record<string, string> = {
      IDENTITY: "Identity Verification",
      VEVO: "Work Rights (VEVO)",
      WWCC: "Working with Children Check",
      NDIS: "NDIS Worker Screening",
      FIRST_AID: "First Aid Certificate",
    };
    return names[type] || type;
  }

  /**
   * Process all alerts (called by scheduled job)
   */
  async processAllAlerts(): Promise<void> {
    await this.checkExpiringVerifications();
    await this.checkExpiredVerifications();
  }
}
