# 2026-05-18 — D2 hardening: pin boundary contracts in resourcingConflicts


**Branch.** `feat/atlas-permaculture`. Pushed `44138d92..f56e4c92`
(`f56e4c92`), divergence `0 0`.

Found an uncommitted test-only addition in
`packages/shared/src/tests/resourcingConflicts.test.ts` from in-flight D2
work. Three hardening tests pinning invariants the conflict engine relies on
but that no prior test asserted unconditionally: (1) `equipmentConflicts`
touching spans (`a.end === b.start`) are back-to-back, not double-booked —
guards a `<=` regression on every consecutive booking of shared equipment;
(2) `isoWeekKey` ISO-8601 year-boundary rollover (`2026-12-31 → 2026-W53`,
`2027-01-01 → 2026-W53`) — guards an off-by-one that silently mis-buckets
labour hours across the year boundary; (3) `assigneeWeeklyLoad` a week
exactly `=== weeklyHoursCap` is at-capacity, not over (strict `>`) — guards
a `>=` boundary regression. No engine change; tests only. Suite
`resourcingConflicts.test.ts` **13/13 green** (10 original + 3 new). Hours
only — no cost (covenant boundary intact; D3 untouched). Committed `f56e4c92`
and pushed; the D2 ADR ([[2026-05-18-atlas-d2-resourcing]]) covenant/scope
boundary is unchanged.
