# 2026-04-24 — §1 duplicate-from-template: project clone with design-entity cascade


Picks up the §1 candidate `duplicate-from-template` (Sprint Bismillah
manifest) — adds a one-click "Duplicate" affordance so a steward can
fork a project's design as a starting variant without re-drawing
everything.

### Shipped (commit `c867803`)
- `apps/web/src/store/cascadeClone.ts` (new) — mirrors `cascadeDelete`'s
  contract; clones zones, structures, paths, utilities, crops,
  paddocks, and phases scoped to the source project, assigning fresh
  ids + timestamps and dropping any `serverId` (the new project hasn't
  synced). Errors in one store are logged but don't abort the rest.
- `apps/web/src/store/projectStore.ts` — `duplicateProject(sourceId,
  overrideName?)` action added to the public store API. Deep-clones
  metadata (drops `serverId` / attachments / timestamps), names the
  clone `"{source} (Copy)"` by default, copies the parcel boundary
  GeoJSON into IndexedDB under the new id, and triggers
  `cascadeCloneProject`. Returns the new `LocalProject` or `null` if
  the source id is unknown.
- `apps/web/src/pages/HomePage.tsx` + `.module.css` — each project
  card now wraps the `<Link>` in a `position: relative` div with an
  overlay `<button>` that fades in on hover/focus. Clicking it
  short-circuits the link, calls `duplicateProject`, and navigates to
  the clone.
- `apps/web/src/features/map/MapView.tsx` — `SettingsPanel` gains a
  "Duplicate as Template" button between Edit and Export, plumbed
  through a new `onDuplicate` prop on `MapViewProps`.
- `apps/web/src/pages/ProjectPage.tsx` — wires `handleDuplicate` and
  passes it down to `MapView`.
- `packages/shared/src/featureManifest.ts` — flips
  `duplicate-from-template` from `planned` → `done`.

### Intentionally excluded from the clone
Runtime / project-specific state stays with the original:
- comments / collaboration discussion
- fieldwork entries / walk routes / punch list
- portal config (public publish settings)
- scenarios (re-derived per project)
- versions (the clone starts a fresh history)
- regeneration events (observation log)

Attachments are dropped on clone — re-uploading parsed blobs into
IndexedDB silently would double-fill quota; the user re-imports if
they want.

### Verification
`tsc --noEmit` clean (zero errors). No new shared-package math, no
zustand version bumps (no schema change), no router changes.
