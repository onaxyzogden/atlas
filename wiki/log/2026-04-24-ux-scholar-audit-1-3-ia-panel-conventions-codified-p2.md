# 2026-04-24 — UX Scholar audit §§1 + 3: IA & panel conventions codified (P2)


Doc-only session closing the last two P2 items from the UX Scholar audit
(`design-system/ogden-atlas/ui-ux-scholar-audit.md` §§1 + 3). No code changes.

### Deliverable

- `design-system/ogden-atlas/ia-and-panel-conventions.md` (new) — 5-section spec:
  1. Perimeter strategy — the five zones (top chrome / left spine / map hero /
     floating tool spine / right rail) with per-zone owner, file, width, z-index,
     and route scope; invariants (no top bar on `/project/*`, one rail at a time,
     tool spine is floating-not-structural, map corner conventions).
  2. Z-index scale — global tier (`tokens.ts:303-312`, 8 steps base→max=999) +
     map canvas local sub-scale (1–50, isolated by `.mapArea { position: relative }`
     per `MapView.module.css:3-10`); rule that inline map-sub-scale numbers are
     acceptable only inside `.mapArea`.
  3. Panel decision matrix — 8 rows (rail / bottom sheet / modal / map-control
     popover / floating toolbar / command palette / toast / delayed tooltip) each
     citing a primitive file + "when to use" / "when NOT" guidance; anti-patterns
     list (re-invented modals, custom z-index >10, second rail, native `title=`).
  4. Ad-hoc floating inventory — 9 existing `features/map/*` floating surfaces
     documented with their shared glass-chrome recipe (`--color-chrome-bg-translucent`
     + `backdrop-filter: blur(8–10px)` + warm-gold border).
  5. Forward guidance (deferred) — `MapControlPopover` primitive extraction,
     `mapZIndex` token export, top-chrome-on-`/project/*` rationale.

### Cross-links

- Audit §§1 and 3 each gained a **Status (2026-04-24)** line pointing to the new spec.
- The new spec links back to audit, `MASTER.md`, and the two 2026-04-23 ADRs
  (OKLCH, DelayedTooltip).

### Not done / deferred

- No `MapControlPopover` primitive — the pattern is documented but not extracted.
- No `mapZIndex` token export — still lives as a comment in `MapView.module.css`.
- No ADR — this spec supersedes nothing; it formalizes existing practice.
  If the `MapControlPopover` or `mapZIndex` refactors land, an ADR will accompany them.

### Files touched

- `design-system/ogden-atlas/ia-and-panel-conventions.md` (new)
- `design-system/ogden-atlas/ui-ux-scholar-audit.md` (2 status lines)
- `wiki/log.md` (this entry)
- `wiki/index.md` (spec link added)

### Recommended next session

`MapControlPopover` primitive + `mapZIndex` token export — this turns the
"de facto glass chrome" pattern into a typed API and retires the ~9 inline
`zIndex: 5 / 10` literals under `features/map/`.
