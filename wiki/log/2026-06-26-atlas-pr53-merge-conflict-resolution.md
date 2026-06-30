# PR #53 made mergeable — main (#51 squash) merged in, 9 conflicts resolved to ours + MapThumbnail lazy-hydration test fix

**Date.** 2026-06-26
**Branch.** `claude/compassionate-burnell-d27343` — the head of PR #53
(onaxyzogden/atlas), the operator's "whole branch → main" integration PR.
**Pushed** (the operator opened PR #53; this is the one sanctioned push lane —
general push discipline still governs other branches).
**ADRs.** None new. Touches the role-layer + showcase-bundle clusters
([[decisions/2026-06-26-atlas-bundle-budget-guard]],
[[decisions/2026-05-21-atlas-showcase-bundle-split]]).
**Entity touched.** [[entities/showcase-portal]] (MapThumbnail test corrected).
**Commits.** `36dee1c1` (merge commit, resolves 9 conflicts) + `97c815e6`
(test fix).

## What landed

A CI-monitor event reported PR #53 had **merge conflicts**. Root cause:
`origin/main` carries `ce6c273b` — the **squash-merge of #51** (Operational
Role Layer + Threshold-3 Act Mandate + offline demo + deep-audit remediation,
2026-06-24 19:34). This branch carries that same work as its **original
unsquashed commits PLUS** later 2026-06-26 work on the overlapping files, so a
three-way merge (`git merge --no-ff --no-commit origin/main`) surfaced **9
conflicts**.

**All 9 resolved to OURS — chronology-verified, not a blind `-X ours`.** The
decisive evidence: `origin/main` has **zero independent development beyond the
squash** (`HEAD..origin/main` = 1, that commit being `ce6c273b` itself), so it
is a strict-subset snapshot of this branch's lineage at 2026-06-24 19:34. Every
conflicted file's latest commit here is dated **2026-06-26**, strictly newer:

- `v3/roles/alwaysSurface.ts` + `v3/act/tier-shell/ActTierObjectiveCard.tsx` +
  `v3/plan/strata/ObjectiveCard.tsx` ← `a13b9494` **fix(amanah)**: adds the
  `carries-scope-note` always-surface signal (the 4th, leading promotion
  reason) so an objective's verbatim `scopeNotes` — the catalogue's fiqh /
  scope caution, e.g. *bayʿ mā laysa ʿindak* advance-sale limits — is **never
  buried** in the collapsed out-of-focus section. #51 (2026-06-24) predates
  this commit; its absence of `carries-scope-note` is age, **not** a deliberate
  removal of a covenant safety valve. Keeping ours preserves the amanah
  feature.
- `v3/act/tier-shell/ActTierObjectiveRail.tsx` + `ActTierStratumSwitcher.tsx`
  ← `998eecec` (audit Phase D role-layer + ceremony UX polish: derived
  auto-expand rail, origin-stratum highlight).
- `apps/api/src/db/migrations/055_operational_roles.sql` ← `f248b163`
  (migration-012 dependency note).
- `packages/shared/src/constants/collaboration/operationalRoles.ts` ←
  `6fc1f272` (comment hygiene on the back-compat aliases).
- the two `__tests__` files resolved to stay consistent with their sources.

**Key safety invariant:** because ours is a strict superset on every conflict,
the resolved tree is **byte-identical to this branch's pre-merge HEAD**
(`git diff --cached HEAD` = 0 files). The merge commit `36dee1c1` is therefore
**purely topological** — it records `origin/main` as a second parent so PR #53
becomes mergeable, with no content change and the covenant `carries-scope-note`
feature intact.

