# 2026-05-18 — feat(web): Report sidebar destination + ObserveModuleBar de-nesting


**Branch.** `feat/atlas-permaculture`. Commits `080aa487` (Report link) + `736ba329` (ObserveModuleBar restructure).

Added a standalone `Report` `<Link>` in `V3LifecycleSidebar.tsx` pointing to the existing `/v3/project/$projectId/report` route, placed directly below "Project Home" and above the stage groups. No module scaffolding; `ReportPage.tsx` and the `/report` route are untouched. `data-active={activeStage === 'report'}` wires the active highlight via the existing plumbing in `V3ProjectLayout.activeFromPath`.

`ObserveModuleBar.tsx` restructured to eliminate the `validateDOMNesting` button-in-button warning: outer tile changed from `<button>` to `<div>`; a new `.tileHit` `<button>` (absolute inset:0, transparent, z-index:1) carries `aria-pressed`, `onClick`, and an explicit `aria-label`; `.cardProgress` (z-index:2) becomes a sibling of `.tileHit` rather than a descendant, so pip `<button>`s are no longer nested inside a `<button>`. `aria-hidden="true"` was removed from `.cardProgress` — placing it on a container holding focusable interactive elements is a WCAG anti-pattern; pip buttons are now exposed to AT as their own labelled controls, with the tile's accessible name on `.tileHit aria-label`. Four CSS rules added to `ObserveModuleBar.module.css`.

Tests: `V3LifecycleSidebar` suite +2 → 6/6 (Report link found + active state). New `ObserveModuleBar.test.tsx` 3/3 (no nested button, tileHit present, pip buttons accessible). Typecheck: clean except 2 pre-existing unrelated `Paddock` errors in `useFlowEndpointOptions.test.ts`.

Runtime preview (web-a1 :5240, project run6): Report link found in expanded sidebar with href ending `/report`; clicking routes to `/v3/project/.../report` with Report heading rendered (`hasReportHeading: true`). The initial console-warning check hit a stale Vite HMR bundle (the preview server had been running since before the fix commits); after a clean `preview_stop`/`preview_start` of `web-a1` and a full reload, `/observe` mounts `ObserveModuleBar` (22 tiles) with `document.querySelectorAll('button button').length === 0` and **no** `validateDOMNesting` warning in the console — runtime confirmation that the button-in-button warning is eliminated. Corroborated by the `ObserveModuleBar.test.tsx` regression suite (3/3, no-nested-button asserted).

ADR: [[2026-05-18-atlas-report-sidebar-destination]] updated — status → Implemented & verified; `aria-hidden` note corrected.
