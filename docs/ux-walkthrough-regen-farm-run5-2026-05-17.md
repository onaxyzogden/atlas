# OLOS / Atlas — Regen-Farm UX Walkthrough (Run 5 — Live Calendar Recurrence Verification)

**Date:** 2026-05-17
**Build:** branch `feat/atlas-permaculture`, F-1/F-2/F-3 fixed build (atlas
`2499d24a`), web app served at `http://localhost:5200/`
**Environment:** **Frontend-only, offline.** No Docker → no Postgres/Redis/Fastify
API. Persistence is browser `localStorage` only.
**Driver:** `preview_*` MCP tools (project mandate). The Mapbox/WebGL canvas
cannot be driven, so prerequisite state was injected through the real Zustand
store actions (`createProject` / `setFacet` / `addZone` / `createPlan` /
`confirmReadiness` / `ensureDefault`) and is **explicitly labelled
"(simulated)"** wherever it appears. The Generate pipeline and the calendar
itself ran natively. DOM text/aria was read directly; no screenshot claims.
**Project used:** a **fresh** project `5440a300-714b-4125-9252-1f3f9ab311b3`
("Run-5 Regen Farm (simulated)") — *not* the contaminated `ec5ed028` /
`a4d04c74`.

> This is a **discovery-only / verification** run. Purpose, per the approved
> directive: re-exercise the Run-4 journey on a genuinely clean fixture and
> **DOM-confirm in the live Event calendar** that F-1b recurrence expansion
> surfaces bounded recurring maintenance entries across the 2032+ horizon — the
> one open verification left when last session's calendar nav bounced. **No
> code changes.** Runs 1–4 (`docs/ux-walkthrough-regen-farm.md`,
> `…-run2-2026-05-16.md`, `…-run3-2026-05-17.md`,
> `…-run4-2026-05-17.md`) are left **byte-for-byte unmodified**.

---

## Severity Legend

| Tag | Meaning |
|---|---|
| **WORKS** | Stage produced the expected output, DOM/localStorage-verified |
| **MAJOR** | Output present but functionally unusable |
| **MINOR** | Friction / latent robustness gap |
| **CAVEAT** | Harness/fixture-authoring limitation, not a product defect |

---

## Headline

**F-1b is FIXED — live-confirmed.** On a clean fresh fixture, a single
"Generate site design" click produced a synthetic maintenance phase whose 17
recurring tasks are dated **2032** (`startYear 2026 + maxDesignOrder 6`),
**never 2124**. In the live Event calendar, the annual maintenance task
"Keyline-graded access track — upkeep (annual)" was DOM-confirmed recurring on
**six bounded yearly occurrences (2032→2037)**, with meta `· recurring annual`,
and **correctly absent from 2038 onward** — bounded by
`MAINTENANCE_VIEW_HORIZON_YEARS = 5`, no runaway. F-1a, F-1b and F-2 all
verified live; no regressions observed.

---

## Per-stage verdict

| # | Stage | Verdict | Evidence |
|---|---|---|---|
| A | Clean fixture injected (project / site-profile / 2 zones / regen plan) | **WORKS** | `ogden-*` rehydrated after reload; project name/type/startDate correct; regen plan `stewardReadinessConfirmedAt` set |
| A | Goal tree seeded; F-2 hyphen-archetype resolves | **WORKS** | `ensureDefault('regenerative_farm')` → archetype `regenerative-farm`, parent "Profitable regenerative farm", 4 subGoals / 9 criteria — **no silent HOMESTEAD fallback** |
| B | `generate()` completes, no prereq warning | **WORKS** | "Generate site design" enabled, date input `2026-06-01`; no thrown/console errors |
| B | Maintenance tasks anchored to post-establishment year (F-1a) | **WORKS** | `ogden-phases`: `maint-phase-…` order 99, 17 tasks, **all `scheduledStart` year = 2032**; phase set carries `gc-phase-…-soil` order 6 ⇒ maxDesignOrder 6 |
| C | Source filter default-on | **WORKS** | "Plan tasks" toggle `aria-pressed="true"` without interaction |
| C | Recurrence expansion present at anchor year (F-1b) | **WORKS** | `Sep 1st 2032 — 2 entries`: annual (`· recurring annual`) + quarterly (`· recurring quarterly`), 6h, role list |
| C | ≥3 distinct bounded yearly occurrences | **WORKS** | Annual task DOM-confirmed on `2032,2033,2034,2035,2036,2037-09-01` (6 occurrences) |
| C | Bounded by horizon — no runaway | **WORKS** | `Sep 1st 2037` last (1 entry); `Sep 1st 2038` & `2039` = **0 entries**, title gone |

