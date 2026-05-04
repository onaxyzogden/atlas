# OGDEN Land Design Atlas — UI/UX Upgrade Brief

**Status:** Draft for approval
**Date:** 2026-04-27
**Owner:** Yousef Abdelsalam
**Branch target:** `feat/shared-scoring`
**Companion plan:** `~/.claude/plans/i-reviewed-the-ogden-cheerful-tarjan.md`

---

## 0. Why this brief exists

The Atlas is technically impressive but cognitively heavy. It shows information; it does not yet convey **judgment**. A first-time user lands inside dense modules — scores, layers, panels, tabs — and must understand the system before the system helps them understand the land.

This brief defines the upgrade that turns the Atlas from a *dashboard* into a *regenerative command center*. It is the gate before any code change. Phases 2–6 of the companion plan implement what is specified here.

---

## 1. Primary user journey

One promise, said in one sentence, answerable in under 30 seconds on any device:

> **"What does this land mean, and what should I do next?"**

Every screen-level decision in this brief is justified against that promise. If a section does not advance the answer, it gets demoted, collapsed, or removed from the default view.

User archetypes served:

- **Land steward / operator** — wants a verdict and a next move.
- **Designer** — wants spatial design tools without re-orienting through metadata.
- **Investor / partner** — wants a one-page deliverable on demand.
- **Field user (mobile)** — wants the verdict, the blockers, and the ability to capture notes and photos outdoors.

---

## 2. New page hierarchy (Overview tab)

Replaces the current dense-module dashboard. Top-to-bottom:

1. **Land Verdict Card** — verdict label, score, one-sentence interpretation, three CTAs.
2. **Critical Constraint Alert** — only when a blocking flag exists.
3. **Decision Triad** — Risks · Opportunities · Limitations cards, each with recommended action.
4. **Land Intelligence Summary** — six tiles: Soil · Water · Climate · Terrain · Access · Regulation. Each shows *Status / Meaning / Confidence*.
5. **Regenerative Design Potential** — Silvopasture · Water harvesting · Agritourism · Grazing · Food forest · Infrastructure sensitivity · Stewardship readiness. Status surfaces reserved; compute may follow later.

The right rail shows **Next Best Actions** (see §5). The left sidebar shows the **5-stage workflow** (see §4).

---

## 3. Top tabs — renamed and reordered

| Position | Old | New | Purpose |
|---|---|---|---|
| 1 | Dashboard | **Overview** | Verdict, constraints, decision triad |
| 2 | Map View | **Design Map** | Spatial design surface (was passive "Map View") |
| 3 | — | **Intelligence** | Layered analytics & data depth |
| 4 | — | **Report** | Briefs, exports, public portal |

Phase 2 renames labels only; underlying routes/views stay the same. New routes for Intelligence and Report are stitched from existing dashboards.

---

## 4. Left sidebar — 5-stage workflow taxonomy

Default grouping mode becomes `stage`. `phase` and `domain` remain as power-user toggles.

### Stage 1 — Understand the Land
Site Intelligence · Hydrology · Soil · Climate · Terrain

### Stage 2 — Identify Constraints
Regulatory · Wetlands / Flood · Zoning · Environmental Risk

### Stage 3 — Design the System
Paddocks · Planting · Forestry · Water Systems · Infrastructure

### Stage 4 — Test Feasibility
Economics · Scenarios · Timeline · Biomass

### Stage 5 — Prepare the Report
Public Portal · Investor Summary · Export

### Mapping table — current taxonomy → new stages

| Current (Phase / Domain item) | New stage |
|---|---|
| P1 Site Intelligence | Stage 1 — Understand |
| P1 Terrain | Stage 1 — Understand |
| Domain: site-overview | Stage 1 — Understand |
| Domain: hydrology-terrain | Stage 1 — Understand (hydrology + terrain) |
| P2 Regulatory · Zoning · Siting Rules | Stage 2 — Identify Constraints |
| P2 Vision Layer · Spiritual | Stage 3 — Design the System (cross-cutting; pinned) |
| P2 Paddock Design · Herd Rotation · Grazing Analysis | Stage 3 — Design the System |
| P2 Planting Tool · Forest Hub · Nursery Ledger · Carbon Diagnostic | Stage 3 — Design the System |
| P2 Utilities & Infrastructure · Energy & Off-Grid · Structures & Built · Access & Circulation · Zones & Land Use | Stage 3 — Design the System |
| P2 Inventory & Health Ledger · Crops & Agroforestry | Stage 3 — Design the System |
| P2 Economics · Timeline & Phasing | Stage 4 — Test Feasibility |
| P3 Collaboration · AI Atlas · Scenarios · Simulation Scenarios | Stage 4 — Test Feasibility |
| P4 Public + Portal · Reporting · Templates | Stage 5 — Prepare the Report |
| P4 Mobile Fieldwork | Cross-cutting — surfaced via mobile shell, not in stage list |

