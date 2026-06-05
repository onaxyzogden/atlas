# 2026-05-20 — OLOS new-user journey walkthrough (6-step dogfood run)

**Branch.** `feat/atlas-permaculture`. No code changes; no commits. Read-only
product QA dogfooding against the 6-step OLOS user journey as the spec.

**Mode.** Live `preview_*` run on `web` :5200 + `api` :3001. Registered a
fresh account, created a brand-new project `Noble Sun Test Farm`
(UUID `9475744c-a064-4ead-a0cd-9b3098cf2172`), walked Observe → Plan →
Act surfaces as a cold-start user (no MTC seed shortcut, 45 localStorage
keys cleared pre-run).

**Deliverable.** [[2026-05-20-olos-new-user-journey-walkthrough]] —
ADR-style walkthrough with per-step verdicts, mapping of the 6-step
journey to the current 3-item Observe/Plan/Act IA, and a prioritized
10-item gap list keyed to the D-roadmap.

**Per-step verdicts (TL;DR):**

- **Step 1 — Create + Observe:** 🟡 partial. Cold-start auto-fetch promise
  is false; project creation only hits `GET /api/v1/projects/builtins`.
  No POST persistence, no data-adapter calls until a boundary is drawn.
  Observation tools mount; geo-anchoring untested (canvas-draw gotcha).
- **Step 2 — Site Scorecard:** 🟡 partial. UI shows 13 dimensions, not 8.
  "Insufficient Data" replaces the promised confidence ratings on a
  fresh project.
- **Step 3 — Design:** ✅ palette / 🟡 catalogue. Zone/water/structure/path
  tooling is complete; planting catalogue + nursery ledger surface is
  not discoverable from Plan stage entry.
- **Step 4 — Phasing (Goal Compass):** ✅ delivers. Yeomans-capped phasing
  matrix is real; ecological dependencies are enforced.
- **Step 5 — Act / command centre:** 🟡 partial. 7-tab Act module mounts
  (Tasks/Deps/Labor/Materials/Contractors/Budget/Proof). Field-proof
  photo upload UI is the most visible gap. D5 Operating Dashboard +
  Adaptive Recommendations slice absent.
- **Step 6 — Monitor + adapt:** 🟡 partial. Regeneration + Biodiversity
  Outcome monitors mount, but every sample fetch fails with
  `Invalid or expired token` immediately after a successful register —
  auth regression in [apiClient.ts:33](../../apps/web/src/lib/apiClient.ts).

**Top gaps (full list in the ADR):**

1. **Auth-token regression** — `apiClient` rejects the just-issued JWT on
   monitoring + AI-enrichment paths. Blocks Step 6 end-to-end.
2. **Cold-start "auto-fetch real public GIS data" promise** — false on a
   project with no boundary. Either wire the adapters off the address-
   search parcel snap, or rewrite the journey copy.
3. **ContextBuilder boot crash** — `TypeError: Cannot read properties of
   undefined (reading 'map')` at
   [ContextBuilder.ts:69](../../apps/web/src/features/ai/ContextBuilder.ts)
   fired from `siteDataStore.enrichProject` fan-out.
4. **13→8 scorecard dimension reconciliation** — copy decision more than
   engineering.
5. **Planting catalogue + nursery ledger discoverability** from Plan.
6. **Field-proof photo upload** missing in Act → Proof tab.
7. **D5 slice** (Operating Dashboard + Adaptive Recommendations) absent.
8. **Auth guard disabled in frontend** — confirmed; masks login bugs.
9. **`Create Account` tab toggle** on /login does not work; inline "Create
   one" link is the working entry.
10. **Backend sync** still localStorage-only for all 26 stores.

**What wasn't exercised (steward-owed, canvas-draw gotcha):**
map-canvas drawing flows, Goal Compass steps 2–5, end-to-end
regeneration readiness gate, address-search → parcel-snap path,
BUILD → Operating Dashboard.

**Recommended next session.** Fix the auth-token regression (gap #1)
first — every monitoring surface depends on it. Then close the cold-
start auto-fetch promise (#3) or rewrite journey copy to match the
boundary-gated reality. The 13→8 scorecard reconciliation (#4) is a
copy decision more than an engineering one.
