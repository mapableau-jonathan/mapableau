import { prisma } from "../prisma";
import { VerificationOrchestrator } from "../services/verification/orchestrator";
import { AlertService } from "../services/alerts/alert-service";

export class VerificationMonitor {
  private orchestrator: VerificationOrchestrator;
  private alertService: AlertService;

  constructor() {
    this.orchestrator = new VerificationOrchestrator();
    this.alertService = new AlertService();
  }

  /**
   * Daily job to check expiring verifications and send alerts
   */
  async checkExpiringVerifications(): Promise<void> {
    console.log("Running daily verification expiry check...");

    try {
      await this.alertService.checkExpiringVerifications();
      await this.alertService.checkExpiredVerifications();

      console.log("Verification expiry check completed");
    } catch (error) {
      console.error("Error checking expiring verifications:", error);
      throw error;
    }
  }

  /**
   * Re-verify expired checks
   */
  async recheckExpiredVerifications(): Promise<void> {
    console.log("Rechecking expired verifications...");

    try {
      const expiredVerifications = await prisma.verificationRecord.findMany({
        where: {
          status: "EXPIRED",
          providerRequestId: {
            not: null,
          },
        },
        include: {
          worker: true,
        },
      });

      for (const verification of expiredVerifications) {
        if (!verification.providerRequestId) continue;

        try {
          const result = await this.orchestrator.recheckVerification(
            verification.id
          );

          if (result.success) {
            console.log(
              `Successfully rechecked verification ${verification.id}`
            );
          } else {
            console.warn(
              `Recheck failed for verification ${verification.id}`
            );
          }
        } catch (error) {
          console.error(
            `Error rechecking verification ${verification.id}:`,
            error
          );
        }
      }

      console.log("Expired verification recheck completed");
    } catch (error) {
      console.error("Error rechecking expired verifications:", error);
      throw error;
    }
  }

  /**
   * Update status of in-progress verifications
   */
  async updateInProgressVerifications(): Promise<void> {
    console.log("Updating in-progress verifications...");

    try {
      const inProgressVerifications = await prisma.verificationRecord.findMany({
        where: {
          status: "IN_PROGRESS",
          providerRequestId: {
            not: null,
          },
        },
      });

      for (const verification of inProgressVerifications) {
        if (!verification.providerRequestId) continue;

        try {
          await this.orchestrator.checkVerificationStatus(verification.id);
        } catch (error) {
          console.error(
            `Error updating verification ${verification.id}:`,
            error
          );
        }
      }

      console.log("In-progress verification update completed");
    } catch (error) {
      console.error("Error updating in-progress verifications:", error);
      throw error;
    }
  }

  /**
   * Run all monitoring tasks
   */
  async runAllTasks(): Promise<void> {
    console.log("Running all verification monitoring tasks...");

    await Promise.all([
      this.checkExpiringVerifications(),
      this.updateInProgressVerifications(),
    ]);

    // Recheck expired less frequently (weekly)
    const dayOfWeek = new Date().getDay();
    if (dayOfWeek === 0) {
      // Sunday
      await this.recheckExpiredVerifications();
    }

    console.log("All monitoring tasks completed");
  }
}
