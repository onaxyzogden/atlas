# 2026-05-12 — Plan3DSelectionHandler typecheck fix + Observe-reskin ADR scope correction


**Motive.** Two trailing items after the Plan+Act callsite migration
landed: (a) the two pre-existing `TS18048` errors in
`Plan3DSelectionHandler.tsx` (from commit `78b21bc4`) were still the
only remaining typecheck failures, and (b) the
[2026-05-11-atlas-observe-human-context-reskin](decisions/2026-05-11-atlas-observe-human-context-reskin.md)
ADR still claimed only Human Context had been reskinned and the
other six Observe modules were deferred, which contradicts the actual
21-file change set already in `main` history.

**Change.**

- **Plan3DSelectionHandler typecheck.** Added a one-line
  `if (!f) return;` guard after `const f = features[0];` so TS can
  narrow `f` for the subsequent `.properties` reads. Resolves both
  TS18048 errors (lines 93 and 97). Commit `1cee21ed`. `npm run
  typecheck` in `apps/web` now exits clean.
- **ADR scope correction.** Renamed the ADR title from "Observe
  Human Context reskin" to "Observe full reskin"; expanded the
  Scope, Status, Migrated components, and Files sections to list
  all 21 module files across human-context, earth-water-ecology,
  topography, macroclimate-hazards, sectors-zones, swot-synthesis,
  and built-environment; fixed the "local extras" section to point
  at `_shared/stageCard/observeExtras.module.css` (promoted from
  Human-Context-local once the other six modules adopted the same
  patterns); marked the Plan+Act follow-up as closed against
  commits `daf1b549` + `2ef6791a`. The file is not renamed —
  inbound wiki links and the index entry keep their existing slug;
  a scope-correction note at the top of the doc explains the
  narrower original framing. Commit `5da4b27b`.

**Outcome.** `apps/web` typecheck is now green for the first time
since `78b21bc4`. The Observe-reskin ADR matches what shipped, so
the next pass at `observe-port.css` cleanup or the
`ProgressRing` gold rollout can plan from accurate scope.
