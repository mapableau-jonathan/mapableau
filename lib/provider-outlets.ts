// todo: move out of lib

import type { Provider } from "@/app/provider-finder/providers";

/**
 * Fetches up to 100 nearest provider outlets from the database (by lat/lng).
 * Uses `/api/provider-finder/nearby` (server Haversine + Prisma).
 */
/** Load one outlet by database id (profile links). */
export async function fetchProviderOutletById(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<Provider | null> {
  const base =
    typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_ORIGIN ?? "");
  const res = await fetch(
    `${base}/api/provider-finder/outlet?id=${encodeURIComponent(id)}`,
    { signal: options?.signal },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? `Failed to load provider: ${res.status}`);
  }
  const body = (await res.json()) as { provider?: Provider };
  return body.provider ?? null;
}
