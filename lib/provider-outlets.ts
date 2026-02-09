import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { ProviderOutlet } from "@/data/provider-outlets.types";
import { parseResponseJson } from "@/lib/utils";

/**
 * Live NDIS provider list (server-side fetch to avoid CORS).
 * When set, getProviderOutlets() and GET /api/providers/outlets use this instead of local JSON.
 */
export const NDIS_PROVIDER_LIST_URL =
  "https://www.ndis.gov.au/sites/default/files/react_extract/provider_finder/build/data/list-providers.json";

/**
 * URL for provider-outlets JSON served from public/ (Next.js serves public/ at site root).
 * File lives at public/data/provider-outlets.json → URL /data/provider-outlets.json
 */
export const PROVIDER_OUTLETS_JSON_URL = "/data/provider-outlets.json";

/** Outlets API path: server proxies NDIS or local file. */
export const PROVIDER_OUTLETS_API_PATH = "/api/providers/outlets";

let outletsCache: ProviderOutlet[] | null = null;

/** Normalize NDIS or local JSON response to ProviderOutlet[]. */
function normalizeToOutlets(raw: unknown): ProviderOutlet[] {
  if (Array.isArray(raw)) return raw as ProviderOutlet[];
  if (raw && typeof raw === "object" && "data" in raw && Array.isArray((raw as { data: unknown }).data)) {
    return (raw as { data: ProviderOutlet[] }).data;
  }
  return [];
}

/**
 * Fetch provider outlets from NDIS live list (server-only). Cached for the process lifetime.
 */
async function fetchFromNdisProviderList(): Promise<ProviderOutlet[]> {
  const url =
    (process.env.NDIS_PROVIDER_LIST_URL?.trim()) || NDIS_PROVIDER_LIST_URL;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`NDIS provider list failed: ${res.status} ${res.statusText}`);
  }
  const raw = await parseResponseJson<unknown>(res);
  const data = normalizeToOutlets(raw ?? null);
  if (data.length === 0) {
    throw new Error("NDIS provider list returned no outlets");
  }
  return data;
}

/**
 * Load provider outlets from NDIS live list (default) or from filesystem when disabled (server-only).
 * Set NDIS_PROVIDER_LIST_URL="" or "off" to use local public/data/provider-outlets.json.
 * Cached for the process lifetime. Use in API routes.
 */
export async function getProviderOutlets(): Promise<ProviderOutlet[]> {
  if (outletsCache) return outletsCache;
  const envUrl = process.env.NDIS_PROVIDER_LIST_URL;
  const useNdis = envUrl !== "off" && envUrl !== "";
  if (useNdis) {
    try {
      outletsCache = await fetchFromNdisProviderList();
      return outletsCache;
    } catch (e) {
      if (envUrl) throw e;
      outletsCache = null;
    }
  }
  const path = join(process.cwd(), "public", "data", "provider-outlets.json");
  const raw = await readFile(path, "utf-8");
  const json = JSON.parse(raw) as { data?: ProviderOutlet[] };
  const data = normalizeToOutlets(json.data ?? json);
  if (data.length === 0) return [];
  outletsCache = data;
  return data;
}

export type {
  ProviderOutlet,
  OutletFlag,
  StateCode,
} from "@/data/provider-outlets.types";
