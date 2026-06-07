# ADR: Tier-0 Stakeholders surface (Phase C Part 3, sub-project 2 of 3: shared register + cultural Amanah item)

- **Date:** 2026-06-06 (build completed 2026-06-07)
- **Status:** Accepted
- **Branch:** `feat/structured-capture-forms` (commits `8f4b0bad` -> `f676ba49` -> `3849c8cd` -> `e6e86c27` -> `7f5ba370` -> `684192de` -> `f645ad45` -> `6d7005d5` -> `e6ee4984` -> `4c076105` -> `41ddc7da`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[decisions/2026-06-06-atlas-tier0-boundaries]] (Phase C Part 3 sub-project 1 -- the multi-mode-per-objective + detect-in-`buildDecisionTarget` + mode-badge pattern this part extends), [[decisions/2026-06-06-atlas-tier0-vision-classify]] / [[decisions/2026-06-06-atlas-tier0-labour-surface]] (the bespoke controlled-renderer routed-before-`hasFields` idiom), [[decisions/2026-06-06-atlas-tier0-workbench]] (Phase B -- the Tier-0 workbench + `isTierZeroObjective` predicate), and [[decisions/2026-06-05-atlas-structured-capture-forms]] (Phase A -- the `FormValue` contract). Patterns the store mirrors: `apps/web/src/store/olos/proofRecordStore.ts`.
- **Log:** [[log/2026-06-06-atlas-tier0-stakeholders]]

## Context

Every prior Tier-0 surface (vision / labour / success-criteria / boundaries)
persists **per-item `FormValue`**: one decision item owns one value blob, and the
panel is built around a per-item draft + `onRecord(value, summary)`. The
`s1-stakeholders` objective ("A mapped picture of stakeholders & community"; 6
mandatory items c1-c6 in two groups) is the **first surface whose authoritative
state is a project-level SHARED REGISTER, not per-item `FormValue`** -- items 1-4
*build* a register of stakeholder records; items 5-6 *annotate* the same records.
This is the key architectural departure of this sub-project.

The operator also supplied (mid-build) the authoritative mockup
`olos_stakeholders_mixed_surface.html`, which both fixed the visual layer and
resolved the architecture's REVIEW flags (R1-R8). The mockup is treated as spec,
not guess -- including the Amanah-sensitive cultural item (c3).

## Decision

Widen the Tier-0 workbench to `s1-stakeholders` and build a multi-mode capture
backed by ONE shared project-level register store, bridged to the existing
per-item panel contract via a thin completion marker. New code is additive; **no
deletion** ([[feedback-no-deletion]]).

### 1. Option A -- store-direct capture, panel keeps the completion marker

`StakeholderCapture` subscribes to a new `stakeholderRegisterStore` **directly**
and performs register CRUD inline (builder items c1/c2/c4 add/edit/remove rows;
c3 cultural rows + acknowledgement; annotate items c5/c6 update fields on existing
rows). The panel's per-item `FormValue` draft + `onRecord` **degrades to a thin
per-item completion MARKER** that still flows through the EXISTING
`actEvidenceStore` path (`saveVisionFormData` + `setItemComplete`), so completion,
rationale, and defer all persist unchanged. **Capture owns register I/O; panel
owns completion + rationale + defer.**

**Rationale:** a project-level register is not per-item `FormValue`; forcing it
through the panel's itemId-keyed seed/onRecord machinery would invert the
`proofRecordStore` direct-consumption convention the codebase already uses for
project-scoped record sets. **Alternative considered (Option B):** thread the
register through panel props -- rejected: it fights the panel's per-item-FormValue
contract and leaks register shape into the shared panel.

### 2. The Zustand v5 stable-snapshot trap is the #1 risk -- fixed by construction

The panel (and the workbench reg-strip) must read register state REACTIVELY, but
`listForProject` returns a fresh `Object.values(...)` array each call -> infinite
re-render under Zustand v5's `useSyncExternalStore` snapshot equality. **Mandatory
fix:** consumers select the **stable raw object** `s.byProject[projectId] ??
EMPTY_STAKEHOLDERS_BY_ID` (a frozen module-level constant) and derive the array /
count via `useMemo` (mirrors the existing `EMPTY_*` idiom in `ActTierShell`). Pure
helpers take a register SNAPSHOT (array), staying unit-testable in isolation. This
is documented in the component header and here because it is the easiest defect to
reintroduce.

