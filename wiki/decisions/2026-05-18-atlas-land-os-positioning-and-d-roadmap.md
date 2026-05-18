# ADR: Land OS Positioning Ratified & Sub-project D Decomposed (D0–D5)

**Date:** 2026-05-18
**Status:** accepted

**Context:**
The Apricot Lane replication initiative was decomposed on 2026-05-17
([[2026-05-17-atlas-regeneration-monitoring-a1]]) into four sub-projects
(A/B/C/D) on a monitoring-first spine. The A track is now complete — A1
regeneration trajectories, A2 habitat allocation (`c0e12776`), A3
biodiversity outcomes ([[2026-05-18-atlas-biodiversity-outcome-monitoring-a3]],
`bfb689fe`) — while B, C, and D remained deferred with no specs. The
initiative's north star lived only as a one-line decomposition inside ADRs;
there was no ratified, scannable positioning + Phase-2 roadmap stating what
success means, mapping the 5 capabilities onto current OLOS state, or making
the pending operating loop (Sub-project D — flagged by the operator as "the
big one") an actionable backlog. The MILOS root `olos.md` open question
"What is the Phase 2 roadmap after Site Intelligence?" was exactly this gap.
This session was scoped (operator-confirmed) as a strategy artifact only —
no code — living in atlas/wiki with a one-line root-wiki pointer.

**Decision:**
1. **Ratify the elevated positioning** verbatim as the authoritative
   Phase-2 north star and success definition: OLOS is the full operating
   system for regenerative land development; success = independently
   running an Apricot-Lane-complexity project without external PM tools or
   personnel. Captured byte-exact in [[land-os-positioning]].
2. **Adopt the 5-capability model** and the capability→current-state map:
   Observe (1), Plan (2), Phased implementation (3) are built engines;
   Manage-without-external-PM (4) is the large gap = Track D; Adapt (5) is
   monitoring-built (A-series) with the recommendation engine = D5.
3. **Track sequencing:** A = COMPLETE; B = track-level only (depends on A
   monitoring spine); C = intent-only, covenant-bounded, Scholar-Council-
   gated; D = decomposed now.
4. **Decompose Sub-project D into sequenced slices D0–D5** as an actionable
   backlog (scope + dependency only, no architecture/specs): D0 operating-
   loop spine & data model; D1 task & dependency engine; D2 resourcing;
   D3 budget & cost tracking; D4 field execution & proof; D5 operating
   dashboards & adaptive recommendations.
5. **Affirm the C-vs-D covenant boundary:** D3/D5 are project cost/budget
   tracking and operating analytics only; capital formation, financing,
   advance-purchase, investor/equity, and yield-as-return framing stay in
   Sub-project C under Scholar Council. No riba/gharar framing in any D
   surface. CSRA / salam-style advance-purchase explicitly excluded.

**Consequences:**
- Future sessions orient from a single ratified page reachable from
  `index.md`; D/B work starts from an approved roadmap instead of
  re-deriving scope.
- The MILOS root `olos.md` "Phase 2 roadmap" open question is closed,
  pointing to [[land-os-positioning]].
- Each D slice still requires its own brainstorm → spec → plan →
  implementation cycle; this ADR commits sequence and covenant boundary,
  not design.
- The roadmap is capability/track-based; the deprecated 7-stage lifecycle
  must not be used to re-derive it.
- Any D3/D5 work that drifts toward financing/capital framing violates
  this ADR and must be rejected back to Sub-project C scope.
- B and C remain undecomposed until each gets its own scoping session.
