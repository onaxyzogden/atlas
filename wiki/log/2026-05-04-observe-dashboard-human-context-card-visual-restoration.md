# 2026-05-04 — Observe dashboard Human Context card visual restoration


**Trigger.** User flagged drift between live `/observe/dashboard` Human Context card and the legacy static reference (`apps/atlas-ui/legacy/index-static.html`). Three regressions: empty-dot people-orbit, flat-text mini-stats, and underlined `<Link>`-as-button labels.

**Fix.** Three files in `apps/atlas-ui/`:

- [`src/pages/ObserveDashboardPage.jsx`](apps/atlas-ui/src/pages/ObserveDashboardPage.jsx) — `PeopleOrbit` now renders a center node with `<User />` and 6 satellite nodes each containing a `<User />`; `MiniStats` consumes structured `{icon,label,value,tone}` items via a local lucide lookup (`users`, `newspaper`); `CardActions` appends `<ArrowRight />` to the primary button label. Removed the now-redundant inline `→` from the SWOT card's primary label.
- [`src/data/builtin-sample.js`](apps/atlas-ui/src/data/builtin-sample.js) — `observeDashboardModules.humanContext.miniStats` migrated from string array to `[{icon,label,value,tone?}]`. Stakeholders carries `tone: "amber"`.
- [`src/styles.css`](apps/atlas-ui/src/styles.css) — added `text-decoration: none` to `.stage-settings/.outlined-button/.green-button` base so router `<Link>` instances don't underline; split `.mini-stat-row` from `.dashboard-badge-row` (now a 3-column grid with stacked icon/label/`<b>` and `.amber b` modifier mapped to `--olos-gold-bright`); rebuilt `.people-orbit-small` with `::before/::after` concentric inner rings, `.people-orbit-small__center` element (44×44, bg `#33451e`), and per-node icon styling (27×27, 15px svg). Legacy CSS at `apps/atlas-ui/legacy/styles-static.css:510-569` was the reference.

**Verification.** `pnpm install --filter atlas-ui...` (worktree fresh-install). Vite at `http://127.0.0.1:5300/observe/dashboard`. `preview_inspect` confirmed: 6 orbit nodes each with svg + center svg, 3 mini-stat cells each with icon + `<b>`, `.amber b` color `rgb(213, 164, 58)` vs default `rgb(255, 242, 214)`, all three card buttons computed `text-decoration: none`. **Screenshot tool was unresponsive** (preview_screenshot timed out at 30s repeatedly) — verification rests on DOM/computed-style inspection, not visual diff.

**Note.** Mid-session, an external HEAD switch wiped uncommitted edits; changes were re-applied cleanly from the conversation context. Working tree was reverified post-restore.

### Deferred

- Other module cards (Macroclimate, Topography, EWE, Sectors, SWOT) still use the legacy `BadgeRow` pattern; user only requested Human Context parity. If the same icon+label+value treatment is desired elsewhere, the structured `miniStats` shape and `MINI_STAT_ICONS` lookup can be extended.
- Manual eyeball at `/observe/dashboard` recommended since screenshot tool timed out.

### Recommended next session

- Visual sweep across the remaining 5 dashboard module cards to check for similar drift from the legacy static reference.
- Or: pick up the still-deferred `getVisionData` selector cleanup from 2026-04-26.
