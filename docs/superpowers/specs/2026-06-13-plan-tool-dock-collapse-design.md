# Plan tool dock — global collapse — Design

**Date:** 2026-06-13
**Project:** OLOS (atlas) — Plan tier-shell
**Status:** approved (design)

## Problem

In the Plan tier-shell, the bottom tools dock (`PlanTierCategorizedToolsRail`, the
"MODULES"/categorized objective-tools rail) is laid out **in-flow under the canvas**
in the center column. `StageShell` renders it via `bottomPlacement="between-rails"`,
where the canvas is `flex: 1 1 auto` and the tray is `flex: 0 0 auto`
(`StageShell.module.css:54-60`). The tray therefore consumes vertical space the
canvas needs.

This was surfaced by the Plan Protocols workspace feature (commit `a1e78dba`): in
Protocols mode the center is a two-pane protocol workspace whose left (mechanics)
pane ends in the IF/THEN threshold editor. With the tools dock eating the bottom of
the center column, the threshold editor gets pushed under the fold and reads as
"partly hidden."

The dock is mounted at `PlanTierShell.tsx:1024-1033` and is already conditionally
suppressed when `showTierZeroWorkbench` is true.

## Decision

Add a **global collapse control** to the Plan bottom tools dock, working in **both**
Objectives and Protocols mode, with the collapsed/expanded choice **persisted** as a
device-local UI preference. Default is **expanded** (current behavior preserved).

Chosen over the two alternatives considered:
- *Auto-hide in Protocols mode only* — narrower; removes user agency.
- *Manual toggle scoped to Protocols mode only* — narrower than requested.

## Approach (selected: Plan-side wrapper)

A thin Plan-side wrapper component owns the collapse chrome and reads/writes the
preference; `PlanTierShell` passes it into `StageShell`'s existing `bottomTray` slot.
`StageShell` stays generic.

Rejected alternatives:
- **First-class StageShell feature** (`bottomCollapsible`/`bottomCollapsed` props) —
  reusable by Act/Observe later, but touches shared chrome across all three stages.
  Broader blast radius than asked. YAGNI.
- **Collapse inside `PlanTierCategorizedToolsRail`** — no new file, but mixes
  persistence + chrome into a focused tools component and cannot cleanly shrink to a
  slim handle.

## Components & data flow

1. **`apps/web/src/store/uiStore.ts`** — add, mirroring the existing
   `rightPanelCollapsed` precedent (`uiStore.ts:43-47,140-142,206`):
   - `planToolDockCollapsed: boolean` — default `false` (expanded).
   - `togglePlanToolDockCollapsed(): void`.
   - `setPlanToolDockCollapsed(v: boolean): void`.
   - Add `planToolDockCollapsed` to `partialize`.
   - **No version bump / no migration.** The field is additive with a default;
     zustand persist merges the persisted partial over initial state, so an absent
     key keeps the default — exactly how `rightPanelCollapsed` was introduced.

2. **New `apps/web/src/v3/plan/tier-shell/PlanToolDock.tsx`** — wraps the dock:
   - **Expanded:** a slim header strip containing a chevron-down "Collapse tools"
     button, then the existing `<PlanTierCategorizedToolsRail ... />` with the same
     four props it receives today (`objective`, `disabled`, `onActivate`,
     `activeFormId`) passed straight through.
   - **Collapsed:** *only* the slim strip — a chevron-up "Show tools" button plus a
     short label. The heavy rail is not rendered, so the center column's canvas
     (`flex: 1 1 auto`) reclaims the full height and the IF/THEN threshold editor is
     unobstructed.
   - Reads `planToolDockCollapsed` and the toggle from `useUIStore`.
   - Carries `data-testid="plan-tool-dock"`; the expanded rail keeps its existing
     testids; the collapse/expand control is reachable by accessible name.

3. **`apps/web/src/v3/plan/tier-shell/PlanTierShell.tsx:1024`** — replace the inline
   `bottomTray={ showTierZeroWorkbench ? undefined : <PlanTierCategorizedToolsRail/> }`
   with `... : <PlanToolDock {...sameProps} />`. The tier-zero suppression
   (`showTierZeroWorkbench ? undefined : ...`) is unchanged. Applies in both
   Objectives and Protocols mode (single global preference).

## Covenant / Amanah

Pure device-local UI preference. uiStore persists to localStorage only and is NOT in
`syncManifest` — nothing reaches the server. No spine write, no protocol content
touched. Default expanded, so behavior is byte-identical until a user clicks collapse.
**Amanah-neutral.**

## Deliberate YAGNI

A **single** global collapse preference, not per-mode defaults. Collapsing in
Protocols mode also collapses the dock in Objectives mode until re-expanded. This is
the requested "global ... persisted preference" scope.

## Testing & verification

- **uiStore unit test:** `planToolDockCollapsed` defaults to `false`; toggle flips it;
  `partialize` output includes the field.
- **PlanToolDock unit test (happy-dom):** expanded → renders the tools rail + a
  collapse control; collapsed → renders the slim handle and does **not** render the
  rail; clicking the control calls the store toggle.
- `tsc` clean bar the 4 pre-existing baseline errors
  (`syncServiceWorkItemsFallback.test.ts:119`,
  `WorkConflictSection.test.tsx:119/120/134`).
- Bounded vitest: `--pool=forks --testTimeout=20000`.
- Live preview on `web-demo` (`FEATURE_DEMO_MODE=true`, :5206): collapse/expand in
  both Objectives and Protocols mode, screenshot proof. Fall back to DOM assertions
  if the v3 mount hangs (standing preview-hang disclosure).

## Definition of done

Collapse control present on the Plan bottom tools dock in both modes; collapsing
frees the center column height (threshold editor fully visible in Protocols mode);
preference survives reload; default-expanded preserves current behavior; tests green;
tsc clean bar baseline; live or DOM-asserted proof captured.
