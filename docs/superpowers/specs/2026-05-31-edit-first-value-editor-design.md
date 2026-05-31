# OLOS Protocol Layer — Vertical Slice 3: "Edit First" inline value editor

**Date:** 2026-05-31
**Project:** OLOS / atlas — Plan Protocol Layer prototype
**Branch:** `feat/atlas-permaculture`
**Status:** approved (design)

## Context

Slice 2 (commit `426db33b`) shipped the Stratum-6 → Protocol confirmation card stack
(spec §10.1 / §4.1 / §11.2): approving the Integration objective opens a scrollable stack
of pre-filled protocol confirmation cards, each with three actions — **Activate / Edit
First / Skip**. The **Edit First** action was rendered but **disabled** with a "Deferred"
tag. This slice builds it.

The confirmation card shows `IF <condition> → THEN <response>`, where the condition's
bracket tokens (e.g. `[approved threshold]`) are substituted with illustrative
"approved tier outputs" and highlighted as amber AUTO-FILLED chips
(`autoFill.renderConditionSegments`). Five tokens are in use across the catalogue:
`approved threshold`, `approved day limit`, `approved recovery target`,
`configured window`, `emergency threshold`. Templates without bracket tokens (e.g.
"rotation entry event") have no auto-filled values.

## Scope

Gallery-only, local React state — consistent with Slices 1–2. **No** store/DB, **no**
route move, **no** schema changes to `@ogden/shared`. The fabricated values stay
web-side in `APPROVED_TIER_OUTPUTS`. Confined to `apps/web/src/v3/plan/spine/`.

## Locked decisions

1. **Editable scope:** auto-filled values only (the substituted bracket segments). The
   THEN response stays as authored. No structural schema fields (that overlaps the
   deferred custom-authoring work).
2. **Save behavior:** Save activates immediately — the protocol commits as **Activated**
   with an "Edited" marker showing it diverged from the pre-filled defaults.
3. **Edit First enablement:** enabled only on cards whose condition has ≥1 auto-filled
   token; disabled on bracket-free cards (nothing to edit).
4. **UI approach:** inline expand within the card (chosen over modal / dedicated pane).
5. **Protocol Mode reflection:** in scope — activated-and-edited templates show the
   "Edited" tag and the edited value in Protocol Mode too.

## Design

### 1. State model (`PlanSpinePrototype.tsx`)
Add `editedValues: Record<string, Record<string, string>>` keyed by template id →
{ token → value } (init `{}`). A template is "edited" iff it has an entry. New handler
`commitEdit(id, values)`:
- merges `values` into `editedValues[id]`, and
- sets `decisions[id] = 'activated'` (save activates immediately).

`onUndo(id)` additionally clears `editedValues[id]` (reverting an edited activation
returns it to the pristine pre-filled defaults). Existing `decisions` /
`onActivate` / `onSkip` semantics unchanged.

### 2. `autoFill.ts`
Extend `ConditionSegment` with optional `token?: string` — the bracket name on
auto-filled segments — so the editor knows which token each input maps to.
`renderConditionSegments` populates `token` on substituted segments.

Card rendering merges per-template edits over the defaults:
`{ ...APPROVED_TIER_OUTPUTS, ...(editedValues[id] ?? {}) }` as the `outputs` argument,
so edited values render immediately in the IF.

Pure-function change — extend `__tests__/autoFill.test.ts` to assert `token` is present
and correct on auto-filled segments and absent on literals.

### 3. `ProtocolConfirmationFlow.tsx` / `ConfirmationCard`
- "Edit First" is **enabled** when the card's condition yields ≥1 segment with a
  `token`; otherwise it stays disabled (drop the "Deferred" tag wording where enabled).
- Clicking it sets card-local `editing = true`: the action row becomes a compact inline
  form — one labelled input per token (label = token name, value pre-filled from the
  current merged outputs) + **Save** / **Cancel**.
- **Save** → `onEditCommit(id, values)` → card collapses to the **Activated** state with
  an amber **"Edited"** tag beside the ✓. **Cancel** → discard, return to pending.
- The running tally counts edited cards as Activated.
- New props: `editedValues: Record<string, Record<string,string>>`,
  `onEditCommit(id, values)`.

### 4. Protocol Mode reflection (`ProtocolModePanel.tsx`)
Accept `editedValues`. Activated templates that carry an edit show the **"Edited"** tag
and render their condition with the edited value (via the same merged-outputs path).
Pristine activations render the default values as before.

### 5. Out of scope / deferred (boundary intact)
Editing the THEN response or any structural field; full custom-authoring surface; real
store/DB persistence; evaluation engine; route move into `PlanStratumShell`; validation
of edited values (free-text inputs this slice).

## Verification
- Extend `autoFill.test.ts` for the `token` field; `@ogden/web` `tsc --noEmit` exit 0;
  `@ogden/shared` unchanged (847 green — no shared edits).
- DOM-verify in `/v3/components` (screenshot tool is environment-blocked by the dead-API
  sync churn — use `preview_eval` DOM inspection, per CLAUDE.md honesty rule):
  Edit First enabled only on threshold/window cards; edit a threshold → Save → card shows
  Activated + "Edited"; tally increments; the new value renders in the IF; Cancel discards;
  Undo reverts to pristine; Protocol Mode shows the edited value + "Edited" tag.
- Commit scoped to `spine/` only; `git fetch` + divergence check first (branch is rebased
  out-of-band). Commit message ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Definition of Done
"Edit First" is a working inline editor on every threshold/window confirmation card:
the steward adjusts the auto-filled value(s), Save commits the protocol as Activated with
an "Edited" marker, the edited value renders in the IF and persists into Protocol Mode.
Bracket-free cards keep Edit First disabled. Web builds green; flow DOM-verified; slice
committed.
