#!/usr/bin/env tsx
/**
 * Seed NDIS Provider Finder
 * Fetches list-providers.json from ndis.gov.au and upserts into NdisFinderProvider.
 *
 * Usage:
 *   pnpm seed:provider-finder
 *   pnpm tsx scripts/seed-provider-finder.ts
 *
 * Requires: DATABASE_URL in .env or environment
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Load .env and .env.local when running as a standalone script
function loadEnv() {
  const root = join(__dirname, "..");
  for (const file of [".env", ".env.local"]) {
    const path = join(root, file);
    if (existsSync(path)) {
      const content = readFileSync(path, "utf8");
      for (const line of content.split("\n")) {
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
        }
      }
    }
  }
}
loadEnv();

import { prisma } from "../lib/prisma";
import { ingestNdisProviderFinder } from "../lib/services/ndis/provider-finder-ingest";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required. Set it in .env or the environment.");
    process.exit(1);
  }

  console.log("Fetching NDIS list-providers.json and seeding provider-finder...");
  const result = await ingestNdisProviderFinder(prisma);
  console.log("Done.", result);
  if (result.errors.length > 0) {
    console.warn("Errors (first 20):", result.errors.slice(0, 20));
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
