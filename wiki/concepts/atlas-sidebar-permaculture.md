# Atlas Sidebar — Permaculture-Grounded IA Synthesis

## Summary

Atlas's v3 lifecycle sidebar lists seven stages — Discover, Diagnose, Design, Prove, Build, Operate, Report — as a flat 1-of-7 list. This page synthesises a six-question dialogue with the **Permaculture Scholar** NotebookLM (`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`, 44 sources covering the Permaculture Design Course Weeks 1–10, Holmgren's principles, Mollison's design process, Yeomans' scales of permanence, watershed, zones/sectors, ethics, decision matrix, and regenerative investments) into actionable sidebar IA decisions.

**Date:** 2026-04-28
**Conversation ID:** `7bb6feac-2bd5-4867-836c-2a1aedcee705`
**Scope:** Sidebar information architecture only — does not propose stage renames in the routing layer or new pages.

The Scholar's verdict, in one line: **the lifecycle axis is correct, but four of the seven verbs are misnamed, two stages should be reframed as a continuous loop, and two side panels are missing.**

---

## Findings

1. **Lifecycle is the right primary axis.** Zone, sector, element, season, and principle are *nested tools*, not navigation peers. (Q2.) The Scholar quoted Mollison's "designer as land physician" metaphor: site analysis precedes design, design precedes implementation, implementation precedes feedback. A lifecycle-first sidebar enforces this discipline.

2. **The canonical permaculture sequence is 5 steps, not 7.** Observation → Site Analysis → Design → Implementation → Feedback. Atlas's seven stages map onto these five with redundancy at the tail (Build/Operate/Report all collapse into Implementation+Feedback). (Q1.)

3. **Four of the seven Atlas verbs are misnamed.** (Q3.)

| Atlas stage | Maps to | Verdict | Recommended rename |
|---|---|---|---|
| Discover | Observation | Misleading (implies one-time realization) | **Observe** |
| Diagnose | Site Analysis | Well-chosen — matches "designer as land physician" | (keep) |
| Design | Design | Well-chosen | (keep) |
| Prove | Feedback / Implementation | Misleading (suggests static theoretical proof) | **Pilot** or **Test** |
| Build | Implementation | Well-chosen | (keep) |
| Operate | Implementation / Feedback | Misleading (industrial/mechanistic) | **Steward** or **Tend** |
| Report | Feedback | Misleading (implies static document) | **Evaluate** or **Adapt** |

4. **"Operate" is not a terminal stage — it's a wrapping loop.** Permaculture Principle 4 ("Apply Self-Regulation and Accept Feedback") makes stewardship a continuous relationship, not a phase. UX implication: the sidebar should not visually present Steward as the sixth box in a 1-to-7 row. Once a project enters stewardship, the active state should communicate that the user *loops back* into Observe / Diagnose / Design as conditions evolve. (Q6.)

5. **No new top-level stages are needed.** Zone analysis, sector analysis, scales of permanence, succession planning, and energy/water flow audits all belong as nested tools inside Diagnose or Design — not as sidebar peers. (Q4.)

6. **Two persistent side panels are missing.** (Q4.)
   - **Ethics checklist** (Earth Care / People Care / Fair Share) — globally accessible at every stage because the three ethics form the foundation of all permaculture decisions.
   - **Seasonal/annual cycle toggle** — a global lens for viewing site analysis and design through different seasons (sun angle, microclimate, weather extremes shift dramatically across the year).

