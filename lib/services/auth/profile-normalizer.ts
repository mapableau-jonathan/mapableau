/**
 * Profile Normalizer
 * Normalizes user profiles from different OAuth providers to a consistent format
 */

export interface NormalizedProfile {
  provider: string;
  providerAccountId: string;
  email: string;
  name: string;
  image?: string;
  emailVerified: boolean;
  rawProfile: any;
  additionalData?: Record<string, any>;
}

/**
 * Normalize profile from Google OAuth
 */
export function normalizeGoogleProfile(profile: any): NormalizedProfile {
  return {
    provider: "google",
    providerAccountId: profile.id || profile.sub,
    email: profile.emails?.[0]?.value || profile.email,
    name: profile.displayName || profile.name || `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim(),
    image: profile.photos?.[0]?.value || profile.picture,
    emailVerified: profile.email_verified ?? profile.emails?.[0]?.verified ?? false,
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
    email: profile.emails?.[0]?.value || profile.email,
    name: profile.displayName || profile.name || `${profile.name?.givenName || ""} ${profile.name?.familyName || ""}`.trim(),
    image: profile.photos?.[0]?.value || profile.picture?.data?.url,
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
    providerAccountId: profile.id || profile.oid,
    email: profile.mail || profile.userPrincipalName || profile.email,
    name: profile.displayName || profile.name || `${profile.givenName || ""} ${profile.surname || ""}`.trim(),
    image: null, // Microsoft Graph doesn't provide profile image in standard OAuth flow
    emailVerified: profile.email_verified ?? true, // Microsoft accounts are typically verified
    rawProfile: profile,
    additionalData: {
      tenantId: profile.tid,
      upn: profile.userPrincipalName,
    },
  };
}

/**
 * Normalize profile from Wix OAuth
 */
export function normalizeWixProfile(profile: any): NormalizedProfile {
  return {
    provider: "wix",
    providerAccountId: profile.id || profile.memberId,
    email: profile.email,
    name: profile.name || profile.displayName || `${profile.firstName || ""} ${profile.lastName || ""}`.trim(),
    image: profile.imageUrl || profile.photo,
    emailVerified: profile.emailVerified ?? profile.verified ?? false,
    rawProfile: profile,
    additionalData: {
      memberId: profile.memberId,
      customFields: profile.customFields,
      roles: profile.roles,
    },
  };
}

/**
 * Normalize profile from Replit
 */
export function normalizeReplitProfile(profile: any): NormalizedProfile {
  return {
    provider: "replit",
    providerAccountId: profile.id || profile.userId,
    email: profile.email,
    name: profile.name || profile.displayName || profile.username,
    image: profile.image || profile.avatarUrl,
    emailVerified: profile.emailVerified ?? true, // Replit emails are typically verified
    rawProfile: profile,
    additionalData: {
      username: profile.username,
      bio: profile.bio,
      url: profile.url,
    },
  };
}

/**
 * Normalize profile from MediaWiki
 */
export function normalizeMediaWikiProfile(profile: any): NormalizedProfile {
  return {
    provider: "mediawiki",
    providerAccountId: profile.id?.toString() || profile.userid?.toString(),
    email: profile.email || "",
    name: profile.realname || profile.name,
    image: undefined, // MediaWiki doesn't provide profile images in standard OAuth
    emailVerified: profile.email ? true : false,
    rawProfile: profile,
    additionalData: {
      groups: profile.groups || [],
      mediaWikiId: profile.id,
    },
  };
}

/**
 * Normalize profile from SAML assertion
 */
export function normalizeSAMLProfile(profile: any): NormalizedProfile {
  return {
    provider: "saml",
    providerAccountId: profile.nameID || profile.id || profile.email || "",
    email: profile.email || "",
    name: profile.name || profile.displayName || profile.cn || "",
    image: profile.picture || profile.photo || profile.thumbnailPhoto,
    emailVerified: profile.email ? true : false, // SAML assertions are typically from trusted IdPs
    rawProfile: profile,
    additionalData: {
      nameID: profile.nameID,
      attributes: profile.attributes || {},
    },
  };
}

/**
 * Normalize profile from generic OAuth2 provider
 */
export function normalizeOAuth2Profile(profile: any, provider: string): NormalizedProfile {
  return {
    provider,
    providerAccountId: profile.id || profile.sub || profile.user_id,
    email: profile.email || profile.emails?.[0]?.value,
    name: profile.name || profile.display_name || profile.displayName || profile.username,
    image: profile.picture || profile.avatar_url || profile.photo,
    emailVerified: profile.email_verified ?? profile.verified ?? false,
    rawProfile: profile,
  };
}

/**
 * Normalize profile based on provider type
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
    case "replit":
      return normalizeReplitProfile(profile);
    case "mediawiki":
      return normalizeMediaWikiProfile(profile);
    case "saml":
      return normalizeSAMLProfile(profile);
    default:
      return normalizeOAuth2Profile(profile, provider);
  }
}

/**
 * Validate normalized profile
 */
export function validateNormalizedProfile(profile: NormalizedProfile): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile.provider) {
    errors.push("Provider is required");
  }

  if (!profile.providerAccountId) {
    errors.push("Provider account ID is required");
  }

  if (!profile.email) {
    errors.push("Email is required");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profile.email)) {
      errors.push("Invalid email format");
    }
  }

  if (!profile.name || profile.name.trim().length === 0) {
    errors.push("Name is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
