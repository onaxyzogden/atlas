# 2026-05-14 — Act: scheduled livestock moves surface in event calendar


User-reported bug: scheduling a livestock move in Plan stage did not
appear in Act stage. Root cause:
`apps/web/src/features/act/useEventAggregator.ts` only iterated
`livestockMoveLogStore.events` (actual logged moves) and ignored
`scheduledLivestockMoveStore.plans` (forward-looking, unfulfilled).
Fix folds the scheduled store into the same aggregator under the
existing `'livestock'` `CalendarSource` (no enum change → existing
filter chip + dot styling + source-order map all keep working): hook
adds `useScheduledLivestockMoveStore((s) => s.plans)`, the `useMemo`
adds a loop after the logged-moves loop that skips fulfilled plans
(`p.fulfilledByEventId`) and emits `{ id:
'scheduled-livestock:${p.id}', source: 'livestock', dateKey,
iso: p.plannedDate, title: 'Planned: ${head} · ${species}', meta:
'planned · ${direction}' }`. The auto-fulfilment in
`scheduledLivestockMoveStore` (±7 day match against logged events)
handles the dedupe automatically — once a plan is fulfilled it
disappears from the calendar and only the logged entry remains.
Docblock updated to mention the new source. Verified end-to-end in
the running preview against the seeded `slvm-future` plan
(2026-06-20, sheep, 20 head, `move_in` → paddock `pad-test-C`): June
20 cell now reads `aria-label="June 20th, 2026 — 1 entries"` and the
agenda renders `Planned: 20 head · sheep · planned · move in`.
