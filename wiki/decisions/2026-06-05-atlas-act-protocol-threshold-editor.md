# ADR: Act-stage per-protocol threshold editor

> **SUPERSEDED (placement only) by
> [[decisions/2026-06-05-atlas-protocol-threshold-editor-plan-relocation]]
> (2026-06-05, commit `769074f2`).** The editor was relocated from Act to the
> **Plan** stage on operator correction ("protocols are editable in Plan, not
> ACT"). Everything below remains accurate about the override store slice
> (v5->v6), `outputsFor` merge, and the editor component itself -- only the
> **mount surface** changed: the editing UI now lives on the Plan
> protocol-detail surface (`ProtocolDetailColumn`), and Act displays the
> Plan-set values **read-only**. Decision 3 ("inline live-persist section in the
> **Act** protocol detail pane") is the part that no longer holds.

- **Date:** 2026-06-05
- **Status:** Superseded (placement) by [[decisions/2026-06-05-atlas-protocol-threshold-editor-plan-relocation]]
- **Branch:** `feat/atlas-permaculture` (commit `b79f8f50`, local-only, not pushed)
- **Entity:** [[entities/act-tier-shell]]
- **Relates to:** [[decisions/2026-06-04-atlas-act-protocol-stratum-scope-detail]] (the detail pane this editor mounted into); [[decisions/2026-04-18-milos-grounding-two-axis]] (the protocol condition/token model, by analogy)

## Context

A standing protocol's trigger condition is free-text prose carrying bracketed
`[token]` placeholders (e.g. `[reserve threshold]`, `[expected yield]`,
`[review window]`). Those tokens ARE the adjustable thresholds, but the Act
surface had **no working UI to set them**:

- `useProtocolLibrary` derives its substitution `outputs` solely from the
  legacy **`s6-yield-flows` `parameterGroup`**, whose 5 items
  (`approved threshold`, `approved day limit`, `approved recovery target`,
  `configured window`, `emergency threshold`) are transcribed from the legacy
  `standardTemplates.ts` catalogue.
- The protocols the Act surface renders come from the **resolved per-type
  catalogues** (`resolveProjectProtocols` -> `universal.ts` + per-type files),
  whose ~32 distinct tokens **never intersect** those 5. So
  `buildProtocolOutputs` could only ever fill legacy tokens that never appear ->
  every Act condition rendered a verbatim, uneditable bracket.
- Widening the parameterGroup is blocked: `protocolOutputs.test.ts` has an
  orphan guard requiring every S6 param be used by a *legacy* template.
- Triggering is **manual** (no eval engine; `autoFill.ts` only string-splits),
  so "adjust the parameters that trigger" means editing the **value substituted
  into the human-read condition**, not building a comparison/auto-fire engine.

## Decision

Three operator decisions (AskUserQuestion this session):

1. **Value scope = per-protocol.** Override keyed `(projectId, templateId,
   token)` so a shared token name (`[threshold]`, `[window]`) can hold a
   distinct value on each protocol -- avoids collapsing semantically-distinct
   thresholds.
2. **Coverage = full now.** A small additive persisted override slice so ANY
   `[token]` in ANY active protocol's condition is editable, merged on top of
   the existing `outputs`. Plan-mode ParameterGroup editing untouched.
3. **Edit UX = inline live-persist** section in the Act protocol detail pane
   (between the IF/THEN card and the activation row); per-keystroke persist so
   the displayed condition updates live; a Reset clears back to the
   `[placeholder]`.

### Strategy A -- additive override slice (the crux)

The override layer is **additive on top of** `outputs` (per-protocol overrides
win); the legacy S6 path, the `protocolOutputs.test.ts` orphan guard, the
shared catalogues, and the Plan-mode `ParameterGroup` are all untouched. No
catalogue / schema / `buildProtocolOutputs` change -> no shared rebuild risk.

```ts
// planStratumStore
protocolTokenOverridesByProject: Record<projectId, Record<templateId, Record<token, string>>>
setProtocolTokenOverride(projectId, templateId, token, value)   // stores as-is; blank renders verbatim downstream
clearProtocolTokenOverrides(projectId, templateId)              // drops the template's map -> Reset
selectProjectProtocolOverrides(state, projectId)                // stable, frozen-empty when absent
```

- Migration **v5 -> v6**: additive backfill (`safe.protocolTokenOverridesByProject ?? {}`),
  mirroring the v4->v5 `valuesByProject` step; `partialize` + `cloneForProject`
  extended. No record/condition shape change.
- `discardObjectivesProgress` is objective-keyed and does NOT clear the
  template-keyed slice -- inert leftovers on project-type change are acceptable
  for v1 (documented).
- `useProtocolLibrary` returns a memoised
  `outputsFor(templateId) = { ...outputs, ...(overrides[templateId] ?? {}) }`
  (deps `[outputs, protocolOverrides]`); base `outputs` kept for back-compat,
  and a template with no overrides returns the **identical base ref** so Plan
  columns are byte-unaffected.

### Editor

`ActProtocolThresholdEditor.tsx` exports a pure
`extractConditionTokens(condition)` (deduped, first-seen order via the same
`renderConditionSegments(condition, {})` split the card uses), returns `null`
when the condition has no tokens, else renders one input per distinct token
(per-keystroke `setProtocolTokenOverride`) + a conditional Reset. It subscribes
inline via `s.protocolTokenOverridesByProject[pid]?.[tid]` -- it **indexes,
never derives** a fresh object in the selector (Zustand v5 loop hazard).
`ActProtocolDetailPane` / `ProtocolLayerPanel` render via `outputsFor(id)` so
the IF/THEN substitutes live.

## Consequences

- A steward sees an "Adjust thresholds" section for any protocol whose condition
  carries `[token]`s, types a per-protocol value into each, and watches the
  displayed IF/THEN substitute it live; Reset returns the verbatim bracket.
- Values persist across reload (IndexedDB v6) and are isolated per
  `(project, template, token)`.
- Additive only: legacy S6 path, Plan ParameterGroup, shared catalogues, and the
  orphan guard are untouched; no persist breakage (additive migration).

## Amanah

Editing a numeric/interval threshold is the steward setting their own approved
operating bound -- no riba/gharar/`bay' ma laysa 'indak` surface. The verbatim
`scopeNotes` block stays rendered by `ProtocolLibraryCard`, outside this editor
([[fiqh-csra-erased-2026-05-04]], [[feedback-csa-in-catalogues]]).

## Verification

- web `tsc --noEmit` EXIT 0 (8GB heap) -- caught + fixed a real
  `template.title` -> `template.name` (the type exposes `name`, not `title`).
- Bounded `vitest --pool=forks --testTimeout=20000`
  ([[feedback-vitest-bounded-runs]]) 19/19: `planStratumStore.protocolOverrides`
  (12) + `ActProtocolThresholdEditor` (7, via the full `ActProtocolDetailPane`).
- Live DOM proof + **screenshot** on MTC S5 `u-s5-water-store-low`
  ([[project-screenshot-hang]]): typing "20% of capacity" substituted live into
  the card IF (gold), Reset returned `[reserve threshold]` + hid the control,
  store net-zero; the no-token `u-s3-flow-anomaly-reassess` mounted the pane but
  NO editor.

## Alternatives considered

- **Widen the S6 parameterGroup** to cover the resolved tokens: rejected -- the
  `protocolOutputs.test.ts` orphan guard forbids params unused by a legacy
  template, and the two token sets are disjoint by design.
- **Global (per-project) token values** rather than per-protocol: rejected --
  shared token names (`[threshold]`, `[window]`) carry distinct meanings across
  protocols; collapsing them would cross-contaminate thresholds.
- **Build a trigger-evaluation engine** so thresholds auto-fire: deferred --
  triggering is manual today; this slice only makes the human-read bound
  editable, which is the actual operator ask.
