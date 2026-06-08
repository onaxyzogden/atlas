# ADR: OLOS HTML-prototype wiring closed -- catalogue-driven model supersedes the wiring map

**Date:** 2026-06-08
**Status:** accepted

**Context:**
The wiring map `docs/html-prototype-wiring.md` lists 28 OLOS HTML prototypes
(`C:\Users\MY OWN AXIS\Documents\OLOS UI\olos_*.html`) to be "wired" into Atlas, each row
pointing at a `features/act/*Card.tsx` target. That target architecture is **defunct**.
The forward Plan/Act model is **catalogue-driven**: decisions are DATA in
`packages/shared/src/constants/plan/catalogues/*.ts` (authored via
`obj()`/`ck()`/`ckA()`/`ckF()`/`dg()`/`patch()`), and one catalogue objective drives BOTH
the read-only Plan `DecisionChecklist` (all tiers) AND the Act surface. The honest scope of
"wiring," therefore, was a content-reconciliation audit, not net-new component authoring.

**Decision:**
Treat the wiring map as a **content source for an audit**, not a build backlog. For each of
the 28 rows, diff the prototype's decision titles (`.dt`), feeds (`.df`), group labels
(`.sec-sep-lbl`/`.glbl`), objective-rail order (`.oi`/`.dn`), and completion-gate text
(`.cgate`/`.nbt`) against the mapped catalogue objective's `checklist` / `decisionGroups` /
`completionGate`, and confirm encoding. Author a new catalogue objective ONLY on a genuine
decision-level gap, and only after halting to flag structural ecovillage additions for
approval. Faith/covenant right-panel content with no catalogue home is captured verbatim in
a flagged inventory for operator review -- **not** silently added to the catalogue.

**Outcome:** all 28 rows (Batch A 1-9 `b44ae18e`; Batch B 10-23 `0d2691e4`; Batch C 24-28
`b95a6fd5`) were confirmed already encoded. **Zero catalogue edits.** Conformance test
stayed 104/104 green. No HALT-and-flag gap arose (the candidate one-to-many rows 13/16/22
all resolved to existing objectives). The covenant-content inventory (4 items) and the
row-15 prototype-file mismatch were recorded as flags, not changes.

**Consequences:**
- The wiring map is **closed**; future prototype/catalogue divergence is a catalogue-content
  question, handled in `catalogues/*.ts` with the conformance test as the gate -- not a
  `features/act/*Card.tsx` build.
- Bespoke Tier-1+ right-panel work surfaces, Tier-1+ mode-badge rendering, the faith/halal
  inventory promotion decision, and the `olos_communal_infra_strategy.html` re-export remain
  DEFERRED as a separate workstream.
- Row 21 financial mechanisms were Amanah-reviewed CLEAN (member cost-sharing among
  co-owners; no riba, no `bay` ma laysa `indak`/CSRA/salam framing), consistent with the
  2026-05-29 ecovillage economic-objective encode authorisation
  ([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

Log: [[log/2026-06-08-html-prototype-wiring-audit-complete]]; entity
[[entities/act-tier-shell]].
