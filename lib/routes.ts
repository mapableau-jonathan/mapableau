/**
 * Routing & Slug Provisioning System
 *
 * Central definitions for URL paths, slug generation, and resolution.
 * Use these helpers instead of hardcoding route strings.
 */

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

// ─── Route paths ─────────────────────────────────────────────────────────────

export const ROUTES = {
  /** Provider Finder: browse outlet-sourced providers */
  providerFinder: "/provider-finder",

  /** Outlet profile (read-only, from JSON). Redirects to claimed if exists. */
  outletProfile: (slug: string) => `/jonathan/profile/${encodeURIComponent(slug)}`,

  /** Claimed profile (editable, from DB) */
  claimedProfile: (slug: string) => `/profiles/${encodeURIComponent(slug)}`,

  /** Profile by slug: prefer claimed, fallback to outlet. Use outletProfile for outlet-first entry. */
  profile: (slug: string) => `/profiles/${slug}`,

  login: "/login",
  register: "/register",
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
    verify: (token: string) => `/api/profiles/verify?token=${encodeURIComponent(token)}`,
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
