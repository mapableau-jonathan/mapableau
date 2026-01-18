/**
 * Prisma Types Export
 * Re-export Prisma types for use in frontend components and API routes
 * Note: Prisma Client should only be used server-side (API routes, server components)
 */

// Re-export commonly used Prisma types
export type {
  User,
  UserRole,
  NDISPlan,
  NDISPlanStatus,
  CarePlan,
  Incident,
  IncidentType,
  IncidentStatus,
  Complaint,
  ComplaintSource,
  ComplaintStatus,
  Risk,
  RiskLevel,
  RiskStatus,
  PaymentTransaction,
  Worker,
  Provider,
  Business,
  Policy,
  PolicyCategory,
  PolicyStatus,
  Advertiser,
  Publisher,
  AdCampaign,
  TokenVoucher,
  BudgetCategory,
  RedemptionRequest,
  NotionSyncMapping,
} from "@prisma/client";

// Re-export Prisma namespace for advanced types
export type { Prisma } from "@prisma/client";

// Helper types for API responses
export type UserWithRelations = User & {
  ndisPlan?: NDISPlan | null;
  worker?: Worker | null;
  publisherAccount?: any | null;
  advertiserAccount?: any | null;
};

export type NDISPlanWithRelations = NDISPlan & {
  participant?: User | null;
  planManager?: User | null;
  categories?: any[];
};

export type CarePlanWithRelations = CarePlan & {
  participant?: User | null;
  worker?: Worker & { user?: User | null } | null;
};

export type PaymentWithRelations = PaymentTransaction & {
  participant?: User | null;
  provider?: User | null;
  plan?: NDISPlan | null;
};
