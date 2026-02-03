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

/** Parse "Suburb State Postcode" or "Suburb State 1234" into suburb, state, postcode */
function parseHeadOffice(headOffice: string): {
  suburb: string;
  state: string;
  postcode: string;
} {
  const parts = headOffice.trim().split(/\s+/);
  if (parts.length >= 3) {
    const postcode = parts[parts.length - 1] ?? "";
    const state = parts[parts.length - 2] ?? "";
    const suburb = parts.slice(0, -2).join(" ");
    return { suburb, state, postcode };
  }
  if (parts.length === 2) {
    return {
      suburb: parts[0] ?? "",
      state: parts[1] ?? "",
      postcode: "",
    };
  }
  return { suburb: headOffice, state: "", postcode: "" };
}

export function mapOutletToProvider(
  o: ProviderOutlet,
  index: number
): Provider {
  const { suburb, postcode } = parseHeadOffice(o.Head_Office);
  const name = (o.Outletname?.trim() || o.Prov_N?.trim() || "Unknown").trim();
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
    `${o.ABN}-${index}-${slugify(name).slice(0, 30)}` ||
    `outlet-${index}`;

  return {
    id,
    slug: slugify(name) || id,
    name,
    suburb: suburb || "—",
    state: o.State_cd,
    postcode: postcode || String(o.Post_cd),
    distanceKm: 0,
    rating: 0,
    reviewCount: 0,
    registered: o.Active === 1,
    categories: categoriesMerged,
    supports: ["In-person"],
    latitude: o.Latitude !== 0 ? o.Latitude : undefined,
    longitude: o.Longitude !== 0 ? o.Longitude : undefined,
  };
}

export function mapOutletsToProviders(outlets: ProviderOutlet[]): Provider[] {
  return outlets.map((o, i) => mapOutletToProvider(o, i));
}
