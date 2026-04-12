import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

import { AutocompleteItem, AutocompleteResponse } from "./types";

const MIN_QUERY_LENGTH = 3;
const MAX_RESULTS = 8;
const QUERY_TIMEOUT_MS = 2500;

// todo: review
async function fetchFallbackSuggestions(): Promise<AutocompleteItem[]> {
  const providers = await prisma.provider.findMany({
    where: { isActive: true },
    include: {
      address: true,
      services: {
        include: {
          serviceDefinition: { select: { name: true } },
        },
      },
    },
    orderBy: [{ reviewCount: "desc" }, { name: "asc" }],
    take: 5,
  });

  return providers.map((provider) => ({
    id: provider.id,
    type: "provider",
    name: provider.name,
    providerId: provider.id,
    rating: provider.rating,
    reviewCount: provider.reviewCount,
    addressString: provider.address.addressString,
    latitude: provider.address.latitude ?? 0,
    longitude: provider.address.longitude ?? 0,
    // ndisRegistered: provider.ndisRegistered,
    // suburb: provider.address?.suburb ?? null,
    // state: provider.address?.state ?? null,
    // postcode: provider.address?.postcode ?? null,
    // matchedService: null,
    // services: provider.services
    //   .map((s) => s.serviceDefinition.name)
    //   .filter(Boolean)
    //   .slice(0, 4),
    // todo: fix
    distanceKm: 0,
    ft_rank: 0,
    trigram_rank: 0,
    services: provider.services
      .map((s) => s.serviceDefinition.name)
      .filter(Boolean),
  }));
}

