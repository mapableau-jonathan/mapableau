/**
 * NDIS provider bulk import (two-pass).
 *
 * Env:
 *   DRY_RUN=1          — pass 1 only + summary stats (no DB).
 *   NDIS_IMPORT_LIMIT  — max listings from `data` (after parse), for testing.
 *
 * Run: pnpm import:ndis  (or npx tsx dataImporter3.ts)
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { type DayOfWeek, type Prisma, PrismaClient } from "@prisma/client";
import { config } from "dotenv";

import { REG_GROUP_OPTIONS } from "./app/provider-finder/regGroupOptions";
import { prisma } from "./lib/prisma";

config();

const SEP = "\u0001";
const BATCH_SIZE = 20;
const DEFAULT_JSON = path.join(
  process.cwd(),
  "public/data/ndisprovidersdata.json",
);

const REG_GROUP_NAME_BY_INDEX = new Map<number, string>(
  REG_GROUP_OPTIONS.map((r) => [r.Index, r.RegGroup]),
);

type NdisListing = {
  ABN: string;
  Prov_N: string;
  Head_Office: string;
  Outletname: string;
  Flag: string;
  Active: number;
  Phone: string;
  Website: string;
  Email: string;
  Address: string;
  State_cd: string;
  Post_cd: number;
  Latitude: number;
  Longitude: number;
  RegGroup: number[];
  opnhrs: string;
  prfsn: string;
};

type NdisRoot = {
  date: string;
  data: NdisListing[];
};

export type AbnPlan = {
  abn: string;
  canonical: NdisListing;
  outlets: NdisListing[];
};

type Counters = {
  skippedNoAbn: number;
  skippedBlankNames: number;
  skippedEmptyGroups: number;
  unknownRegGroupIndex: number;
  skippedHoursSegment: number;
};

function normalizeAbn(raw: string): string {
  return raw.replace(/\s+/g, "").trim();
}

function normalizeText(raw: string): string {
  const t = raw.normalize("NFC").trim().replace(/\s+/g, " ");
  return t;
}

function listingPassesFilters(listing: NdisListing): boolean {
  const abn = normalizeAbn(String(listing.ABN ?? ""));
  if (!abn) return false;
  const prov = normalizeText(String(listing.Prov_N ?? ""));
  const outlet = normalizeText(String(listing.Outletname ?? ""));
  if (!prov && !outlet) return false;
  return true;
}

function outletFingerprintFor(listing: NdisListing, abn: string): string {
  const a = normalizeAbn(abn);
  const p = normalizeText(String(listing.Prov_N ?? ""));
  const o = normalizeText(String(listing.Outletname ?? ""));
  const payload = `${a}${SEP}${p}${SEP}${o}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

function outletDisplayName(listing: NdisListing): string {
  const outlet = String(listing.Outletname ?? "").trim();
  if (outlet) return outlet;
  const head = String(listing.Head_Office ?? "").trim();
  if (head) return head;
  return normalizeText(String(listing.Prov_N ?? "")) || "Outlet";
}

function canonicalRowIndex(rows: NdisListing[]): number {
  const hIndices: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i].Flag).toUpperCase() === "H") hIndices.push(i);
  }
  if (hIndices.length >= 2) return hIndices[0];
  if (hIndices.length === 1) return hIndices[0];
  return 0;
}

function buildAbnPlanMap(
  listings: NdisListing[],
  counters: Counters,
): Map<string, AbnPlan> {
  const grouped = new Map<string, NdisListing[]>();

  for (const listing of listings) {
    const abn = normalizeAbn(String(listing.ABN ?? ""));
    if (!abn) {
      counters.skippedNoAbn++;
      continue;
    }
    if (!listingPassesFilters(listing)) {
      counters.skippedBlankNames++;
      continue;
    }
    if (!grouped.has(abn)) grouped.set(abn, []);
    grouped.get(abn)!.push(listing);
  }

  const plans = new Map<string, AbnPlan>();

  for (const [abn, rows] of grouped) {
    if (rows.length === 0) {
      counters.skippedEmptyGroups++;
      continue;
    }
    const ci = canonicalRowIndex(rows);
    const canonical = rows[ci];
    const outlets = rows.filter((_, i) => i !== ci);
    plans.set(abn, { abn, canonical, outlets });
  }

  return plans;
}

function parseSpecialisationLabels(prfsn: string): string[] {
  if (!prfsn) return [];
  return prfsn
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listingIsActive(listing: NdisListing): boolean {
  return listing.Active === 1;
}

function coordsOrNull(
  lat: number,
  lng: number,
): { latitude: number; longitude: number } | null {
  if (lat === 0 && lng === 0) return null;
  return { latitude: lat, longitude: lng };
}

function addressCreateInput(listing: NdisListing): Prisma.AddressCreateInput {
  const line = String(listing.Address ?? "").trim();
  const coords = coordsOrNull(listing.Latitude, listing.Longitude);
  return {
    addressString: line || "",
    state: String(listing.State_cd ?? "").trim() || null,
    postcode: listing.Post_cd != null ? String(listing.Post_cd) : null,
    country: "Australia",
    latitude: coords?.latitude ?? null,
    longitude: coords?.longitude ?? null,
  };
}

function nullableString(s: string): string | null {
  const t = s.trim();
  return t ? t : null;
}

/** Parse tokens like "12AM", "7:30PM", "11PM" → minutes from midnight UTC. */
function parse12hToMinutes(token: string): number | null {
  const m = token.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  if (h > 12 || min > 59) return null;
  const ap = m[3].toUpperCase();
  if (ap === "AM") {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return h * 60 + min;
}

function minutesToDbTimeDate(minutes: number): Date {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return new Date(Date.UTC(1970, 0, 1, h, m, 0, 0));
}

const DAY_NAME_TO_ENUM: Record<string, DayOfWeek> = {
  MONDAY: "MONDAY",
  TUESDAY: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  FRIDAY: "FRIDAY",
  SATURDAY: "SATURDAY",
  SUNDAY: "SUNDAY",
};

function parseBusinessHours(
  opnhrs: string,
  counters: Counters,
): { dayOfWeek: DayOfWeek; openTime: Date; closeTime: Date }[] {
  if (!opnhrs?.trim()) return [];
  const out: {
    dayOfWeek: DayOfWeek;
    openTime: Date;
    closeTime: Date;
  }[] = [];

  for (const rawPart of opnhrs.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;
    const colonIdx = part.indexOf(":");
    if (colonIdx < 0) {
      counters.skippedHoursSegment++;
      continue;
    }
    const dayRaw = part.slice(0, colonIdx).trim();
    const rest = part.slice(colonIdx + 1).trim();
    const dayKey = dayRaw.toUpperCase();
    const dayOfWeek = DAY_NAME_TO_ENUM[dayKey];
    if (!dayOfWeek) {
      counters.skippedHoursSegment++;
      continue;
    }
    const dashIdx = rest.indexOf("-");
    if (dashIdx < 0) {
      counters.skippedHoursSegment++;
      continue;
    }
    const openTok = rest.slice(0, dashIdx).trim();
    const closeTok = rest.slice(dashIdx + 1).trim();
    const openM = parse12hToMinutes(openTok);
    const closeM = parse12hToMinutes(closeTok);
    if (openM === null || closeM === null) {
      counters.skippedHoursSegment++;
      continue;
    }
    out.push({
      dayOfWeek,
      openTime: minutesToDbTimeDate(openM),
      closeTime: minutesToDbTimeDate(closeM),
    });
  }
  return out;
}

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

async function getServiceDefinitionId(
  tx: Tx,
  name: string,
  cache: Map<string, string>,
): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;
  const row = await tx.serviceDefinition.upsert({
    where: { name },
    create: { name },
    update: {},
  });
  cache.set(name, row.id);
  return row.id;
}

