# Objective 1.2 Team-Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Objective 1.2 ("Constitute the steward team") opens pre-seeded with the people named in the project-creation wizard — shown as muted "Awaiting role" provisional rows with a truthful "N of M constituted" count — and every empty panel offers a live jump to where its data is recorded.

**Architecture:** A pure display-merge. The creation wizard already writes the primary steward + queued invites to `project.metadata.team` (via `updateProject`/`reconcileStewardInvites` in `projectStore`), but `selectTeamRoster` never reads it. We (1) extend the pure `selectTeamRoster` adapter to synthesize provisional `TeamMemberRow`s from `metadata.team` (email-de-duped against real members; counted in `rosterSize`, not `constitutedCount`), (2) have `TeamRegistryPanel` read `metadata.team` from `useProjectStore` and render provisional rows muted plus jump-link affordances, and (3) thread two navigation callbacks from `ActTierZeroWorkbench`. No store writes, no migration.

**Tech Stack:** TypeScript, React 18, Zustand 5, Vitest + Testing Library (happy-dom), pnpm/Turborepo monorepo. Spec: [2026-07-04-objective-12-team-bridge-design.md](../specs/2026-07-04-objective-12-team-bridge-design.md).

**Grounded facts (verified against the tree at HEAD `7ccb1e93`):**
- `metadata.team` type: `NonNullable<ProjectMetadata['team']>` — `ProjectMetadata` is exported from `@ogden/shared` (`packages/shared/src/schemas/project.schema.ts:107-126`, `:154`). Shape: `{ primarySteward?: { name?, email? }, coStewards?: { name?, email? }[], queuedInvites?: QueuedTeamInvite[] }` where `QueuedTeamInvite = { name?, email, role, queuedAt }`.
- Read path: `useProjectStore((s) => s.projects.find((p) => p.id === projectId)?.metadata?.team)` — `LocalProject.metadata?: ProjectMetadata` (`projectStore.ts:81`); the wizard writes here in both offline and authed modes. Returns a stable nested ref (no fresh object minted → Zustand-safe).
- Checklist item ids (real): `s1-steward-c1` (roster), `s1-steward-c2` (roles), `s1-steward-c5` (labour) — `packages/shared/src/constants/plan/catalogues/universal.ts:157/175/191`.
- Objective 1.1 id: `s1-vision`.
- `TeamRegistryPanel` is mounted **only** at `ActTierZeroWorkbench.tsx:701` (`isDeclaration && activeObjective.id === TEAM_OBJECTIVE_ID`).
- `onSelectObjective?: (objectiveId: string) => void` is a prop of `ActTierZeroWorkbench` (`:116`, destructured `:536`) and **is** threaded by the Plan/Declaration mount (`PlanTierShell.tsx:1427/1453` → `handleSelectObjective`), so the intent jump works in production. `setSelectedItemId` is local state (`:552`).
- The existing panel test (`TeamRegistryPanel.test.tsx`) renders store-direct with **no `QueryClientProvider`** and mocks `useResolvedOperationalRoles` — so the panel must NOT add a React-Query `useProject` call. Reading `metadata.team` from `useProjectStore` (Zustand) keeps the store-direct harness intact.

---

## File Structure

- `apps/web/src/v3/act/tier-shell/selectTeamRoster.ts` — **modify.** Add `provisional?: boolean` to `TeamMemberRow`; add `ProjectTeamMeta` type + optional 4th `teamMeta` param; synthesize provisional rows.
- `apps/web/src/v3/act/tier-shell/__tests__/selectTeamRoster.test.ts` — **modify.** New `describe` block for provisional synthesis / de-dupe / counts.
- `apps/web/src/v3/act/tier-shell/TeamRegistryPanel.tsx` — **modify.** Read `metadata.team`; pass to adapter; render provisional rows muted with the "Awaiting role" label; add optional `onNavigateObjective` / `onSelectItem` props + jump-link affordances.
- `apps/web/src/v3/act/tier-shell/TeamRegistryPanel.module.css` — **modify.** Add `.memberRowProvisional`, `.awaitingHint`, `.jumpLink`.
- `apps/web/src/v3/act/tier-shell/__tests__/TeamRegistryPanel.test.tsx` — **modify.** New `describe` blocks for provisional rendering + jump-link callbacks (seed `useProjectStore`).
- `apps/web/src/v3/act/tier-shell/ActTierZeroWorkbench.tsx` — **modify.** Thread `onNavigateObjective` / `onSelectItem` into the `TeamRegistryPanel` mount at `:701`.

