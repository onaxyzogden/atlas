# 2026-04-28 — Atlas Sidebar IA: Permaculture-Grounded Redesign (Phase B)


### Done
Implemented Shape 4 (combined label refresh + grouping + footer utility nav) per the Phase A synthesis. Edited [V3LifecycleSidebar.tsx](../apps/web/src/v3/components/V3LifecycleSidebar.tsx) and [V3LifecycleSidebar.module.css](../apps/web/src/v3/components/V3LifecycleSidebar.module.css):

- **Labels (v3-only override map, route slugs unchanged):** Discover→**Observe**, Prove→**Test**, Operate→**Steward**, Report→**Evaluate**. Diagnose / Design / Build kept. Per-stage descriptions added (e.g. "Thoughtful, protracted observation").
- **Grouping:** seven stages bucketed into three permaculture phases — *Understand* (Observe + Diagnose), *Design* (Design + Test), *Live* (Build + Steward + Evaluate). Group headers render as small uppercase eyebrow labels above each `<ol>`.
- **Loop affordance:** Steward (operate) row carries a `↻` badge with `title="Stewardship loops back to Observe"`, signaling the continuous-feedback wrap rather than a terminal step.
- **Footer utility nav:** four entries — Ethics & Principles (P0), Matrix Toggles (P0), Plant Database (P1), Climate Tools (P1). P0s render as enabled buttons (action wiring deferred); P1s render `disabled` with "Coming soon" copy per RULE 4 (no dead clicks).
- **Taxonomy untouched:** `LIFECYCLE_STAGES` in `features/land-os/lifecycle.ts` left as-is so the v2 sidebar at `/project/$projectId/*` is not affected. Renames live as a v3-only `V3_STAGE_LABELS` lookup in the sidebar component, keyed by `BannerId`.

### Verification
- `npx vite build` clean (32.46s, 493 PWA precache entries; no TS errors).
- Sidebar DOM via `preview_eval` confirmed: "PROJECT LIFECYCLE / Project Home / UNDERSTAND / 1 Observe / 2 Diagnose / DESIGN / 3 Design / 4 Test / LIVE / 5 Build / 6 Steward ↻ / 7 Evaluate / REFERENCE / Ethics & Principles · Matrix Toggles · Plant Database (Coming soon) · Climate Tools (Coming soon)". Active stage on `/v3/project/mtc/home` correctly resolves to "Project Home".
- `preview_screenshot` was timing out at 30s during the session — fell back to DOM inspection. Pre-existing axe accessibility warnings about `<aside>` inside another landmark are unrelated.

### Carries forward
- Seasonal/annual cycle toggle (header chip) and a live ethics scorer remain deferred per Phase A's open-questions list.
- Map-overlay layer that consumes `matrixTogglesStore` ships in v3.1 — toggles persist state today but render no overlays yet.
