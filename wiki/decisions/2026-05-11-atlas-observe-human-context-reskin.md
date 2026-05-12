# Observe Human Context reskin onto shared stageCard primitives

**Date:** 2026-05-11
**Scope:** `apps/web/src/v3/_shared/stageCard/`, `apps/web/src/v3/observe/modules/human-context/`
**Status:** Closed for Human Context. Other six Observe modules deferred.

## Problem

The Observe slide-up already shared chrome with Plan/Act (see
[2026-05-11-atlas-shared-module-nav](2026-05-11-atlas-shared-module-nav.md)),
but the *body* of every Observe module page was still rendered against
the monolithic `apps/web/src/v3/observe/styles/observe-port.css`
(~22k lines). Observe pages presented a distinctly different visual
language from Plan/Act:

- Green primary buttons (`background: #15803D` inline / `--olos-green`)
  instead of the gold `.btn` from `planCard.module.css` /
  `actCard.module.css`
- Bespoke hero cards (`module-hero-card`, `surface-card` variants)
  instead of the 28px italic display-font hero with `.heroTag` eyebrow
- Custom green progress rings, place chips, regional stat blocks
- Per-module `.detail-page <slug>-page` layouts with their own grids

The steward asked for the Human Context dashboard to **"match the
theme of the other two stages."** Doing that one module at a time
preserves the ability to review the proof-of-concept before touching
the other six Observe modules.

A second drift problem was already visible inside Plan/Act:
`features/plan/planCard.module.css` (165 lines) and
`features/act/actCard.module.css` (221 lines) were 95% byte-identical.
Act was a superset — extra pill states (`pillPlanned/Running/Success/Fail/Incon`),
`.table`, and `.linkedPairHighlight`. Two stages drifting twice over
the same primitives.

## Decision

Promote the Plan and Act card primitives into one shared module —
`apps/web/src/v3/_shared/stageCard/stageCard.module.css` — selected by
a `data-stage` attribute on `.hero`. Migrate the Human Context module
onto it as the first consumer. Leave the legacy
`features/plan/planCard.module.css` and `features/act/actCard.module.css`
files in place so Plan/Act callsites do not need any TSX edits in this
session; callsite migration is deferred.

### Hero gradient by `data-stage`

```css
.hero {
  background: linear-gradient(135deg, var(--stage-hero-a, #2a1f10) 0%, var(--stage-hero-mid, #1a130a) 50%, var(--stage-hero-b, #2a1d12) 100%);
}
.hero[data-stage='plan']    { --stage-hero-a:#2a1f10; --stage-hero-mid:#1a130a; --stage-hero-b:#2a1d12; }
.hero[data-stage='act']     { --stage-hero-a:#221530; --stage-hero-mid:#14101c; --stage-hero-b:#261a18; }
.hero[data-stage='observe'] { --stage-hero-a:#1a2a18; --stage-hero-mid:#0f1a10; --stage-hero-b:#1d2c15; }
```

Plan keeps its bronze, Act keeps its violet-bronze, Observe gets a
new earth-green hue distinct from both so the three stages remain
visually identifiable while sharing every other token.

### Accents

Observe's green buttons, rings, and accent chips are replaced with the
Plan/Act gold accent (`var(--color-gold-brand)`,
`var(--color-gold-rgb)`). Semantic pill greens
(`.pillMet`, `.pillSuccess`) stay green because Plan and Act already
use them for success states — green carries meaning here, not theme.

### ProgressRing handling

The shared `ProgressRing` component is still green (used by the six
un-reskinned Observe modules). Rather than thread a colour prop or
fork an `ObserveStageRing` component, the Human Context module
defines a local gold `.ring` class in `humanContext.module.css` using
`conic-gradient(rgba(var(--color-gold-rgb), 0.85) ...)` and a local
`Ring()` helper. Future Observe-module reskins can adopt the same
pattern, and a final pass can collapse the shared component once
every consumer has migrated.

### Local extras

`apps/web/src/v3/observe/modules/human-context/humanContext.module.css`
holds the patterns that don't fit the shared `stageCard.module.css`:

- `.heroRow` — image-right hero layout
- `.heroArt` — 180px banner image
- `.kpiGrid` / `.kpiBlock` — KPI strip beneath the hero
- `.ring` — gold conic-gradient progress ring
- `.layout` — main + 320px aside grid
- `.cardEyebrow` — gold numbered chip eyebrow above section titles
- `.synthesisBlock` — gold-numbered bullet list ("what this implies for design")
- `.blockquote` — gold-left-border italic quote
- `.capacityBar` / `.capacityLegend` — stacked-bar split for initial/ongoing hours
- `.snapshotMetric` — sidebar metric row with round gold icon + label/value

## Migrated components

All four under `apps/web/src/v3/observe/modules/human-context/`:

- `HumanContextDashboard.tsx`
- `StewardSurveyDetail.tsx`
- `IndigenousRegionalContextDetail.tsx`
- `VisionDetail.tsx`

Each now renders:

```tsx
<div className={card.page}>
  <div className={card.hero} data-stage="observe">
    <span className={card.heroTag}>Observe · Module 1 · …</span>
    <h1 className={card.title}>…</h1>
    <p className={card.lede}>…</p>
    {/* gold .btn CTA */}
  </div>
  {/* card.section blocks containing .grid, .field, .statRow, .listRow, .pill, .table */}
</div>
```

Inline `background: #15803D` buttons, `surface-card` wrappers, and
`module-hero-card` heroes are gone from these four files.

## Deferred follow-ups

1. **Plan + Act callsite migration.** Two CSS files
   (`features/plan/planCard.module.css`, `features/act/actCard.module.css`)
   are still imported by ~38 + ~25 files including the legacy v1/v2
   Observe cards in `features/observe/`. Migration is mechanical
   (replace the import path, add `data-stage="plan"|"act"` to every
   `<div className={css.hero}>`) but high-volume. Defer until a
   session can absorb the churn without diluting the user-visible
   reskin work.
2. **Other six Observe modules.** Each still renders against
   `observe-port.css`. Plan to walk through one at a time, mirroring
   the Human Context pattern. The shared `ProgressRing` and any
   exclusively-owned `.detail-page <slug>-page` rules can be deleted
   once the last consumer migrates.
3. **`observe-port.css` cleanup.** The Human-Context-only `.human-*`
   selectors can be pruned in a follow-up cleanup pass. Default to
   leaving rules in place this session — accidental removal of a
   selector shared by another Observe module would silently break
   that module.

## Files

**New (shared)**
- `apps/web/src/v3/_shared/stageCard/stageCard.module.css`
- `apps/web/src/v3/_shared/stageCard/index.ts`

**New (local extras)**
- `apps/web/src/v3/observe/modules/human-context/humanContext.module.css`

**Rewritten**
- `apps/web/src/v3/observe/modules/human-context/HumanContextDashboard.tsx`
- `apps/web/src/v3/observe/modules/human-context/StewardSurveyDetail.tsx`
- `apps/web/src/v3/observe/modules/human-context/IndigenousRegionalContextDetail.tsx`
- `apps/web/src/v3/observe/modules/human-context/VisionDetail.tsx`

**Untouched (deliberate)**
- `apps/web/src/features/plan/planCard.module.css`
- `apps/web/src/features/act/actCard.module.css`
- `apps/web/src/v3/observe/styles/observe-port.css`
- `apps/web/src/v3/observe/_shared/components/ProgressRing.*`
- The other six Observe modules

## Verification

- `npx tsc --noEmit` passes cleanly with the rewritten files.
- Browser preview verification deferred to the steward; the steward
  asked for the reskin to land first and will review the rendered
  result directly.