async function getSpecialisationDefinitionId(
  tx: Tx,
  name: string,
  cache: Map<string, string>,
): Promise<string> {
  const cached = cache.get(name);
  if (cached) return cached;
  const existing = await tx.specialisationDefinition.findFirst({
    where: { name },
  });
  const row =
    existing ?? (await tx.specialisationDefinition.create({ data: { name } }));
  cache.set(name, row.id);
  return row.id;
}

function regGroupServiceNames(
  regGroup: number[] | undefined,
  c: Counters,
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const idx of regGroup ?? []) {
    const name = REG_GROUP_NAME_BY_INDEX.get(idx);
    if (!name) {
      c.unknownRegGroupIndex++;
      continue;
    }
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

async function syncProviderServices(
  tx: Tx,
  providerId: string,
  regGroup: number[] | undefined,
  caches: { svc: Map<string, string> },
  c: Counters,
) {
  await tx.providerService.deleteMany({ where: { providerId } });
  const names = regGroupServiceNames(regGroup, c);
  const data: { providerId: string; serviceDefinitionId: string }[] = [];
  for (const name of names) {
    const sid = await getServiceDefinitionId(tx, name, caches.svc);
    data.push({ providerId, serviceDefinitionId: sid });
  }
  if (data.length > 0) {
    await tx.providerService.createMany({ data });
  }
}

async function syncOutletServices(
  tx: Tx,
  providerOutletId: string,
  regGroup: number[] | undefined,
  caches: { svc: Map<string, string> },
  c: Counters,
) {
  await tx.providerOutletService.deleteMany({ where: { providerOutletId } });
  const names = regGroupServiceNames(regGroup, c);
  const data: { providerOutletId: string; serviceDefinitionId: string }[] = [];
  for (const name of names) {
    const sid = await getServiceDefinitionId(tx, name, caches.svc);
    data.push({ providerOutletId, serviceDefinitionId: sid });
  }
  if (data.length > 0) {
    await tx.providerOutletService.createMany({ data });
  }
}

async function syncProviderSpecialisations(
  tx: Tx,
  providerId: string,
  prfsn: string,
  caches: { spec: Map<string, string> },
) {
  await tx.providerSpecialisation.deleteMany({ where: { providerId } });
  const labels = parseSpecialisationLabels(prfsn);
  const data: {
    providerId: string;
    specialisationDefinitionId: string;
  }[] = [];
  for (const label of labels) {
    const sid = await getSpecialisationDefinitionId(tx, label, caches.spec);
    data.push({ providerId, specialisationDefinitionId: sid });
  }
  if (data.length > 0) {
    await tx.providerSpecialisation.createMany({
      data,
      skipDuplicates: true,
    });
  }
}

async function syncOutletSpecialisations(
  tx: Tx,
  providerOutletId: string,
  prfsn: string,
  caches: { spec: Map<string, string> },
) {
  await tx.providerOutletSpecialisation.deleteMany({
    where: { providerOutletId },
  });
  const labels = parseSpecialisationLabels(prfsn);
  const data: {
    providerOutletId: string;
    specialisationDefinitionId: string;
  }[] = [];
  for (const label of labels) {
    const sid = await getSpecialisationDefinitionId(tx, label, caches.spec);
    data.push({ providerOutletId, specialisationDefinitionId: sid });
  }
  if (data.length > 0) {
    await tx.providerOutletSpecialisation.createMany({
      data,
      skipDuplicates: true,
    });
  }
}

async function importAbnGroup(
  tx: Tx,
  plan: AbnPlan,
  caches: { svc: Map<string, string>; spec: Map<string, string> },
  c: Counters,
) {
  const { abn, canonical, outlets } = plan;

  const addrIn = addressCreateInput(canonical);
  const address = await tx.address.create({ data: addrIn });

  console.log("upserting provider", { abn });
  const provider = await tx.provider.upsert({
    where: { abn },
    create: {
      abn,
      name: normalizeText(String(canonical.Prov_N ?? "")) || abn,
      phone: nullableString(canonical.Phone),
      email: nullableString(canonical.Email),
      website: nullableString(canonical.Website),
      addressId: address.id,
      isActive: listingIsActive(canonical),
      isVerified: false,
      ndisRegistered: (canonical.RegGroup?.length ?? 0) > 0,
    },
    update: {
      name: normalizeText(String(canonical.Prov_N ?? "")) || abn,
      phone: nullableString(canonical.Phone),
      email: nullableString(canonical.Email),
      website: nullableString(canonical.Website),
      addressId: address.id,
      isActive: listingIsActive(canonical),
      isVerified: false,
      ndisRegistered: (canonical.RegGroup?.length ?? 0) > 0,
    },
  });

  const outletIds: string[] = [];

  for (const row of outlets) {
    const fp = outletFingerprintFor(row, abn);
    const oAddr = await tx.address.create({ data: addressCreateInput(row) });
    console.log("upserting outlet", {
      fp,
      providerId: provider.id,
      outletname: row.Outletname,
      abn: row.ABN,
      prov_n: row.Prov_N,
    });
    const outlet = await tx.providerOutlet.upsert({
      where: {
        providerId_outletFingerprint: {
          providerId: provider.id,
          outletFingerprint: fp,
        },
      },
      create: {
        providerId: provider.id,
        outletFingerprint: fp,
        name: outletDisplayName(row),
        phone: nullableString(row.Phone),
        email: nullableString(row.Email),
        website: nullableString(row.Website),
        abn,
        addressId: oAddr.id,
        isActive: listingIsActive(row),
        isVerified: false,
      },
      update: {
        name: outletDisplayName(row),
        phone: nullableString(row.Phone),
        email: nullableString(row.Email),
        website: nullableString(row.Website),
        abn,
        addressId: oAddr.id,
        isActive: listingIsActive(row),
        isVerified: false,
      },
    });
    outletIds.push(outlet.id);
  }

  console.log("syncing provider services & specialisations", {
    providerId: provider.id,
  });
  await syncProviderServices(tx, provider.id, canonical.RegGroup, caches, c);
  await syncProviderSpecialisations(tx, provider.id, canonical.prfsn, caches);

  for (let i = 0; i < outlets.length; i++) {
    const row = outlets[i];
    const oid = outletIds[i];
    console.log("syncing outlet services & specialisations", { outletId: oid });
    await syncOutletServices(tx, oid, row.RegGroup, caches, c);
    await syncOutletSpecialisations(tx, oid, row.prfsn, caches);
  }

  console.log("syncing provider business hours", { providerId: provider.id });
  await tx.providerBusinessHour.deleteMany({
    where: { providerId: provider.id },
  });
  const provHours = parseBusinessHours(canonical.opnhrs, c);
  if (provHours.length > 0) {
    await tx.providerBusinessHour.createMany({
      data: provHours.map((h) => ({
        providerId: provider.id,
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
      })),
    });
  }

  for (let i = 0; i < outlets.length; i++) {
    const row = outlets[i];
    const oid = outletIds[i];
    console.log("syncing outlet business hours", { outletId: oid });
    await tx.providerOutletBusinessHour.deleteMany({
      where: { providerOutletId: oid },
    });
    const oh = parseBusinessHours(row.opnhrs, c);
    if (oh.length > 0) {
      await tx.providerOutletBusinessHour.createMany({
        data: oh.map((h) => ({
          providerOutletId: oid,
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
        })),
      });
    }
  }
}

async function run() {
  const jsonPath = process.env.NDIS_JSON_PATH ?? DEFAULT_JSON;
  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const limitRaw = process.env.NDIS_IMPORT_LIMIT;
  const limit =
    limitRaw && /^\d+$/.test(limitRaw) ? parseInt(limitRaw, 10) : undefined;

  const counters: Counters = {
    skippedNoAbn: 0,
    skippedBlankNames: 0,
    skippedEmptyGroups: 0,
    unknownRegGroupIndex: 0,
    skippedHoursSegment: 0,
  };

  const raw = fs.readFileSync(jsonPath, "utf-8");
  const root = JSON.parse(raw) as NdisRoot;
  let listings = root.data ?? [];
  if (limit != null && limit > 0) listings = listings.slice(0, limit);

  console.log(
    `NDIS import: ${listings.length} listings from ${jsonPath}${dryRun ? " (DRY_RUN)" : ""}`,
  );

  const plans = buildAbnPlanMap(listings, counters);
  const abnKeys = [...plans.keys()];
  let totalOutlets = 0;
  for (const p of plans.values()) totalOutlets += p.outlets.length;

  console.log("Pass 1 summary:", {
    uniqueAbns: plans.size,
    totalOutletRows: totalOutlets,
    skippedNoAbn: counters.skippedNoAbn,
    skippedBlankNames: counters.skippedBlankNames,
    skippedEmptyGroups: counters.skippedEmptyGroups,
  });

  if (dryRun) {
    console.log("DRY_RUN: skipping database.");
    return;
  }

  const svcCache = new Map<string, string>();
  const specCache = new Map<string, string>();

  for (let b = 0; b < abnKeys.length; b += BATCH_SIZE) {
    const batchKeys = abnKeys.slice(b, b + BATCH_SIZE);
    const batchIndex = Math.floor(b / BATCH_SIZE);
    try {
      await prisma.$transaction(
        async (tx) => {
          for (const abn of batchKeys) {
            const plan = plans.get(abn);
            if (!plan) continue;
            await importAbnGroup(
              tx,
              plan,
              { svc: svcCache, spec: specCache },
              counters,
            );
          }
        },
        {
          maxWait: 60_000,
          timeout: 600_000,
        },
      );
      console.log(
        `Batch ${batchIndex} OK (${batchKeys.length} ABNs) [${batchKeys.slice(0, 3).join(", ")}${batchKeys.length > 3 ? ", …" : ""}]`,
      );
    } catch (err) {
      console.error("Batch failed:", {
        batchIndex,
        abnCount: batchKeys.length,
        abns: batchKeys,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw err;
    }
  }

  console.log("Import finished.", {
    unknownRegGroupIndex: counters.unknownRegGroupIndex,
    skippedHoursSegment: counters.skippedHoursSegment,
  });
}

run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
