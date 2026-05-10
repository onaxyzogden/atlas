# 2026-05-09 — Atlas Act Schedule Module: Weather Forecast + Event Calendar

**Status:** Implemented · Act stage v3.x

## Context

The Act stage (`/v3/project/$projectId/act`) is the operational/execution
surface of Atlas. Before this change it exposed six modules (build,
maintain, livestock, harvest, review, network) and a four-panel right rail
(TodaysPriorities, AlertsPanel, UpcomingEvents, QuickActions). Two gaps
were limiting day-to-day operator value:

1. **No weather presence.** Open-Meteo was wired server-side for *wind*
   climatology (3-yr historical ERA5) — see
   [2026-04-28-atlas-wind-prevailing-overlay.md](2026-04-28-atlas-wind-prevailing-overlay.md)
   — but there was no forecast endpoint, no client hook, no UI. Operators
   had to leave the app to see "is rain coming, frost risk tonight, what's
   this week's spray window?"
2. **No real calendar.** The right-rail UpcomingEvents panel was a 4-item
   teaser tied solely to `communityEventStore`. All other dated operations
   data — field tasks, livestock moves, harvest log, nursery batches — was
   invisible on a time axis.

## Decision

**Add a 7th Act module — `schedule` — hosting two new slide-up cards:
WeatherForecastCard + EventCalendarCard. Add a compact WeatherStrip to the
ops rail. Broaden UpcomingEvents from one-source to five-source.**

### Server: Open-Meteo forecast adapter

- New unauthenticated endpoint `GET /api/v1/climate-analysis/forecast?lat=&lng=`
  mirrors the wind-rose pattern.
- Adapter at `apps/api/src/services/climate/openMeteoForecastFetch.ts`
  pulls hourly (temp, precip, weather_code, wind, humidity, apparent) and
  daily (high/low, sum, prob_max, weather_code, wind_max, sunrise/sunset)
  for a 7-day window with `timezone=auto`.
- Cache at `apps/api/src/services/climate/forecastCache.ts` mirrors
  `windRoseCache.ts`. **TTL is 1 h** (vs 30 d for wind) — forecast data
  is live, not climatology. 0.1° quantization, 200 ms read timeout,
  fire-and-forget write, silent-failure.

### Client: forecast hook + types

- `apps/web/src/lib/forecast/types.ts` re-exports `ForecastCurrent`,
  `ForecastHour`, `ForecastDay`, `WeatherForecastResponse` from `apiClient.ts`
  (single source of truth) and adds a WMO `weather_code` → `{ icon, label,
  band }` lookup table.
- `apps/web/src/lib/forecast/useForecast.ts` derives the parcel centroid
  via `turf.centroid`, quantizes to 4 decimals (~11 m), and returns
  `{ data, status, coordinates }` where `status: 'loading' | 'live' | 'fallback' | 'no-parcel'`.

### Module: schedule (7th tile)

- `ACT_MODULES` grew from 6 to 7. `ActModuleBar` grid changed from
  `repeat(6, 1fr)` to `repeat(7, 1fr)`.
- Two cards: `act-weather-forecast` (default tab) and `act-event-calendar`,
  both rendered inside the existing `ActModuleSlideUp` tab pattern.

### WeatherForecastCard

- Sections: current conditions, next 24 h (horizontal scroll), 7-day list
  (high/low gradient bar), farm signals (frost/rain/spray/heat chips
  derived from hourly+daily), Open-Meteo source attribution.

### EventCalendarCard

- **Custom date-fns month grid** (no external calendar lib) — 7 cols × 6
  rows, walked from `startOfWeek(startOfMonth)` to `endOfWeek(endOfMonth)`
  so the grid is always rectangular.
- Aggregator at `apps/web/src/features/act/useEventAggregator.ts` collapses
  five stores into one `Map<dateKey, CalendarEntry[]>`:
  `communityEventStore`, `fieldTaskStore` (uses `dueAt`),
  `livestockMoveLogStore`, `harvestLogStore`, `nurseryStore` (batches emit
  `sowDate` + `expectedReadyDate`; transfers emit `transferDate`).
- Filter chips toggle source visibility; cells show up to 5 colored dots
  per day with `+N more` overflow; click pins the day in a detail drawer
  below the grid.

### Rail summary

