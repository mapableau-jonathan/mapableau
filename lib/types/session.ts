/**
 * Session User Type
 * Minimal session payload for MapAble OAuth authentication
 */

export type Provider = "google" | "microsoft" | "facebook";

export interface SessionUser {
  id: string; // Provider profile ID
  provider: Provider;
  email?: string;
  name?: string;
  roles: string[]; // Default: ["participant"]
  verificationStatus: "unverified" | "verified" | "rejected";
  linkedProviders?: Provider[]; // Other OAuth providers linked to same email
}
