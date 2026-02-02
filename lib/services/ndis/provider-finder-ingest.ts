/**
 * NDIS Provider Finder ingest
 * Fetches list-providers.json from ndis.gov.au and upserts into NdisFinderProvider.
 * Uses ETag caching to skip re-processing when the source has not changed.
 */

import type { PrismaClient } from "@prisma/client";

const SOURCE_URL =
  "https://www.ndis.gov.au/sites/default/files/react_extract/provider_finder/build/data/list-providers.json";

async function fetchWithCaching(etag?: string): Promise<
  | { changed: false }
  | { changed: true; newEtag: string | undefined; text: string }
> {
  const res = await fetch(SOURCE_URL, {
    headers: {
      accept: "application/json",
      "user-agent": "MapAble-NDIS-Provider-Import/1.0 (non-commercial)",
      ...(etag ? { "if-none-match": etag } : {}),
    },
    signal: AbortSignal.timeout(120_000),
  });

  if (res.status === 304) return { changed: false };

  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const newEtag = res.headers.get("etag") ?? undefined;
  const text = await res.text();
  return { changed: true, newEtag, text };
}

/** Raw provider object from NDIS JSON (flexible shape) */
export type NdisRawProvider = Record<string, unknown> & {
  id?: string;
  providerNumber?: string;
  registrationNumber?: string;
  name?: string;
  businessName?: string;
  abn?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  registrationGroups?: string[];
  supportCategories?: string[];
  [key: string]: unknown;
};

function extractExternalId(p: NdisRawProvider): string {
  const id =
    p.id ??
    p.providerNumber ??
    p.registrationNumber ??
    (p as { provider_id?: string }).provider_id;
  if (typeof id === "string") return id;
  if (typeof id === "number") return String(id);
  return `row-${JSON.stringify(p).slice(0, 50)}`;
}

function extractName(p: NdisRawProvider): string | null {
  const name =
    p.name ?? p.businessName ?? (p as { business_name?: string }).business_name;
  return typeof name === "string" ? name : null;
}

function extractAbn(p: NdisRawProvider): string | null {
  const abn = p.abn;
  return typeof abn === "string" ? abn : null;
}

function extractSuburb(p: NdisRawProvider): string | null {
  const suburb = p.suburb ?? (p as { locality?: string }).locality;
  return typeof suburb === "string" ? suburb : null;
}

function extractState(p: NdisRawProvider): string | null {
  const state = p.state ?? (p as { state_territory?: string }).state_territory;
  return typeof state === "string" ? state : null;
}

function extractPostcode(p: NdisRawProvider): string | null {
  const postcode = p.postcode;
  return typeof postcode === "string"
    ? postcode
    : typeof postcode === "number"
      ? String(postcode)
      : null;
}

function extractRegistrationGroups(p: NdisRawProvider): string[] {
  const groups =
    p.registrationGroups ??
    p.supportCategories ??
    (p as { registration_groups?: string[] }).registration_groups ??
    [];
  if (!Array.isArray(groups)) return [];
  return groups.filter((g): g is string => typeof g === "string");
}

function toProviderArray(data: unknown): NdisRawProvider[] {
  if (Array.isArray(data)) return data as NdisRawProvider[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const list =
      obj.providers ?? obj.list ?? obj.data ?? obj.results ?? obj.items;
    if (Array.isArray(list)) return list as NdisRawProvider[];
  }
  return [];
}

export interface IngestResult {
  fetched: number;
  upserted: number;
  errors: string[];
  skipped?: boolean;
  newEtag?: string;
}

export async function ingestNdisProviderFinder(
  prisma: PrismaClient
): Promise<IngestResult> {
  const result: IngestResult = { fetched: 0, upserted: 0, errors: [] };

  const meta = await prisma.ndisFinderIngestMeta.findUnique({
    where: { id: "default" },
  });
  const lastEtag = meta?.lastEtag ?? undefined;

  let payload: { changed: false } | { changed: true; newEtag: string | undefined; text: string };
  try {
    payload = await fetchWithCaching(lastEtag);
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }

  if (payload.changed === false) {
    result.skipped = true;
    return result;
  }

  let data: unknown;
  try {
    data = JSON.parse(payload.text) as unknown;
  } catch {
    result.errors.push("Invalid JSON in response");
    return result;
  }

  const providers = toProviderArray(data);
  result.fetched = providers.length;
  if (payload.newEtag) result.newEtag = payload.newEtag;

  for (let i = 0; i < providers.length; i++) {
    try {
      const p = providers[i] as NdisRawProvider;
      const externalId = extractExternalId(p);
      const name = extractName(p);
      const abn = extractAbn(p);
      const suburb = extractSuburb(p);
      const state = extractState(p);
      const postcode = extractPostcode(p);
      const registrationGroups = extractRegistrationGroups(p);

      await prisma.ndisFinderProvider.upsert({
        where: { externalId },
        create: {
          externalId,
          name: name ?? undefined,
          abn: abn ?? undefined,
          suburb: suburb ?? undefined,
          state: state ?? undefined,
          postcode: postcode ?? undefined,
          registrationGroups,
          raw: p as object,
        },
        update: {
          name: name ?? undefined,
          abn: abn ?? undefined,
          suburb: suburb ?? undefined,
          state: state ?? undefined,
          postcode: postcode ?? undefined,
          registrationGroups,
          raw: p as object,
        },
      });
      result.upserted++;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : String(err);
      result.errors.push(`Row ${i}: ${msg}`);
      if (result.errors.length >= 50) break;
    }
  }

  await prisma.ndisFinderIngestMeta.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      lastEtag: result.newEtag ?? null,
      lastIngestedAt: new Date(),
    },
    update: {
      lastEtag: result.newEtag ?? undefined,
      lastIngestedAt: new Date(),
    },
  });

  return result;
}
