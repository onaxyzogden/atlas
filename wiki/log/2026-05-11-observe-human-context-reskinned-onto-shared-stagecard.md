# 2026-05-11 — Observe Human Context reskinned onto shared stageCard


**Motive.** The Observe slide-up shared chrome with Plan/Act after the
shared module-nav work, but the body of every Observe module still
rendered against the monolithic `observe-port.css` — green buttons,
bespoke hero cards, custom progress rings. Steward asked for the
Human Context dashboard to "match the theme of the other two stages."

**Change.** New shared `apps/web/src/v3/_shared/stageCard/stageCard.module.css`
merges `planCard.module.css` and `actCard.module.css` (95% identical,
Act was the superset) into one source of truth. Hero gradient picked
by `data-stage="plan|act|observe"` — Observe gets a new earth-green
hue distinct from Plan bronze and Act violet. All four Human Context
components (`HumanContextDashboard.tsx`, `StewardSurveyDetail.tsx`,
`IndigenousRegionalContextDetail.tsx`, `VisionDetail.tsx`) rewritten
onto the shared primitives + a local `humanContext.module.css` for
the layout extras (KPI grid, gold conic-gradient `Ring`, eyebrow,
synthesis block, blockquote, capacity bar, snapshot metric). Green
inline-styled buttons replaced with gold `.btn`. Plan/Act callsites
left on the legacy CSS files for now — migration is mechanical but
high-volume (60+ files including the v1/v2 Observe cards in
`features/observe/`).

**Outcome.** Human Context dashboard + three detail pages now read
as visually equivalent to a Plan or Act card slide-up body, with
just the hero hue differing. Typecheck clean. The other six Observe
modules still render against `observe-port.css` and will follow the
same pattern in subsequent sessions. ADR:
[2026-05-11-atlas-observe-human-context-reskin.md](decisions/2026-05-11-atlas-observe-human-context-reskin.md).
