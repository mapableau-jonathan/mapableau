import type { ProviderOutlet } from "@/data/provider-outlets.types";

/**
 * URL for provider-outlets JSON served from public/ (Next.js serves public/ at site root).
 * File lives at public/data/provider-outlets.json → URL /data/provider-outlets.json
 */
export const PROVIDER_OUTLETS_JSON_URL = "/data/provider-outlets.json";

/**
 * Fetches provider/outlet records from the public JSON (public/data/provider-outlets.json).
 * Use in client or server; returns typed ProviderOutlet[].
 */
export async function fetchProviderOutlets(
  requestInit?: RequestInit,
): Promise<ProviderOutlet[]> {
  const base =
    typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_ORIGIN ?? "");
  const url = `${base}${PROVIDER_OUTLETS_JSON_URL}`;
  const res = await fetch(url, requestInit);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch provider outlets: ${res.status} ${res.statusText}`,
    );
  }
  const raw = (await res.json()) as { data: ProviderOutlet[] };
  const data = raw.data;
  if (!data || !Array.isArray(data)) {
    throw new Error("Provider outlets response is not an array or is empty");
  }
  return data;
}

export type {
  ProviderOutlet,
  OutletFlag,
  StateCode,
} from "@/data/provider-outlets.types";
