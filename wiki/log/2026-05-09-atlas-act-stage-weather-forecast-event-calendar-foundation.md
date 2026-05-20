# 2026-05-09 — Atlas Act stage: weather forecast + event calendar foundation


### Brief

The Act stage page lacked any weather presence and the right-rail
"Upcoming Events" was a single-source teaser tied only to
`communityEventStore`. Build a presentable weather forecast + a
multi-source event calendar suitable for a future `schedule` module
and a compact rail summary above `TodaysPriorities`.

### Completed (shipped to disk)

**Server — Open-Meteo forecast adapter**
- `apps/api/src/services/climate/openMeteoForecastFetch.ts` — mirrors
  `openMeteoWindFetch.ts`. Fetches `/v1/forecast` with hourly
  (`temperature_2m`, `precipitation`, `precipitation_probability`,
  `weather_code`, `wind_speed_10m`, `wind_direction_10m`) and daily
  (`temperature_2m_max/min`, `precipitation_sum`,
  `precipitation_probability_max`, `weather_code`,
  `wind_speed_10m_max`, `sunrise`, `sunset`). 7-day window,
  `timezone=auto`. No API key.
- `apps/api/src/services/climate/forecastCache.ts` — Redis pattern from
  `windRoseCache.ts`. Key `forecast:v1:${qLat}:${qLng}` quantized to
  0.1°. **1h TTL** (forecast is live data, vs 30-day TTL for wind
  climatology). 200ms read timeout, fire-and-forget write.
- Route registered in `apps/api/src/routes/climate-analysis/index.ts`
  as `GET /api/v1/climate-analysis/forecast?lat=X&lng=Y`. 502 /
  `FORECAST_UNAVAILABLE` envelope on adapter failure.

**Web client — types + hook + api wrapper**
- `apps/web/src/lib/forecast/types.ts` — `ForecastHour`,
  `ForecastDay`, `ForecastResult`, WMO `weatherCodeMeta()` lookup
  (~30 codes → lucide icon + short label).
- `apps/web/src/lib/forecast/useForecast.ts` — derives parcel
  centroid via `turf.centroid()` from
  `project.parcelBoundaryGeojson`, memoizes lat/lng to 4 decimals,
  AbortController on unmount, returns `{ data, status }`.
- `apps/web/src/lib/apiClient.ts` — adds `api.climateAnalysis.forecast(lat, lng, signal)`.

**Implementation cards (lazy-loadable)**
- `apps/web/src/features/act/WeatherForecastCard.tsx` (+ CSS) — current
  conditions hero, 24-hour scroll strip, 7-day list with high/low
  gradient + precip + peak wind, farm-signal chips (frost risk,
  rainfall window, spray window), Open-Meteo source footer.
- `apps/web/src/features/act/EventCalendarCard.tsx` (+ CSS) — custom
  date-fns 7×6 month grid, prev/next + Today, source filter chips,
  per-day color-coded dots (Tasks · Livestock · Harvest · Nursery ·
  Community), click-day detail drawer, empty state.
