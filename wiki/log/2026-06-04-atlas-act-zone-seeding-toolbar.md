# 2026-06-04 — Surface zone-seeding tools (seed / trim / clear) in the Act S4 zones toolbar

**Branch.** `feat/atlas-permaculture` (local-only per the out-of-band-rebase rule
for this branch; **not pushed**).

## Problem

The zone-seeding workflow (place Zone 0 → Z1–Z5 Mollison concentric rings
auto-generate → trim to property boundary) had been surfaced in the **Plan**
`ZoneCirculationOverviewCard` for the `s4-zones` objective (commit `26270041`).
But placing zones on the map is an **execute** activity, not a plan-decide one
(per the Plan-decides / Act-executes-and-collects framing — see
`[[project-act-tier-shell]]`). The tools belonged in the **Act categorized tools
rail**, surfaced for the same `s4-zones` objective.

## What shipped

Four files wire seed / trim / clear into the Act tools rail via the existing
`OBJECTIVE_ACT_TOOLS_OVERRIDE` + `ACT_TOOL_CATALOG` machinery (no new files):

- **`packages/shared/.../objectiveActTools.ts`** — `'s4-zones'` override extended
  from `['zone', 'buffer-ring']` to
  `['zone-seed', 'zone-trim', 'zone-clear', 'zone', 'buffer-ring']`.
- **`apps/web/.../actToolCatalog.ts`** — three new catalogue entries in the
  `Zones & Planning` category: `zone-seed` (Sprout icon, **map** arm →
  `plan.zone-circulation.zone-seed-anchor`, dispatched on the Act canvas by the
  already-mounted `PlanDrawHost`), `zone-trim` (Scissors), `zone-clear` (Eraser).
  A new `ActToolArm` kind `{ kind: 'zone-action'; action: 'trim' | 'clear' }` was
  added for the two imperative post-actions (the catalog previously had only
  `map` / `log` / `form` / `flow` arms — none imperative).
- **`apps/web/.../ActTierShell.tsx`** — `handleActivateTool` gained a
  `zone-action` dispatch branch: **clear** calls
  `useZoneStore.clearSeededZones(projectId)` + toast; **trim** resolves the parcel
  via `parcelPolygon(project.parcelBoundaryGeojson)`, clips each `ring-seed`
  zone via `clip()`, then `updateZone`/`deleteZone` + toast. `id` (active project)
  added to the callback dep array.
- **`apps/web/.../ActTierCategorizedToolsRail.tsx`** — `isToolArmed()` guard for
  the new `zone-action` kind (returns false — imperative, no persistent armed
  state); also satisfies TS exhaustiveness narrowing.

## Out-of-band rebase note

The branch was rebased externally mid-slice. Three of the four edits
(`objectiveActTools.ts`, `actToolCatalog.ts`, `ActTierShell.tsx`) were folded
into the rebased history (present in HEAD `1965b2e5`); the
`ActTierCategorizedToolsRail.tsx` guard remained uncommitted. Because the
`zone-action` arm kind was committed without its rail guard, **HEAD carried a
latent TS narrowing error** until this slice's commit landed the guard. Committed
via explicit pathspec (rail file only); the unrelated foreign "snap-draw" WIP in
the working tree (`snapPoint.ts`, `useMapboxDrawTool.ts`, `PlanDrawHost.tsx`,
`FenceLineTool.tsx`, `PaddockTool.tsx`) was left unstaged.

## Verification

- **Typecheck** (`apps/web`, 8 GB heap): clean for all four touched files.
- **Conformance:** `actToolCoverage.test.ts` 17/17 (bounded `--pool=forks`).
- **Preview** (DOM probe; screenshot tool unresponsive, transient per
  `[[project-screenshot-hang]]`): on the `s4-zones` objective the tools rail
  showed tiles in order — Seed zones from rings / Trim seeded to parcel / Clear
  seeded zones / Zones / Buffer zones. Seed click armed the tool
  (`data-active=true`); Clear click fired the correct empty-state toast.

No ADR — incremental Act-rail wiring on existing tool-catalog machinery, no
architectural change.

## Open question for the operator

The Plan-card version (commit `26270041`) still exists. The user's instruction
("those tools need to be in the Act toolbar") was a placement correction; whether
to *remove* the duplicate from the Plan card to make it Act-only is unconfirmed.

## Amanah

Spatial design tooling only — no sales/finance instrument, no fiqh surface.
Clean.