---

## Task 1: `selectTeamRoster` — provisional-row synthesis (pure, TDD)

**Files:**
- Modify: `apps/web/src/v3/act/tier-shell/selectTeamRoster.ts`
- Test: `apps/web/src/v3/act/tier-shell/__tests__/selectTeamRoster.test.ts`

- [ ] **Step 1: Write the failing tests**

Append this `describe` block to `selectTeamRoster.test.ts` (after the existing "member rows" block; it reuses the file's existing `entry` / `member` helpers):

```typescript
// ---------------------------------------------------------------------------
// Provisional rows from metadata.team (the wizard -> 1.2 bridge)
// ---------------------------------------------------------------------------

describe('selectTeamRoster -- provisional rows from metadata.team', () => {
  const teamMeta = {
    primarySteward: { name: 'Ali Rahman', email: 'ali@example.nz' },
    coStewards: [{ name: 'Noor Said', email: 'noor@example.nz' }],
    queuedInvites: [
      {
        email: 'sam@example.nz',
        role: 'team_member' as const,
        queuedAt: '2026-01-01T00:00:00.000Z',
      },
    ],
  };

  it('synthesizes an "Awaiting role" provisional row per named person when the roster is empty', () => {
    const model = selectTeamRoster([], {}, {}, teamMeta);
    expect(model.rosterSize).toBe(3);
    expect(model.constitutedCount).toBe(0);
    expect(model.members.map((m) => m.name)).toEqual(['Ali Rahman', 'Noor Said', 'sam']);
    expect(model.members.every((m) => m.provisional === true)).toBe(true);
    expect(model.members.every((m) => m.roleLabel === 'Awaiting role')).toBe(true);
    expect(model.members.every((m) => m.complete === false)).toBe(true);
  });

  it('counts provisional rows in rosterSize but never in constitutedCount', () => {
    const model = selectTeamRoster(
      [entry({}, { userId: 'u1', email: 'ali@example.nz', operationalRoles: ['food_production'] })],
      {},
      {},
      teamMeta,
    );
    // Ali is now account-backed -> his provisional twin is dropped; Noor + sam remain provisional.
    expect(model.rosterSize).toBe(3);
    expect(model.constitutedCount).toBe(1);
    expect(model.members.filter((m) => m.provisional).map((m) => m.name)).toEqual([
      'Noor Said',
      'sam',
    ]);
  });

  it('de-dupes the same email appearing in both coStewards and queuedInvites', () => {
    const model = selectTeamRoster([], {}, {}, {
      coStewards: [{ name: 'Noor', email: 'noor@example.nz' }],
      queuedInvites: [
        { email: 'NOOR@example.nz', role: 'team_member' as const, queuedAt: '2026-01-01T00:00:00.000Z' },
      ],
    });
    expect(model.rosterSize).toBe(1);
  });

  it('shows a name-only primary steward (no email to de-dupe on)', () => {
    const model = selectTeamRoster([], {}, {}, { primarySteward: { name: 'Solo Steward' } });
    expect(model.rosterSize).toBe(1);
    expect(model.members[0]?.name).toBe('Solo Steward');
    expect(model.members[0]?.provisional).toBe(true);
    expect(model.members[0]?.initials).toBe('SS');
  });

  it('adds no provisional rows and stays byte-identical when no teamMeta is supplied', () => {
    const model = selectTeamRoster([entry()], {});
    expect(model.rosterSize).toBe(1);
    expect(model.members.every((m) => !m.provisional)).toBe(true);
  });

  it('adds no labour bars for provisional people (labour comes from the roster join only)', () => {
    const model = selectTeamRoster([], {}, {}, teamMeta);
    expect(model.labour).toEqual([]);
    expect(model.totalWeeklyHours).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `apps/web`):
```
../../node_modules/.bin/vitest run src/v3/act/tier-shell/__tests__/selectTeamRoster.test.ts --pool=forks --no-coverage
```
Expected: the 6 new tests FAIL. `selectTeamRoster` currently accepts only 3 args, so the 4th arg is ignored — `rosterSize` is `0`/`1` and `provisional` is `undefined`. (TypeScript may also flag the 4th arg — that is an expected RED signal, not a blocker for the run.)

- [ ] **Step 3: Add the `ProjectTeamMeta` type, the `provisional` field, and the synthesis**

In `selectTeamRoster.ts`, extend the `@ogden/shared` import to bring in the `ProjectMetadata` type:

```typescript
import {
  OPERATIONAL_ROLE_DEFS,
  operationalRolesApplyTo,
  type OperationalRole,
  type ProjectMetadata,
} from '@ogden/shared';
```

Add `provisional` to `TeamMemberRow` (after `operationalRoleLabels`):

```typescript
  operationalRoleLabels: string[];
  /**
   * True for a row synthesized from `metadata.team` (the creation wizard's
   * primary steward / co-stewards / queued invites) rather than an
   * account-backed member. Provisional rows are counted in `rosterSize` but
   * never in `constitutedCount`; the panel renders them muted with an
   * "Awaiting role" label. Absent/false for real members.
   */
  provisional?: boolean;
```

Add the team-meta type + helpers near the other helpers (after `firstNonEmpty`):

```typescript
/** The wizard-captured team block on the project (Wizard Step 3 / reconcileStewardInvites). */
export type ProjectTeamMeta = NonNullable<ProjectMetadata['team']>;

/** Lowercased, trimmed email for de-dupe keying (''-safe). */
function normEmail(email: string | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

/**
 * Synthesize provisional "Awaiting role" rows from the wizard-captured team,
 * de-duped by normalized email against the account-backed roster (`takenEmails`)
 * and against earlier provisional rows. A person with no email never de-dupes
 * (always shown) and is keyed by source index to keep React keys unique.
 */
function provisionalRowsFrom(
  teamMeta: ProjectTeamMeta | undefined,
  takenEmails: ReadonlySet<string>,
): TeamMemberRow[] {
  if (!teamMeta) return [];
  const sources: Array<{ name?: string; email?: string }> = [];
  const primary = teamMeta.primarySteward;
  if (primary && (primary.name || primary.email)) sources.push(primary);
  for (const co of teamMeta.coStewards ?? []) {
    if (co.name || co.email) sources.push(co);
  }
  for (const inv of teamMeta.queuedInvites ?? []) {
    sources.push({ name: inv.name, email: inv.email });
  }

  const seen = new Set<string>(takenEmails);
  const rows: TeamMemberRow[] = [];
  sources.forEach((src, i) => {
    const email = normEmail(src.email);
    if (email) {
      if (seen.has(email)) return;
      seen.add(email);
    }
    const name =
      firstNonEmpty(src.name, src.email ? emailLocalPart(src.email) : undefined) || 'Steward';
    rows.push({
      userId: email ? `provisional:${email}` : `provisional:${i}`,
      name,
      initials: initialsOf(name),
      roleLabel: 'Awaiting role',
      complete: false,
      operationalRoleLabels: [],
      provisional: true,
    });
  });
  return rows;
}
```

- [ ] **Step 4: Thread the new param through `selectTeamRoster`**

Change the signature and merge provisional rows into `members`. Update the four touched spots:

```typescript
export function selectTeamRoster(
  entries: readonly StewardRosterEntry[],
  sharedVision: SharedVision,
  roleLabelMap: OperationalRoleLabelMap = {},
  teamMeta?: ProjectTeamMeta,
): TeamRosterModel {
```

Replace the `const constitutedCount = members.filter(...)` line (currently right after the `members` map) with the provisional merge:

```typescript
  // Append provisional rows synthesized from the wizard-captured team, de-duped
  // by email against the account-backed roster. Counted in rosterSize (below),
  // never in constitutedCount (they carry complete:false).
  const accountEmails = new Set(
    entries.map((e) => normEmail(e.member.email)).filter((v) => v.length > 0),
  );
  const allMembers = [...members, ...provisionalRowsFrom(teamMeta, accountEmails)];
  const constitutedCount = allMembers.filter((m) => m.complete).length;
```

In the `return` object, use `allMembers`:

```typescript
  return {
    members: allMembers,
    rosterSize: allMembers.length,
    constitutedCount,
    labour,
    totalWeeklyHours,
    intent,
  };
```

(Labour + intent are unchanged — they derive from `entries` / `sharedVision` only, so provisional people contribute nothing.)

- [ ] **Step 5: Run the tests to verify they pass**

Run (from `apps/web`):
```
../../node_modules/.bin/vitest run src/v3/act/tier-shell/__tests__/selectTeamRoster.test.ts --pool=forks --no-coverage
```
Expected: ALL tests PASS (the 6 new + every pre-existing case in the file).

- [ ] **Step 6: Commit**

```
git add apps/web/src/v3/act/tier-shell/selectTeamRoster.ts apps/web/src/v3/act/tier-shell/__tests__/selectTeamRoster.test.ts
git commit -m "feat(team-bridge): synthesize provisional roster rows from metadata.team"
```

---

## Task 2: `TeamRegistryPanel` — read team, render provisional rows muted, add jump links (TDD)

**Files:**
- Modify: `apps/web/src/v3/act/tier-shell/TeamRegistryPanel.tsx`
- Modify: `apps/web/src/v3/act/tier-shell/TeamRegistryPanel.module.css`
- Test: `apps/web/src/v3/act/tier-shell/__tests__/TeamRegistryPanel.test.tsx`

- [ ] **Step 1: Write the failing tests**

In `TeamRegistryPanel.test.tsx`, add the `fireEvent` import and the `useProjectStore` import, a seed helper, a `projects` reset in `beforeEach`, and two new `describe` blocks.

Change the Testing-Library import line:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
```

Add after the `useMemberStore` import (line ~74):
```typescript
import { useProjectStore, type LocalProject } from '../../../../store/projectStore.js';
```

Add to the existing `beforeEach` body (so a stray builtin can't leak a team into these tests):
```typescript
  useProjectStore.setState({ projects: [] });
```

Add this seed helper next to `seedVision`:
```typescript
function seedProjectTeam(team: NonNullable<LocalProject['metadata']>['team']): void {
  useProjectStore.setState({
    projects: [{ id: PROJECT_ID, metadata: { team } } as LocalProject],
  });
}
```

Add the two `describe` blocks:
```typescript
describe('TeamRegistryPanel -- provisional rows from the wizard team', () => {
  it('renders named-at-setup people as muted "Awaiting role" rows and counts them', () => {
    seedVision(); // empty roster + empty vision
    seedProjectTeam({
      primarySteward: { name: 'Ali Rahman', email: 'ali@example.nz' },
      queuedInvites: [
        { email: 'noor@example.nz', role: 'team_member', queuedAt: '2026-01-01T00:00:00.000Z' },
      ],
    });
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);

    expect(screen.getByTestId('registry-count').textContent).toMatch(/0 of 2 constituted/);

    const row = screen.getByTestId('member-row-provisional:ali@example.nz');
    expect(row.textContent).toMatch(/Ali Rahman/);
    expect(row.textContent).toMatch(/Awaiting role/);
    expect(row.getAttribute('data-provisional')).toBe('true');
    // Provisional rows are not "constituted" -> no check badge.
    expect(row.getAttribute('data-complete')).toBeNull();
  });
});

describe('TeamRegistryPanel -- self-describing empty-state jump links', () => {
  it('invokes the nav callbacks with the right destinations', () => {
    seedVision(); // everything empty, no team
    const onNavigateObjective = vi.fn();
    const onSelectItem = vi.fn();
    render(
      <TeamRegistryPanel
        projectId={PROJECT_ID}
        onNavigateObjective={onNavigateObjective}
        onSelectItem={onSelectItem}
      />,
    );

    fireEvent.click(screen.getByTestId('jump-roster'));
    expect(onSelectItem).toHaveBeenCalledWith('s1-steward-c1');

    fireEvent.click(screen.getByTestId('jump-labour'));
    expect(onSelectItem).toHaveBeenCalledWith('s1-steward-c5');

    fireEvent.click(screen.getByTestId('jump-intent'));
    expect(onNavigateObjective).toHaveBeenCalledWith('s1-vision');
  });

  it('offers an "assign roles" jump (c2) when provisional rows are present', () => {
    seedVision();
    seedProjectTeam({ primarySteward: { name: 'Ali Rahman', email: 'ali@example.nz' } });
    const onSelectItem = vi.fn();
    render(<TeamRegistryPanel projectId={PROJECT_ID} onSelectItem={onSelectItem} />);

    fireEvent.click(screen.getByTestId('jump-roles'));
    expect(onSelectItem).toHaveBeenCalledWith('s1-steward-c2');
  });

  it('renders no jump buttons when no nav callbacks are provided', () => {
    seedVision();
    render(<TeamRegistryPanel projectId={PROJECT_ID} />);
    expect(screen.queryByTestId('jump-roster')).toBeNull();
    expect(screen.queryByTestId('jump-labour')).toBeNull();
    expect(screen.queryByTestId('jump-intent')).toBeNull();
    // The existing descriptive empty copy still renders (unchanged).
    expect(screen.getByText(/No stewards on the roster yet/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run (from `apps/web`):
```
../../node_modules/.bin/vitest run src/v3/act/tier-shell/__tests__/TeamRegistryPanel.test.tsx --pool=forks --no-coverage
```
Expected: the 4 new tests FAIL (`member-row-provisional:...`, `jump-roster`, `jump-labour`, `jump-intent`, `jump-roles` testids don't exist; count reads `0 of 0`). Every pre-existing test in the file still PASSES.

- [ ] **Step 3: Add the props, read `metadata.team`, pass it to the adapter**

In `TeamRegistryPanel.tsx`, add the store import (after the `useVisionStore` import, line ~33):
```typescript
import { useProjectStore } from '../../../store/projectStore.js';
```

Extend the props interface:
```typescript
export interface TeamRegistryPanelProps {
  projectId: string;
  /**
   * Live jump to another objective (wired to the workbench's onSelectObjective).
   * Used by the Intent empty-state link to open objective 1.1. When omitted, the
   * intent jump button is not rendered.
   */
  onNavigateObjective?: (objectiveId: string) => void;
  /**
   * Live jump to a checklist item within THIS objective (wired to the workbench's
   * setSelectedItemId). Used by the roster / roles / labour empty-state links.
   * When omitted, those jump buttons are not rendered.
   */
  onSelectItem?: (itemId: string) => void;
}
```

Update the component signature + read the team (inside the component, after the `roleLabelMap` memo, before the `model` memo):
```typescript
export default function TeamRegistryPanel({
  projectId,
  onNavigateObjective,
  onSelectItem,
}: TeamRegistryPanelProps): JSX.Element {
```
```typescript
  // Wizard-captured team (primary steward + co-stewards + queued invites). Read
  // from projectStore -- the same store the wizard/reconcileStewardInvites write
  // -- so it works offline + authed and stays seedable in the store-direct test.
  // The find(...) returns an existing nested ref (no fresh object) -> Zustand-safe.
  const teamMeta = useProjectStore(
    (s) => s.projects.find((p) => p.id === projectId)?.metadata?.team,
  );
  const model = useMemo(
    () => selectTeamRoster(entries, sharedVision, roleLabelMap, teamMeta),
    [entries, sharedVision, roleLabelMap, teamMeta],
  );
```

- [ ] **Step 4: Render provisional rows muted + add the jump-link affordances**

In the Team Registry `<section>`, mark provisional rows. Replace the member row's `className` and add `data-provisional`:
```typescript
              <div
                key={m.userId}
                className={
                  m.provisional
                    ? `${css.memberRow} ${css.memberRowProvisional}`
                    : css.memberRow
                }
                data-testid={`member-row-${m.userId}`}
                data-complete={m.complete || undefined}
                data-provisional={m.provisional || undefined}
              >
```
(No other change to the row body is needed: provisional rows already carry `roleLabel === "Awaiting role"`, `operationalRoleLabels === []` so no chips render, and `complete === false` so no check badge renders.)

Add an "assign roles" hint immediately AFTER the members `.map(...)` block but still inside the `model.members.length > 0` branch — only when a provisional row is present and the callback exists:
```typescript
            {onSelectItem && model.members.some((m) => m.provisional) ? (
              <button
                type="button"
                className={css.jumpLink}
                data-testid="jump-roles"
                onClick={() => onSelectItem('s1-steward-c2')}
              >
                Named at setup -- assign roles below to constitute
              </button>
            ) : null}
```

Replace the roster empty branch (`<div className={css.empty}>No stewards on the roster yet.</div>`) with the descriptive text + optional jump:
```typescript
          <div className={css.empty}>
            No stewards on the roster yet.
            {onSelectItem ? (
              <button
                type="button"
                className={css.jumpLink}
                data-testid="jump-roster"
                onClick={() => onSelectItem('s1-steward-c1')}
              >
                Add stewards below
              </button>
            ) : null}
          </div>
```

Replace the labour empty branch (`<div className={css.empty}>No weekly hours declared yet.</div>`) with:
```typescript
          <div className={css.empty}>
            No weekly hours declared yet.
            {onSelectItem ? (
              <button
                type="button"
                className={css.jumpLink}
                data-testid="jump-labour"
                onClick={() => onSelectItem('s1-steward-c5')}
              >
                Record weekly hours below
              </button>
            ) : null}
          </div>
```

Replace the intent empty branch (`<div className={css.empty}>Intent Object not yet declared.</div>`) with:
```typescript
          <div className={css.empty}>
            Intent Object not yet declared.
            {onNavigateObjective ? (
              <button
                type="button"
                className={css.jumpLink}
                data-testid="jump-intent"
                onClick={() => onNavigateObjective('s1-vision')}
              >
                Declare in Objective 1.1
              </button>
            ) : null}
          </div>
```

- [ ] **Step 5: Add the CSS**

Append to `TeamRegistryPanel.module.css`:
```css
/* Provisional roster row -- synthesized from the wizard-captured team, not yet a
   constituted member. Muted + dashed left rule to read as "pending". */
.memberRowProvisional {
  opacity: 0.72;
  border-left: 2px dashed var(--color-border-subtle, rgba(84, 92, 100, 0.10));
  padding-left: 6px;
}

/* Inline "jump to where this is captured" link inside an empty/hint block. Button
   reset -> text link in the panel accent. */
.jumpLink {
  display: inline;
  margin-left: 6px;
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--color-gold-active, #9a771f);
  text-decoration: underline;
  cursor: pointer;
}
.jumpLink:hover {
  color: var(--color-text, #1b1e22);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run (from `apps/web`):
```
../../node_modules/.bin/vitest run src/v3/act/tier-shell/__tests__/TeamRegistryPanel.test.tsx --pool=forks --no-coverage
```
Expected: ALL tests PASS (4 new + all pre-existing).

- [ ] **Step 7: Commit**

```
git add apps/web/src/v3/act/tier-shell/TeamRegistryPanel.tsx apps/web/src/v3/act/tier-shell/TeamRegistryPanel.module.css apps/web/src/v3/act/tier-shell/__tests__/TeamRegistryPanel.test.tsx
git commit -m "feat(team-bridge): TeamRegistryPanel shows provisional rows + empty-state jump links"
```

---

## Task 3: Thread the nav callbacks from `ActTierZeroWorkbench`

**Files:**
- Modify: `apps/web/src/v3/act/tier-shell/ActTierZeroWorkbench.tsx:701`

- [ ] **Step 1: Wire the callbacks into the mount**

Replace the single-line mount at `:701`:
```typescript
              <TeamRegistryPanel projectId={projectId} />
```
with:
```typescript
              <TeamRegistryPanel
                projectId={projectId}
                onNavigateObjective={
                  onSelectObjective
                    ? (objectiveId) => {
                        // Close this popup, then switch the active objective (1.1).
                        setSelectedItemId(null);
                        onSelectObjective(objectiveId);
                      }
                    : undefined
                }
                onSelectItem={(itemId) => setSelectedItemId(itemId)}
              />
```
(`onSelectObjective` is already destructured at `:536`; `setSelectedItemId` is in scope from `:552`. When `onSelectObjective` is absent — e.g. an Act-parity mount that omits it — the intent jump degrades to no button, which is the intended fallback.)

- [ ] **Step 2: Typecheck the web package**

Run (from repo root, PowerShell):
```
$env:NODE_OPTIONS="--max-old-space-size=8192"; corepack pnpm --filter @ogden/web exec tsc --noEmit
```
Expected: exit 0, no errors. (This is the integration guard: the 3-line prop wiring is a pass-through; its behavioral contract — that the panel fires the right ids — is already covered by Task 2's panel tests.)

- [ ] **Step 3: Run the existing workbench declaration test (no regression)**

Run (from `apps/web`):
```
../../node_modules/.bin/vitest run src/v3/act/tier-shell/__tests__/ActTierZeroWorkbench.declaration.test.tsx --pool=forks --no-coverage
```
Expected: PASS (the mount change is additive; declaration behavior is unchanged).

- [ ] **Step 4: Commit**

```
git add apps/web/src/v3/act/tier-shell/ActTierZeroWorkbench.tsx
git commit -m "feat(team-bridge): thread objective/item jump callbacks into TeamRegistryPanel"
```

---

## Task 4: Full verification + preview proof

**Files:** none (verification only; commit only if a fix is needed).

- [ ] **Step 1: Typecheck all three packages**

Run (from repo root, PowerShell), each expected exit 0:
```
$env:NODE_OPTIONS="--max-old-space-size=8192"; corepack pnpm --filter @ogden/web exec tsc --noEmit
corepack pnpm --filter @ogden/shared exec tsc --noEmit
corepack pnpm --filter @ogden/api exec tsc --noEmit
```

- [ ] **Step 2: Run the two touched suites together (bounded)**

Run (from `apps/web`):
```
../../node_modules/.bin/vitest run src/v3/act/tier-shell/__tests__/selectTeamRoster.test.ts src/v3/act/tier-shell/__tests__/TeamRegistryPanel.test.tsx src/v3/act/tier-shell/__tests__/ActTierZeroWorkbench.declaration.test.tsx --pool=forks --no-coverage
```
Expected: all green.

- [ ] **Step 3: Preview proof (offline demo)**

Start the offline-demo dev server (launch config exists; do not use Bash for servers). Create a fresh project through the wizard, name a primary steward + one invite in Step 3, finish, then open objective **1.2** in Plan. Verify via DOM snapshot (v3 mounts can hang the screenshot tool — if so, disclose and fall back to `preview_snapshot`/`preview_inspect`):
  - Team Registry shows the named people as muted "Awaiting role" rows.
  - Registry count reads "0 of N constituted" (N = people named), not "0 of 0".
  - The Intent empty-state shows a "Declare in Objective 1.1" link that navigates to 1.1.
  - The labour empty-state shows a "Record weekly hours below" link that selects the c5 capture.

State plainly whether each was confirmed; do not claim success without the snapshot.

- [ ] **Step 4 (only if a fix was needed): commit the fix**

```
git add <fixed files>
git commit -m "fix(team-bridge): <what/why>"
```

---

## Self-Review

**Spec coverage:**
- Data bridge / provisional synthesis / email de-dupe / count semantics → Task 1. ✓
- `TeamMemberRow.provisional` field → Task 1, Step 3. ✓
- Muted "Awaiting role" rendering → Task 2, Steps 4-5. ✓
- Self-describing empty states + live jumps (intent→1.1; roster/roles/labour→c1/c2/c5) → Task 2, Step 4. ✓
- Nav wiring via `onSelectObjective` + `setSelectedItemId` → Task 3. ✓
- Pure adapter byte-identical with no `teamMeta` → Task 1 test #5. ✓
- No store writes / no migration → nothing in any task writes a store or DB. ✓
- Amanah: only operator-entered names/emails + existing neutral labels; no sale/CSA copy introduced → confirmed (no new prose beyond "Awaiting role" + jump-link labels). ✓

**Deviation from spec (documented, intentional):** the spec proposed replacing the empty-state lead copy ("Declared in Objective 1.1…"). The plan instead **keeps** the existing lead sentences ("No stewards on the roster yet.", "Intent Object not yet declared.", etc.) and **appends** a named jump button ("Declare in Objective 1.1", "Add stewards below", …). This satisfies the spec's "self-describing + live jump" intent while keeping the existing empty-state assertions green — a smaller, safer diff. Same destinations (s1-vision / c1 / c2 / c5).

**Placeholder scan:** no TBD/TODO; every code step shows complete code and exact run commands. ✓

**Type consistency:** `ProjectTeamMeta = NonNullable<ProjectMetadata['team']>` defined in Task 1 and referenced by name only there; the panel passes the `useProjectStore` selector result (structurally the same optional type) straight through — no name mismatch. `provisional?: boolean`, `onNavigateObjective`, `onSelectItem`, and the testids (`jump-roster`/`jump-roles`/`jump-labour`/`jump-intent`, `member-row-provisional:<email>`) are used identically across tasks and tests. ✓
