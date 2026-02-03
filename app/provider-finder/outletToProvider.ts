import type { ProviderOutlet } from "@/data/provider-outlets.types";

import type { Provider } from "./providers";
import { regGroupIndicesToCategories } from "./regGroupOptions";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

type LocationParsed = { suburb: string; state: string; postcode: string };

/** Parse Address "..., Suburb, STATE Postcode" or fallback to "Suburb State Postcode" (Head_Office) */
function parseAddress(address: string): LocationParsed | null {
  const raw = address.trim();
  if (!raw || raw.toUpperCase() === "CONFIDENTIAL") return null;
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1] ?? "";
    const lastParts = last.split(/\s+/).filter(Boolean);
    const postcode = lastParts[lastParts.length - 1] ?? "";
    const state = lastParts[lastParts.length - 2] ?? "";
    const suburb = parts[parts.length - 2] ?? "";
    return { suburb, state, postcode };
  }
  if (parts.length === 1) {
    const tokens = parts[0].split(/\s+/).filter(Boolean);
    if (tokens.length >= 3) {
      const postcode = tokens[tokens.length - 1] ?? "";
      const state = tokens[tokens.length - 2] ?? "";
      const suburb = tokens.slice(0, -2).join(" ");
      return { suburb, state, postcode };
    }
    if (tokens.length === 2) {
      return { suburb: tokens[0] ?? "", state: tokens[1] ?? "", postcode: "" };
    }
    return { suburb: parts[0], state: "", postcode: "" };
  }
  return null;
}

/** Parse "Suburb State Postcode" (e.g. Head_Office) into suburb, state, postcode */
function parseHeadOffice(headOffice: string): LocationParsed {
  const parts = headOffice.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    const postcode = parts[parts.length - 1] ?? "";
    const state = parts[parts.length - 2] ?? "";
    const suburb = parts.slice(0, -2).join(" ");
    return { suburb, state, postcode };
  }
  if (parts.length === 2) {
    return { suburb: parts[0] ?? "", state: parts[1] ?? "", postcode: "" };
  }
  return { suburb: headOffice, state: "", postcode: "" };
}

export function mapOutletToProvider(
  o: ProviderOutlet,
  index: number,
): Provider {
  const parsed = parseAddress(o.Address) ?? parseHeadOffice(o.Head_Office);
  const { suburb, postcode } = parsed;
  const name = (o.Prov_N?.trim() || o.Outletname?.trim() || "Unknown").trim();
  const categories = regGroupIndicesToCategories(o.RegGroup);
  const prfsnCategories = o.prfsn
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  const categoriesMerged =
    categories.length > 0
      ? categories
      : prfsnCategories.length > 0
        ? prfsnCategories
        : [];
  const id =
    `${o.ABN}-${index}-${slugify(name).slice(0, 30)}` || `outlet-${index}`;

  const outletName = (o.Outletname || o.Prov_N || "unknown").trim();
  const outletAddr = (o.Address || o.Head_Office || "").trim();
  const outletKey =
    `${o.ABN}-${slugify(outletName)}-${slugify(outletAddr)}` || undefined;

  return {
    id,
    slug: slugify(name) || id,
    outletKey,
    name,
    suburb: suburb || "—",
    state: (parsed.state || o.State_cd) as Provider["state"],
    postcode: postcode || String(o.Post_cd),
    distanceKm: 0,
    rating: 0,
    reviewCount: 0,
    registered: o.Active === 1,
    categories: categoriesMerged,
    supports: ["In-person"],
    latitude: o.Latitude !== 0 ? o.Latitude : undefined,
    longitude: o.Longitude !== 0 ? o.Longitude : undefined,
    phone: o.Phone?.trim() || undefined,
    email: o.Email?.trim() || undefined,
    website: o.Website?.trim() || undefined,
    abn: o.ABN?.trim() || undefined,
    openingHours: o.opnhrs?.trim() || undefined,
  };
}

export function mapOutletsToProviders(outlets: ProviderOutlet[]): Provider[] {
  return outlets.map((o, i) => mapOutletToProvider(o, i));
}