### 3. One shared `StakeholderRecord` register store (local-only, no API this pass)

NEW `apps/web/src/store/stakeholderRegisterStore.ts` mirrors `proofRecordStore.ts`
MINUS api/sync: `byProject[projectId][id]`; `createStakeholder` /
`updateStakeholder` / `deleteStakeholder` / `listForProject` / `getStakeholder`; a
private `mutate(projectId, id, fn)` copied verbatim (preserves id/projectId/
createdAt); persist `{ name: 'ogden-stakeholder-register', version: 2,
partialize: byProject }` with `rehydrateWithLogging`; an exported frozen
`EMPTY_STAKEHOLDERS_BY_ID`. Ids are `stakeholder-${crypto.randomUUID()}`. Builder
items create rows; annotate items UPDATE fields on existing rows (create none);
c3 "none acknowledged" is a marker flag, NOT a row.

**Mockup data-model reconciliation (version 1 -> 2):** the mockup made the comms
field multi-select and added a relationship tone, so `StakeholderRecord.commsChannel?:
string` became `commsChannels?: string[]`, and `RelationshipStatus` gained
`'tension'` (now `'conflict' | 'tension' | 'neutral' | 'goodwill' |
'partnership'`). A `migrate(persisted, version)` coerces legacy `commsChannel`
string -> `commsChannels: [string]`. **Rationale:** single source of truth for the
record shape; a persist migration is the honest way to evolve a persisted store
without dropping prior data.

### 4. c3 (Indigenous land relationships / cultural obligations) is mandatory and NON-DEFERRABLE

Purely additive mechanism: `DecisionPanelTarget` gains `deferrable?: boolean`
(default undefined => deferrable). `buildDecisionTarget` sets `deferrable =
item.id === 's1-stakeholders-c3' ? false : undefined`. The footer hides the defer
button when `decision.deferrable === false`. Every existing target stays
deferrable (undefined); only c3 sets false. Chosen over a `nonDeferrable`
double-negative and over leaking the itemId into the shared panel.

c3 is **recordable without forcing a false positive**: per the mockup it presents
a 5-status cultural model (ids `not-investigated` [default], `enquiry-no-obligations`,
`active-consultation`, `assessment-required`, `formal-protocol`) plus a notes
field, stored in the completion marker (`culturalStatus` + `culturalNotes`), not
as register rows. c3 is **always valid** so the steward can always take a positive
recording act -- silence is never completion. See Amanah below.

### 5. Per-item modes; validity decoupled from completion

`stakeholderModeFor(itemId)` (pure, exported) drives both the right-panel body and
the center-list mode badge:

| Item | Mode | Badge label | Valid when |
|---|---|---|---|
| c1 | `mapContact` | Map + contact | >=1 neighbour row |
| c2 | `contact` | Contact entry | >=1 authority row |
| c3 | `cultural` | Cultural | ALWAYS (positive act either way) |
| c4 | `contact` | Contact entry | ALWAYS |
| c5 | `annotate` | Annotate register | ALWAYS |
| c6 | `annotate` | Annotate register | ALWAYS |

Per the mockup reconciliation, the earlier "none toggle" escape-hatch logic was
**removed**: only c1 and c2 can be invalid (they need at least one row of their
category); c3/c4/c5/c6 are always valid. **Completion is decoupled from register
contents:** `recorded` comes from the per-item marker via `setItemComplete`
(effective progress), NOT from row counts -- so each of c1-c6 completes
independently though they share one register. Switching items remounts
`StakeholderCapture` (keyed on itemId) but every mount reads the SAME
`byProject[projectId]` rows, so no register state is lost.

`summariseStakeholder(itemId, rows, marker)` produces the record summary
(e.g. "3 neighbours recorded"); c5 single-select tone pills write
`relationshipStatus` (lowercased), c6 multi-select pills write
`commsChannels: string[]`.

### 6. Workbench strips, badges, predicate widening

