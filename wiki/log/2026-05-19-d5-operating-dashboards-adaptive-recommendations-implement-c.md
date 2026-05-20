# 2026-05-19 — D5: operating dashboards & adaptive recommendations (implement + close)


**Branch.** `feat/atlas-permaculture`. Implemented Sub-project D5
(operating dashboards) end-to-end via the approved plan
[[plans/2026-05-19-d5-operating-dashboards]], Tasks 1–4. **Final
ratified D slice — the D-series (D0–D5) is complete.**

**Files created/modified.** Pure engine
`packages/shared/src/lib/operatingHealth.ts` (new,
`computeOperatingHealth` composing the four D1–D4 engine results into
four lights + ranked recommendations + counts) + barrel export +
`src/tests/operatingHealth.test.ts` (12); render-only card
`apps/web/src/features/act/OperatingDashboardCard.tsx` (new, mirrors
`BudgetCard`'s `{ actual, actualHrs }` actuals map and
`FieldProofPanel`'s five-store proof/domain-event derivation) +
`__tests__/OperatingDashboardCard.test.tsx` (4); append-only
registration at the six mount points (`v3/act/types.ts`,
`v3/act/ActModuleSlideUp.tsx`, `features/dashboard/DashboardRouter.tsx`,
`features/act/ActHub.tsx`, `features/navigation/taxonomy.ts`,
`components/stage-navigator/stageModules.ts`) — every edit a pure
append beside the `act-budget` anchor, no reorder/mutation.

**Verification outcome.** `@ogden/shared` tsc exit 0 clean +
**265/265 (19 files)** vitest (incl. `operatingHealth` 12); web tsc
exit 0 clean + **1233/1233 (117 files)** vitest (incl.
`OperatingDashboardCard` 4); `vite build` exit 0 (`✓ built in 41.85s`,
PWA 721 precache, 8 GiB heap — env not code). The `layerFetcher`
socket-error lines are the expected offline-fallback path, not
failures. Covenant release-gate grep over `operatingHealth.ts` +
`OperatingDashboardCard.tsx`: every lexicon hit is a negative covenant
declaration in a doc-comment — no real financing/capital framing.
PASS. ADR: [[decisions/2026-05-19-atlas-d5-operating-dashboards]].

**Design forks (binding).** (1) Deterministic rule-based composition —
no scoring/ML; (2) strictly render-only — no store / `syncManifest` /
schema / DB migration / spine-status mutation; (3) a new dedicated
`act-operating-dashboard` card, append-only across six mounts (vs D4's
child-panel approach). Budget signal is D3 drift surfaced verbatim,
never re-framed. Composition-over-re-derivation: the engine calls the
four results, never re-derives them.

**Deferred.** Dismiss/snooze of recommendations (needs persistence —
excluded by fork 2); cross-card navigation from a recommendation (YAGNI
— render-only by spec, deep-link is a labelled non-navigating hint);
live preview screenshot **disclosed-blocked** by the known MapLibre/
WebGL hang (card deep behind the Act slide-up) — six-mount static
wiring + web tsc exit 0 + 4 happy-dom card tests are the authoritative
proof, no screenshot claimed.

**Commit posture.** Explicit-path per-task commits, never `git add
-A`/`.`, nothing pushed: `bcdd6c70` engine+tests, `7ca0b424`
out-of-band behaviour-equivalent simplify, `22d80b8a` card, `1fc68e34`
six-mount registration, (this) `docs(d5)` ADR+log. `wiki/index.md`
deliberately not modified (D0-owned dirty — left for its owner, per the
D2/D3/D4 precedent).
