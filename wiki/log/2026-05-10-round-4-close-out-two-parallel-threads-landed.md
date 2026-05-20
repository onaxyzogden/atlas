# 2026-05-10 — Round 4 close-out: two parallel threads landed


Two independent threads appeared in the dirty tree at session close;
both clean and self-contained, so committed thematically before push:

- `4cfff01` — `feat(observe): ship Sectors & Zones PDF export`. Mirrors
  the Macroclimate pattern: `SectorsZonesPayload` in shared schema,
  `renderSectorsZonesReport` registered, dashboard "Export PDF" wired.
- `6e6d003` — `refactor(observe): EarthWaterEcology dashboard — drop
  unused tabs row + EcologyCard props`. Pure dead-code cleanup (the
  6-tab row was never wired to state; `boundary` / `caption` props
  unused by `EcologyCard`).

`tsc --noEmit` clean both before and after. Pushed.
