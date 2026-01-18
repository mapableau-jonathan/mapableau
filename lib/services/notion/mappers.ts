/**
 * Notion Data Mappers
 * Convert between MapAble system models and Notion database properties
 */

import { User, NDISPlan, CarePlan, Incident, Complaint, Risk, PaymentTransaction, Worker } from "@prisma/client";

// Notion property types
type NotionPropertyValue =
  | { title: Array<{ text: { content: string } }> }
  | { rich_text: Array<{ text: { content: string } }> }
  | { number: number }
  | { date: { start: string; end?: string } | null }
  | { select: { name: string } | null }
  | { checkbox: boolean }
  | { relation: Array<{ id: string }> }
  | { email: string | null };

type NotionProperties = Record<string, NotionPropertyValue>;

/**
 * Map User (Participant) to Notion properties
 */
export function mapUserToNotionProperties(
  user: User & { ndisPlan?: NDISPlan | null }
): NotionProperties {
  const properties: NotionProperties = {
    Name: {
      title: [{ text: { content: user.name || user.email || "Unknown" } }],
    },
    Email: {
      email: user.email || null,
    },
    "Participant ID": {
      rich_text: [{ text: { content: user.id } }],
    },
    Status: {
      select: { name: user.role === "PARTICIPANT" ? "Active" : "Inactive" },
    },
    "System ID": {
      rich_text: [{ text: { content: user.id } }],
    },
  };

  // Add NDIS Plan relation if exists
  if (user.ndisPlan) {
    properties["NDIS Plan Number"] = {
      relation: [{ id: user.ndisPlan.id }], // This will be resolved to Notion page ID later
    };
  }

  return properties;
}

/**
 * Map NDISPlan to Notion properties
 */
export function mapNDISPlanToNotionProperties(
  plan: NDISPlan & { participant?: User | null; planManager?: User | null }
): NotionProperties {
  return {
    "Plan Number": {
      title: [{ text: { content: plan.planNumber } }],
    },
    Participant: {
      relation: plan.participant ? [{ id: plan.participant.id }] : [],
    },
    Status: {
      select: { name: plan.status },
    },
    "Total Budget": {
      number: Number(plan.totalBudget),
    },
    "Remaining Budget": {
      number: Number(plan.remainingBudget),
    },
    "Start Date": {
      date: { start: plan.startDate.toISOString().split("T")[0] },
    },
    "End Date": {
      date: { start: plan.endDate.toISOString().split("T")[0] },
    },
    "Plan Manager": {
      rich_text: plan.planManager
        ? [{ text: { content: plan.planManager.name || plan.planManager.email } }]
        : [],
    },
    "System ID": {
      rich_text: [{ text: { content: plan.id } }],
    },
  };
}

/**
 * Map CarePlan to Notion properties
 */
export function mapCarePlanToNotionProperties(
  plan: CarePlan & { participant?: User | null; worker?: Worker & { user?: User | null } | null }
): NotionProperties {
  const goalsText = Array.isArray(plan.goals)
    ? plan.goals
        .map((g: any) => `${g.description || ""} (Target: ${g.targetDate || ""}, Status: ${g.status || "ACTIVE"})`)
        .join("\n")
    : "";

  return {
    "Plan Name": {
      title: [{ text: { content: plan.planName } }],
    },
    Participant: {
      relation: plan.participant ? [{ id: plan.participant.id }] : [],
    },
    Worker: {
      rich_text: plan.worker?.user
        ? [{ text: { content: plan.worker.user.name || plan.worker.user.email } }]
        : [],
    },
    Status: {
      select: { name: plan.status },
    },
    "Start Date": {
      date: { start: plan.startDate.toISOString().split("T")[0] },
    },
    "Review Date": {
      date: { start: plan.reviewDate.toISOString().split("T")[0] },
    },
    Goals: {
      rich_text: [{ text: { content: goalsText } }],
    },
    "System ID": {
      rich_text: [{ text: { content: plan.id } }],
    },
  };
}

/**
 * Map Incident to Notion properties
 */
export function mapIncidentToNotionProperties(
  incident: Incident & { participant?: User | null }
): NotionProperties {
  return {
    "Incident Type": {
      select: { name: incident.incidentType },
    },
    Participant: {
      relation: incident.participant ? [{ id: incident.participant.id }] : [],
    },
    Description: {
      rich_text: [{ text: { content: incident.description } }],
    },
    "Occurred At": {
      date: { start: incident.occurredAt.toISOString().split("T")[0] },
    },
    Status: {
      select: { name: incident.status },
    },
    "NDIS Reported": {
      checkbox: incident.ndisReported,
    },
    "System ID": {
      rich_text: [{ text: { content: incident.id } }],
    },
  };
}

/**
 * Map Complaint to Notion properties
 */
export function mapComplaintToNotionProperties(
  complaint: Complaint & { participant?: User | null }
): NotionProperties {
  return {
    "Complaint Number": {
      title: [{ text: { content: complaint.complaintNumber } }],
    },
    Participant: {
      relation: complaint.participant ? [{ id: complaint.participant.id }] : [],
    },
    Source: {
      select: { name: complaint.source },
    },
    Description: {
      rich_text: [{ text: { content: complaint.description } }],
    },
    Status: {
      select: { name: complaint.status },
    },
    "Received At": {
      date: { start: complaint.receivedAt.toISOString().split("T")[0] },
    },
    "System ID": {
      rich_text: [{ text: { content: complaint.id } }],
    },
  };
}

/**
 * Map Risk to Notion properties
 */
