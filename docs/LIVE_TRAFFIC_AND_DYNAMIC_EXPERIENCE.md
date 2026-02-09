# Live Traffic Modelling with Dynamic Participant Experience

## Scope (assumptions)

- **Live traffic**: Venue-level “busy” state or footfall (e.g. how busy a provider location is now, or at a given time). Could later extend to wait times or occupancy.
- **Modelling**: Store current state and optional time-of-day patterns (e.g. “usually quieter 2–4pm”) so we can show “Quieter now” or “Busier than usual”.
- **Dynamic participant experience**: Use the signed-in participant’s profile (accessibility needs, preferred categories, location) to:
  - Filter or rank providers (e.g. prefer categories they like, surface accessibility-friendly options).
  - Show live traffic where relevant (e.g. “Quieter now” for sensory needs).
  - Optionally tailor copy or CTAs (e.g. “Good match for your profile”).

If your “traffic” is transport/routes or something else, the data model and APIs below can be adapted.

---

## 1. Data model (traffic / live state)

### Option A: Minimal (per venue, current state only)

Add a small table or JSON field for “live” state that can be updated by an external process or manual/admin later:

- **Provider/venue key**: `outletKey` or `claimedProviderId` (or both: outlet for unclaimed, claimed for claimed).
- **Fields**: e.g. `busyLevel` (quiet | moderate | busy), `lastUpdatedAt`, optional `nextQuietWindow` (e.g. “2pm–4pm”) for modelled pattern.

Store in DB (new table `VenueTraffic` or similar) or in a cache (Redis) with an API that reads it. Provider finder and map then read this via API.

### Option B: Time-based modelling

- Same as above, plus a **pattern** per venue: e.g. weekday vs weekend, or slots per day (e.g. “9–12 busy, 12–14 quiet”).  
- “Live” can be current snapshot; “modelled” = derive “usually quieter at this time” from pattern.

Recommendation: start with Option A (current state + `lastUpdatedAt`); add pattern later if needed.

---

## 2. APIs

- **GET `/api/traffic` or `/api/traffic/[outletKey]`**  
  Returns busy level (and optional next-quiet window) for one or many venues.  
  Query params: e.g. `outletKeys=key1,key2` or by `claimedProviderId`.

- **PATCH/POST (admin or internal)**  
  Update traffic state (e.g. from sensor, manual, or cron).  
  Auth: require role or API key; not public.

- **Optional: GET `/api/traffic/for-participant`**  
  Same as above but scoped to “providers relevant to this participant” (using participant profile preferences/location) so the UI can show “live traffic for your area / your categories”.

---

## 3. Dynamic participant experience (UI)

- **Provider Finder / Map**  
  - If user is signed in and has a **ParticipantProfile**:  
    - Use `preferredCategories`, `accessibilityNeeds`, and location (suburb/state/postcode) to:  
      - Prefer or rank providers (e.g. match categories, show “Good match” badge).  
      - Optionally filter or sort by “quieter now” when traffic data exists.  
    - Show live traffic on cards/map (e.g. “Quieter now”, “Busier than usual”) when `/api/traffic` returns data for that provider.
  - If not signed in: keep current behaviour (no personalisation); traffic can still be shown if available.

- **Where to plug in**  
  - **Provider finder**: `useProviderFinder` (or equivalent) already has `filteredSorted`; add a “participant context” (profile) and a “traffic” layer.  
    - Fetch participant profile when logged in; fetch traffic for visible providers (or for participant’s preferred list).  
    - Merge traffic into provider list; sort/filter by participant preferences + optional “prefer quieter” when profile indicates sensory needs.
  - **Map**: same traffic + participant context; e.g. marker or tooltip “Quieter now”.

- **Accessibility**  
  - Expose “Quieter now” / “Busier than usual” in a way that works with screen readers and doesn’t rely only on colour (e.g. text + icon).

---

## 4. Implementation order (suggested)

1. **Schema + API for traffic**  
   - Add `VenueTraffic` (or equivalent) and optional migration.  
   - Implement GET (public) and PATCH/POST (protected) for traffic state.  
   - Use mock or manual data at first.

2. **Participant-aware provider list**  
   - In provider finder, when user is signed in, load participant profile; use `preferredCategories` and location to rank or filter.  
   - No traffic yet; just “dynamic experience” from profile.

3. **Traffic in UI**  
   - Fetch traffic for visible providers (or for participant’s list); show “Quieter now” / “Busier” on cards and map.  
   - Optional: “Prefer quieter venues” filter or sort when participant has relevant accessibility need.

4. **Modelling (optional)**  
   - Add time-of-day (or weekly) pattern per venue; API returns “usually quieter at this time” or “next quiet window”.  
   - UI can show “Usually quieter 2pm–4pm” in addition to “Quieter now”.

5. **Live updates (optional)**  
   - Replace polling with WebSocket or SSE for traffic so “Quieter now” updates without refresh.

---

## 5. Files to touch (high level)

| Area              | Files / locations |
|-------------------|-------------------|
| Schema            | `prisma/schema.prisma` (e.g. `VenueTraffic`); migration |
| Traffic API       | `app/api/traffic/` (GET, optional PATCH/POST) |
| Participant fetch  | Already have `/api/participants/me`; use in provider finder |
| Provider finder   | `app/provider-finder/ProviderFinderClient.tsx`, `useProviderFinder.ts` (or equivalent): inject profile + traffic, sort/filter, show badges |
| Map               | `components/Map.tsx`: accept traffic per provider; show in popup/tooltip |
| Types             | `app/provider-finder/providers.ts` or new `lib/traffic.ts`: `BusyLevel`, traffic response type |

---

## 6. What this doc does *not* cover

- **Transport/road traffic**: Would need a different model (routes, journey times) and possibly an external API (e.g. Google Routes).
- **Real-time push**: Plan above uses polling by default; WebSocket/SSE is an optional later step.
- **Sensor/hardware**: How venues send “busy” data is out of scope here; we only assume an API or cron can write into our store.

If you confirm “traffic” = venue busy levels and “dynamic experience” = participant-based ranking + live badges, the next step is to implement **§1 (schema) + §2 (APIs)** then **§3 (participant-aware + traffic in UI)** in that order.
