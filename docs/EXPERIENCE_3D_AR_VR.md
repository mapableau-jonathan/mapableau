# Abstract as 3D AR/VR Experience

This document abstracts the app’s **participant experience** (provider finder, venue preview, live traffic, accessibility) as a **3D AR/VR experience**. The same data and APIs can drive the current 2D UI and a future immersive client.

---

## 1. Experience abstraction (data + API)

The “experience” is defined by **what** the user sees and does, not **how** it is rendered. The backend exposes:

| Concept | Current (2D) | Abstract model (for 3D/AR/VR) |
|--------|----------------|--------------------------------|
| **Venue / provider** | Card, map marker, profile page | **Spatial entity**: id, name, location (lat/lng or 3D coords), categories, accessibility metadata, optional 3D scene/asset URL |
| **Participant** | Profile (preferences, accessibility needs, location) | **Participant context**: same fields; used to filter/rank and tailor the scene (e.g. “show quieter venues”, “emphasise wheelchair access”) |
| **Live state** | Badge “Quieter now” on card | **Spatial state**: per-venue busy level, optional “next quiet window”; can drive 3D indicators (colour, icon, label in space) |
| **AccessiView** | Video embed, “preview before you go” | **Immersive preview**: 3D/360 venue walkthrough or AR overlay; same “preview before you go” goal, different medium |

So: **abstract experience = (participant context, list of venues with live state, optional venue 3D/preview assets)**. The same APIs (`/api/profiles`, provider outlets, `/api/traffic`, etc.) feed both 2D and 3D/AR/VR clients.

---

## 2. 3D AR/VR mapping

How the abstract experience maps to an immersive client:

- **Venues**  
  Each venue is a **3D object or anchor** in space (e.g. in a 3D map, or as POIs in AR). Position from lat/lng (or pre-baked 3D coordinates). Metadata (name, categories, accessibility, live traffic) is shown in spatial UI (e.g. floating panel, label, colour coding).

- **Participant context**  
  The 3D/AR/VR scene is **dynamic**: only show or emphasise venues that match the participant’s preferences and accessibility needs. “Quieter now” and “Good match” become 3D indicators (e.g. glow, icon, or label in world space).

- **AccessiView**  
  **3D**: Interactive 3D walkthrough of a venue (e.g. WebGL/Three.js or Cesium); user moves through a model to preview layout and accessibility.  
  **AR**: Overlay venue info or a simple 3D preview on the real world (e.g. “this is the entrance”; “quiet area here”).  
  **VR**: Full immersive walkthrough in a headset; same data (venue model, accessibility annotations, live state) as 3D.

- **Live traffic**  
  In 3D/AR/VR, “busy” vs “quiet” can drive **visual state** (e.g. colour, particle density, or a “Quieter now” label in space) without changing the underlying API.

---

## 3. Implementation boundary (future 3D/AR/VR client)

To keep the app backend **renderer-agnostic**:

- **Backend**  
  No change: existing APIs (providers, participant profile, traffic when implemented) already expose the abstract experience (entities, context, live state). Optional: add a **unified “experience” endpoint** (e.g. `GET /api/experience` or `/api/experience/for-participant`) that returns participant context + list of venues with live state + optional 3D asset URLs. That endpoint can be consumed by both 2D and 3D/AR/VR.

- **3D/AR/VR client**  
  Separate module or app (e.g. WebXR + Three.js/A-Frame, or Unity) that:
  - Calls the same APIs (or the unified experience API).
  - Renders venues as 3D objects/anchors; applies participant-based filtering and live-state visuals.
  - For AccessiView: loads venue 3D/scene (URL from API or config) and runs the immersive walkthrough.

- **Abstraction in code**  
  Optionally define a small **experience type** (e.g. in `lib/experience.ts` or `types/experience.ts`): `ParticipantContext`, `VenueWithLiveState`, `ExperiencePayload`. The 2D app and a future 3D client both consume this shape; only the renderer (DOM vs WebXR) differs.

---

## 4. Summary

- **Abstract experience** = participant context + venues (with live state) + optional 3D/preview assets, all served by existing (or extended) APIs.
- **3D AR/VR** = same data, rendered as immersive 3D map, venue walkthrough (AccessiView), or AR overlay, with dynamic, participant-aware and live-traffic-aware behaviour.
- **Backend** stays agnostic; a future 3D/AR/VR client can reuse the same APIs and, if desired, a shared “experience” type/endpoint.

This gives a single abstract definition of the “experience” that can be realised in 2D (current) and 3D/AR/VR without duplicating business logic.
