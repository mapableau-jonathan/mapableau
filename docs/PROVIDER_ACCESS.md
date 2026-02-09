# Provider registration and access

This document describes how providers (businesses) register and onboard in the app, and how the approach aligns with the [Digital Access Standard](https://www.digital.gov.au/policy/digital-experience/digital-access-standard) (DAS).

## Single access point

- **One entry for providers**: The Provider Finder page includes a clear call-to-action: “Register as a provider” and “Find and claim your listing.”
- **No separate provider portal**: All provider flows use the same domain and app. Routes live under the main router:
  - `/register/provider` – provider registration (creates User + ClaimedProvider, then redirects to onboarding).
  - `/onboarding` – multi-step onboarding (business details, contact, categories, hours, confirm).
- **Post-login behaviour**: If a user has an in-progress onboarding (ClaimedProvider with `onboardingStatus` in progress), the dashboard redirects them to `/onboarding`.

## Reuse of existing capabilities

- **Identity**: Existing **User** model and **NextAuth** (credentials) are used. No separate provider identity or myGov/AGA integration in MVP.
- **Profile data**: A single **ClaimedProvider** model is used for both:
  - **Claimed outlets**: Provider claims an existing outlet from NDIS/outlet data (`outletKey` set).
  - **Net-new providers**: Provider registers without an existing listing (`outletKey` null); they complete onboarding and get a public profile at `/profiles/[slug]`.
- **Registration**: Generic `POST /api/register` accepts an optional `role: "provider"` and creates a minimal ClaimedProvider so the user can be sent to onboarding. Dedicated `POST /api/register/provider` is used by the “Register as a provider” flow.

## NDIS / outlet data

- **Live provider list**: By default the app pipes provider outlets from the NDIS live list:  
  `https://www.ndis.gov.au/sites/default/files/react_extract/provider_finder/build/data/list-providers.json`  
  Fetched server-side via `GET /api/providers/outlets` (avoids CORS). Client and claim flow use this API. Set `NDIS_PROVIDER_LIST_URL=""` or `"off"` to use local `public/data/provider-outlets.json` instead; set a custom URL to override the NDIS source.
- Outlet data is **read-only**. Registration and onboarding do not modify the source.
- Claiming links a User to an existing outlet via `outletKey` and creates a ClaimedProvider. The public profile can later be edited by the owner; the original outlet listing remains unchanged.

## ABN Lookup (ABR)

Optional: to verify ABNs during onboarding, register for the [ABR Lookup web services](https://abr.business.gov.au/Tools/WebServices) and set `ABR_GUID` in your environment. The onboarding “Look up” button then calls the Australian Business Register; on success the business name and address (state, postcode) can be pre-filled and `abnVerifiedAt` is set on the ClaimedProvider.

## Accessibility and inclusion

- Onboarding and registration UIs use semantic HTML, labels, and keyboard-friendly controls in line with WCAG and project standards (see AGENTS.md).
- “Need help? Contact us” is shown so users can complete registration or onboarding with support (non-digital pathway).

## Decision record: provider-facing access (DAS Criterion 4)

**Decision**: Reuse the existing access point (this app and Provider Finder) and extend the existing User and ClaimedProvider model for provider registration and onboarding, rather than building a new provider portal or identity silo.

**Rationale**: Aligns with DAS Criterion 4 (decision-making framework for provider-facing services): extending the current app reduces fragmentation, avoids duplicate sign-in, and reuses existing auth and profile data. New access points (e.g. a separate provider domain) would be considered only if user research or whole-of-government requirements justified them.

**Date**: 2025.