- `apps/web/src/features/act/useEventAggregator.ts` — pulls dated
  entries from `communityEventStore`, `fieldTaskStore`,
  `livestockMoveLogStore`, `harvestLogStore`, `nurseryStore`.
  Returns `{ all, byDate }`. Phase milestones excluded (their
  `timeframe` strings aren't anchored to calendar dates).

**Rail panel (compact summary)**
- `apps/web/src/v3/act/ops/WeatherStrip.tsx` (+ CSS) — single-row
  panel: weather-code icon · current temp · today high/low · precip
  badge if ≥40%. Frost overlay row when next-18h min ≤2°C. Click
  triggers `onOpen` (intended to switch to `schedule` module + open
  slide-up).

### Wiring (Phase 3 + Phase 6)

- `apps/web/src/v3/act/types.ts` — added `'schedule'` as the 7th
  `ActModule`, with label "Schedule", full label "Operations Schedule",
  `CalendarClock` icon, and `MODULE_CARDS.schedule = [{ Weather forecast,
  act-weather-forecast }, { Event calendar, act-event-calendar }]`.
- `apps/web/src/v3/act/ActModuleBar.{tsx,module.css}` — grid widened
  to `repeat(7, 1fr)`; doc updated to "7-tile bottom navigator".
- `apps/web/src/v3/act/ActModuleSlideUp.tsx` — lazy imports for
  `WeatherForecastCard` + `EventCalendarCard`; switch-case extended
  with `act-weather-forecast` / `act-event-calendar`.
- `apps/web/src/v3/act/ops/ActOpsAside.tsx` — `<WeatherStrip>` mounted
  above `TodaysPriorities`; new `openSchedule` callback selects the
  schedule module and opens the slide-up; `onOpenSchedule` prop wired
  through to `UpcomingEvents`.
- `apps/web/src/v3/act/ops/UpcomingEvents.tsx` — refactored from
  single-source `useCommunityEventStore` to `useEventAggregator`;
  per-row source icons (Users / ListChecks / Beef / Sprout / Leaf);
  "Schedule →" header link triggers `onOpenSchedule`.
- `apps/web/src/v3/plan/PlanModuleBar.module.css` — Plan rail widened
  to `repeat(11, 1fr)` so all 11 plan modules sit in one row (was
  wrapping `PRINCIPLES` to a second line). Out of original scope but
  shipped opportunistically with this session's verification.

### Verification

- `cd apps/web && npx tsc --noEmit` → exit 0
- `cd apps/api && npx tsc --noEmit` → exit 0
- `npm run lint` → exit 0
- **Forecast endpoint live**: `curl
  'http://127.0.0.1:3001/api/v1/climate-analysis/forecast?lat=44.50&lng=-78.20'`
  → 200 with `data.hourly.length === 168` (7 d × 24 h),
  `data.daily.length === 7`. `meta.cached === false` on second call
  because Redis isn't running locally — silent no-op matches the
  `windRoseCache.ts` precedent. The cache write/read path is in code;
  full hit-on-second-call demo deferred until Redis is up.
- **Preview (`/v3/project/mtc/act`)** — DOM probes confirmed:
  - Right rail renders 5 panels in stable order: Weather · Today's
    Priorities · Alerts · Upcoming Events · QuickActions.
  - Bottom bar renders 7 act tiles (Build, Maintain, Livestock,
    Harvest, Review, Network, **Schedule**).
  - Clicking Schedule opens the slide-up titled "Operations Schedule"
    with two tabs: "Weather forecast" and "Event calendar".
  - Weather tab renders the no-parcel empty state ("Set a parcel
    boundary to enable the local forecast.") because the MTC sample
    project has no `boundary` yet — confirms graceful degradation.
  - Calendar tab renders the May-2026 month grid, all five source
    filter chips (Community · Tasks · Livestock · Harvest · Nursery),
    day-detail drawer, and correct empty-state copy.
- **Multi-source aggregator gate**: seeded one community event +
  one field task into `localStorage` (projectId `mtc`) → reload →
  UpcomingEvents rendered both rows with distinct source icons,
  "Community / Task" labels, and `MMM d` formatted dates. Seeded
  data cleared after.
- **Plan rail single-row**: 11 plan-module tiles share one row top
  (`distinctRowTops.length === 1`).
- preview_screenshot timed out repeatedly (Mapbox renderer holds the
  main thread); structural verification is via DOM probes, not pixels.

### Deferred

- Cache hit-on-second-call demo — needs Redis running locally.
- Live forecast UI on a real parcel — only the no-parcel empty state
  was exercised this session (MTC has no boundary yet).
- Calendar week/agenda views — month grid only; week + agenda were
  always out of scope per plan.

### ADR

`wiki/decisions/2026-05-09-atlas-act-schedule-weather-and-calendar.md`
documents the Open-Meteo forecast addition, the schedule module, and
the 5-store calendar aggregation contract.

### Commit

Committed on `feat/atlas-permaculture`. (See `git log` for hash.)

### Recommended next session

- Run the cache hit-on-second-call demo with Redis up.
- Once a project has a parcel boundary, screenshot the live weather
  card (current conditions + 24 h strip + 7-day list + farm-signal
  chips: frost / rainfall window / spray window).
- Optional: add week/agenda toggles to `EventCalendarCard`.