Tagging is non-destructive: each `NAV_ITEM` adds a `stage` field; existing `phase` and `domain` fields stay.

---

## 5. Component upgrades — exact copy and acceptance criteria

### 5.1 Land Verdict Card

**Location:** Top of Overview tab.

**Verdict bands (derived from existing Overall Suitability score):**

| Score | Verdict label | Tone |
|---|---|---|
| 80–100 | Strong Fit | confident green |
| 60–79 | Conditional Opportunity | amber gold |
| 40–59 | Proceed with Caution | warning |
| 0–39 | Not Recommended | critical red |

**Layout (copy template):**

> **Conditional Opportunity — Proceed with Caution**
> **Score: 66/100**
> **Main blocker:** Conservation authority regulation
> **Best-fit use:** Regenerative education / low-impact agroforestry / phased stewardship
> **Next move:** Confirm permitted uses before design investment

**CTAs (in this order):** `View Constraints` · `Open Design Map` · `Generate Brief`

**Acceptance:**
- Score circle reuses logic from `ScoresAndFlagsSection.tsx`; no parallel scoring engine.
- Main blocker = highest-severity flag from existing flag data.
- Best-fit use = top-ranked opportunities, joined as a sentence.
- Renders correctly for high/mid/low test parcels with appropriate band, label, and tone.

---

### 5.2 Critical Constraint Alert

**Visibility:** Only when a blocking flag exists. Never empty-state.

**Copy template:**

> **Conservation Authority Regulation Detected**
> Development may be restricted within the regulation limit. Confirm permitted uses before committing to infrastructure, fill, grading, or permanent structures.

**CTA:** `Create Regulatory Checklist`

**Acceptance:**
- Hidden when no severity-≥-blocking flag exists.
- Visually distinct from Decision Triad cards (full-width, alert tone).
- Linkable to the Regulatory dashboard (Stage 2).

---

### 5.3 Decision Triad cards

**Three cards, side-by-side on desktop, stacked on mobile.**

| Card | Color tone | Question it answers |
|---|---|---|
| Risks | Critical red | What can stop this project? |
| Opportunities | Gold | What makes this land valuable? |
| Limitations | Sage / grey | What must be designed around? |

**Each card carries the same schema:**

- **Impact level** (High / Medium / Low) — pill or icon.
- **Why it matters** — one sentence in plain English.
- **Recommended action** — verb-first imperative.
- **Confidence** (High / Medium / Low) — based on data provenance.
- **Source** — short attribution + link to Details.

**Acceptance:**
- All five fields render for every triad item; missing data shows "—" not blank.
- Underlying data is the existing Risks/Opportunities/Limitations sections — this is render-layer, not new compute.

---

### 5.4 Next Best Actions panel (right rail)

Replaces the underused "Regenerative Metrics" placeholder on Overview.

**Copy pattern (3–5 items, ordered):**

1. Confirm CA-regulated parcel restrictions
2. Mark buildable / non-buildable zones
3. Add manual soil test
4. Run low-impact enterprise scenario
5. Generate land brief

**Acceptance:**
- Always populated on Overview — never empty.
- Items derived from existing flags + opportunities.
- Each item is clickable and routes to the relevant tool.
- Section-specific dashboards (Hydrology, Terrain, etc.) keep their existing contextual metric cards — Next Best Actions only replaces the Overview default rail.

---

### 5.5 Primary CTA — Generate Land Brief

**Location:** Top-right of `AppShell` header, persistent across all project pages.

**Behavior:** Opens the existing `ProjectSummaryExport` modal.

**Acceptance:**
- Visible at desktop and tablet widths.
- On mobile, collapses into the project selector menu as a primary item (not hidden).

---

## 6. Data-vs-meaning layering — design rule

Every analytic surface follows this three-layer pattern:

1. **Summary** (largest, plain English): *"This parcel has strong soil potential but regulatory limitations may restrict development."*
2. **Evidence** (bullets, scannable):
   - Soil: Class 2
   - Wetlands: none detected
   - Hydrology: 170m to nearest stream
   - CA regulation: present
3. **Source / metadata** (collapsed `Details` disclosure): source, data date, confidence, rated-on timestamp.

This rule applies to: Site Intelligence sub-panels, Decision Triad cards, Land Intelligence Summary tiles, and any future analytic card. Metadata stays reachable; it stops dominating.

---

## 7. Mobile behavior

**Activation:** `useIsMobile()` (768px breakpoint, already in code).

