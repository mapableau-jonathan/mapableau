import type { VerificationType, VerificationStatus } from "@prisma/client";

export type VerificationProvider = "chandler" | "privy" | "vsure" | "checkworkrights" | "oho" | "ndis" | "usi" | "manual";

export interface IdentityVerificationData {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  documentType: "drivers_licence" | "passport";
  documentNumber: string;
  state?: string; // For driver's licence
  expiryDate?: string; // ISO date string
}

export interface VEVOVerificationData {
  passportNumber: string;
  dateOfBirth: string; // ISO date string
  firstName: string;
  lastName: string;
  visaGrantNumber?: string;
  transactionReferenceNumber?: string;
}

export interface WWCCVerificationData {
  wwccNumber: string;
  state: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  expiryDate?: string; // ISO date string
}

export interface NDISVerificationData {
  screeningId?: string;
  applicationId?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string
  employerId: string;
}

export interface FirstAidVerificationData {
  certificateNumber?: string;
  rtoNumber?: string;
  unitCode?: string; // e.g., "HLTAID011"
  issueDate?: string; // ISO date string
  expiryDate?: string; // ISO date string
  usiNumber?: string; // Unique Student Identifier
}

export interface VerificationConfig {
  identityProvider: "chandler" | "privy";
  vevoProvider: "vsure" | "checkworkrights";
  enableWWCC: boolean;
  enableNDIS: boolean;
  enableFirstAid: boolean;
}