- **Strips (mockup parity):** for `s1-stakeholders` the workbench renders two
  strips above the center list -- a static **map-strip** ("2 overlays active on
  map", Layers icon, mirroring the boundary map-strip) and a **reg-strip** with a
  LIVE register count (read via the stable-snapshot pattern in #2), the label
  "stakeholders in register", and the ASCII note "Items 1-4 build the register -
  Items 5-6 annotate it" (the mockup's en-dash + middle-dot converted to ASCII).
- **Badges:** `DecisionList.MODE_LABELS` is extended with `mapContact` ->
  "Map + contact", `contact` -> "Contact entry", `cultural` -> "Cultural",
  `annotate` -> "Annotate register" (labels confirmed against the mockup). No
  structural change; badges are absent when `modeFor` is not passed.
- **Predicate:** `ActTierShell` adds `'s1-stakeholders'` to the existing
  `TIER_ZERO_OBJECTIVE_IDS` Set (the BT7 boundaries precedent). Purely additive;
  the map shell + modal suppression already key off the predicates.

### 7. Options via the already-threaded `resolveOptions` prop -- no new resolver

The stakeholder option sets (neighbour/community types, relationship tones, comms
channels, authority categories) are added as `_base`-only sets to
`FIELD_OPTION_SETS` in `@ogden/shared`, resolved through the already-threaded
`resolveOptions(setId)` prop. Content was reconciled verbatim against the mockup
(SR-A). **No new resolver** -- stakeholder options do not vary by project type.

## Consequences

- A steward opening Tier-0 `s1-stakeholders` sees the non-map 3-pane workbench with
  a map-strip + a live reg-strip + per-row mode badges. Builder items (c1/c2/c4)
  add/edit/remove rows in a shared register; c3 records a cultural status + notes
  (or an explicit "not investigated"/"no obligations" acknowledgement) with NO
  defer button; annotate items (c5/c6) write relationship tone / comms channels
  onto existing rows. The reg-strip count updates live as rows are added. Each item
  completes independently via its own marker; switching items preserves the shared
  register.
- `s1-vision`, `s1-boundaries`, and every spatial objective render exactly as the
  prior phases left them.
- The register persists locally under `ogden-stakeholder-register` v2; legacy
  single-channel data migrates forward losslessly.
- No `planStratumStore` touch; no API/DB persistence; the per-item completion/
  rationale/defer path is unchanged.

## Amanah

Data capture of stakeholder/community relationships. No sale, advance-purchase,
financing instrument, or CSRA/salam framing; no riba/gharar surface
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]). Clean.

**c3 special handling (deliberate safeguard):** an Indigenous/cultural obligations
item must not be quietly postponed -- so it is **non-deferrable by design** (no
defer button), a guard against treating Indigenous relationships as optional
paperwork. It is **recordable without forcing a false positive**: the cultural
status model includes explicit "not yet investigated" / "enquiry made - no
obligations" options, so projects with no obligations affirm that explicitly
rather than skipping, and projects with obligations capture status + context.
Silence is never completion; the steward takes a positive act either way.

## Verification

- Shared `tsc --noEmit` clean (ST1/SR-A); web `tsc --noEmit` EXIT 0 (8GB heap).
- Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]): shared fieldOptions (stakeholder sets); web
  `stakeholderRegisterStore`, `StakeholderCapture` (modes / helpers / CRUD /
  cultural marker), `DecisionWorkingPanel` (stakeholder arm + non-deferrable
  footer + precedence + reactive validity; 55/55 after SR-C),
  `DecisionList` (mode badges incl. the 4 stakeholder labels),
  `ActTierZeroWorkbench` (detection + both strips + live reg-count; 34/34).
- Two-stage SDD review (spec then code-quality) PASSED per task; SR-B verified
  twice (controller Read + spec-compliance reviewer) before commit.
- Final whole-implementation review (ST8) + live smoke: **see the log entry**
  ([[log/2026-06-06-atlas-tier0-stakeholders]]) -- recorded there on completion.

## Alternatives considered

- **Option B (thread the register through panel props):** rejected -- fights the
  per-item-FormValue contract; inverts the proofRecordStore direct-consumption
  convention.
- **A fresh-array selector (`listForProject`) in the reactive consumers:**
  rejected -- trips the Zustand v5 stable-snapshot infinite-render trap; the frozen
  `EMPTY_STAKEHOLDERS_BY_ID` + `useMemo` derivation is mandatory.
- **Deriving completion from register row counts:** rejected -- would break c3 (a
  no-rows acknowledgement) and the annotate items (which create no rows);
  completion stays on the per-item marker.
- **A `nonDeferrable` flag (double negative) or itemId leak into the panel:**
  rejected for `deferrable?: boolean` defaulting to deferrable.
- **A `StakeholderType` enum as a second source of truth vs the option strings:**
  resolved by the mockup (SR-A/R8) -- option-set content is authoritative.
