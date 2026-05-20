# 2026-05-08 — Act stage Operations Hub redesign + V3 sidebar regrouped to stage-collapsibles


Two-part redesign of the Act stage rails. **Right rail** stops being a stack of permaculture-principle GuidanceCards and becomes an Operations Hub dashboard ([apps/web/src/v3/act/ops/ActOpsAside.tsx](apps/web/src/v3/act/ops/ActOpsAside.tsx), composed of `TodaysPriorities` / `AlertsPanel` / `UpcomingEvents` / `QuickActions`); module-aware so Build → budget overruns, Maintain → irrigation/waste flags, Livestock → rotation moves + welfare flags, Harvest → swaps Alerts for "Recent harvests", Review → hazard walk-throughs, Network → CRM follow-ups. Wired to existing stores only (`fieldTaskStore`, `maintenanceStore`, `harvestLogStore`, `successionStore`, `communityEventStore`, `hazardsStore`, `livestockStore`) — no new mutation paths; Create Field Task / Log Observation route into existing slide-ups, RSVP is a `window.alert` placeholder. `ActChecklistAside` becomes a thin shim so `ActLayout` consumers don't change. **Left outer sidebar** ([apps/web/src/v3/components/V3LifecycleSidebar.tsx](apps/web/src/v3/components/V3LifecycleSidebar.tsx)) reshaped into 3 collapsible stage groups (Observe / Plan / Act): active stage auto-expands and shows its module list with the active module highlighted; clicking a collapsed stage navigates to its landing route and expands it. Project Home above, Reference footer below. **Inner Act rail** ([apps/web/src/v3/act/ActTools.tsx](apps/web/src/v3/act/ActTools.tsx)) repurposed from per-module bento → "Quick Log" strip with three large-tap field-log buttons (Log harvest / Log water check / Log livestock move); each selects its module, opens the slide-up, and activates the matching map tool when one exists (`act.harvest.log-entry`). Color-keyed glyphs via `data-kind` (harvest:#8bd16a, water:#5fc7d4, livestock:#c9a05a). **Active-state class fix:** swapped `.moduleLink.active` / `.stageLink.active` / `.homeLink.active` compound CSS rules to `[data-active='true']` attribute selectors after observing the active module pill never rendered — vite's CSS-modules export doesn't reliably scope a class that only appears in compound selectors, so the JSX's `${css.active}` resolved to a literal unhashed `active` that didn't match the hashed `._moduleLink_xxx._active_xxx` rule. Switching to `data-active` attributes (consistent with the existing `.stageGroup[data-active='true']` pattern already on the same file) sidesteps the hashing question entirely. tsc clean (`NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit -p apps/web/tsconfig.json`). Plan file at `~/.claude/plans/the-act-stage-right-piped-bumblebee.md`.

### Verification

- `cd apps/web && tsc --noEmit` → exit 0, clean.
- Preview `/v3/project/mtc/act` renders three rails in their intended shape: outer sidebar with Project Home + 3 collapsible stage groups (ACT expanded, modules listed); inner Quick Log strip; right Operations Hub dashboard.
- Active module link (Build & Construction selected) now renders the sage-tinted pill that the rule always intended.

### Deferred
- Wiring "Create Field Task" / "Log Observation" / "RSVP" to real mutation paths (currently route to existing surfaces or `window.alert` stub).
- Migrating Plan/Observe right-rails to dashboard format — Act is the execution stage; the others stay guidance-shaped on purpose.

### Commit

`07e0fd1 atlas/v3: Act ops aside + Built Environment dashboard WIP` on `feat/atlas-permaculture`.

### Recommended next session

- Wire `Create Field Task` / `Log Observation` to real store mutations rather than slide-up routing (currently the steward still has to fill the form by hand).
- Audit the rest of the V3 codebase for the same `${css.active}`-on-compound-selector footgun (grep `\.\w+\.active` across `*.module.css`).
