# 2026-05-12 — Observe `_shared/components/` primitives deleted (post-reskin cleanup)


**Closed.** Follow-up to the 2026-05-11 full Observe reskin onto shared
`stageCard` primitives. With all seven Observe dashboards now rendering
directly against `v3/_shared/stageCard/`, the React primitive layer at
`apps/web/src/v3/observe/_shared/components/` had a single remaining
consumer: `components/AnnotationListCard.tsx` imported `SurfaceCard` as
a `<section>` wrapper, and that card is mounted by six of the seven
Observe dashboards. Inlined `SurfaceCard` into `AnnotationListCard`
(swap `<SurfaceCard className={styles.panel}>` → `<section>`; fold the
four-rule `.card` CSS — border / radius / `--color-panel-card` bg /
inset green box-shadow — into `AnnotationListCard.module.css`'s
`.panel` rule), then deleted the entire `_shared/components/`
directory (24 files: 12 .tsx + 11 .module.css + `index.ts`) and its
now-empty `_shared/` parent. README's Layout tree no longer mentions
the `_shared/` branch. Also corrects the 2026-05-11 reskin ADR's
underscoped title — the actual ship was all seven modules, not just
Human Context, and today's deletion is the natural cleanup that
follows. Typecheck clean; preview navigated through
`/observe/{human-context,topography,macroclimate-hazards}` with no
module-resolution errors. Full record:
[wiki/decisions/2026-05-12-atlas-observe-shared-primitives-deleted.md](decisions/2026-05-12-atlas-observe-shared-primitives-deleted.md).
