/**
 * Authentication Types
 * Shared types for role-based access control
 */

export type Role = "participant" | "worker" | "provider_admin" | "employer_admin" | "platform_admin";

export type VerificationStatus = "unverified" | "pending" | "verified" | "suspended" | "revoked";

export interface SessionUser {
  id: string;
  provider?: "google" | "microsoft" | "facebook" | "dev";
  email?: string;
  name?: string;
  roles: Role[];
  verificationStatus?: VerificationStatus;
  linkedProviders?: string[];
}
