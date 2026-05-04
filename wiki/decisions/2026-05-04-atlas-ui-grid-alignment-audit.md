# 2026-05-04 — atlas-ui grid-alignment audit (deferred work scope)

## Context

Phase 3 of the [atlas-ui ← MILOS UI/UX lift](2026-05-04-atlas-ui-milos-lift.md)
deferred a grid-alignment audit. The plan called for walking each page in
the new unified `<AppShell>` and snapping internal margins of the 14
presentational components to `--space-*` tokens.

After landing the safe regex tokenization (380 exact-match px → tokens,
commit `35934ba`), `apps/atlas-ui/src/styles.css` still contains 677
hardcoded off-grid px values across 35 distinct numbers in spacing
properties (padding/margin/gap and longhands).

## Finding

The prototype is **not** on a non-4px visual rhythm — it's drifted by
1–2px throughout. 670 of the 677 off-grid values (99%) sit within 2px
of a `--space-*` token. Only 7 occurrences (1%) are >2px from any
token and likely intentional.

### Top off-grid clusters (frequency × value × nearest token)

| Px | Count | Nearest token | Delta |
|---|---:|---|---:|
| 10 | 154 | `--space-2` (8) or `--space-3` (12) | ±2 |
| 14 | 102 | `--space-3` (12) or `--space-4` (16) | ±2 |
| 18 |  62 | `--space-4` (16) | +2 |
|  9 |  54 | `--space-2` (8) | +1 |
|  6 |  46 | `--space-1` (4) or `--space-2` (8) | ±2 |
|  7 |  44 | `--space-2` (8) | −1 |
|  5 |  39 | `--space-1` (4) | +1 |
| 13 |  31 | `--space-3` (12) | +1 |
| 11 |  26 | `--space-3` (12) | −1 |
| 22 |  19 | `--space-5` (20) | +2 |

These ten values alone account for 577 of the 677 occurrences (85%).

## Recommendation

Treat the audit as **visual-QA bound**, not a regex sweep. Every value
above is a 1–2px judgment call — rounding 10px → 8px in some places
visibly tightens layout; in others it collapses gutters to look
cramped. The right pass walks each page with `preview_inspect`,
prioritizes the top 10 clusters, and decides per occurrence.

### Suggested workflow

1. `preview_start` the atlas-ui dev server (port 5300).
2. For each of the 18 routes, capture a baseline screenshot at
   1672×941 (the catalog viewport).
3. Use `preview_inspect` on suspicious gutters/paddings — look for
   the top-cluster values (10, 14, 18, 9, 6, 7).
4. Edit the rule in `styles.css`, hard-reload, capture an after
   screenshot, accept or revert per visual judgment.
5. Avoid rounding inside `calc()`, transforms, or border declarations
   (those use px for non-spacing reasons — line widths, hairlines).
6. Build-verify after each batch; commit per-component blocks.

## Out of scope for the regex pass that already landed

- The 7 off-grid values >2px from any token (likely intentional —
  e.g. `38px`, `52px` if they exist).
- Negative spacing (`margin: -28px ...`) — CSS does not negate custom
  properties without `calc(-1 * var(--space-7))`, which is verbose and
  rarely worth the churn for a value that already maps cleanly.
- Non-spacing px: line widths, border-radius (already on radius scale),
  font-sizes, transforms, calc() arithmetic.

## References

- Parent decision: [2026-05-04 atlas-ui ← MILOS UI/UX Lift](2026-05-04-atlas-ui-milos-lift.md)
- Tokenization commit: `35934ba`
