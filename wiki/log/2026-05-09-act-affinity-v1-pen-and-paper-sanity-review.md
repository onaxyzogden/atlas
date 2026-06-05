# 2026-05-09 — Act affinity v1: pen-and-paper sanity review


Sanity-checked the v1 project-type module-affinity table shipped earlier
today (see `2026-05-09-atlas-act-operations-hub-project-type-aware-ranking.md`)
against pen-and-paper steward-day walkthroughs for all six archetypes.
Method per archetype: persona → 8–12-action peak-season day narrative
tagged to Act modules → touch counts → derived ordering →
v1 vs derived comparison (1-pos = noise, 2-pos = candidate revision,
3+ = implausibly wrong) → confidence + recommendation. Findings:
4/6 archetypes confirm v1 (regenerative_farm, retreat_center,
educational_farm, conservation — conservation is the highest-confidence
match); 2/6 surface candidate tweaks (homestead — promote `livestock`
above `harvest`; multi_enterprise — promote `network` 3 positions, the
biggest signal in the review). The review recommends shipping nothing
today and deferring tweaks until real-steward telemetry exists, since
pen-and-paper personas can't distinguish "wrong v1" from "wrong
persona." Also flagged the Schedule-module gap: the `'schedule'`
`ActModule` exists in `types.ts` but is absent from the affinity
table, so any `module: 'schedule'` row currently sinks to the bottom
for every type via `Number.POSITIVE_INFINITY`. Recommended adding a
doc-comment in `projectTypeModuleAffinity.ts` explaining the
omission rather than ranking it. ADR:
`wiki/decisions/2026-05-09-atlas-act-affinity-v1-sanity-review.md`.
Cross-link appended to the v1 ADR. **No code changes** this session —
review only.

### Atlas Act/Schedule — EventCalendarCard week + agenda views

Follow-up to the 2026-05-09 schedule decision (ADR
`2026-05-09-atlas-act-schedule-weather-and-calendar.md`). The Schedule
module shipped month-only; this iteration adds Week and Agenda toggles
on `EventCalendarCard.tsx` so an operator can pick the time window
that matches the question they're asking.

Added `type CalendarViewMode = 'month' | 'week' | 'agenda'` (local to
the component), a `viewMode` `useState`, and a 3-button toggle row
that reuses the existing `.filterChip` styling alongside the source
filter chips. Header label, prev/next handlers, and the rendered
panel branch on `viewMode`:

- **Month** — unchanged 7×6 `date-fns` grid with the existing
  DayDetail drawer.
- **Week** — single column of 7 day cards from
  `startOfWeek(anchor)` → `endOfWeek(anchor)` (Sunday start, matching
  the month grid). ←/→ controls step `addWeeks(±1)`. Each card shows
  `EEE · MMM d`, the same colored source dots / overflow count, and
  `—` when empty. Clicking a card sets `selectedDay` and renders the
  same DayDetail drawer below.
- **Agenda** — derives `agendaDays` (next 14 days from
  `startOfDay(today)`) and renders one `DayDetail` block per
  non-empty day, or "No upcoming entries in the next 14 days. Toggle
  filters or extend the window." when none exist. Prev/next disabled
  in this mode (window is fixed to "next 14 days"). The header label
  reads "Next 14 days" instead of a month/week range.

Source filter chips (`activeSources: Set<CalendarSource>`) and
`filteredByDate` are unchanged — both new modes consume the same
filtered map. `selectedDay` survives mode switches.

CSS additions in `EventCalendarCard.module.css`: `.viewToggle`
(toggle row), `.weekStrip` + `.weekCell` + `.weekCellLabel` /
`.weekCellRight` / `.weekCellEmpty` (Week column), `.agendaList`
+ `.agendaDay` (Agenda stack). Reuses `.cellToday`, `.cellSelected`,
`.cellDots`, `.cellOverflow`, `.dayDetail`, and the dot palette.

**Verification.** `apps/web npx tsc --noEmit` clean (exit 0). DOM
probes against /v3/project/mtc/act/schedule with the slide-up open
on the Event-calendar tab confirmed:
- Toggle row renders with 3 buttons; exactly one carries
  `aria-pressed="true"` at any time.
- **Month** → 42 cells in `[class*="_grid_"]`.
- **Week** → 7 buttons in `[class*="_weekStrip_"]`; header reads
  `May 3 – May 9, 2026`.
- **Agenda** → `[class*="_agendaList_"]` present; "No upcoming
  entries" empty-state visible (mtc has no dated stores seeded);
  header reads "Next 14 days".
- Switching `Week → Agenda → Month` round-trips back to a 42-cell
  grid; `aria-pressed` flag tracks the active mode at every step.

**Deferred.** Phases A (Redis cache `meta.cached: true` demo) and B
(live forecast UI screenshot on a parcel-bearing project) remain
runtime/environment work — Redis container not running locally,
Mapbox renderer is the screenshot blocker. Both are documented in
the follow-up plan
(`.claude/plans/the-act-stage-page-declarative-ullman.md`) and can
land in a session that brings up Docker. No new ADR — this is a
continuation of the existing schedule decision.
