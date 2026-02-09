/**
 * Routing & Slug Provisioning System
 *
 * Re-exports from lib/router (universal router) plus slug utilities and API routes.
 */

import { buildPath } from "./router";

/** Slug character set: lowercase a-z, 0-9, hyphens only */
const SLUG_REGEX = /^[a-z0-9-]+$/;
const SLUG_MAX_LENGTH = 100;

/**
 * Convert a display name to a URL-safe slug.
 * - Lowercase, trim, replace spaces with hyphens, strip non-alphanumeric (except -)
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "unknown";
}

/** Validate a slug string. */
export function isValidSlug(slug: string): boolean {
  return (
    typeof slug === "string" &&
    slug.length > 0 &&
    slug.length <= SLUG_MAX_LENGTH &&
    SLUG_REGEX.test(slug)
  );
}

/**
 * Stable key for matching an outlet to a claimed profile.
 * Format: ABN-slugify(Outletname)-slugify(Address)
 */
export function outletKey(
  abn: string,
  outletName: string,
  address: string,
): string {
  return `${abn}-${slugify(outletName)}-${slugify(address)}`;
}

// ─── Route paths (from universal router) ──────────────────────────────────────

export const ROUTES = {
  home: "/",
  providerFinder: "/provider-finder",
  outletProfile: (slug: string) => buildPath("outletProfile", { slug }),
  claimedProfile: (slug: string) => buildPath("claimedProfile", { slug }),
  profile: (slug: string) => buildPath("claimedProfile", { slug }),
  jonathan: "/jonathan",
  jonathanDashboard: "/jonathan/dashboard",
  jonathanParticipant: "/jonathan/participant",
  jonathanParticipantProfile: (slug: string) =>
    buildPath("jonathanParticipantProfile", { slug }),
  jonathanEmulate: "/jonathan/emulate",
  login: "/login",
  register: "/register",
  providerRegister: "/register/provider",
  onboarding: "/onboarding",
  dashboard: "/dashboard",
  map: "/map",
} as const;

// ─── API paths ───────────────────────────────────────────────────────────────

export const API_ROUTES = {
  profiles: {
    claim: "/api/profiles/claim",
    claimed: (outletKey: string) =>
      `/api/profiles/claimed?outletKey=${encodeURIComponent(outletKey)}`,
    profile: (slug: string) => `/api/profiles/${encodeURIComponent(slug)}`,
    mine: "/api/profiles/mine",
    verify: (token: string) => `/api/profiles/verify?token=${encodeURIComponent(token)}`,
  },
  participants: {
    me: "/api/participants/me",
    bySlug: (slug: string) => `/api/participants/${encodeURIComponent(slug)}`,
  },
} as const;

// ─── Slug provisioning ───────────────────────────────────────────────────────

export type SlugProvisioning = {
  /** Generate slug for an outlet-sourced provider (from name). */
  fromOutletName: (name: string) => string;

  /** Ensure unique slug; append suffix if collision. */
  ensureUnique: (
    baseSlug: string,
    exists: (slug: string) => boolean | Promise<boolean>,
  ) => Promise<string>;
};

export const slugProvisioning: SlugProvisioning = {
  fromOutletName: (name) => slugify(name),

  async ensureUnique(baseSlug, exists) {
    let slug = baseSlug;
    let n = 0;
    while (await Promise.resolve(exists(slug))) {
      n += 1;
      slug = `${baseSlug}-${Date.now().toString(36)}${n > 1 ? `-${n}` : ""}`;
    }
    return slug;
  },
};
