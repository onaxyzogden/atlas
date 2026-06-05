# 2026-05-11 — Rotation surface polish (L+E) + Predator card guard


**Motive.** Two same-day ADRs each closed with deferred-polish lists.
Operator picked the quick-win bundle: past-due tint on the Plan-map
scheduled-moves overlay (**L**) and linked-pair hover grouping on the
rotation card (**E**). Both paint-and-CSS depth, no schema changes.

**Change.**

- **L** — `PlanScheduledMovesOverlay.tsx` `TEXT_LAYER` paint became
  data-driven via `case` expressions on a per-feature `pastDue` flag
  (`b.soonest < today`). Past-due text swaps to `#a3401d` with a
  `#f5cbb8` halo; on-time keeps the cream default.
- **E** — `RotationScheduleCard.tsx` gained a `hoveredLinkedId`
  useState; rows that own a `linkedEventId` wire mouseenter/leave;
  any row whose `id` *or* `linkedEventId` matches the hovered partner
  gets `.linkedPairHighlight`. Applied to per-paddock logged-moves
  rows and the Structure-moves tail.
- **E (follow-up)** — Visual-evidence pass revealed the rotation
  card's per-paddock blocks never co-render both legs of a paddock-
  to-paddock rotate pair (exit and entry land in different paddock
  buckets). Extended the same wiring to `LivestockMoveCard.tsx`'s
  project-wide moves table where both legs do co-render, with a
  matching `.linkedPairHighlight td` rule in `actCard.module.css`.
- **Predator hotspots guard** — Visual-evidence seeding produced a
  paddock without the (typed-required) `species` field, which
  surfaced a real crash in `PredatorRiskHotspotsCard.tsx`: the
  per-paddock analysis called `p.species.reduce(...)` unguarded.
  Normalized to `const species = p.species ?? []` at the start of
  the analysis so partial/legacy paddock records render a
  baseline-only risk row instead of bringing down the whole tab.

**Verified.** typecheck clean across `apps/web`. Live preview:
both linked legs visibly tinted with warm bronze + inset
left-border on hover; past-due badge renders red `#a3401d` text vs
cream `#2d2a23` for on-time at the seeded MTC paddocks; predator
hotspots tab no longer error-boundaries on species-less paddocks.

**Commits.** `6c0f956` (core L+E), `ac1f0f9` (LivestockMoveCard
hover extension), `b385be3` (ADR addendum), `ebaf8ee` (predator
card species fallback).

**Refs.**
[wiki/decisions/2026-05-11-atlas-plan-scheduled-moves-overlay.md](decisions/2026-05-11-atlas-plan-scheduled-moves-overlay.md),
[wiki/decisions/2026-05-11-atlas-livestock-rotate-linked-pair.md](decisions/2026-05-11-atlas-livestock-rotate-linked-pair.md).
