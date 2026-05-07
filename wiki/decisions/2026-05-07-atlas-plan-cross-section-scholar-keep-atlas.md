# Atlas Plan Module 6 (Cross-section & Solar Geometry) — KEEP_ATLAS per Scholar verdict

**Date:** 2026-05-07
**Stage:** Atlas / Plan / Module 6 — Cross-section & Solar Geometry
**Verdict:** KEEP_ATLAS (no code change; enhancements logged as follow-ups)
**Adjudicator:** NotebookLM Permaculture Scholar (`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`), 2026-05-07

## Options compared

- **A · Atlas current** — `apps/web/src/features/plan/TransectVerticalEditorCard.tsx` (~540L). Steward picks a saved transect, pins vertical elements at metric distances either as standalone (type + heightM + label) or as typed refs (water-system / polyculture / closed-loop / structure) that resolve height + label from the linked store; renders the 2D profile with element silhouettes and integrated winter/summer solstice noon altitude lines (latitude inferred from `Transect.pointA[1]`).
- **B · OGDEN prototype** — only swale long-profile/cross-section embedded inside `PlanSwaleDrainToolPage` (water module, not a standalone Module 6).

## Scholar verdict

> "Option A (Atlas) should absolutely be kept as the foundation for Module 6. It already accomplishes the heavy lifting of the OSU PDC 'Site Cross Section' assignment by providing the A-B transect, vertical element plotting, and the highly specific winter/summer solstice solar overlay."

Specifically:

- **Cross-section + solar overlay is the orthodox framing.** OSU PDC Assignment 15 mandates exactly this — A-to-A′ transect line + summer/winter solar angles. Atlas's solstice-altitude lines already satisfy that mandate.
- **OGDEN's framing is rejected** — restricting cross-sections to swale long-profiles "severely misunderstands the broad utility of the cross-section." A proper section integrates trees, water, access, structures together.
- **Atlas already gets right:** typed refs that resolve heights (Scholar: "knowing tree heights clarified solar access and shading"); ability to pin structures / trees / shrubs / water features as the OSU PDC requires.

## Enhancements identified (deferred to follow-ups)

Scholar identified four orthodox elements Atlas does not yet surface, all logged as follow-ups rather than blocking the verdict:

1. **Microclimate bracket labels** below the profile — horizontal brackets the steward can drag along the transect and label with attributes like "Shady, Dry, Warm" / "Full sun, wet in rainy season, hot, flat."
2. **Succession-stage bands** — bracket-style overlays labelling "Early succession (compacted)" / "Mid succession (pioneer species)" / "Late stage / climax."
3. **Explicit slope / elevation annotations** — even when the visual slope is rendered, orthodox cross-sections call out elevation deltas and slope % (e.g. "Slope 20–25%") in text.
4. **Wind and flow deflection callouts** — vertical illustration of how an element responds to a sector force (e.g. dense evergreen deflecting cold winter wind over a structure; swale catching overland flow). Sector origins themselves stay on the top-down Sector Compass; this is the section-level *response*.

## Decision

No code change required for the verdict. Filing the four enhancements above as a Module 6 follow-up ticket; the iteration ADR will list them. Atlas's Module 6 remains as-is.

## Sources cited by Scholar

OSU Permaculture Design Course Assignment 15 *Site Cross Section* (mandates A-to-A′ transect + summer/winter solar angles + microclimate bracketing + succession labelling); Mollison B. *Permaculture Designer's Manual* (sector + zone integration); Holmgren D. *Principles & Pathways* (P1 *Observe & Interact*).
