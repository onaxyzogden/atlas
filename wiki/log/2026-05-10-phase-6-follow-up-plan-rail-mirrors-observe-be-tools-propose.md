# 2026-05-10 — Phase 6 follow-up: Plan rail mirrors Observe BE tools (proposed-state)


**Motive.** After Phase 6 closeout, the user flagged that the Plan toolbar
was missing the Built Environment tools that Observe surfaces. Phase 5.2.A
made all 31 BE kinds placeable in Observe via a registry-driven rail; Plan
had only 2 tools under Structures & Subsystems (`structure` + `utility-run`).
This turn brings the same registry-driven palette to Plan, with each
placement defaulting to `state: 'proposed'` instead of `'existing'`.

**Implementation (4 files).**

- `useMapToolStore.ts` — `MapToolId` union extended with the template literal
  ``` `plan.structures-subsystems.be.${string}` ```. Keeps the strict-literal
  surface for existing tools while letting the kind registry grow without
  per-kind union edits.
- `BeV2ExistingTool.tsx` — added optional `state?: BuiltEnvironmentState`
  prop (default `'existing'`). Plan rail passes `state="proposed"`.
  Backward-compatible — Observe call sites unchanged.
- `PlanTools.tsx` — registry-driven `PLAN_BE_TOOLS` array filters
  `BUILT_ENVIRONMENT_KINDS` to entries whose `defaultStates.includes('proposed')`,
  maps each to a `ToolItem` with `toolId: 'plan.structures-subsystems.be.<kind>'`.
  Mirrors Observe's `BE_ICON_MAP` resolver. Spread into the existing
  Structures & Subsystems group **after** the legacy `structure` +
  `utility-run` entries (legacy retained for richer create-time UX).
- `PlanDrawHost.tsx` — prefix-match dispatch: any `activeTool` starting
  with `plan.structures-subsystems.be.` strips the prefix to recover the
  `kind` and mounts `<BeV2ExistingTool kind={kind} state="proposed" />`.
  Runs **before** the per-tool switch so the registry path doesn't need
  a 23-case enumeration.

**Why the previous Plan rail mirror got reverted.** The earlier Phase 5.3
attempt scattered 23 new tool ids across Plan modules with bespoke
ids per kind. This turn collapses them to a single namespace
(`plan.structures-subsystems.be.*`) under one dispatch handler — registry
churn doesn't ripple through the Plan switchboard.

**Verification.**
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` → exit 0.
- 3 BE vitest files / 41 cases (V2 store + adapters + derivations) → green.
- Manual MTC smoke deferred to user: pick "Barn" from Plan rail under
  Structures & Subsystems → draw polygon → entity should appear in V2 with
  `state: 'proposed'` and render via `DesignElementExtrusionLayer` when
  pitched, plus the V2 generic layer top-down.

**Architectural note.** This is the symmetry the unification arc was after:
one shared store, one shared draw tool (`BeV2ExistingTool`), one shared
kind registry — and now both stages surface the same palette, distinguished
only by the `state` axis. Adding a new BE kind to the registry now lights
up both rails with zero code changes elsewhere.
