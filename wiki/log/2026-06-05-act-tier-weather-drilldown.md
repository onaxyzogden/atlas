# 2026-06-05 — Act tier-shell weather buttons wired to a right-rail forecast drill-down

**Closed.** Operator selected the two `WeatherStrip` buttons in the Act
tier-shell right-rail Dashboard (the weather strip, aria-label "Open weather
forecast", and the "7-day ->" link, aria-label "Open full weather forecast")
and said "these two buttons need fixing" — clarified to: clicking either should
**load the full 7-day forecast in the same right sidebar** (not a modal or
slide-up), with a way back to the dashboard cards.

Both buttons were dead: `ActOpsDashboard` mounted the strip with
`onOpen={noop}`. The legacy `ActOpsAside`/map-first path opens the forecast via
`ActModuleSlideUp`, but the tier-shell mounts no slide-up.

Modeled "weather detail" as a drill-down **sub-view of Dashboard mode**
(`rightMode` stays `'dashboard'`; the Dashboard tab stays visually active). A
`weatherOpen` boolean gates the dashboard branch between cards and forecast.

Changes (one explicit-path commit `a6c3b042`, `feat/atlas-permaculture`, **not
pushed**):

- **ADD `apps/web/src/v3/act/tier-shell/ActTierWeatherPanel.tsx` + `.module.css`**
  — back-header (`ChevronLeft` + "Dashboard", aria-label "Back to dashboard")
  over the shared `WeatherForecastCard` (Open-Meteo 7-day, reused verbatim;
  `onSwitchToMap` no-op — no map-switch affordance in the rail). Props
  `{ project: LocalProject; onBack: () => void }`.
- **EDIT `apps/web/src/v3/act/field-action/ActOpsDashboard.tsx`** — added
  optional `onOpenWeather?: () => void`, passed to `WeatherStrip` as
  `onOpen={onOpenWeather ?? noop}`. The `noop` fallback is retained so the
  map-first mount (`ActMapFirstLayout`, no right-rail target) stays inert
  (pre-existing, out of scope).
- **EDIT `apps/web/src/v3/act/tier-shell/ActTierShell.tsx`** — `weatherOpen`
  state; dashboard fallback branch renders `ActTierWeatherPanel` when open else
  `ActOpsDashboard` with `onOpenWeather`; the Dashboard tab onClick clears it;
  `useEffect(() => { if (rightMode === 'detail') setWeatherOpen(false); },
  [rightMode])` resets it whenever objective/protocol detail takes the rail.

No change to `WeatherStrip.tsx` — its `onOpen` contract was already correct;
only its tier-shell mount was a no-op.

**Verification:** `tsc --noEmit` — my files (ActTierWeatherPanel,
ActOpsDashboard, ActTierShell) produced **0** errors; the only tsc errors are in
untracked foreign-WIP files, left untouched. Bounded vitest
(`--pool=forks --testTimeout=20000`) `actToolCoverage` **17/17** green. Preview
DOM proof on `/v3/project/mtc/act/tier-shell/stratum/s3-systems-reading`:

- strip click -> right body shows the forecast (`_dashboard_` cards gone, back
  button present, "7-day" / "Next 24" / "Open-Meteo" / farm-signal text shown);
- back button -> dashboard cards return;
- "7-day ->" link -> forecast opens too (both buttons share `onOpen`);
- select an `_objCard_` objective (enter detail) then click the Dashboard
  `_rightToggleBtn_` -> right body shows the dashboard cards, NOT the forecast
  (`dashShown: true`, `forecastShown: false`) — confirms the reset-on-detail
  effect.

`preview_screenshot` hangs on the WebGL map, [[project-screenshot-hang]].
Foreign WIP and prior uncommitted wiki edits left untouched.

Entity: [[entities/act-tier-shell]] (new "Weather drill-down" section).

---

## Follow-up (same day): rail-layout forecast — drop hero, signals first

Operator selected the forecast hero header in the right-rail drill-down and
said "remove header and move farm signals section to very top."

Two-file change (commit `043dd979`, `feat/atlas-permaculture`, **not pushed**):

- **EDIT `apps/web/src/features/act/WeatherForecastCard.tsx`** — added optional
  `railLayout?: boolean` (default `false`). When true: skip the `shared.hero`
  header, and render the **Farm signals** section first (above Current
  conditions). The section JSX was extracted to a `signalsSection` const and
  placed `{railLayout && signalsSection}` at the top of the `status === 'live'`
  fragment / `{!railLayout && signalsSection}` in its original position.
- **EDIT `apps/web/src/v3/act/tier-shell/ActTierWeatherPanel.tsx`** — pass
  `railLayout` to `WeatherForecastCard`.

The default `false` preserves the legacy `ActModuleSlideUp` mount (hero +
original section order) — no change to that surface.

**Verification:** tsc 0 for my files. Preview DOM proof on the same route — the
`_hero_` element is gone (`heroPresent: false`); the live block's first section
is Current conditions because the current MTC forecast window derives **zero**
farm signals (`signalRowPresent: false`), so the signals-first reorder is
verified by code structure rather than rendered output (no qualifying
frost/rain/spray/heat signal active). The earlier drill-down proof's "farm
signals present" string was actually the hero **lede** ("...frost signals to
time field work"), which this change removes.
