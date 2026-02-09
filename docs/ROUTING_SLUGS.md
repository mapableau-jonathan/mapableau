# Routing & Slug Provisioning System

## Universal Router

The app uses a type-safe universal router (`lib/router/`):

| Module        | Purpose                                                |
|---------------|--------------------------------------------------------|
| `registry.ts` | Route definitions (path, pattern, authRequired)        |
| `build.ts`    | buildPath, parsePath, matchesRoute                     |
| `redirect.ts` | Server-side redirect(route, params)                    |
| `useAppRouter`| Client hook: push, replace, buildPath, current, isActive |
| `AppLink`     | Type-safe Link component                               |

### Usage

```ts
import { buildPath, useAppRouter, AppLink, redirect } from "@/lib/router";

// Build path
buildPath("outletProfile", { slug: "harbour-support" });

// Client navigation
const router = useAppRouter();
router.push("claimedProfile", { slug: "harbour-support" });

// Type-safe link
<AppLink route="providerFinder" params={{}}>Browse</AppLink>

// Server redirect
redirect("providerFinder", {});
```

## Route registry

| Route           | Path                      | Params   |
|-----------------|---------------------------|----------|
| home            | `/`                       | —        |
| providerFinder  | `/provider-finder`        | —        |
| outletProfile   | `/jonathan/profile/[slug]`| `{ slug }` |
| claimedProfile  | `/profiles/[slug]`        | `{ slug }` |
| jonathan        | `/jonathan`               | —        |
| jonathanDashboard | `/jonathan/dashboard`   | — (auth) |
| jonathanParticipant | `/jonathan/participant` | — (auth) |
| jonathanParticipantProfile | `/jonathan/participant/[slug]` | `{ slug }` |
| login, register | `/login`, `/register`     | —        |
| providerRegister | `/register/provider`     | —        |
| onboarding     | `/onboarding`             | — (auth) |
| dashboard      | `/dashboard`              | — (auth) |
| map            | `/map`                    | —        |

## Provider registration and access

Provider entry points and onboarding are documented in [PROVIDER_ACCESS.md](PROVIDER_ACCESS.md): single access from Provider Finder, routes `/register/provider` and `/onboarding`, reuse of User and ClaimedProvider.

## Slug generation (`lib/routes.ts`)

- **Rule:** lowercase, hyphens, alphanumeric only.
- **Max length:** 100 chars.
- **Source:** provider/outlet name → `slugify(name)`.
- **Uniqueness:** claimed profiles use `slug-{timestamp}` suffix on collision.

## Route–page audit

| Registry route        | Path                    | Page file                          | Status   |
|-----------------------|-------------------------|------------------------------------|----------|
| home                  | `/`                     | `app/page.tsx`                     | Routed   |
| providerFinder        | `/provider-finder`      | `app/provider-finder/page.tsx`     | Routed   |
| outletProfile         | `/jonathan/profile/[slug]` | `app/jonathan/profile/[slug]/page.tsx` | Routed   |
| claimedProfile        | `/profiles/[slug]`      | `app/profiles/[slug]/page.tsx`     | Routed   |
| login                 | `/login`                | `app/login/page.tsx`               | Routed   |
| register              | `/register`             | `app/register/page.tsx`            | Routed   |
| providerRegister      | `/register/provider`    | `app/register/provider/page.tsx`   | Routed   |
| onboarding            | `/onboarding`           | `app/onboarding/page.tsx`          | Routed   |
| dashboard             | `/dashboard`            | `app/dashboard/page.tsx`           | Routed   |
| map                   | `/map`                  | `app/map/page.tsx`                 | Routed   |

All in-app links and redirects use `buildPath`, `AppLink`, `redirect(route, params)`, or `ROUTES` so path changes stay in one place. Footer/home links to `/care`, `/transport`, `/ndis`, etc. are placeholders and have no page yet.

## Identifiers

| Identifier | Format                         | Use case                          |
|------------|--------------------------------|-----------------------------------|
| `slug`     | `[a-z0-9-]+`                  | URL path; human-readable          |
| `outletKey`| `ABN-slugify(name)-slugify(addr)` | Match outlet ↔ claimed profile |
| `id`       | `ABN-index-slug`              | Internal; stable per outlet       |