**Then CI caught one genuine test failure — fixed (`97c815e6`).** Not from the
merge (tree unchanged from verified HEAD), but a **latent regression from this
branch's own bundle-split commit `04cd3489`**:
`apps/web/src/showcase/__tests__/MapThumbnail.test.tsx` asserted **synchronously**
(`getByTestId('showcase-map-live')`) immediately after the click, but `04cd3489`
had converted `<ShowcaseMap>` to `React.lazy(() => import(...))` (its own
`showcase-map` chunk, to keep maplibre out of first paint), so on click the map
now resolves on a **microtask behind a `Suspense` "Loading map…" fallback**. The
sync query caught the fallback, not the map — the **sole** failure in the CI
run (1 failed / 6558 passed). Fix: `await screen.findByTestId(...)` (async,
retries) + `async` test fn. **The component is unchanged — the bundle split was
not weakened to satisfy the test.**

## Verification

- **Conflict math.** `git diff --cached HEAD` after resolution = **0 files**
  (merged tree == pre-merge HEAD); no remaining unmerged paths.
- **Chronology.** `git show -s` dates: #51 squash 2026-06-24 19:34; every
  conflicted file's HEAD-side commit 2026-06-26 (`a13b9494` / `998eecec` /
  `f248b163` / `6fc1f272`). `origin/main` confirmed unmoved at `ce6c273b`
  before commit; remote PR branch confirmed non-divergent before each push.
- **MapThumbnail fix.** `corepack pnpm exec vitest run
  src/showcase/__tests__/MapThumbnail.test.tsx` → **1 passed** locally.
- **Full CI on the fix commit `97c815e6`.** `gh pr view 53`:
  `mergeable: MERGEABLE`, `mergeStateStatus: **CLEAN**`; rollup **build /
  integration / lint / test / typecheck all SUCCESS** (the previously-failing
  `test` jobs now green). PR #53 ready to merge.

## Remaining followups

1. **Lighthouse re-measure** of the showcase (carried from
   [[decisions/2026-05-21-atlas-showcase-bundle-split]] Followup #2) — still
   needs a bootable preview server. Unchanged by this session.
2. **The merge into main itself** is the operator's to perform (they control
   merges); PR #53 is now CLEAN and green for that.

## Lesson

A `React.lazy` + `Suspense` conversion **silently changes a synchronous render
into an async one**, breaking any `getBy*` testing-library assertion that ran
green when the import was static — even when the lazy module is `vi.mock`'d,
because `lazy()` still defers to a microtask. The bundle-budget session's
"rendered showcase DOM is byte-identical (build-graph change only)" claim was
**wrong for the click path** and the affected unit tests were not run. Rule:
when a change moves a component behind `Suspense`, convert its tests to
`findBy*` / `await waitFor` **and actually run that test file** — never infer
"suite green" from tsc + build alone. Correction filed against
[[log/2026-06-26-atlas-showcase-bundle-budget-guard]].

## Covenant & branch discipline

- **Amanah CLEAR.** The covenant-sensitive call (whether to keep the
  `carries-scope-note` surface signal that #51 lacks) was resolved by
  **establishing chronology** rather than assuming — confirming #51 merely
  predates the `fix(amanah)` commit, so keeping ours **preserves** the fiqh /
  scope-caution surfacing, never strips it. No capital / sale / advance-purchase
  surface touched; no CSRA / salam ([[fiqh-csra-erased-2026-05-04]],
  [[feedback-csa-in-catalogues]]). The showcase covenant-copy ratchet and the
  verbatim Apricot Lane attribution are untouched (the test fix is assertion
  timing only).
- Merge resolved with `git checkout --ours` per file + explicit-path `git add`;
  no `git add -A`; no `--no-verify`. Pushes were the sanctioned PR-#53 lane
  (fast-forward, non-divergence checked each time).

## Commit shape

- `36dee1c1` — merge commit (`origin/main` ce6c273b as 2nd parent; 9 conflicts
  → ours; tree == pre-merge HEAD a8d7d0e1).
- `97c815e6` — `test(showcase): await lazy ShowcaseMap hydration in
  MapThumbnail test` (1 file, +5/−2).

Follows [[log/2026-06-26-atlas-showcase-bundle-budget-guard]] (whose
`04cd3489` introduced the lazy edge this corrects); touches
[[entities/showcase-portal]].