**Shell layout:**
- **Top app bar** — Atlas / project name, project selector, overflow menu.
- **Bottom navigation** — Overview · Design · Intelligence · Report.
- **Body** — one-card-per-section vertical stack on Overview.
- **Sticky `Next Action` button** above the bottom nav, always visible.
- **Horizontal swipe** between the four bottom-nav sections.

**Field-use priorities:**
- Verdict, blockers, and Next Action visible without scroll on a 375px screen.
- Field notes and photo capture (existing `mobile-fieldwork` module) remain reachable in one tap.
- No attempt to preserve the desktop dashboard layout — mobile is its own shell.

**Acceptance:**
- At 375px: Verdict + Critical Constraint + sticky Next Action all visible above the fold.
- At 768px: behaves as mobile shell, not a half-broken desktop.

---

## 8. Design system rules

These rules govern Phase 3+ component work and any future card.

- **Spacing:** Prefer breathing room over density. Standard inter-section gap = 24px desktop, 16px mobile.
- **Borders:** Reduce. Use elevation, background tint, or section title weight to separate.
- **Section titles:** Larger, heavier, plain-English. No abbreviations or codes.
- **Contrast tiers (named):**
  - `critical` — red, used for Risks and blocking constraints only.
  - `caution` — amber/gold, used for Opportunities and conditional verdicts.
  - `opportunity` — sage / soft gold, used for Limitations and design surfaces.
  - `confident` — green, used for Strong Fit verdicts and confirmed positives.
- **Iconography:** Fewer, larger icons. No tiny indicator clusters. Each icon must carry meaning, not decoration.
- **Copy:** Plain English over jargon. "What this means" framing over raw metric names. Verb-first imperatives in every CTA.
- **Empty states:** Forbidden in default views. Either show the framework (Pending status) or hide the surface entirely.
- **Reuse `phaseTokens` color system** in `taxonomy.ts` for stage-level color anchors.

---

## 9. Implementation checklist (developer tickets)

### Phase 2 — Navigation restructure
- [ ] Add `stage` field to `NAV_ITEM` type in `taxonomy.ts`.
- [ ] Tag every existing `NAV_ITEM` per the §4 mapping table.
- [ ] Add `stageMeta` (5 entries) alongside `phaseTokens` and `domainMeta`.
- [ ] Extend `GroupingToggle` with a `stage` option; default to `stage`.
- [ ] Update `IconSidebar.tsx` to render stage groups via existing accordion.
- [ ] Rename `ProjectPage.tsx` tabs to `Overview | Design Map | Intelligence | Report`.
- [ ] Stub Intelligence and Report tabs as wrappers around existing dashboards.
- [ ] Verify `npm run build` and `npm run lint` pass.

### Phase 3 — Land Verdict + Critical Constraint
- [ ] Build `features/dashboard/LandVerdictCard.tsx` with verdict bands per §5.1.
- [ ] Build `features/dashboard/CriticalConstraintAlert.tsx` per §5.2.
- [ ] Mount at top of `DashboardView.tsx` for the Overview section.
- [ ] Wire `Generate Brief` CTA to existing `ProjectSummaryExport` modal.
- [ ] Verify with three test parcels (high/mid/low score).

### Phase 4 — Decision Triad + layering
- [ ] Build `features/dashboard/DecisionTriad.tsx` consuming existing Risks/Opportunities/Limitations data.
- [ ] Apply five-field card schema per §5.3.
- [ ] Refactor Site Intelligence sub-panels to the three-layer pattern (Summary / Evidence / Details disclosure).

### Phase 5 — Next Best Actions + persistent CTA
- [ ] Build `features/dashboard/NextBestActionsPanel.tsx` per §5.4.
- [ ] Replace the Overview default right-rail content; leave section-specific metric cards alone.
- [ ] Add `Generate Land Brief` button to `AppShell.tsx` top-right per §5.5.

### Phase 6 — Mobile shell
- [ ] Build `app/MobileProjectShell.tsx` with top bar, bottom nav, swipe, sticky Next Action.
- [ ] Reuse LandVerdictCard, CriticalConstraintAlert, DecisionTriad, NextBestActionsPanel.
- [ ] Verify at 375px and 768px.

---

## 10. Out of scope (deferred)

- Map View visual redesign and layer styling.
- New analytical compute for Regenerative Design Potential (silvopasture / agritourism / stewardship readiness scoring).
- Backend / API changes — this is presentation-layer only.
- Public portal redesign.

---

## 11. Approval

This brief must be marked **approved** before Phase 2 begins. Approval can be:

- Verbatim approval, or
- Edits inline with explicit "approved with edits" sign-off.

Once approved, the implementation checklist in §9 becomes the working spec for Phases 2–6.
