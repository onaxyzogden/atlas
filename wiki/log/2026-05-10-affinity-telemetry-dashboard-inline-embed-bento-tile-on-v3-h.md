# 2026-05-10 — Affinity telemetry dashboard inline-embed + bento tile on v3 Home


Follow-up to the same-day surfacing commit (`ffe8de3`). The original
"References & tools" tile linked out to a standalone
`/reference/affinity-telemetry` route — the user wanted the dashboard
*displayed* on Home without click-through, then asked for it housed in
a bento-style box matching the surrounding card vocabulary.

Final shape:

- `apps/web/src/v3/pages/HomePage.tsx` already renders
  `<AffinityTelemetryDashboard />` inline above the help banner, gated
  by `VITE_ATLAS_TELEMETRY_ENABLED ?? import.meta.env.DEV`. The inner
  component supplies its own header/legend/grid chrome — the outer
  "DEVELOPER · Affinity telemetry · live" wrapper that was added in the
  first iteration was removed because it duplicated the inner
  component's "Affinity telemetry" title and subtitle. The wrapper is
  now a bare flag-gated `<section className={css.devEmbed}>`.
- `apps/web/src/v3/pages/HomePage.module.css` — `.devEmbed` is now a
  bento tile: `--radius-lg` corners, hairline border, soft surface fill
  with a faint cool gradient, layered ambient shadow. Visual language
  matches Project Health and the 3-column row on the same page so the
  embed reads as a peer tile, not a transplant. The previously-added
  `.devSection*` and `.devTile*` classes from the linked-out tile
  iteration are kept (inert) per `feedback_no_deletion.md`; future dev
  surfaces can reuse them.

The standalone `/v3/project/$projectId/reference/affinity-telemetry`
route and the V3LifecycleSidebar utility entry (both committed in
`ffe8de3`) remain as secondary surfaces — useful for "give me the
dashboard alone, full-width" or for navigating from inside a deep
stage page.

The aggregate API endpoint still 500s locally because migration
`024_act_interaction_events.sql` hasn't been applied on this machine —
the rendered dashboard's "Failed to load" banner is expected until
`pnpm --filter api migrate` is run. The UI shell, grid, legend, and
empty-state cells render correctly regardless.
