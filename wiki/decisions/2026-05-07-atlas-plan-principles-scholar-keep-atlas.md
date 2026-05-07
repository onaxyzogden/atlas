# Atlas Plan Module 8 (Principle Verification) — KEEP_ATLAS per Scholar verdict

**Date:** 2026-05-07
**Stage:** Atlas / Plan / Module 8 — Principle Verification
**Verdict:** KEEP_ATLAS (no code change; enhancements logged as follow-ups)
**Adjudicator:** NotebookLM Permaculture Scholar (`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`), 2026-05-07

## Options compared

- **A · Atlas current** — `apps/web/src/features/plan/HolmgrenChecklistCard.tsx` (~187L). Twelve-principle self-assessment rubric. For each Holmgren principle (p1 Observe & Interact … p12 Creatively use & respond to change): prompt + worked example, free-text justification textarea, 3-state status pill (unmet | partial | met), and a multi-pick of linked features pulled live from `zoneStore` / `pathStore` / `structureStore` / `topographyStore` / `polycultureStore` / `waterSystemsStore.earthworks`. Header summary shows met/partial/unmet running counts. Persisted via `principleCheckStore` keyed by project.
- **B · OGDEN prototype** — **NO CANDIDATE.** OGDEN ships only a Module 8 stub label in `PlanPage.jsx`.

## Scholar verdict

> "**KEEP_ATLAS (with minor enhancements).** Option A's current implementation (~187 LOC) is already architecturally aligned with orthodox permaculture pedagogy. As taught by Andrew Millison, Holmgren's 12 principles are the standard for consolidating the theory into a usable verification framework. The culmination of a permaculture project relies on the designer manually reflecting on how they applied these specific 12 principles to their site. A pure data-driven or automated scoring model would strip away the human observation and interaction that is central to the permaculture ethos (Principle 1: Observe & Interact)."

Specifically:

- **Holmgren's 12 is the right rubric.** OSU PDC explicitly uses Holmgren's 12 "for simplicity's sake" because Holmgren consolidated Mollison's longer list into 12; the PDC final portfolio requires the designer to "reflect and show us how you used the 12 David Holmgren permaculture principles … in your design."
- **The mechanic — free-text justification + linked-feature multi-pick + 3-state status — is correct.** It mirrors the OSU PDC final-portfolio template (Application = Met + Justification; Further Applied = Partial; Lessons Learned = reflective text), and the linked-feature multi-pick provides the exact "evidence" the PDC rubric demands ("Principle — Explanation of why these photos demonstrate the principle").
- **Automated cross-checks rejected.** "P6 requires ≥1 closed-loop edge"-style validations "run counter to the contextual, observation-heavy nature of permaculture"; the relationship between designer and site is "like a physician has a relationship with their patient" — verification must remain reflective, not algorithmic.
- **Yeomans Keyline Scales explicitly excluded** from Module 8: they are a *chronological sequencing* tool (the "sensible order to design for elements"), not a retrospective verification rubric. Keyline lives in Module 4 (Layering) and Module 7 (Phasing), not here.

## Enhancements identified (deferred to follow-ups)

Scholar identified three orthodox elements Atlas does not yet surface, all logged as follow-ups rather than blocking the verdict:

1. **Three-Ethics rollup (Earth Care / People Care / Fair Share).** Permaculture is fundamentally "an ethically based design system" with the three ethics at its core; the 12 principles serve the ethics. Add a top-level UI rollup that maps which principles satisfy each ethic and surfaces a per-ethic health pill, so the steward sees ethical coverage above the principle-by-principle drilldown.
2. **Mission Statement / Goals cross-check.** OSU PDC's most critical verification step is "check back in with your mission statement and goals, and see if you accomplish your mission statement through the principles." Display the project's original goals at the top of the verification screen so the user can visually cross-reference them while filling in justifications.
3. **Missing-principle warnings + feature-type coverage matrix.** Add a radar chart or simple coverage matrix highlighting under-evidenced principles — e.g. if 50 features are linked to *Obtain a Yield* but zero to *Catch and Store Energy*, the module should surface that gap as a feedback signal (Principle 4 — Apply Self-Regulation and Accept Feedback). Visualises which principles still need design choices behind them.

## Decision

No code change required for the verdict. The three enhancements above are filed as Module 8 follow-up tickets; the iteration ADR will list them. Atlas's `HolmgrenChecklistCard` remains as-is — twelve principles, free-text justification, linked-feature multi-pick, 3-state status, persisted per project.

## Sources cited by Scholar

OSU Permaculture Design Course (Andrew Millison) — Holmgren's 12 chosen "for simplicity's sake"; final portfolio reflective rubric (Application / Further Applied / Lessons Learned); "Principle — Explanation of why these photos demonstrate the principle"; Holmgren D. *Permaculture: Principles & Pathways Beyond Sustainability* (the canonical 12); Mollison B. *Permaculture Designer's Manual* (3 Ethics: Earth Care / People Care / Fair Share); Yeomans Keyline Scales of Landscape Permanence (chronological sequencing — explicitly *out of scope* for this verification module).
