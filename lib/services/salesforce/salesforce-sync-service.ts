/**
 * Salesforce Sync Service
 * Handles syncing participant-related data to Salesforce CRM
 */

import { prisma } from "@/lib/prisma";
import { getSalesforceConfig } from "@/lib/config/salesforce";
import { SalesforceApiService } from "./salesforce-api-service";
import { logger } from "@/lib/logger";

/**
 * Salesforce Sync Service
 */
export class SalesforceSyncService {
  private config = getSalesforceConfig();
  private apiService = new SalesforceApiService();

  /**
   * Store sync mapping (similar to Notion mapping but for Salesforce)
   * Note: You may want to create a SalesforceSyncMapping table in Prisma schema
   * For now, we'll use external IDs in Salesforce to track mappings
   */
  private async storeMapping(
    entityType: string,
    systemId: string,
    salesforceId: string,
    objectType: string
  ): Promise<void> {
    // TODO: Implement if you add SalesforceSyncMapping to Prisma schema
    // For now, we'll use External IDs in Salesforce
    logger.info("Stored Salesforce sync mapping", {
      entityType,
      systemId,
      salesforceId,
      objectType,
    });
  }

  /**
   * Map User to Salesforce Contact/Lead
   */
  private mapUserToSalesforceRecord(user: any): Record<string, any> {
    return {
      FirstName: user.name?.split(" ")[0] || "",
      LastName: user.name?.split(" ").slice(1).join(" ") || user.name || "",
      Email: user.email,
      Phone: null, // Add if available
      System_ID__c: user.id, // Custom field for mapping
      Role__c: user.role,
      Created_Date__c: user.createdAt?.toISOString(),
    };
  }

  /**
   * Map NDIS Plan to Salesforce Custom Object
   */
  private mapNDISPlanToSalesforceRecord(plan: any): Record<string, any> {
    return {
      Plan_Number__c: plan.planNumber,
      Participant_System_ID__c: plan.participantId,
      Status__c: plan.status,
      Start_Date__c: plan.startDate?.toISOString(),
      End_Date__c: plan.endDate?.toISOString(),
      Total_Budget__c: plan.totalBudget?.toString(),
      Remaining_Budget__c: plan.remainingBudget?.toString(),
      System_ID__c: plan.id,
    };
  }

