# Feature Manifest

## Summary

Single source of truth for Atlas's 30-section feature surface. Every
in-scope feature belongs to exactly one section, carries a phase tag
(`P1`-`P4`, `MT`, `FUTURE`), and an implementation status (`stub`,
`planned`, `partial`, `done`). Manifest drives route gating in the
API and section routing in the web app.

## How It Works

**Storage.** `packages/shared/src/featureManifest.ts` exports
`FEATURE_MANIFEST: SectionManifest[]` with one entry per section:

```ts
{ id: 1..30, slug: 'kebab', name: string, phases: PhaseTag[],
  status: 'stub'|'partial'|'done', features: FeatureItem[] }
```

Each `FeatureItem` is `{ key, label, phase, status }`. Entries live in
id order; the file is append-only for new sections. Subpath export
`@ogden/shared/manifest` makes the manifest importable without pulling
in the full shared barrel.

**Phase gating (API).** `apps/api/src/plugins/featureGate.ts` decorates
`fastify.requirePhase(tag)`. Each route's preHandler chains
`[authenticate, fastify.requirePhase('P1')]`. Gating is driven by:
- `ATLAS_PHASE_MAX` — opens P1 through the named phase (default P1).
- `ATLAS_MOONTRANCE=1` — opens MT-tagged routes.
- `ATLAS_FUTURE=1` — opens FUTURE-tagged routes (mirrors MT pattern).

Closed routes return 404, not 403, so ungated sections are invisible
rather than forbidden.

**Scaffolding generator.** `apps/api/scripts/scaffold-section.ts`
produces a new section's artifacts idempotently: route folder under
`apps/api/src/routes/<slug>/`, feature folder under
`apps/web/src/features/<slug>/` (index.ts, `<Slug>Page.tsx`,
`CONTEXT.md` from template), Zod placeholder at
`packages/shared/src/schemas/section<id>.schema.ts`, manifest stub
append, and `app.ts` import + register. Refuses to overwrite existing
files; merge conflicts in `app.ts` are resolved by the parent session,
not the generator.

**CONTEXT.md.** Every scaffolded feature folder carries a filled
CONTEXT.md from `apps/web/src/features/_templates/SECTION_CONTEXT.md.tmpl`.
Downstream implementation sessions read the manifest entry + CONTEXT.md
as their starting brief; they should not explore the codebase cold.

## Where It's Used

- `packages/shared/src/featureManifest.ts` — storage.
- `apps/api/src/plugins/featureGate.ts` — API gating.
- `apps/api/src/app.ts` — 29 scaffolded route registrations grouped
  under `// ── Scaffolded sections (Batch N: §§…) ──` comments.
- `apps/web/src/features/<slug>/` — 28 scaffolded feature folders.
  §1 uses legacy `features/project/` by design (manifest slug is
  `project-intake` but no stub folder exists).
- `apps/api/scripts/scaffold-section.ts` — generator.
- `apps/web/src/features/_templates/SECTION_CONTEXT.md.tmpl` — template.
- Plan: `.claude/plans/feature-sections-1-30-the-stateless-lollipop.md`
  (canonical pass definition + reusable per-section agent brief).

## Constraints

- **Manifest edits alongside feature work.** Do not add a feature to a
  section without updating its manifest entry in the same PR. Status
  transitions (`stub` → `partial` → `done`) are load-bearing.
- **Phase tags are contracts.** An item tagged `P2` must not be
  reachable with `ATLAS_PHASE_MAX=P1`. If an item's real requirements
  are lower than its tag, change the tag rather than bypassing the
  gate.
- **§1 slug convention.** `project-intake` is a logical slug; the
  actual §1 surface lives at `apps/web/src/features/project/` and
  `apps/api/src/routes/projects/`. Do not create
  `apps/web/src/features/project-intake/` or move §1 code there.
- **Symbol collisions.** When a scaffolded slug's route import would
  collide with a legacy symbol (e.g. Batch 7 §27's `publicPortalRoutes`
  vs `./routes/portal/public.js`'s `publicPortalRoutes`), alias the
  scaffolded import (`publicPortalSectionRoutes`) in `app.ts`. Do not
  rename the scaffolded folder.
- **No scaffolding without the generator.** Hand-written stubs drift
  from the framework shape and break the merge protocol. Run the
  generator first, then hand-edit.
- **FUTURE is not aspirational.** Items tagged FUTURE are hard-gated
  behind `ATLAS_FUTURE=1`; they appear in planning dashboards but
  never in production surfaces by default.