7. **Utility navigation should foreground four reference items, in priority order.** (Q5.)
   1. Ethics & Principles Reference (the 3 ethics + Holmgren's 12 principles)
   2. Plant & Ecology Database (PFAF / Natural Capital style species lookup with hardiness)
   3. Climate & Weather Tools (historical wind/precip averages, hardiness zones, solar angle calculator)
   4. Decision-Making Matrix Toggles (global topography / sector / zone overlay switches)

---

## Mapping table — current sidebar vs Scholar-recommended

| # | Current label | Scholar verdict | Recommended label | Rationale |
|---|---|---|---|---|
| 1 | Discover | Rename | **Observe** | "Discover" implies a one-time event; permaculture demands "thoughtful and protracted observation." |
| 2 | Diagnose | Keep | Diagnose | Matches "land physician" metaphor exactly. |
| 3 | Design | Keep | Design | Canonical step name in both vocabularies. |
| 4 | Prove | Rename | **Pilot** | Pre-build validation should evoke small/slow testing, not theoretical proof. |
| 5 | Build | Keep | Build | "Building the systems" is the literal source vocabulary for implementation. |
| 6 | Operate | Rename + reframe | **Steward** (looping) | Living relationship, not industrial operation; renders as a loop, not a step. |
| 7 | Report | Rename | **Evaluate** | Continuous feedback loop, not a static outward document. |

---

## Recommended additions (priority-ranked)

| Item | Type | Priority | Where it lives |
|---|---|---|---|
| Ethics & Principles Reference | Utility nav (footer) | **P0** | Bottom of sidebar, persistently accessible |
| Decision-Making Matrix Toggles | Utility nav OR rail toggle | **P0** | Side rail or sidebar footer — global overlay state |
| Plant & Ecology Database | Utility nav (footer) | P1 | Bottom of sidebar — opens reference panel/page |
| Climate & Weather Tools | Utility nav (footer) | P1 | Bottom of sidebar — opens reference panel/page |
| Seasonal/Annual cycle toggle | Persistent header chip | P1 | Top of content area or sidebar — global lens |
| Steward-as-loop visual | Sidebar layout change | P0 | Replace 1-of-7 row with 6 + 1 looping group |

---

## Open questions / tensions

- **Renames vs route stability.** Renaming Discover → Observe, Prove → Pilot, Operate → Steward, Report → Evaluate changes user-visible labels but should NOT change route slugs (`/v3/project/:id/discover` etc. stay) — those are routing keys, not user-facing copy. The plan's Phase B explicitly excludes route renames.
- **"Pilot" vs "Test".** Scholar offered both for Prove. "Pilot" leans operational (small first deployment), "Test" leans analytical (scenario validation). Atlas's existing Prove page does feasibility scoring, not a small physical pilot — so **"Test"** may be the better fit, but this conflicts slightly with the Scholar's preference for small/slow physical experimentation. **Defer to Yousef.**
- **Steward-as-loop visualization.** A literal circular layout breaks alignment with the linear stage banner and lifecycle progress indicators already shipped on the Home page. A pragmatic compromise: render Steward as a visually distinct "ongoing" group at the bottom of the linear list, with an explicit "↻ loops back to Observe" affordance. Not a full circular UI.
- **Where do utility links go?** Two viable placements: (1) as a separate footer section *inside* the LandOsShell sidebar (preserves single-column nav), or (2) as a split between sidebar footer (Ethics + Principles) and DecisionRail global toggles (Matrix overlays). The Scholar prefers persistent global access; placement is a design choice.
- **Ethics checklist surface.** Could be a static reference page, a dynamic interactive checklist that scores the current project against the three ethics, or just a sidebar tooltip. Cheapest version is a reference link; richest version requires scoring engine work. Phase B should ship the cheapest version.

---

## Implications for Phase B (sidebar code changes)

The Scholar's input lands cleanly on **Shape 4** of the four shapes pre-listed in the plan: combined label refresh + grouping + bottom utility nav.

Specifically:
- **Labels:** rename 4 of 7 stage labels in `LIFECYCLE_STAGES` (Discover→Observe, Prove→Test, Operate→Steward, Report→Evaluate). Keep `id`/`section` slugs unchanged.
- **Grouping:** visually separate the seven stages into three permaculture phases — *Understand* (Observe + Diagnose), *Design* (Design + Test), *Live* (Build + Steward + Evaluate) — with group headers in the sidebar.
- **Looping:** add a subtle "↻" affordance at the Steward row indicating the loop-back relationship.
- **Footer utility nav:** add a sidebar footer with 4 links — Ethics & Principles, Plant Database, Climate Tools, Matrix Toggles. P0 items render as real links to stub pages or open existing surfaces; P1 items can render as disabled/"Coming soon" if no surface exists yet.
- **Side panels (deferred to a later pass):** Seasonal toggle and live ethics scorer are out of scope for the sidebar pass — note as future work.

---

## Source provenance

All claims in this synthesis trace to the Permaculture Scholar conversation `7bb6feac-2bd5-4867-836c-2a1aedcee705`, turns 1–6 (questions Q1–Q6), 2026-04-28. Key sources cited by the Scholar across answers:

- *The Foundations of Permaculture Design* (`f548d127-...`) — canonical 5-step sequence, "designer as land physician"
- *The Permaculture Principles* (`c948c809-...`) — Holmgren's 12 principles, especially #1 (Observe and Interact), #4 (Self-Regulation and Accept Feedback), #9 (Use Small and Slow Solutions)
- *Permaculture Decision Making Matrix* (`cf971a56-...`) and *Sectors* (`bc61f9e8-...`) — sector mapping as foundational diagnostic step
- *Permaculture Zones* (`6f5b87b7-...`) and *Zones in the Matrix* (`a4e49f10-...`) — zones as nested design tool
- *Scales of Landscape Permanence* (`34767968-...`) — Yeomans' ordering inside Design
- *Permaculture Ethics* (`492c88e3-...`) — Earth Care / People Care / Fair Share as persistent foundation
- *OSU Permaculture Course Intro - Designer as Land Physician* (`d8ad6824-...`) — diagnosis-before-treatment metaphor that validates "Diagnose" stage name

This page is one of two artifacts derived from this dialogue; the other is [permaculture-alignment.md](permaculture-alignment.md), which assesses Atlas's overall alignment with permaculture ethics + principles (broader scope, earlier dialogue).
