# NDIS Provider Finder Ingest

This feature ingests NDIS registered provider data from the official NDIS provider finder JSON and exposes it via API.

## Data source

- **URL:** `https://www.ndis.gov.au/sites/default/files/react_extract/provider_finder/build/data/list-providers.json`
- **Ingest:** Fetches the JSON and upserts into the `NdisFinderProvider` table (one row per provider).
- **ETag caching:** Requests send `If-None-Match` with the last stored ETag; if the server returns 304 Not Modified, the ingest skips re-processing and returns `{ skipped: true }`. Uses `User-Agent: MapAble-NDIS-Provider-Import/1.0 (non-commercial)`.

## Database

- **Models:** `NdisFinderProvider`, `NdisFinderIngestMeta` (see `prisma/schema.prisma`).
- **NdisFinderProvider:** `externalId`, `name`, `abn`, `suburb`, `state`, `postcode`, `registrationGroups`, `raw` (full JSON), `ingestedAt`.
- **NdisFinderIngestMeta:** Single row (`id: "default"`) storing `lastEtag` and `lastIngestedAt` for ETag-based caching.
- After adding the models, run:
  - `npx prisma generate`
  - `npx prisma db push` (or create a migration) to create the tables.

## API

### Ingest (populate data)

- **POST** `/api/ndis/provider-finder/ingest`
- Fetches the NDIS URL (with ETag caching) and upserts all providers when content has changed.
- Response: `{ fetched, upserted, errors }` or `{ skipped: true, fetched: 0, upserted: 0, errors: [] }` when the source returned 304 Not Modified. May include `newEtag` when updated.
- **Recommendation:** Protect this route in production (e.g. cron secret or admin-only). Consider running via a cron job (e.g. weekly).

### Query (search ingested data)

- **GET** `/api/ndis/provider-finder`
- Query params:
  - `name` – filter by provider name (case-insensitive contains)
  - `postcode` – exact postcode
  - `state` – exact state (case-insensitive)
  - `suburb` – filter by suburb (case-insensitive contains)
  - `limit` – max results (default 20, max 100)
  - `offset` – pagination offset (default 0)
- Response: `{ providers, total, limit, offset }`.

## Example

```bash
# Ingest (run once or on a schedule)
curl -X POST https://your-app.vercel.app/api/ndis/provider-finder/ingest

# Search by name and postcode
curl "https://your-app.vercel.app/api/ndis/provider-finder?name=Care&postcode=2000&limit=10"
```
