# 2026-06-03 -- Cross-protocol co-occurrence detection: T5-T6 (Observe surface + live gate) shipped

**Branch.** `feat/atlas-permaculture` (commits `b6336e2`, `5987bb1`; docs commit
follows; **not pushed**). Continues
[[log/2026-06-03-atlas-cooccurrence-detection-T1-T4]].

**What shipped.** The feature is now surfaced on BOTH read surfaces and verified
live end-to-end.

- **T5 (`b6336e2`, ASCII-comment fixup `5987bb1`)**
  `apps/web/src/v3/observe/dashboard/CoOccurrenceSynthesisCard.tsx` + `.module.css`
  + test. A READ-ONLY Observe synthesis card: self-fetches via
  `useCoOccurrenceClusters(projectId)` (currentBucket omitted for the same
  cross-domain reason as the Plan shell -- documented in a code comment so a later
  reader does not re-add it), returns null when empty, lists each cluster's theme
  + summary + implicated objective ids as plain text, flags existential rows
  (`data-existential="true"`), and carries a single passive "Resolve in Plan"
  pointer -- NO Acknowledge/Resolve/Dismiss controls (Observe synthesizes, does
  not act). Mounted in `UnifiedLandStateSurface` header after
  `PlanRevisionBanner`. testid `cooccurrence-synthesis-card`. Card test 4/4 green.
  Coordinator applied a small ASCII fix (em-dashes -> `--` in comments, matching
  the sibling banner convention) as `5987bb1`.

- **T6 (verification + live preview gate).** Shared + web `tsc --noEmit` clean
  (web 8 GB heap, EXIT 0). Bounded `--pool=forks` sweep: 8 files / 56 tests green
  (four new co-occurrence specs + prior review-flag / Objective suites) -- no
  regression. Live gate via `preview_eval` DOM on port 5200 (`preview_screenshot`
  unavailable on this Windows setup -- DISCLOSED): backed up
  `localStorage['ogden-review-flags']`, then for MTC (`projectId: 'mtc'`) a
  positive fixture (2 open flags, distinct templates
  [`paddock-rotation-cover-trigger` + `emergency-destocking`], same
  `cycleNumber: 1`, one existential) rendered the Plan `cooccurrence-banner`
  ("1 structural verdict"; expand -> "Structural design" theme, ihsan summary
  prefix, existential row, 2 deep-links) AND the Observe
  `cooccurrence-synthesis-card` (0 buttons/links = read-only confirmed live,
  existential flag, "Resolve in Plan"); a negative control (same template x2)
  rendered NEITHER surface. Original store state and the Observe shell-toggle mode
  were restored afterward.

**T4 caveat now CLOSED.** At the T4 commit the full-shell mount test hung and was
omitted; the integration rested on tsc + the T3 unit test. The T6 live gate drove
the real `PlanStratumShell` in-browser and confirmed the banner mounts, expands,
deep-links, and renders the existential row -- empirically closing the gap the
unit test could not cover.

**Settled design unchanged** from
[[decisions/2026-06-03-atlas-cooccurrence-detection]]: detect on co-deviation;
derived read-model over open flags; both surfaces one hook; conservative grouping
(exclude `cycleNumber === undefined`, require >= 2 distinct `sourceTemplateId`);
existential clusters sort first with the ihsan/rifq summary prefix.

Explicit-path commits, foreign WIP untouched ([[feedback-no-deletion]]); fetched +
0-behind before each commit ([[feedback-commit-immediately-on-rebased-branches]]);
not pushed ([[project-branch-rebase]]); CSRA untouched
([[fiqh-csra-erased-2026-05-04]]); ASCII-only. Design doc
`stages/design-protocol-cooccurrence-detection-review.md` (status: approved).
Entities [[entities/protocols-dashboard]], [[entities/observe-dashboard]].
