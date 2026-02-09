/**
 * Single source of truth for app branding (frontend + backend).
 * MapAble: accessibility map and NDIS provider finder at https://mapable.com.au
 * Set NEXT_PUBLIC_BRAND= to switch back to .
 */

const BRAND = process.env.NEXT_PUBLIC_BRAND === "" ? "" : "mapable";

export const APP_NAME = BRAND === "mapable" ? "MapAble" : "";
export const APP_TAGLINE =
  BRAND === "mapable"
    ? "Your accessibility map"
    : "Your Online Accessible Library";
export const APP_DESCRIPTION =
  BRAND === "mapable"
    ? "Find accessible places and NDIS providers. Map your access with dignity and equality."
    : "Accessible books and literature for everyone. Audio, braille, large print and ebooks—supporting dignity, equality and inclusion in reading.";

/** Canonical site URL. Defaults to localhost:3002 in development, else https://mapable.com.au */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof process !== "undefined" && process.env.NODE_ENV === "development"
    ? "http://localhost:3002"
    : "https://mapable.com.au");

/** Path under /public for the main logo (no leading slash). Override with NEXT_PUBLIC_LOGO_PATH. */
export const LOGO_PATH =
  process.env.NEXT_PUBLIC_LOGO_PATH ??
  (BRAND === "mapable" ? "mapable-logo.png" : "-logo.png");

/** If set, header uses this image instead of the MapAble SVG logo. */
export const USE_LOGO_IMAGE = !!process.env.NEXT_PUBLIC_LOGO_PATH;
