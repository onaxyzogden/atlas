# 2026-04-24 — IA + panel matrix refresh (P2 follow-up)


**Context.** The 2026-04-23/24 UX Scholar entry recommended "IA codification (§1) + panel decision matrix (§3)" as the next session. That work actually landed earlier in commit `c276c51` as [`design-system/ogden-atlas/ia-and-panel-conventions.md`](../design-system/ogden-atlas/ia-and-panel-conventions.md) — the recommendation line was stale. This session is a **freshness pass** against that doc, auditing everything that landed between c276c51 and today.

**Classified post-c276c51 additions** — each component was checked against the matrix as *(a)* fits an existing row, *(b)* needs a new row, or *(c)* violates the matrix:

| Component | Verdict |
|---|---|
| `StickyMiniScore` | (b) — new matrix row: "Sticky sub-header inside rail" |
| `BiodiversityCorridorOverlay` non-compact toggle (lines 265–287) | (c) — hand-rolled `backdropFilter` button; logged as known violation |
| `BiodiversityCorridorOverlay` compact toggle + paint | (a) — spine-btn + paint-only |
| `PollinatorHabitatStateOverlay` | (a) — paint-only |
| `RegenerationTimelineCard` + `LogEventForm` | (b) — new row: "Inline section-scoped disclosure form" |
| `EnergyDemandRollup` | (b) — new row: "Compact KPI / supply-vs-demand strip" |
| `SynthesisSummarySection`, `MilestoneMarkers` | (a) — rail sections, no new primitive |
| `LandingPage` + `LandingNav` (non-project `/`) | (b) — new §1 sub-section: "Public route exception" |
| 28-file `title=` → `DelayedTooltip` retrofit (`29bf499`) | validates existing §3 row |

**Doc edits (single file — `ia-and-panel-conventions.md`).**

- §1 Invariants — added a **Public route exception (Landing)** block. The landing page at `/` is the one surface that skips `AppShell` and renders its own sticky 64 px top bar (`LandingNav`). Rule: don't extend this pattern to any authed route.
- §3 matrix — 3 new rows (StickyMiniScore / disclosure form / rollup strip).
- §3 anti-patterns — added "hand-rolled floating toggles with inline `backdropFilter`" + a new **Known violations** sub-section naming `BiodiversityCorridorOverlay.tsx:265–287` and the broader 5-file map-overlay migration backlog (Agroforestry / CrossSection / MeasureTools / Microclimate / MulchCompostCovercrop still ship the pre-primitive chrome).
- §4 inventory — new "Paint-only overlays" sub-list for `PollinatorHabitatStateOverlay` and the paint portion of `BiodiversityCorridorOverlay`.
- §5 Deferred — retired the landed items (MapControlPopover primitive + map z-index token) which had been listed as "Landed 2026-04-24" but were already in the body; added opportunistic map-overlay migration + landing-OKLCH audit items.
- Appended a **Revision history** footer with the initial vs refresh diff.

**No code changes.** Documentation-only pass per the audit's P2 label. `wc -l` of the doc: 166 → 207 (within the <250 gate).

### Deferred

- **Map-overlay migration completion.** ~5 files in `features/map/**` still ship hand-rolled `backdropFilter` chrome outside the `MapControlPopover` primitive. Handle opportunistically when touching those files.
- **BiodiversityCorridorOverlay fix.** The documented violation should migrate to `MapControlPopover variant="dropdown"` — separate code session.
- **MASTER.md palette drift.** The 2026-04-01 palette in `design-system/ogden-atlas/MASTER.md` (green/harvest-gold, Fira fonts) no longer reflects the warm-slate + OKLCH reality. Worth a separate refresh session against `tokens.css`.

### Recommended next session

- `BiodiversityCorridorOverlay` migration to `MapControlPopover` (small, isolated; closes the flagged violation). Or the `MASTER.md` palette refresh if a wider design-system-doc session is preferred.