  /**
   * Sync participant (User) to Salesforce as Contact
   */
  async syncParticipantToSalesforce(participantId: string, userId?: string): Promise<void> {
    if (!this.config.syncSettings.syncParticipants) {
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: participantId },
        include: {
          ndisPlan: true,
        },
      });

      if (!user || user.role !== "PARTICIPANT") {
        logger.warn("User not found or not a participant", { participantId });
        return;
      }

      const salesforceRecord = this.mapUserToSalesforceRecord(user);

      // Upsert using System_ID__c as external ID
      const result = await this.apiService.upsertRecord(
        "Contact",
        "System_ID__c",
        participantId,
        salesforceRecord,
        userId
      );

      if (result.success && result.id) {
        await this.storeMapping("User", participantId, result.id, "Contact");
        logger.info("Synced participant to Salesforce", {
          participantId,
          salesforceId: result.id,
        });
      } else {
        logger.error("Failed to sync participant to Salesforce", {
          participantId,
          errors: result.errors,
        });
      }
    } catch (error) {
      logger.error("Error syncing participant to Salesforce", { error, participantId });
      throw error;
    }
  }

  /**
   * Sync NDIS Plan to Salesforce Custom Object (NDIS_Plan__c)
   */
  async syncNDISPlanToSalesforce(planId: string, userId?: string): Promise<void> {
    if (!this.config.syncSettings.syncNDISPlans) {
      return;
    }

    try {
      const plan = await prisma.nDISPlan.findUnique({
        where: { id: planId },
        include: {
          participant: true,
          planManager: true,
        },
      });

      if (!plan) {
        logger.warn("NDIS Plan not found", { planId });
        return;
      }

      const salesforceRecord = this.mapNDISPlanToSalesforceRecord(plan);

      // Upsert using System_ID__c as external ID
      // Note: You'll need to create NDIS_Plan__c custom object in Salesforce
      const result = await this.apiService.upsertRecord(
        "NDIS_Plan__c", // Custom object name - adjust as needed
        "System_ID__c",
        planId,
        salesforceRecord,
        userId
      );

      if (result.success && result.id) {
        await this.storeMapping("NDISPlan", planId, result.id, "NDIS_Plan__c");
        logger.info("Synced NDIS plan to Salesforce", { planId, salesforceId: result.id });
      } else {
        logger.error("Failed to sync NDIS plan to Salesforce", {
          planId,
          errors: result.errors,
        });
      }
    } catch (error) {
      logger.error("Error syncing NDIS plan to Salesforce", { error, planId });
      throw error;
    }
  }

  /**
   * Sync Care Plan to Salesforce
   */
  async syncCarePlanToSalesforce(planId: string, userId?: string): Promise<void> {
    if (!this.config.syncSettings.syncCarePlans) {
      return;
    }

    try {
      const plan = await prisma.carePlan.findUnique({
        where: { id: planId },
        include: {
          participant: true,
          worker: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!plan) {
        logger.warn("Care Plan not found", { planId });
        return;
      }

      // Map to Salesforce record
      const salesforceRecord: Record<string, any> = {
        Plan_Name__c: plan.planName,
        Participant_System_ID__c: plan.participantId,
        Worker_System_ID__c: plan.workerId,
        Status__c: plan.status,
        Start_Date__c: plan.startDate?.toISOString(),
        Review_Date__c: plan.reviewDate?.toISOString(),
        Goals__c: JSON.stringify(plan.goals),
        Services__c: JSON.stringify(plan.services),
        System_ID__c: plan.id,
      };

      const result = await this.apiService.upsertRecord(
        "Care_Plan__c", // Custom object name
        "System_ID__c",
        planId,
        salesforceRecord,
        userId
      );

      if (result.success && result.id) {
        await this.storeMapping("CarePlan", planId, result.id, "Care_Plan__c");
        logger.info("Synced care plan to Salesforce", { planId, salesforceId: result.id });
      }
    } catch (error) {
      logger.error("Error syncing care plan to Salesforce", { error, planId });
      throw error;
    }
  }

  /**
   * Sync Incident to Salesforce
   */
  async syncIncidentToSalesforce(incidentId: string, userId?: string): Promise<void> {
    if (!this.config.syncSettings.syncIncidents) {
      return;
    }

    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          participant: true,
        },
      });

      if (!incident) {
        logger.warn("Incident not found", { incidentId });
        return;
      }

      const salesforceRecord: Record<string, any> = {
        Incident_Type__c: incident.incidentType,
        Description__c: incident.description,
        Occurred_At__c: incident.occurredAt?.toISOString(),
        Participant_System_ID__c: incident.participantId,
        Status__c: incident.status,
        Location__c: incident.location,
        System_ID__c: incident.id,
      };

      const result = await this.apiService.upsertRecord(
        "Incident__c", // Custom object name
        "System_ID__c",
        incidentId,
        salesforceRecord,
        userId
      );

      if (result.success && result.id) {
        logger.info("Synced incident to Salesforce", { incidentId, salesforceId: result.id });
      }
    } catch (error) {
      logger.error("Error syncing incident to Salesforce", { error, incidentId });
      throw error;
    }
  }

  /**
   * Sync Complaint to Salesforce
   */
  async syncComplaintToSalesforce(complaintId: string, userId?: string): Promise<void> {
    if (!this.config.syncSettings.syncComplaints) {
      return;
    }

    try {
      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        include: {
          participant: true,
        },
      });

      if (!complaint) {
        logger.warn("Complaint not found", { complaintId });
        return;
      }

      const salesforceRecord: Record<string, any> = {
        Complaint_Number__c: complaint.complaintNumber,
        Source__c: complaint.source,
        Description__c: complaint.description,
        Participant_System_ID__c: complaint.participantId,
        Status__c: complaint.status,
        Service_Area__c: complaint.serviceArea,
        System_ID__c: complaint.id,
      };

      const result = await this.apiService.upsertRecord(
        "Complaint__c", // Custom object name
        "System_ID__c",
        complaintId,
        salesforceRecord,
        userId
      );

      if (result.success && result.id) {
        logger.info("Synced complaint to Salesforce", { complaintId, salesforceId: result.id });
      }
    } catch (error) {
      logger.error("Error syncing complaint to Salesforce", { error, complaintId });
      throw error;
    }
  }

  /**
   * Sync Risk to Salesforce
   */
  async syncRiskToSalesforce(riskId: string, userId?: string): Promise<void> {
    if (!this.config.syncSettings.syncRisks) {
      return;
    }

    try {
      const risk = await prisma.risk.findUnique({
        where: { id: riskId },
        include: {
          participant: true,
        },
      });

      if (!risk) {
        logger.warn("Risk not found", { riskId });
        return;
      }

      const salesforceRecord: Record<string, any> = {
        Title__c: risk.title,
        Description__c: risk.description,
        Risk_Level__c: risk.riskLevel,
        Status__c: risk.status,
        Category__c: risk.category,
        Participant_System_ID__c: risk.participantId,
        System_ID__c: risk.id,
      };

      const result = await this.apiService.upsertRecord(
        "Risk__c", // Custom object name
        "System_ID__c",
        riskId,
        salesforceRecord,
        userId
      );

      if (result.success && result.id) {
        logger.info("Synced risk to Salesforce", { riskId, salesforceId: result.id });
      }
    } catch (error) {
      logger.error("Error syncing risk to Salesforce", { error, riskId });
      throw error;
    }
  }

  /**
   * Sync Payment Transaction to Salesforce
   */
  async syncPaymentToSalesforce(paymentId: string, userId?: string): Promise<void> {
    if (!this.config.syncSettings.syncPayments) {
      return;
    }

    try {
      const payment = await prisma.paymentTransaction.findUnique({
        where: { id: paymentId },
        include: {
          participant: true,
          provider: true,
        },
      });

      if (!payment) {
        logger.warn("Payment transaction not found", { paymentId });
        return;
      }

      const salesforceRecord: Record<string, any> = {
        Participant_System_ID__c: payment.participantId,
        Provider_System_ID__c: payment.providerId,
        Amount__c: payment.amount?.toString(),
        Status__c: payment.status,
        Service_Code__c: payment.serviceCode,
        Service_Description__c: payment.serviceDescription,
        Plan_System_ID__c: payment.planId,
        System_ID__c: payment.id,
      };

      const result = await this.apiService.upsertRecord(
        "Payment_Transaction__c", // Custom object name
        "System_ID__c",
        paymentId,
        salesforceRecord,
        userId
      );

      if (result.success && result.id) {
        logger.info("Synced payment to Salesforce", { paymentId, salesforceId: result.id });
      }
    } catch (error) {
      logger.error("Error syncing payment to Salesforce", { error, paymentId });
      throw error;
    }
  }

  /**
   * Sync all participants (batch operation)
   */
  async syncAllParticipants(userId?: string): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    try {
      const participants = await prisma.user.findMany({
        where: { role: "PARTICIPANT" },
      });

      for (const participant of participants) {
        try {
          await this.syncParticipantToSalesforce(participant.id, userId);
          synced++;
        } catch (error) {
          logger.error("Failed to sync participant", {
            error,
            participantId: participant.id,
          });
          failed++;
        }
      }

      logger.info("Batch sync completed", { synced, failed, total: participants.length });
    } catch (error) {
      logger.error("Error in batch sync", { error });
      throw error;
    }

    return { synced, failed };
  }
}
