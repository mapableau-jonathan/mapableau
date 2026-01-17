/**
 * Profile Normalizer
 * Normalizes user profiles from different OAuth providers to a common format
 */

export interface NormalizedProfile {
  provider: string;
  providerAccountId: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
  rawProfile: any; // Original provider profile
}

/**
 * Normalize profile from Google OAuth
 */
export function normalizeGoogleProfile(profile: any): NormalizedProfile {
  return {
    provider: "google",
    providerAccountId: profile.id || profile.sub,
    email: profile.email || profile.emails?.[0]?.value || "",
    name: profile.name || profile.displayName || `${profile.given_name || ""} ${profile.family_name || ""}`.trim() || "User",
    image: profile.picture || profile.photos?.[0]?.value,
    emailVerified: profile.email_verified ?? profile.verified_email ?? false,
    rawProfile: profile,
  };
}

/**
 * Normalize profile from Facebook OAuth
 */
export function normalizeFacebookProfile(profile: any): NormalizedProfile {
  return {
    provider: "facebook",
    providerAccountId: profile.id,
    email: profile.email || profile.emails?.[0]?.value || "",
    name: profile.name || profile.displayName || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "User",
    image: profile.picture?.data?.url || profile.photos?.[0]?.value,
    emailVerified: profile.email_verified ?? false,
    rawProfile: profile,
  };
}

/**
 * Normalize profile from Microsoft Entra ID
 */
export function normalizeMicrosoftProfile(profile: any): NormalizedProfile {
  return {
    provider: "microsoft",
    providerAccountId: profile.id || profile.oid || profile.sub,
    email: profile.email || profile.mail || profile.userPrincipalName || "",
    name: profile.name || profile.displayName || `${profile.given_name || ""} ${profile.family_name || ""}`.trim() || "User",
    image: profile.picture || profile.photo,
    emailVerified: profile.email_verified ?? profile.verified ?? false,
    rawProfile: profile,
  };
}

/**
 * Normalize profile from Wix OAuth
 */
export function normalizeWixProfile(profile: any): NormalizedProfile {
  return {
    provider: "wix",
    providerAccountId: profile.id || profile.memberId || profile.userId || "",
    email: profile.email || profile.loginEmail || "",
    name: profile.name || profile.displayName || `${profile.firstName || ""} ${profile.lastName || ""}`.trim() || "User",
    image: profile.picture || profile.photo || profile.avatarUrl,
    emailVerified: profile.emailVerified ?? profile.verified ?? false,
    rawProfile: profile,
  };
}

/**
 * Normalize profile from any provider
 */
export function normalizeProfile(provider: string, profile: any): NormalizedProfile {
  switch (provider.toLowerCase()) {
    case "google":
      return normalizeGoogleProfile(profile);
    case "facebook":
      return normalizeFacebookProfile(profile);
    case "microsoft":
    case "azure-ad":
    case "azuread":
      return normalizeMicrosoftProfile(profile);
    case "wix":
      return normalizeWixProfile(profile);
    default:
      // Generic normalization for unknown providers
      return {
        provider: provider.toLowerCase(),
        providerAccountId: profile.id || profile.sub || profile.userId || "",
        email: profile.email || profile.emails?.[0]?.value || "",
        name: profile.name || profile.displayName || "User",
        image: profile.picture || profile.photo || profile.avatarUrl,
        emailVerified: profile.email_verified ?? profile.verified ?? false,
        rawProfile: profile,
      };
  }
}
