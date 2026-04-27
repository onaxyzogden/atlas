# Phase 1 Audit — Sidebar Item Divergence

**Status:** review
**Date:** 2026-04-26
**Source:** [apps/web/src/features/navigation/taxonomy.ts](../apps/web/src/features/navigation/taxonomy.ts)

Decide per-row: **Keep split** (intentional), **Add to dashboard** (create page), **Add to map** (create panel), or **Demote** (remove entirely).

---

## A. Dashboard-only items (hidden from map rail) — 4 rows

| id | label | domain | phase | Why hidden today | Recommendation |
|---|---|---|---|---|---|
| `data-catalog` | Data Catalog | site-overview | P1 | Comment in taxonomy: "catalog has no map-rail surface; layer *visibility* handled by `map-layers`." | **Keep split** — purpose-built dashboard view, would duplicate `map-layers` |
| `biomass` | Biomass | site-overview | P1 | Read-out only, no map placement. | **Add to map** — biomass is a site-characterization layer, naturally belongs on the rail next to Site Intelligence |
| `dashboard-settings` | Settings | general | P4 | Settings live in `SidebarBottomControls` on both rails already. | **Keep split** — duplicating in accordion is noise |
| `archive` | Archive | general | P4 | Not a map operation. | **Keep split** — archival belongs on the dashboard side |

---

## B. Map-only items (hidden from dashboard) — 15 rows

These are mostly Design Atlas sub-tools (placement-based) and meta tools (fieldwork/history/AI/etc.) that have rich rail panels but no dashboard equivalents.

### B1. Design Atlas sub-tools (placement-based) — 6 rows

| id | label | domain | phase | What it does on map | Recommendation |
|---|---|---|---|---|---|
| `zones` | Zones & Land Use | general | P2 | Draw/edit zone polygons | **Keep split** — pure placement tool; under Phase 3 these tools migrate to bottom toolbar anyway |
| `structures` | Structures & Built | general | P2 | Place buildings from templates | **Keep split** — same reason |
| `access` | Access & Circulation | general | P2 | Draw paths/roads | **Keep split** — same |
| `livestock-systems` | Livestock Systems | grazing-livestock | P2 | Place livestock infra | **Keep split** — same |
| `crops` | Crops & Agroforestry | forestry | P2 | Place crop/orchard zones | **Keep split** — same |
| `utilities` | Utilities & Energy | energy-infrastructure | P2 | **Hosts the Off-Grid Readiness, Energy Demand, Solar Energy, Water Systems read-outs** | **Special case** — the panel is what we surface in the dashboard during Phase 2. The *placement actions* stay map-only (move to bottom toolbar in Phase 3). |

### B2. Cross-cutting / meta tools — 9 rows

| id | label | phase | Why map-only | Recommendation |
|---|---|---|---|---|
| `vision` | Vision Layer | P2 | Map overlay (reference imagery on canvas) | **Keep split** |
| `spiritual` | Spiritual | P2 | Map overlay (qibla, prayer-time light) | **Keep split** |
| `zoning` | Zoning | P2 | Map overlay (regulatory zones) — note: distinct from `zones` (design tool) | **Add to dashboard** — a regulatory zones list/report would be useful as a read-out, mirrors `regulatory` |
| `ai` | AI Atlas | P3 | AI suggestion panel scoped to map context | **Keep split** for now — AI dashboard is a future story |
| `collaboration` | Collaboration | P3 | Live cursors, comments on map | **Add to dashboard** — comment inbox / review queue makes sense as a dashboard page |
| `moontrance` | OGDEN Identity | P3 | Brand layer | **Keep split** |
| `templates` | Templates | P3 | Template library scoped to placement | **Add to dashboard** — template library (browse/manage) is naturally a dashboard surface |
| `fieldwork` | Fieldwork | P4 | Field-notes captured against map points | **Add to dashboard** — field-notes review/triage list belongs in dashboard |
| `history` | Version History | P4 | Map-state version timeline | **Add to dashboard** — project-level audit log fits dashboard chrome |

---

## C. Items with no `panel` (silently dropped from map rail)

`MAP_ITEMS` filter is `!dashboardOnly && i.panel` — so any item missing `panel` would be invisible on the rail even without `mapOnly`. Verified against current taxonomy: every non-`dashboardOnly` item has a `panel`. **No accidental drops.**

---

## D. Compliance group note

The `compliance` domain group is empty — `regulatory` was relocated to `site-overview`. The group filters out automatically. **No change needed.**

---

## Summary of recommended changes

- **Keep split (status quo):** 11 rows (data-catalog, dashboard-settings, archive, zones, structures, access, livestock-systems, crops, vision, spiritual, moontrance, ai)
- **Add map panel:** 1 row (biomass)
- **Add dashboard page:** 5 rows (zoning, collaboration, templates, fieldwork, history)
- **Special case (utilities):** keep `mapOnly` flag on the design-tool entry, but Phase 2 surfaces the *read-outs* under EnergyDashboard

---

## Awaiting your sign-off

Mark each "Recommendation" cell ✅ to accept or write your override, then I'll execute Phase 1 code changes (taxonomy edits + new dashboard pages + new map panel for biomass).
