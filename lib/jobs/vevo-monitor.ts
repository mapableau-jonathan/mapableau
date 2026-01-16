import { prisma } from "../prisma";
import { VEVOService } from "../services/verification/vevo";
import { AlertService } from "../services/alerts/alert-service";

export class VEVOMonitor {
  private vevoService: VEVOService;
  private alertService: AlertService;

  constructor() {
    this.vevoService = new VEVOService();
    this.alertService = new AlertService();
  }

  /**
   * Monitor VEVO status changes
   */
  async monitorVisaStatusChanges(): Promise<void> {
    console.log("Monitoring VEVO status changes...");

    try {
      const vevoVerifications = await prisma.verificationRecord.findMany({
        where: {
          verificationType: "VEVO",
          status: {
            in: ["VERIFIED", "IN_PROGRESS"],
          },
          providerRequestId: {
            not: null,
          },
        },
        include: {
          worker: true,
        },
      });

      for (const verification of vevoVerifications) {
        if (!verification.providerRequestId) continue;

        try {
          const statusResponse = await this.vevoService.getStatus(
            verification.providerRequestId
          );

          // Check if status changed
          if (statusResponse.status !== verification.status) {
            console.log(
              `VEVO status changed for verification ${verification.id}: ${verification.status} -> ${statusResponse.status}`
            );

            // Update verification record
            await prisma.verificationRecord.update({
              where: { id: verification.id },
              data: {
                status: statusResponse.status,
                verifiedAt: statusResponse.verifiedAt,
                expiresAt: statusResponse.expiresAt,
                errorMessage: statusResponse.errorMessage,
                metadata: statusResponse.metadata as any,
              },
            });

            // Create alert for status change
            if (
              statusResponse.status === "EXPIRED" ||
              statusResponse.status === "FAILED" ||
              statusResponse.status === "SUSPENDED"
            ) {
              await this.alertService.createAlert(
                verification.workerId,
                verification.id,
                "STATUS_CHANGED",
                `VEVO status changed to ${statusResponse.status.toLowerCase()}`
              );
            }
          }
        } catch (error) {
          console.error(
            `Error monitoring VEVO verification ${verification.id}:`,
            error
          );
        }
      }

      console.log("VEVO monitoring completed");
    } catch (error) {
      console.error("Error monitoring VEVO status:", error);
      throw error;
    }
  }

  /**
   * Process webhook updates (called by webhook handler)
   */
  async processWebhookUpdate(
    providerRequestId: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const verification = await prisma.verificationRecord.findFirst({
      where: {
        providerRequestId,
        verificationType: "VEVO",
      },
    });

    if (!verification) {
      return;
    }

    // Update verification
    await prisma.verificationRecord.update({
      where: { id: verification.id },
      data: {
        status: status as any,
        metadata: metadata as any,
        updatedAt: new Date(),
      },
    });

    // Create alert if status changed to expired/failed
    if (status === "EXPIRED" || status === "FAILED") {
      await this.alertService.createAlert(
        verification.workerId,
        verification.id,
        status === "EXPIRED" ? "VERIFICATION_EXPIRED" : "VERIFICATION_FAILED",
        `VEVO verification ${status.toLowerCase()}`
      );
    }
  }
}
