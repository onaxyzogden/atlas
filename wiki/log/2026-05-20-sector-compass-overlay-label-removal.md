# 2026-05-20 — Remove "Sector compass" text label from map overlay

**Branch.** `feat/atlas-permaculture`.

## Summary

Cosmetic UI tweak on the Observe-stage map overlay. The
`SectorCompassOverlay` floating card rendered a redundant `"Sector
compass"` text label above the compass diagram (the diagram already
carries an `aria-label="Sector compass diagram"` + the "N" marker, so
the text was visual noise on the map canvas). Removed the single
`<span className={css.label}>Sector compass</span>` line from
[apps/web/src/v3/observe/components/overlays/SectorCompassOverlay.tsx](../../apps/web/src/v3/observe/components/overlays/SectorCompassOverlay.tsx).

The compass diagram, "N" marker, and pitch/bearing transform are
unchanged. The `css` import remains in use (`dock` / `card` / `svg`);
the now-unused `.label` rule in the CSS module is left as harmless dead
style (no functional impact, prune-on-touch later).

## Verification

- Single-line JSX removal; no logic, props, or store interaction
  touched.
- Accessibility preserved — the SVG retains `role="img"` +
  `aria-label="Sector compass diagram"`.

## Posture

- Strictly-additive-removal (one presentational line). No schema, no
  store, no covenant surface, no API.