export function mapRiskToNotionProperties(risk: Risk & { participant?: User | null }): NotionProperties {
  return {
    Title: {
      title: [{ text: { content: risk.title } }],
    },
    Participant: {
      relation: risk.participant ? [{ id: risk.participant.id }] : [],
    },
    "Risk Level": {
      select: { name: risk.riskLevel },
    },
    Status: {
      select: { name: risk.status },
    },
    Category: {
      rich_text: [{ text: { content: risk.category } }],
    },
    "System ID": {
      rich_text: [{ text: { content: risk.id } }],
    },
  };
}

/**
 * Map PaymentTransaction to Notion properties
 */
export function mapPaymentToNotionProperties(
  payment: PaymentTransaction & {
    participant?: User | null;
    provider?: User | null;
  }
): NotionProperties {
  return {
    "Transaction ID": {
      title: [{ text: { content: payment.id } }],
    },
    Participant: {
      relation: payment.participant ? [{ id: payment.participant.id }] : [],
    },
    Provider: {
      rich_text: payment.provider
        ? [{ text: { content: payment.provider.name || payment.provider.email } }]
        : [],
    },
    Amount: {
      number: Number(payment.amount),
    },
    Status: {
      select: { name: payment.status },
    },
    "Service Code": {
      rich_text: [{ text: { content: payment.serviceCode } }],
    },
    "Created At": {
      date: { start: payment.createdAt.toISOString().split("T")[0] },
    },
    "System ID": {
      rich_text: [{ text: { content: payment.id } }],
    },
  };
}

/**
 * Map Notion page to User (reverse mapping)
 */
export function mapNotionPageToUser(page: any): Partial<User> {
  const properties = page.properties || {};
  
  return {
    name: properties.Name?.title?.[0]?.text?.content || undefined,
    email: properties.Email?.email || undefined,
    // Note: ID mapping handled separately via System ID
  };
}

/**
 * Map Notion page to NDISPlan (reverse mapping)
 */
export function mapNotionPageToNDISPlan(page: any): Partial<NDISPlan> {
  const properties = page.properties || {};
  
  return {
    planNumber: properties["Plan Number"]?.title?.[0]?.text?.content || undefined,
    status: properties.Status?.select?.name as any,
    totalBudget: properties["Total Budget"]?.number ? BigInt(Math.round(properties["Total Budget"].number * 100)) : undefined,
    remainingBudget: properties["Remaining Budget"]?.number ? BigInt(Math.round(properties["Remaining Budget"].number * 100)) : undefined,
    startDate: properties["Start Date"]?.date?.start ? new Date(properties["Start Date"].date.start) : undefined,
    endDate: properties["End Date"]?.date?.start ? new Date(properties["End Date"].date.start) : undefined,
  };
}

/**
 * Map Notion page to CarePlan (reverse mapping)
 */
export function mapNotionPageToCarePlan(page: any): Partial<CarePlan> {
  const properties = page.properties || {};
  
  return {
    planName: properties["Plan Name"]?.title?.[0]?.text?.content || undefined,
    status: properties.Status?.select?.name || undefined,
    startDate: properties["Start Date"]?.date?.start ? new Date(properties["Start Date"].date.start) : undefined,
    reviewDate: properties["Review Date"]?.date?.start ? new Date(properties["Review Date"].date.start) : undefined,
    // Goals would need parsing from rich_text
  };
}

/**
 * Map Notion page to Incident (reverse mapping)
 */
export function mapNotionPageToIncident(page: any): Partial<Incident> {
  const properties = page.properties || {};
  
  return {
    incidentType: properties["Incident Type"]?.select?.name as any,
    description: properties.Description?.rich_text?.[0]?.text?.content || undefined,
    occurredAt: properties["Occurred At"]?.date?.start ? new Date(properties["Occurred At"].date.start) : undefined,
    status: properties.Status?.select?.name as any,
    ndisReported: properties["NDIS Reported"]?.checkbox || false,
  };
}

/**
 * Map Notion page to Complaint (reverse mapping)
 */
export function mapNotionPageToComplaint(page: any): Partial<Complaint> {
  const properties = page.properties || {};
  
  return {
    complaintNumber: properties["Complaint Number"]?.title?.[0]?.text?.content || undefined,
    source: properties.Source?.select?.name as any,
    description: properties.Description?.rich_text?.[0]?.text?.content || undefined,
    status: properties.Status?.select?.name as any,
    receivedAt: properties["Received At"]?.date?.start ? new Date(properties["Received At"].date.start) : undefined,
  };
}

/**
 * Map Notion page to Risk (reverse mapping)
 */
export function mapNotionPageToRisk(page: any): Partial<Risk> {
  const properties = page.properties || {};
  
  return {
    title: properties.Title?.title?.[0]?.text?.content || undefined,
    riskLevel: properties["Risk Level"]?.select?.name as any,
    status: properties.Status?.select?.name as any,
    category: properties.Category?.rich_text?.[0]?.text?.content || undefined,
  };
}

/**
 * Map Notion page to PaymentTransaction (reverse mapping)
 */
export function mapNotionPageToPayment(page: any): Partial<PaymentTransaction> {
  const properties = page.properties || {};
  
  return {
    amount: properties.Amount?.number ? BigInt(Math.round(properties.Amount.number * 100)) : undefined,
    status: properties.Status?.select?.name as any,
    serviceCode: properties["Service Code"]?.rich_text?.[0]?.text?.content || undefined,
    createdAt: properties["Created At"]?.date?.start ? new Date(properties["Created At"].date.start) : undefined,
  };
}

/**
 * Extract System ID from Notion page
 */
export function extractSystemIdFromNotionPage(page: any): string | null {
  const properties = page.properties || {};
  const systemId = properties["System ID"]?.rich_text?.[0]?.text?.content;
  return systemId || null;
}
