# 2026-05-15 — Map cursor: Observe annotation hover-probe coverage fix


**Branch.** `claude/jovial-mccarthy-bb516f`.

**What.** Audit of `INTERACTIVE_LAYER_PREFIXES` coverage (follow-up to
the intent-channel ADR) found `'observe-annot-'` / `'obs-annot-'` were
**dead** prefixes — no layer uses them; Observe annotation layers are
`observe-anno-*`. The hover-probe matched no Observe annotation, so the
observer clobbered the layers' bare `pointer` write back to `grab`:
clickable affordance silently dead Observe-wide. `observe-anno-` was the
sole gap (`design-el-`/`plan-data-`/`be-v2-`/`plan-scheduled-moves-` all
correct; `observe-sector-handles-circle` intentionally intent-channel).

- Replaced the two dead entries with `'observe-anno-'` in
  `INTERACTIVE_LAYER_PREFIXES` (`useMapCursor.ts`).
- Deleted the now-redundant `onEnter`/`onLeave` bare cursor writers +
  plumbing in `ObserveAnnotationLayers.tsx` (prior ADR's "Redundant —
  deleted" disposition; click/dblclick → `openDetail` untouched).

See `decisions/2026-05-15-atlas-observe-anno-prefix-fix.md`.

**Verification.** `corepack pnpm --filter web typecheck` exit 0. `web-wt`
(port 5210) pan rest `grab !important`. Deterministic prefix logic proved
in-page: OLD prefixes → all real `observe-anno-*` ids `false` (the
regression), NEW → all `true`; other families still `true`;
non-interactive `false`. Live rendered-map hover screenshot not
obtainable headless (MapTiler `403` placeholder key blocks the base
style; synthetic-style eval + screenshot time out the WebGL renderer) —
noted as a limitation, not assumed. Console: only pre-existing
`ObserveModuleBar.tsx:32` warning + expected `403`.