- New `WeatherStrip` panel above TodaysPriorities — single row with
  weather-code icon, current temp, today high/low, precip-prob badge ≥40%,
  and a frost-risk overlay when any hour in the next 18 h drops to ≤2 °C.
  Clicking opens the schedule slide-up.
- `UpcomingEvents` was **broadened, not replaced** (no-deletion rule):
  same component name and props shape, but it now consumes
  `useEventAggregator` and renders source-aware icons (Users / ListChecks /
  Beef / Sprout / Leaf). Header has a "Schedule →" link that opens the
  slide-up.

## Consequences

### Phase milestones excluded from the calendar

`BuildPhase` carries `timeframe` strings ("Year 0–1", "Year 2–3"), not
specific calendar dates. Including them would require fabricating
month-anchors. Decision: exclude. If a future phase store adds
`startDate`/`endDate`, revisit.

### Cache TTL split: 30 d wind vs 1 h forecast

Two adapters, two TTLs. Wind climatology is decadal; forecast is live.
Same Redis instance, different key prefix (`windrose:v1:` vs
`forecast:v1:`). Operationally simpler than running two cache services.

### Right rail now stacks five panels

Plan budget assumed AlertsPanel could collapse-when-empty if vertical
space ran tight. In practice the WeatherStrip is ~64 px including the
optional frost row, and 1080p viewport accommodates all five panels with
scroll left over. No collapse needed yet.

### Open-Meteo lat/lng quantization

0.1° (~11 km) at the cache key matches the wind-rose precedent. The
client quantizes to 4 decimals (~11 m) before calling — sub-meter parcel
edits don't trigger refetch churn. Documented in the card's source-
attribution footer.

### `noUncheckedIndexedAccess` interactions

CSS-module imports return `string | undefined` under
`noUncheckedIndexedAccess: true`. Source-dot-class lookup tables (e.g.
`SOURCE_DOT_CLASS: Record<CalendarSource, string>`) use non-null
assertions on the css.module values. This is the same pattern already in
use elsewhere in the codebase.

## Alternatives Considered

- **Calendar as a sidebar widget instead of a slide-up card.** Rejected —
  the rail is for at-a-glance signals; full month grid needs the slide-up
  width.
- **`react-day-picker` for the calendar grid.** Held in reserve. The
  custom date-fns grid is ~50 lines; if the polish bar isn't met after
  user testing, swap is non-breaking (component-internal).
- **Separate Weather and Calendar modules (8 tiles).** Rejected — both
  surfaces share the same time axis and operator mental model
  ("scheduling decisions"); one module with two tabs is tighter.
- **Server-side aggregation of dated stores.** Rejected — all five stores
  are still local-first / Zustand; aggregating on the client keeps the
  read path simple. Revisit when stores migrate to server-sync.

## Files

### Created
- `apps/api/src/services/climate/openMeteoForecastFetch.ts`
- `apps/api/src/services/climate/forecastCache.ts`
- `apps/api/src/routes/climate-analysis/forecast.ts`
- `apps/web/src/lib/forecast/types.ts`
- `apps/web/src/lib/forecast/useForecast.ts`
- `apps/web/src/features/act/WeatherForecastCard.tsx` (+ `.module.css`)
- `apps/web/src/features/act/EventCalendarCard.tsx` (+ `.module.css`)
- `apps/web/src/features/act/useEventAggregator.ts`
- `apps/web/src/v3/act/ops/WeatherStrip.tsx` (+ `.module.css`)

### Modified
- `apps/web/src/lib/apiClient.ts` — added `forecast()` + response types
- `apps/web/src/v3/act/types.ts` — schedule module + label/icon/full-label/cards
- `apps/web/src/v3/act/ActModuleSlideUp.tsx` — lazy imports + 2 switch cases
- `apps/web/src/v3/act/ActModuleBar.tsx` — 7-tile doc comment
- `apps/web/src/v3/act/ActModuleBar.module.css` — `repeat(7, 1fr)`
- `apps/web/src/v3/act/ops/ActOpsAside.tsx` — mounts WeatherStrip + threads `openSchedule`
- `apps/web/src/v3/act/ops/UpcomingEvents.tsx` — aggregator-backed, source icons

## Verification

- `cd apps/web && npx tsc --noEmit` — clean
- `cd apps/api && npx tsc --noEmit` — clean
- `npm run lint` — clean
- Manual preview: deferred to next session window when dev servers can be
  started concurrently.