---

## Journey (stage-by-stage)

1. **Fixture (Phase A).** Minted fresh project via `createProject`
   (`5440a300-…`), `updateProject` set `startDate 2026-06-01`,
   `hasParcelBoundary`, `acreage 120`, empty FeatureCollection. 11 site-profile
   facets via `setFacet(…, 'manual')`. Two `LandZone` via `addZone`: barren
   livestock-suitable (`category livestock`, `groundCover barren`,
   `successionStage disturbed`, `permacultureZone 4`, `suitableForLivestock
   true`) + food (`food_production`, `bare-soil`, `pioneer`, Z2). One
   `RegenerationPlan` via `createPlan` (`targetState pasture`, barren zone)
   then `confirmReadiness` → `stewardReadinessConfirmedAt` set
   (`planReady: true`). Goal tree via `ensureDefault(pid,'regenerative_farm')`.
2. **Generate (Phase B).** Plan → Compass module → Proposal tab; "Generate
   site design" enabled, no missing-prerequisite warning. Click → 12 phases
   incl. `regen-phase-…` (order 1, regen-zone adopted, **no duplicate**),
   `gc-phase-…` climate/water/access/trees/subdivision/soil (orders 1–6),
   `maint-phase-…` (order 99). 17 maintenance tasks, **every `scheduledStart`
   in 2032** (annual ones 2032-09-01/09-23/10-16/11-07; quarterly/monthly from
   2032-03-01).
3. **Live calendar (Phase C).** Routed to `/v3/project/<pid>/act/schedule`
   (route, not the "Operations Schedule" sidebar item — the prior-session
   bounce). Opened the in-module **"Event calendar"** tab. Stepped the
   Next-month control **76×** (no jump-to-date control) May 2026 → September
   2032 (label confirmed). `Sep 1st 2032` cell → 2 recurring entries. Stepped
   +12mo repeatedly: the annual title reappears 2033–2037; gone 2038/2039.

---

## Findings

No new defects. F-1a / F-1b / F-2 confirmed live; F-3 was unit-locked in the
fix session and is exercised implicitly here (per-phase-id bucketing — the
regen `order:1` phase still shares year 2026 with the first design phase while
distributing independently; no interleave observed).

Carried recommendations (unchanged from Run-4, still out of scope here):
closed-loop model unification (#58/#59 — document-only); no jump-to-date
control on `EventCalendarCard` (reaching 2032 needs 76 month-steps — a
**MINOR** UX gap for any long-horizon maintenance view; recommend a year/month
picker or "jump to next maintenance" affordance).

---

## Validation method & honesty caveats

- **CAVEAT — canvas-origin geometry.** No zone/paddock/swale could be *drawn*;
  the WebGL canvas is undrivable. All prerequisites were created through the
  app's own store actions (schema-correct by construction) and labelled
  "(simulated)". The Generate pipeline and the calendar rendered natively —
  their outputs are genuine engine/UI results, not injected.
- **CAVEAT — calendar nav.** No jump-to-date control exists; the Next-month
  button was clicked 76× programmatically (functional `setAnchor` updaters
  compose). The landed month label was DOM-asserted ("September 2032") before
  reading entries.
- **No screenshots claimed.** All verification via `localStorage` reads and
  DOM `aria-label` / `innerText` reads (`preview_eval`).
- **Discovery-only.** No source files edited.

---

## Net

The F-1 fix is fully validated end-to-end on a clean project: maintenance
recurrence anchors to the post-establishment year (2032) and expands into
bounded, calendar-visible yearly occurrences (2032–2037, none past the 5-year
horizon). The headline Goal-Compass → auto-design → phasing → scheduling →
calendar pipeline is sound on the fixed build. F-1b's single open live
verification is now closed: **FIXED — live-confirmed**.