async function fetchAutocompleteItems(
  query: string,
  latitude: number,
  longitude: number,
  minLatitude: number,
  maxLatitude: number,
  minLongitude: number,
  maxLongitude: number,
): Promise<AutocompleteItem[]> {
  // measure time taken
  const startTime = Date.now();
  const rows = await prisma.$queryRaw<AutocompleteItem[]>`
  WITH q AS (
    SELECT websearch_to_tsquery('english', ${query}) AS tsq
  ),
  search AS (
    SELECT
      p.id,
      p.name,
      p.rating,
      p."reviewCount",
      'provider' AS type,
      a."addressString",
      a.latitude,
      a.longitude,
      (
        6371 * acos(
          cos(radians(${latitude})) *
          cos(radians(a.latitude)) *
          cos(radians(a.longitude) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(a.latitude))
        )
      ) AS distanceKm,
      -- Full-text rank
      ts_rank_cd(p.search_vector, q.tsq) AS ft_rank,
      -- Trigram similarity on provider name
      similarity(p.name, ${query}) AS trigram_rank
    FROM "Provider" p
    JOIN "Address" a ON p."addressId" = a.id
    CROSS JOIN q
    WHERE
      (p.search_vector @@ q.tsq
      OR p.name % ${query}
      OR EXISTS (
        SELECT 1
        FROM "ProviderService" ps
        JOIN "ServiceDefinition" sd ON ps."serviceDefinitionId" = sd.id
        WHERE ps."providerId" = p.id
          AND (sd.name % ${query} OR to_tsvector('english', sd.name) @@ q.tsq)
      ))
      AND a.latitude BETWEEN ${minLatitude} AND ${maxLatitude}
      AND a.longitude BETWEEN ${minLongitude} AND ${maxLongitude}

    UNION ALL

    SELECT
      po.id,
      po.name,
      po.rating,
      po."reviewCount",
      'outlet' AS type,
      a."addressString",
      a.latitude,
      a.longitude,
      (
        6371 * acos(
          cos(radians(${latitude})) *
          cos(radians(a.latitude)) *
          cos(radians(a.longitude) - radians(${longitude})) +
          sin(radians(${latitude})) *
          sin(radians(a.latitude))
        )
      ) AS distanceKm,
      ts_rank_cd(po.search_vector, q.tsq) AS ft_rank,
      similarity(po.name, ${query}) AS trigram_rank
    FROM "ProviderOutlet" po
    JOIN "Address" a ON po."addressId" = a.id
    CROSS JOIN q
    WHERE
      (po.search_vector @@ q.tsq
      OR po.name % ${query}
      OR EXISTS (
        SELECT 1
        FROM "ProviderOutletService" pos
        JOIN "ServiceDefinition" sd ON pos."serviceDefinitionId" = sd.id
        WHERE pos."providerOutletId" = po.id
          AND (sd.name % ${query} OR to_tsvector('english', sd.name) @@ q.tsq)
      ))
      AND a.latitude BETWEEN ${minLatitude} AND ${maxLatitude}
      AND a.longitude BETWEEN ${minLongitude} AND ${maxLongitude}
  ),
  limited AS (
    SELECT *
    FROM search
    ORDER BY (ft_rank * 10) + trigram_rank DESC
    LIMIT ${MAX_RESULTS}
  )

  SELECT
    l.*,
    svc.services
  FROM limited l
  LEFT JOIN LATERAL (
    SELECT array_agg(sd.name ORDER BY sd.name) AS services
    FROM (
      SELECT ps."serviceDefinitionId"
      FROM "ProviderService" ps
      WHERE l.type = 'provider'
        AND ps."providerId" = l.id

      UNION ALL

      SELECT pos."serviceDefinitionId"
      FROM "ProviderOutletService" pos
      WHERE l.type = 'outlet'
        AND pos."providerOutletId" = l.id
    ) s
    JOIN "ServiceDefinition" sd
      ON sd.id = s."serviceDefinitionId"
  ) svc ON TRUE;
  `;

  const endTime = Date.now();
  console.log(`Time taken: ${endTime - startTime}ms`);

  return rows;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error("Query timed out")),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<AutocompleteResponse | { error: string }>> {
  try {
    const searchParams = req.nextUrl.searchParams;

    console.log("searchParams", searchParams);
    const search = searchParams.get("q")?.trim() ?? "";

    if (search.length < MIN_QUERY_LENGTH) {
      return NextResponse.json({
        query: search,
        keepTyping: true,
        items: [],
      });
    }

    try {
      // todo: clean up this logic
      const latitude = parseFloat(searchParams.get("lat") || "");
      const longitude = parseFloat(searchParams.get("lon") || "");
      const minLatitude = parseFloat(searchParams.get("minLat") || "");
      const maxLatitude = parseFloat(searchParams.get("maxLat") || "");
      const minLongitude = parseFloat(searchParams.get("minLon") || "");
      const maxLongitude = parseFloat(searchParams.get("maxLon") || "");

      console.log("latitude", latitude);
      console.log("longitude", longitude);
      console.log("minLatitude", minLatitude);
      console.log("maxLatitude", maxLatitude);
      console.log("minLongitude", minLongitude);
      console.log("maxLongitude", maxLongitude);

      if (
        isNaN(latitude) ||
        isNaN(longitude) ||
        isNaN(minLatitude) ||
        isNaN(maxLatitude) ||
        isNaN(minLongitude) ||
        isNaN(maxLongitude)
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid latitude, longitude, minLatitude, maxLatitude, minLongitude, maxLongitude",
          },
          { status: 400 },
        );
      }

      const items = await withTimeout(
        fetchAutocompleteItems(
          search,
          latitude,
          longitude,
          minLatitude,
          maxLatitude,
          minLongitude,
          maxLongitude,
        ),
        QUERY_TIMEOUT_MS,
      );
      return NextResponse.json({ query: search, items });
    } catch (error) {
      if (error instanceof Error && error.message === "Query timed out") {
        const fallbackItems = await fetchFallbackSuggestions();
        return NextResponse.json({
          query: search,
          fallback: true,
          items: fallbackItems,
        });
      }

      throw error;
    }
  } catch (err) {
    console.error("provider-finder autocomplete:", err);
    return NextResponse.json(
      { error: "Could not load autocomplete results" },
      { status: 500 },
    );
  }
}
