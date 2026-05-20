# 2026-04-27 — Site Intelligence label-value layout fix


The Site Intelligence panel rendered each row at full panel width (~1080px)
with label glued left and value glued right via `flex:1; text-align:right`,
forcing 800+px saccades. Solution:

- Tile rows 2-3 across at desktop via `display:grid; grid-template-columns:
  repeat(auto-fill, minmax(260px, 1fr))` on the row-list container inside
  each `.liveDataWrap`. Collapses to a single column on narrow rails.
- Override the shared `.rightAlign` class and `.liveDataRight` wrapper inside
  `.liveDataRow` (`flex: 0 1 auto; margin-left: auto`) so values float to
  the **tile** edge, not the panel edge.
- Cap `.liveDataLabel` at `max-width: 130px`; baseline-align the row.

Live verification at 1440px viewport: gaps now 10–60px across Hydrology,
Groundwater, Water Quality, Live Ontario Data sections.

The Modern UI/UX Design Scholar notebook was rate-limited (8 retries) during
the consult attempt — plan stood on codebase evidence + established design-
system patterns (Stripe / Linear / IBM Carbon / Primer all use ~280–360 px
definition-list columns for dense metadata panels).

Files: [components/panels/SiteIntelligencePanel.module.css](../atlas/apps/web/src/components/panels/SiteIntelligencePanel.module.css)
Commit: `7f08936`

Deferred: re-consult scholar when rate limit clears; optional `.numeric`
modifier for tabular-num right-alignment of pure-metric rows.
