# "Edit First" Inline Value Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the deferred "Edit First" action on the protocol confirmation cards so a steward can adjust a proposal's auto-filled values, then Save to activate it with an "Edited" marker that persists into Protocol Mode.

**Architecture:** Gallery-only, local React state (consistent with Slices 1–2). `autoFill.ts` gains a `token` field so the editor knows which bracket each input maps to. Per-template edits live in `PlanSpinePrototype` state (`editedValues`), merged over the default `APPROVED_TIER_OUTPUTS` everywhere the condition renders. The amber AUTO-FILLED renderer is extracted to one shared component so the confirmation flow and Protocol Mode render edited values identically. No `@ogden/shared` changes, no store/DB, no route move.

**Tech Stack:** React 18 + TypeScript (strict, `noUncheckedIndexedAccess`), Vite, Vitest. pnpm via `corepack pnpm`. Web tsc needs `NODE_OPTIONS=--max-old-space-size=8192`.

---

## File Structure

- **Modify** `apps/web/src/v3/plan/spine/autoFill.ts` — add optional `token` to `ConditionSegment`; populate it on substituted segments.
- **Modify** `apps/web/src/v3/plan/spine/__tests__/autoFill.test.ts` — update existing expectations for the new `token` field; add token-specific assertions.
- **Create** `apps/web/src/v3/plan/spine/AutoFilledCondition.tsx` — the amber IF-segment renderer, extracted from `ProtocolConfirmationFlow` so both consumers share it (DRY).
- **Modify** `apps/web/src/v3/plan/spine/ProtocolConfirmationFlow.tsx` — import the extracted renderer; add the inline edit form + `editedValues`/`isEdited`/`onEditCommit` plumbing.
- **Modify** `apps/web/src/v3/plan/spine/ProtocolModePanel.tsx` — accept `outputs` + `editedValues`; render the IF via the shared renderer with merged outputs; show the "Edited" tag.
- **Modify** `apps/web/src/v3/plan/spine/PlanSpinePrototype.tsx` — add `editedValues` state, `commitEdit`, undo-clears-edit; pass new props to both panels.

---

## Task 1: `autoFill.ts` — add `token` to `ConditionSegment` (TDD)

**Files:**
- Modify: `apps/web/src/v3/plan/spine/autoFill.ts`
- Test: `apps/web/src/v3/plan/spine/__tests__/autoFill.test.ts`

- [ ] **Step 1: Update existing tests + add token assertions (write the failing tests)**

The current tests use exact `toEqual`, so substituted segments must now carry `token`. Replace the whole `describe` body in `autoFill.test.ts` with:

```ts
describe('renderConditionSegments', () => {
  it('substitutes a known bracket token and flags it auto-filled with its token name', () => {
    const segs = renderConditionSegments('pasture cover < [approved threshold] kg DM/ha', OUTPUTS);
    expect(segs).toEqual([
      { text: 'pasture cover < ', autoFilled: false },
      { text: '1,500 kg DM/ha', autoFilled: true, token: 'approved threshold' },
      { text: ' kg DM/ha', autoFilled: false },
    ]);
  });

  it('returns a single literal segment (no token) when there are no brackets', () => {
    const segs = renderConditionSegments('rotation entry event', OUTPUTS);
    expect(segs).toEqual([{ text: 'rotation entry event', autoFilled: false }]);
  });

  it('keeps an unknown bracket token verbatim, flags it auto-filled, and still records the token', () => {
    const segs = renderConditionSegments('grazing days ≥ [unmapped token]', OUTPUTS);
    expect(segs).toEqual([
      { text: 'grazing days ≥ ', autoFilled: false },
      { text: '[unmapped token]', autoFilled: true, token: 'unmapped token' },
    ]);
  });

  it('handles multiple bracket tokens, recording each token name', () => {
    const segs = renderConditionSegments(
      '[approved threshold] then [emergency threshold]',
      OUTPUTS,
    );
    expect(segs).toEqual([
      { text: '1,500 kg DM/ha', autoFilled: true, token: 'approved threshold' },
      { text: ' then ', autoFilled: false },
      { text: '800 kg DM/ha', autoFilled: true, token: 'emergency threshold' },
    ]);
    expect(segs.filter((s) => s.autoFilled).every((s) => !/[[\]]/.test(s.text))).toBe(true);
  });

  it('records the token on a mid-string substitution', () => {
    const segs = renderConditionSegments('no body condition score in [approved day limit]', OUTPUTS);
    expect(segs[0]).toEqual({ text: 'no body condition score in ', autoFilled: false });
    expect(segs[1]).toEqual({ text: '3 days', autoFilled: true, token: 'approved day limit' });
  });

  it('does not set a token on literal segments', () => {
    const segs = renderConditionSegments('cover < [approved threshold] now', OUTPUTS);
    expect(segs[0]).not.toHaveProperty('token');
    expect(segs[2]).not.toHaveProperty('token');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas" && corepack pnpm --filter @ogden/web exec vitest run src/v3/plan/spine/__tests__/autoFill.test.ts`
