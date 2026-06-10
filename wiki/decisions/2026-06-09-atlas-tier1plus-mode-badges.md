# ADR 2026-06-09 -- Tier-1+ decision mode badges: label-on-item, not a key->label map

**Status:** Accepted
**Date:** 2026-06-09
**Context module:** [[entities/act-tier-shell]]
**Session log:** [[log/2026-06-09-atlas-tier1plus-mode-badges]]

## Context

Each decision row in the Tier-0 Act workbench renders a capture-mode badge (the mockup `.mb-*` chip). At Tier-0 the badge is produced by `DecisionList.tsx` through a `modeFor` RAW-KEY resolver + a central `MODE_LABELS` lookup, fed by hardcoded `*ModeFor(itemId)` switch functions inside each bespoke `*Capture.tsx`. Those switches earn their keep at Tier-0 because the resolved mode ALSO routes a bespoke right-panel body.

Tier-1+ decisions rendered NO badge. Tier-1+ has no bespoke capture components, so for them a mode badge routes nothing -- it is purely decorative display metadata. We needed it on both Tier-1+ surfaces (read-only Plan `DecisionChecklist`, interactive Act `ActTierExecutionPanel`). Two forks had to be settled: which surfaces, and where the badge text comes from.

## Decision

1. **Render on both Tier-1+ surfaces; leave Tier-0 untouched.** A single shared `ModeBadge.tsx` (co-located with Plan, imported by Act) keeps markup + the `mode-badge-<itemId>` testid identical across surfaces. `DecisionList.tsx` and the `modeFor`/`MODE_LABELS`/`MODE_ICONS` Tier-0 path are NOT modified -- zero regression risk to the working workbench.

2. **Source the badge text as a verbatim label string on the catalogue item**, via a new optional `mode?: string` on `PlanDecisionChecklistItemSchema` (`z.string().min(1).optional()`), threaded through `ck()`'s opts bag. Render as-is. NO raw-key->label map and NO component-side switch functions for Tier-1+.

## Rationale

- **Tier-1+ badges are bespoke-per-item.** Unlike Tier-0, where a key (e.g. `inventory`) recurs and also selects a panel body, each Tier-1+ badge is unique prose for one decision. A key->label map would be ~1:1 -- pure indirection with no reuse and a second file to keep in sync.
- **Consistency with the catalogue-driven plan model.** One objective already drives both Plan and Act from data ([[entities/act-tier-shell]]). The badge is just more display data on the same item; storing it on the item keeps the single source of truth.
- **Additive + absent-safe.** Optional field => the static seed and every existing catalogue validate unchanged; surfaces render the badge only when present.
- **Verbatim transcription preserves fidelity + Amanah.** Copy comes straight from the OLOS prototype (count/order verified 1:1), so financial/sale-channel phrasing is never silently reworded ([[feedback-csa-in-catalogues]], [[fiqh-csra-erased-2026-05-04]]).

## Consequences

- 35 ecovillage badges authored across 6 prototyped objectives; other Tier-1+ objectives (no prototype) get none -- no fabricated data.
- The badge is decoration only: Tier-1+ still has NO bespoke right-panel routing. Wiring a `DecisionWorkingPanel`-style router for Tier-1+ is a separate deferred workstream.
- Two mode mechanisms now coexist by design: Tier-0 `modeFor` (key, routes a panel) and Tier-1+ `item.mode` (label, decorative). Migrating Tier-0 onto `item.mode` is possible later but deliberately deferred.
- Re-order safety rests on per-objective representative-mode assertions in `catalogues.test.ts` (the optional validator checks structure, not correctness).

Shipped in commit `734282ea` (8 files). See [[log/2026-06-09-atlas-tier1plus-mode-badges]].
