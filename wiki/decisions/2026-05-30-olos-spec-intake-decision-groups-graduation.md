# ADR: OLOS spec intake -- Decision Groups + Graduation (wiki-ingest only; code stays canonical)

**Date:** 2026-05-30
**Status:** accepted

**Context:**
The operator attached three OLOS architecture specs with no implementation
instruction:
- `OLOS_Project_Type_Secondary_Layer_Spec_v1.2` (adds `decision_groups[]`
  in sections 9.3-9.4; updates the design-tension register; confirms
  Residential as project type #13, secondary-only).
- `OLOS_Decision_Groups_Reference_v1.0` (canonical decision-group data for
  all 18 catalogues -- Part 1 primaries, Part 2 the six Secondary Type
  Catalogues RS/OGS/HMS/EVS/COS/NRS).
- `OLOS_Project_Type_Graduation_Spec_v1.0` (the grow-into-types model:
  `type_history[]`, `active_primary_types[]`, graduation engine semantics).

These open several new multi-session workstreams (a `decision_groups[]`
schema field + data wiring across 18 catalogues; a graduation engine/store;
an updated tension register). They do **not** supply the
Silvopasture-secondary or Orchard-secondary catalogue files that the prior
fan-out deferred -- neither type appears as a secondary in the Decision
Groups Reference (both appear only as primaries), so the deferred task #13
remains blocked on operator source files.

The operator scoped this session via AskUserQuestion:
- Q1 "What should this session target?" -> **Wiki-ingest only** (capture the
  specs as authoritative reference; encode nothing yet).
- Q2 "How to handle the doc-vs-code discrepancies?" -> **Flag in wiki, keep
  code as-is** (document the deltas; treat the encoded model as canonical;
  no code churn).

**Decision:**
1. Ingest all three specs into the wiki as authoritative reference: two new
   concept pages ([decision-groups](../concepts/decision-groups.md),
   [project-type-graduation](../concepts/project-type-graduation.md)), this
   ADR, an entity note on
   [shared-package](../entities/shared-package.md), and a log entry.
2. Encode no code this session. `decision_groups[]` and the graduation model
   are documented as planned-not-encoded.
3. Keep the codebase as canonical where it diverges from the docs; record
   the deltas as known doc-vs-code flags (below).

**Flagged doc-vs-code discrepancies (code remains canonical):**
1. **Universal-objective count: 16 vs 19.** Secondary Layer Spec v1.2
   (section 4) states verbatim: "Sixteen objectives are universal." The
   encoded model carries **19** universal objectives (`universal.ts`,
   resolved everywhere, e.g. the verified regen_farm+residential = 38 set).
   Code (19) is canonical; the spec wording is older. Reconcile only if the
   operator confirms a deliberate reduction.
2. **Ref scheme: `XX.S{stratum}.{n}` vs `SILV-/ORCH-/U-` prefixes.** The
   Decision Groups Reference uses type-prefix refs like `RF.S1.1`, `RS.S2.1`.
   The encoded catalogues use `SILV-S1.4`, `ORCH-S1.4`, etc. The encoded
   scheme is canonical; mapping is mechanical if/when decision groups are
   wired.
3. **Design tensions: 13 (docs) vs 10 (code).** v1.2 references 13 tensions
   (tensions 9 & 10 added for Residential+Agritourism and
   Residential+Wellness; 11 & 12 added when Off-Grid was promoted to
   secondary; plus the prior set). `relationshipMatrix.ts` encodes 10 named
   tensions. Code is canonical; the extra named tensions are unencoded until
   their secondary types are.
4. **`decision_groups[]` is a new, unencoded schema field.** The
   `planStratumObjective` schema has no `decision_groups[]`; adding it is a
   future schema + data + Plan-render workstream, not done here.

**Consequences:**
- The wiki now documents decision groups and graduation as the authoritative
  forward design, clearly marked planned-not-encoded, with the four deltas
  recorded so a future implementer reconciles deliberately rather than
  discovering drift.
- No code, schema, test, or engine change this session; the encoded 19-
  universal + `SILV-/ORCH-` model stays canonical.
- Deferred follow-ons (each its own future session): (a) `decision_groups[]`
  schema field + data wiring across catalogues; (b) graduation engine/store
  (builds on the deferred mid-project add/remove seam, Sub-slice F);
  (c) tension-register expansion as secondary types are encoded;
  (d) Silvopasture/Orchard secondary catalogues remain blocked on operator
  source files (not provided by these three docs).
- Covenant: documentation-only; no economic surface; the CSRA prohibition
  ([[fiqh-csra-erased-2026-05-04]]) is untouched. ASCII-only copy.
