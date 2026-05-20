# 2026-04-24 — §1 save candidate properties


Closes `save-candidates` (featureManifest §1 Property Profile / P2).
Completes the candidate-evaluation triad alongside duplicate (§1) and
compare (§1, shipped earlier).

### Context
`LocalProject.status` already had `'candidate'` in its union (projectStore.ts:19)
but nothing in the UI wrote to it — the only reader was CompareCandidatesPage
formatting a display string. This closes the loop with writers + a filter
surface so stewards can keep a working list of exploratory properties
separate from active builds.

### Changes
- `apps/web/src/pages/HomePage.tsx` — added `StatusFilter` state
  (`'all' | 'active' | 'candidate'`), filter-chip group (All / Active /
  Candidates with counts, hidden until at least one candidate exists),
  candidate-state card badge (info variant, dotted), card action cluster
  (Mark as candidate ↔ Promote) sharing the hover-reveal pattern with
  the existing Duplicate button, and empty-filter messaging.
- `apps/web/src/pages/HomePage.module.css` — new classes `.filterChips`,
  `.filterChip`, `.filterChipActive`, `.filterChipCount`, `.filterEmpty`,
  `.cardActions`, `.cardActionBtn`, `.cardCandidate` (dashed border for
  exploratory properties), `.cardBadges`. Replaced the single
  `.cardDuplicateBtn` with the generic `.cardActionBtn` cluster.
- `apps/web/src/features/project/ProjectEditor.tsx` — status checkbox
  inside the editor modal. Toggles `'active' ⇄ 'candidate'` only;
  archived/shared are managed elsewhere (permissions surface).
- `packages/shared/src/featureManifest.ts` — flipped line 90
  `save-candidates` status `planned → done`.

### Rationale
Pure presentation: no store schema changes, no new entities, no new
scoring math. The status union already supported it; this just surfaces
writers and a filter chip. Dashed border + info-dot badge communicates
"not yet committed" without competing with the projectType Badge at the
card head. Filter chips only render when candidates exist so fresh
accounts stay uncluttered.

### Not in scope
- No "archived" surfacing on HomePage (separate feature).
- No server-side filter query (candidates live in localStorage until the
  next sync; existing `ogden-projects` persist v3 already carries
  `status` through).
- No candidate-specific dashboard summary — stewards who need
  side-by-side comparison use the existing `/projects/compare` flow
  (shipped earlier as compare-candidates).

### Verification
- `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit`
  → exit 0, clean.
- Preview verification deferred (user-driven smoke test).
