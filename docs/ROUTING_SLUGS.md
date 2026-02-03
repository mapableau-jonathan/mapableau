# Routing & Slug Provisioning System

## Overview

| Route type        | Path pattern              | Data source   | Purpose                          |
|-------------------|---------------------------|---------------|----------------------------------|
| Outlet profile    | `/jonathan/profile/[slug]`| JSON (outlets)| Read-only provider; claim CTA    |
| Claimed profile   | `/profiles/[slug]`        | DB (Prisma)   | Editable by owner                |

**Entry flow:** Provider Finder → View profile → `/jonathan/profile/[slug]`. If claimed, redirects to `/profiles/[slug]`.

## Slug generation

- **Rule:** lowercase, hyphens, alphanumeric only.
- **Max length:** 100 chars.
- **Source:** provider/outlet name → `slugify(name)`.
- **Uniqueness:** claimed profiles use `slug-{timestamp}` suffix on collision.

## Identifiers

| Identifier | Format                         | Use case                          |
|------------|--------------------------------|-----------------------------------|
| `slug`     | `[a-z0-9-]+`                  | URL path; human-readable          |
| `outletKey`| `ABN-slugify(name)-slugify(addr)` | Match outlet ↔ claimed profile |
| `id`       | `ABN-index-slug`              | Internal; stable per outlet       |

## Central module

Use `lib/routes.ts` for:

- `slugify(input)` – generate slug from string
- `isValidSlug(slug)` – validate slug format
- `outletKey(abn, name, address)` – stable outlet key
- `ROUTES.outletProfile(slug)`, `ROUTES.claimedProfile(slug)` – build paths
- `API_ROUTES.profiles.*` – API URLs
- `slugProvisioning.fromOutletName(name)` – outlet slug
- `slugProvisioning.ensureUnique(base, exists)` – collision handling