Expected: FAIL — substituted segments lack `token` (e.g. "missing property token").

- [ ] **Step 3: Add the `token` field to the implementation**

In `autoFill.ts`, change the `ConditionSegment` interface to add the optional `token`:

```ts
export interface ConditionSegment {
  /** The text to render for this segment. */
  text: string;
  /** True when this segment was substituted from an approved tier output. */
  autoFilled: boolean;
  /**
   * The bracket token name (without brackets, e.g. `'approved threshold'`) for
   * an auto-filled segment. Absent on literal segments. Lets the Edit-First form
   * map each input back to the token it overrides.
   */
  token?: string;
}
```

Then in `renderConditionSegments`, change the substituted-segment push (currently `segments.push({ text: value ?? match[0], autoFilled: true });`) to include the token:

```ts
    const token = match[1] ?? '';
    const value = outputs[token];
    // Substitute the approved output if known; otherwise keep the placeholder
    // verbatim (still flagged so the UI shows it as an unresolved auto-fill).
    segments.push({ text: value ?? match[0], autoFilled: true, token });
```

(The literal pushes stay as-is — no `token` property, so it is absent on literals.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas" && corepack pnpm --filter @ogden/web exec vitest run src/v3/plan/spine/__tests__/autoFill.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas"
git add apps/web/src/v3/plan/spine/autoFill.ts apps/web/src/v3/plan/spine/__tests__/autoFill.test.ts
git commit -m "feat(olos-protocol): add token field to ConditionSegment for Edit First

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Extract `AutoFilledCondition` into a shared component

**Files:**
- Create: `apps/web/src/v3/plan/spine/AutoFilledCondition.tsx`
- Modify: `apps/web/src/v3/plan/spine/ProtocolConfirmationFlow.tsx` (remove local def, import the new one)

Behaviour-preserving extraction so Protocol Mode (Task 5) can reuse the exact amber renderer.

- [ ] **Step 1: Create the shared component file**

Create `apps/web/src/v3/plan/spine/AutoFilledCondition.tsx` with the renderer moved verbatim from `ProtocolConfirmationFlow.tsx`:

```tsx
// AutoFilledCondition.tsx
//
// Renders a protocol IF-condition with its AUTO-FILLED bracket substitutions
// highlighted as amber chips (Protocol Layer Spec §4.1). Shared by the
// confirmation card stack (ProtocolConfirmationFlow) and the read-only Protocol
// Mode library (ProtocolModePanel) so both render the (possibly steward-edited)
// values identically. Pure presentation over the pure renderConditionSegments
// helper — no eval, no state.

import { C, F } from './tokens.js';
import { renderConditionSegments } from './autoFill.js';

export default function AutoFilledCondition({
  condition,
  outputs,
}: {
  condition: string;
  /** Effective outputs for this protocol: defaults merged with any steward edits. */
  outputs: Record<string, string>;
}) {
  const segments = renderConditionSegments(condition.replace(/^IF\s+/, ''), outputs);
  return (
    <span style={{ fontSize: 11, color: C.textPrimary, fontFamily: F.sans, lineHeight: 1.6 }}>
      {segments.map((seg, i) =>
        seg.autoFilled ? (
          <span
            key={i}
            style={{
              background: C.amberDim,
              border: `1px solid ${C.amber}55`,
              color: C.amber,
              borderRadius: 5,
              padding: '1px 6px',
              margin: '0 1px',
              fontFamily: F.mono,
              fontWeight: 600,
              fontSize: 10,
              whiteSpace: 'nowrap',
            }}
          >
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}
```

- [ ] **Step 2: Replace the local definition in `ProtocolConfirmationFlow.tsx` with an import**

Delete the entire local `function AutoFilledCondition({ ... }) { ... }` block (lines 22–57, from `function AutoFilledCondition({` through its closing `}`). Then update the imports near the top — change:

```tsx
import { renderConditionSegments } from './autoFill.js';
```

to:

```tsx
import AutoFilledCondition from './AutoFilledCondition.js';
```

(`renderConditionSegments` is no longer used directly in this file after the extraction; remove that import. `TYPE_STYLE`, `TypeBadge`, `C`, `F`, and the type imports stay.)

- [ ] **Step 3: Typecheck**

Run: `cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas" && NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm --filter @ogden/web exec tsc --noEmit`
Expected: exit 0, no errors in `spine/` (the file compiles with the extracted import; no unused-import error for `renderConditionSegments`).

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas"
git add apps/web/src/v3/plan/spine/AutoFilledCondition.tsx apps/web/src/v3/plan/spine/ProtocolConfirmationFlow.tsx
git commit -m "refactor(olos-protocol): extract AutoFilledCondition into shared component

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `PlanSpinePrototype` — `editedValues` state + handlers + prop plumbing

**Files:**
- Modify: `apps/web/src/v3/plan/spine/PlanSpinePrototype.tsx`

- [ ] **Step 1: Add `editedValues` state**

After the existing `decisions` state line (`const [decisions, setDecisions] = useState<Record<string, ProposalDecision>>({});`), add:

```tsx
  // §4.1 Edit-First overrides: per-template { token -> edited value }. Merged over
  // APPROVED_TIER_OUTPUTS wherever the condition renders. Empty = pristine defaults.
  const [editedValues, setEditedValues] = useState<Record<string, Record<string, string>>>({});
```

- [ ] **Step 2: Add `commitEdit`, an edit-aware undo, and an `isEdited` helper**

After the existing `setDecision` helper, add:

```tsx
  // Save the Edit-First form: record the per-template overrides and activate (§4.1
  // "save activates immediately").
  const commitEdit = (id: string, values: Record<string, string>) => {
    setEditedValues((prev) => ({ ...prev, [id]: values }));
    setDecision(id, 'activated');
  };

  // Undo also discards any Edit-First override, returning the proposal to its
  // pristine pre-filled defaults.
  const handleUndo = (id: string) => {
    setDecision(id, 'pending');
    setEditedValues((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // A template counts as "edited" only when an override actually diverges from the
  // default approved output (saving the form unchanged does not flag it).
  const isEdited = (id: string) => {
    const e = editedValues[id];
    return !!e && Object.entries(e).some(([k, v]) => v !== APPROVED_TIER_OUTPUTS[k]);
  };
```

- [ ] **Step 3: Wire the new props into both panels**

In the `confirmFlowOpen` branch, replace the `<ProtocolConfirmationFlow .../>` element's props with (adds `editedValues`, `isEdited`, `onEditCommit`; replaces the old `onUndo`):

```tsx
            <ProtocolConfirmationFlow
              templates={confirmTemplates}
              decisions={decisions}
              outputs={APPROVED_TIER_OUTPUTS}
              editedValues={editedValues}
              isEdited={isEdited}
              onActivate={(id) => setDecision(id, 'activated')}
              onSkip={(id) => setDecision(id, 'skipped')}
              onUndo={handleUndo}
              onEditCommit={commitEdit}
              onClose={() => {
                setConfirmFlowOpen(false);
                setMode('protocol');
              }}
            />
```

In the `mode === 'protocol'` branch, replace the `<ProtocolModePanel .../>` element with (adds `outputs` + `editedValues`; keeps existing props):

```tsx
            <ProtocolModePanel
              enterprises={ENTERPRISES}
              decisions={decisions}
              integrationApproved={integrationApproved}
              outputs={APPROVED_TIER_OUTPUTS}
              editedValues={editedValues}
              onRestore={(id) => setDecision(id, 'activated')}
              onNavigateToSource={handleNavigateToSource}
            />
```

- [ ] **Step 4: Typecheck (expected to fail until Tasks 4–5 land)**

Run: `cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas" && NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm --filter @ogden/web exec tsc --noEmit`
Expected: errors ONLY of the form "Property 'editedValues'/'isEdited'/'onEditCommit'/'outputs' does not exist on type ... Props" for the two panels — these are resolved in Tasks 4 and 5. No other new errors. (Do not commit yet — commit after Task 4 so the tree stays compiling.)

---

## Task 4: `ProtocolConfirmationFlow` — inline Edit-First form

**Files:**
- Modify: `apps/web/src/v3/plan/spine/ProtocolConfirmationFlow.tsx`

- [ ] **Step 1: Extend `ConfirmationCard` props and add edit state**

Change the `ConfirmationCard` destructured props + type (currently `template, decision, outputs, onActivate, onSkip, onUndo`) to add `isEdited`, `onEditCommit`, and import `useState` (already imported). Replace the props block with:

```tsx
function ConfirmationCard({
  template,
  decision,
  outputs,
  isEdited,
  onActivate,
  onSkip,
  onUndo,
  onEditCommit,
}: {
  template: StandardProtocolTemplate;
  decision: ProposalDecision;
  /** Effective outputs for this card: defaults merged with this card's edits. */
  outputs: Record<string, string>;
  /** True when this card's values diverge from the pre-filled defaults. */
  isEdited: boolean;
  onActivate: () => void;
  onSkip: () => void;
  onUndo: () => void;
  onEditCommit: (values: Record<string, string>) => void;
}) {
```

Immediately after the existing `const [expanded, setExpanded] = useState(false);` line, add the editable-token derivation and edit state:

```tsx
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  // The condition's distinct auto-fill tokens (e.g. 'approved threshold'). Edit
  // First is only meaningful when there is at least one.
  const tokens = [
    ...new Set(
      renderConditionSegments(template.condition.replace(/^IF\s+/, ''), outputs)
        .map((s) => s.token)
        .filter((t): t is string => !!t),
    ),
  ];
  const canEdit = tokens.length > 0;

  const startEdit = () => {
    setDraft(Object.fromEntries(tokens.map((tk) => [tk, outputs[tk] ?? ''])));
    setEditing(true);
  };
  const saveEdit = () => {
    onEditCommit(draft);
    setEditing(false);
  };
```

This re-introduces a direct use of `renderConditionSegments`, so add it back to the imports alongside the `AutoFilledCondition` import:

```tsx
import AutoFilledCondition from './AutoFilledCondition.js';
import { renderConditionSegments } from './autoFill.js';
```

- [ ] **Step 2: Show the "Edited" tag on an activated card**

In the `acted ? (...)` branch, replace the status `<span>` that renders `{decision === 'activated' ? '✓ Activated' : '⊘ Skipped'}` with one that appends an Edited tag:

```tsx
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: accent,
                fontFamily: F.sans,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {decision === 'activated' ? '✓ Activated' : '⊘ Skipped'}
              {decision === 'activated' && isEdited && (
                <span
                  style={{
                    fontSize: 8,
                    background: C.amberDim,
                    color: C.amber,
                    border: `1px solid ${C.amber}55`,
                    borderRadius: 6,
                    padding: '1px 5px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Edited
                </span>
              )}
            </span>
```

- [ ] **Step 3: Replace the disabled "Edit First" button + add the inline form**

In the `else` (un-acted) branch of the footer, the three buttons render. Replace the entire disabled Edit-First `<button disabled ...>...</button>` block (the one containing the "Deferred" tag) with an enabled button that opens the form:

```tsx
            <button
              onClick={startEdit}
              disabled={!canEdit}
              title={canEdit ? 'Adjust the auto-filled values before activating' : 'No auto-filled values to edit'}
              style={{
                background: 'transparent',
                border: `1px solid ${C.border}`,
                borderRadius: 7,
                color: canEdit ? C.textSecondary : C.textTertiary,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: F.sans,
                padding: '6px 12px',
                cursor: canEdit ? 'pointer' : 'not-allowed',
                opacity: canEdit ? 1 : 0.6,
              }}
            >
              Edit First
            </button>
```

Then wrap the footer's action content so the inline form replaces the buttons while editing. Change the footer's conditional so it has three states — editing / acted / pending. Replace the footer's opening `{acted ? (` with `{editing ? (` and insert the form, then chain to the existing acted/pending logic. Concretely, replace `{acted ? (` with:

```tsx
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            {tokens.map((tk) => (
              <div key={tk} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label
                  style={{
                    fontSize: 9,
                    color: C.textTertiary,
                    fontFamily: F.sans,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {tk}
                </label>
                <input
                  value={draft[tk] ?? ''}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [tk]: e.target.value }))}
                  style={{
                    background: C.bg,
                    border: `1px solid ${C.amber}55`,
                    borderRadius: 7,
                    color: C.textPrimary,
                    fontSize: 12,
                    fontFamily: F.mono,
                    padding: '6px 10px',
                    outline: 'none',
                  }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              <button
                onClick={saveEdit}
                style={{
                  background: C.green,
                  border: 'none',
                  borderRadius: 7,
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: F.sans,
                  padding: '6px 14px',
                  cursor: 'pointer',
                }}
              >
                Save &amp; activate
              </button>
              <button
                onClick={() => setEditing(false)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  color: C.textSecondary,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: F.sans,
                  padding: '6px 12px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : acted ? (
```

This makes the footer a three-way: `editing ? <form> : acted ? <status+undo> : <activate/edit/skip>`. The closing of the JSX ternary stays the same (the existing `) : (` before the pending buttons and the final `)}` are unchanged).

- [ ] **Step 4: Pass per-card merged outputs + new props from the default export**

In `ProtocolConfirmationFlow`'s prop list, add `editedValues`, `isEdited`, `onEditCommit`. Replace the destructure + type with:

```tsx
export default function ProtocolConfirmationFlow({
  templates,
  decisions,
  outputs,
  editedValues,
  isEdited,
  onActivate,
  onSkip,
  onUndo,
  onEditCommit,
  onClose,
}: {
  /** Already enterprise-filtered (spec §4.3) standard templates to confirm. */
  templates: readonly StandardProtocolTemplate[];
  /** Per-template decision state, keyed by template id. */
  decisions: Record<string, ProposalDecision>;
  /** Mock approved tier outputs (defaults) for AUTO-FILLED bracket substitution. */
  outputs: Record<string, string>;
  /** Per-template Edit-First overrides, keyed by template id then token. */
  editedValues: Record<string, Record<string, string>>;
  /** Whether a template's values diverge from defaults (drives the "Edited" tag). */
  isEdited: (id: string) => boolean;
  onActivate: (id: string) => void;
  onSkip: (id: string) => void;
  onUndo: (id: string) => void;
  onEditCommit: (id: string, values: Record<string, string>) => void;
  onClose: () => void;
}) {
```

Then replace the `<ConfirmationCard .../>` in the card stack `.map` with one that passes merged outputs + the new props:

```tsx
        {templates.map((t) => (
          <ConfirmationCard
            key={t.id}
            template={t}
            decision={decisions[t.id] ?? 'pending'}
            outputs={{ ...outputs, ...(editedValues[t.id] ?? {}) }}
            isEdited={isEdited(t.id)}
            onActivate={() => onActivate(t.id)}
            onSkip={() => onSkip(t.id)}
            onUndo={() => onUndo(t.id)}
            onEditCommit={(values) => onEditCommit(t.id, values)}
          />
        ))}
```

- [ ] **Step 5: Update the legend text (Edit First is no longer deferred)**

Replace the legend's trailing text — change:

```tsx
          values are auto-filled from approved Stratum-6 outputs · &ldquo;Edit First&rdquo; is deferred this slice
```

to:

```tsx
          values are auto-filled from approved Stratum-6 outputs · use &ldquo;Edit First&rdquo; to adjust a threshold before activating
```

- [ ] **Step 6: Typecheck**

Run: `cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas" && NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm --filter @ogden/web exec tsc --noEmit`
Expected: the `ProtocolConfirmationFlow` errors from Task 3 are gone. Remaining errors should be ONLY the `ProtocolModePanel` `outputs`/`editedValues` prop errors (fixed in Task 5).

- [ ] **Step 7: Commit (Tasks 3 + 4 together — first compiling point for the confirmation flow)**

```bash
cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas"
git add apps/web/src/v3/plan/spine/PlanSpinePrototype.tsx apps/web/src/v3/plan/spine/ProtocolConfirmationFlow.tsx
git commit -m "feat(olos-protocol): Edit First inline value editor on confirmation cards

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `ProtocolModePanel` — reflect edited values + "Edited" tag

**Files:**
- Modify: `apps/web/src/v3/plan/spine/ProtocolModePanel.tsx`

- [ ] **Step 1: Import the shared renderer**

Add to the imports (after the `TypeBadge` import):

```tsx
import AutoFilledCondition from './AutoFilledCondition.js';
```

- [ ] **Step 2: Extend `ProtocolLibraryCard` to take merged outputs + edited flag**

Replace the `ProtocolLibraryCard` props block (currently `template, decision, integrationApproved`) with:

```tsx
function ProtocolLibraryCard({
  template,
  decision,
  integrationApproved,
  outputs,
  edited,
}: {
  template: StandardProtocolTemplate;
  /** Post-confirmation decision for this template; 'pending' pre-confirmation. */
  decision: ProposalDecision;
  /** True once the Stratum-6 Integration objective has been approved (§10.1). */
  integrationApproved: boolean;
  /** Effective outputs for this template: defaults merged with steward edits. */
  outputs: Record<string, string>;
  /** True when this template's values diverge from the pre-filled defaults. */
  edited: boolean;
}) {
```

- [ ] **Step 3: Render the IF via the shared renderer**

Replace the plain IF `<span>` (currently `<span ...>{template.condition.replace(/^IF\s+/, '')}</span>`) with the shared renderer so brackets become approved (or edited) values:

```tsx
            <AutoFilledCondition condition={template.condition} outputs={outputs} />
```

- [ ] **Step 4: Add the "Edited" tag beside the status label**

In the lifecycle-status `<span>` footer, after the `{statusLabel}` text and before the span closes, add the Edited tag (only meaningful once active + edited):

```tsx
          {statusLabel}
          {isActive && edited && (
            <span
              style={{
                fontSize: 8,
                background: C.amberDim,
                color: C.amber,
                border: `1px solid ${C.amber}55`,
                borderRadius: 6,
                padding: '1px 5px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Edited
            </span>
          )}
```

- [ ] **Step 5: Add `outputs` + `editedValues` to the panel props and pass them down**

Replace the `ProtocolModePanel` default export props block to add `outputs` and `editedValues`:

```tsx
export default function ProtocolModePanel({
  enterprises = ['sheep_beef'],
  decisions = {},
  integrationApproved = false,
  outputs = {},
  editedValues = {},
  onRestore,
  onNavigateToSource,
}: {
  enterprises?: readonly EnterpriseId[];
  /** Per-template confirmation decision (post §4.1 flow), keyed by template id. */
  decisions?: Record<string, ProposalDecision>;
  /** True once the Stratum-6 Integration objective has been approved (§10.1). */
  integrationApproved?: boolean;
  /** Mock approved tier outputs (defaults) for AUTO-FILLED substitution. */
  outputs?: Record<string, string>;
  /** Per-template Edit-First overrides, keyed by template id then token. */
  editedValues?: Record<string, Record<string, string>>;
  /** Restore a skipped template to active (§4.1 recoverable skipped list). */
  onRestore?: (id: string) => void;
  /** Navigate back to the originating Stratum-6 Integration objective. */
  onNavigateToSource?: () => void;
}) {
```

> Note: the original `enterprises` JSDoc is dropped above for brevity — keep the existing detailed comment if preferred; it does not affect behaviour.

Then update the `visibleTemplates.map(...)` call to pass the merged outputs + edited flag:

```tsx
          visibleTemplates.map((t) => (
            <ProtocolLibraryCard
              key={t.id}
              template={t}
              decision={decisions[t.id] ?? 'pending'}
              integrationApproved={integrationApproved}
              outputs={{ ...outputs, ...(editedValues[t.id] ?? {}) }}
              edited={Object.entries(editedValues[t.id] ?? {}).some(([k, v]) => v !== outputs[k])}
            />
          ))
```

- [ ] **Step 6: Full verification — tests + typecheck**

Run: `cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas" && corepack pnpm --filter @ogden/web exec vitest run src/v3/plan/spine/__tests__/autoFill.test.ts`
Expected: PASS (6 tests).

Run: `cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas" && NODE_OPTIONS=--max-old-space-size=8192 corepack pnpm --filter @ogden/web exec tsc --noEmit > "$TEMP/tsc-s3.txt" 2>&1; echo "EXIT=$?"; grep -iE "spine|autoFill|protocol|error TS" "$TEMP/tsc-s3.txt" || echo "NONE in spine"`
Expected: `EXIT=0`, "NONE in spine" (web tree is clean per slice 2).

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/atlas"
git add apps/web/src/v3/plan/spine/ProtocolModePanel.tsx
git commit -m "feat(olos-protocol): reflect Edit-First values + Edited tag in Protocol Mode

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: DOM verification in `/v3/components`

**Files:** none (verification only).

> The preview screenshot tool is environment-blocked by the dead-API `[SYNC]` churn; per CLAUDE.md, do NOT claim visual success from screenshots. Verify via `preview_eval` DOM inspection (serverId `3b81bf2e-d46d-48ba-a991-d3d13ad760e0`, port 5200), driving real onClick handlers via `dispatchEvent(new MouseEvent('click', {bubbles:true}))`. The page spontaneously redirects to `/v3/portfolio`; re-navigate via `location.href='/v3/components'` and drive the flow in a single async IIFE to beat the redirect. Scope all queries to `.olos-spine-root` to avoid matching the sibling StratumSpine debug component.

- [ ] **Step 1: Drive to the confirmation flow and assert Edit First enablement**

Navigate to `/v3/components`, click Stratum 6, select the "Enterprise integration & feedback loops" objective, click "Approve & instantiate protocols →". In the card stack, assert:
- Threshold/window cards (e.g. "Paddock Rotation — Cover Trigger", "Emergency Destocking", "Rest Period — Re-entry Gate") have an **enabled** "Edit First" button.
- A bracket-free card (e.g. "Pre-Rotation Paddock Assessment", condition "rotation entry event") has a **disabled** "Edit First" button.

- [ ] **Step 2: Edit a threshold and save**

On "Paddock Rotation — Cover Trigger", click "Edit First" → assert an input appears pre-filled with `1,500 kg DM/ha`. Set its value to `1,650 kg DM/ha` using React's native value setter so the onChange tracker fires (setting `input.value` directly is swallowed by React):

```js
const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
set.call(input, '1,650 kg DM/ha');
input.dispatchEvent(new Event('input', { bubbles: true }));
```

Click "Save & activate". Assert:
- The card collapses to `✓ Activated` with an `Edited` tag.
- The IF now renders `1,650 kg DM/ha` (not `1,500`), and no `[approved threshold]` bracket is visible.
- The tally `Activated` incremented by 1.

- [ ] **Step 3: Cancel and Undo paths**

On another threshold card, click "Edit First", change a value, click "Cancel" → assert the card returns to pending (Activate/Edit First/Skip shown) with no `Edited` tag and the original value in the IF. Then Activate-via-Edit a card, click "Undo" → assert it returns to pending AND the IF shows the default value again (override cleared).

- [ ] **Step 4: Protocol Mode reflection**

Click "Close" → in Protocol Mode assert the edited template shows status `Active` with an `Edited` tag and its IF renders the edited value (`1,650 kg DM/ha`); a pristine activated template shows `Active` with no `Edited` tag.

- [ ] **Step 5: Record verification result**

Summarise the DOM-verified states in the final report. If the environment blocks a step after reasonable retries, document which step and why (do not fake success).

---

## Definition of Done
- "Edit First" is a working inline editor on every threshold/window confirmation card; bracket-free cards keep it disabled.
- Editing a value + Save commits the protocol as Activated with an "Edited" marker; the edited value renders in the IF and persists into Protocol Mode.
- Cancel discards; Undo reverts to pristine defaults.
- `autoFill.test.ts` 6/6 green; web `tsc --noEmit` exit 0; `@ogden/shared` unchanged.
- Flow DOM-verified in `/v3/components`; slice committed (scoped to `spine/`).
