# 2026-04-24 — Accessibility implementation slice 2 (WCAG 2.1 AA closure)


Closes out the remaining P1/P2 findings from
[`design-system/ogden-atlas/accessibility-audit.md`](../design-system/ogden-atlas/accessibility-audit.md).
All 12 audit findings now marked ✅ shipped across slices 1 (P0 + early P1s)
and 2 (this commit, `4802012`).

### Shipped

- **§3 `<div onClick>` triage** — 13 files sampled. 12 were modal-backdrop
  dismissals; each gained a `useEffect` Escape-key listener +
  `role="presentation"` on the backdrop + `role="dialog" aria-modal="true"` on
  the inner `stopPropagation` panel. `MilestoneMarkers` card (the one non-modal
  case) became `role="button" tabIndex={0} onKeyDown={Enter/Space}`.
  Shared dismiss handler kept, no duplicated logic. `Modal.tsx` already had an
  Escape handler, so it just gained the `role="presentation"` tag.
- **§4 Dashboard heading hierarchy** — 9 dashboard pages renumbered so the
  outline descends without skipping (h1 → h2 → h3). 31 tag changes total;
  all `className` styling preserved so visual layout is unchanged.
- **§8 Form labels** — 22 controls across `StructurePropertiesModal`,
  `wizard/StepNotes`, and the `DesignToolsPanel` zone-naming modal now carry
  `<label htmlFor>` + matching `id`; the hidden `<input type="file">` in
  StepNotes gained an `aria-label`. `LoginPage` and `SplitScreenCompare` were
  already compliant.
- **§4 Score live-region** — `ScoresAndFlagsSection` suitability card now
  carries `role="status" aria-live="polite" aria-atomic="true"` +
  `aria-label="Overall suitability score: {score} out of 100"` so screen
  readers announce score updates as derived layers complete.
- **P2 polish** —
  - Nav `aria-label`s: `DashboardSidebar` (`"Project dashboards"`),
    `HydrologyDashboard` suite tabs (`"Hydrology sub-dashboards"`),
    `PublicPortalShell` (`"Portal sections"`). `LandingNav` aria-label sits in
    the working tree awaiting that feature's initial commit (landing/ still
    untracked).
  - `Button` spinner animation wrapped in `@media (prefers-reduced-motion: reduce)`
    so the loading glyph freezes for users with the OS preference set.
  - `tokens.css` gains a short comment documenting the `--color-text-muted`
    ≥14px floor (preventive guardrail; existing usages all comply).

### Verification

- `tsc --noEmit` ran clean on every file touched this slice. The 48 repo-wide
  pre-existing errors (PlantingToolDashboard `Object is possibly undefined`,
  HydrologyDashboard `capacityGal`, AppShell route strings, regenerationEventStore)
  are unchanged — none live in a slice-2 file.
- Preview server remained green through the sweep; no console errors
  introduced.
- Audit doc `priority summary` table updated: all 12 findings now show
  ✅ shipped with per-slice attribution.

### Commits

- `4802012` — `feat(a11y): slice 2 — §3 onClick triage + heading hierarchy +
  form labels + P2 polish` (28 files, 540 +, 105 −, including the audit doc's
  first commit).

### Still open

Nothing in the scoped audit. Deferred items (mobile `SlideUpPanel`
ergonomics, public-portal full pass, automated axe tooling, WCAG 2.2 AA
additions, map-canvas a11y, auth-flow audit) remain queued per the
[audit's "Deferred / out of scope" section](../design-system/ogden-atlas/accessibility-audit.md#deferred--out-of-scope).
