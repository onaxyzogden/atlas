# 2026-05-12 — Plan + Act callsite migration off legacy planCard / actCard CSS


**Motive.** Closing the deferred follow-up from
[2026-05-11-atlas-observe-human-context-reskin](decisions/2026-05-11-atlas-observe-human-context-reskin.md):
~49 Plan and Act cards still imported the legacy
`features/plan/planCard.module.css` and `features/act/actCard.module.css`
modules. The shared
[`apps/web/src/v3/_shared/stageCard/stageCard.module.css`](../apps/web/src/v3/_shared/stageCard/stageCard.module.css)
primitive (selected by `data-stage="plan|act|observe"`) had been the
canonical home since the Observe Human-Context reskin landed, and the
two legacy CSS files were already deleted in `daf1b549`. Callsites
still had to be flipped.

**Change.**

- 49 `.tsx` callsites updated: import path swung to the shared
  stageCard module, and `data-stage="plan"` (or `data-stage="act"`)
  added to each `<header className={styles.hero}>` element so the
  attribute-keyed gradient resolves correctly.
- Touches `apps/web/src/features/plan/*`, `apps/web/src/features/act/*`,
  and `apps/web/src/v3/plan/cards/**`. Per-file diff is exactly two
  lines: import path + `data-stage` attribute.
- Migration tool
  [`scripts/migrate-stagecard.py`](../scripts/migrate-stagecard.py)
  committed for traceability. Byte-safe UTF-8 read/write — written
  after an earlier agent-driven attempt corrupted em-dashes into
  cp1252 mojibake (BOM prepended, `—` → `â€"`). Cleanly-reverted
  files were re-migrated through the script; two contaminated files
  (`WaterCatchmentsCard`, `WaterStorageCard`) were repaired in place
  by round-tripping through cp1252→utf-8.

**Outcome.** Zero remaining references to the legacy CSS modules
(grep confirms `planCard.module.css` / `actCard.module.css` survives
only as the deleted-file name in `daf1b549`'s log and as a comment in
`stageCard.module.css` itself). `apps/web` typecheck passes for the
change set — the only errors are the 2 pre-existing
`Plan3DSelectionHandler.tsx` issues from `78b21bc4`. Plan and Act
heroes now render off the same `data-stage`-keyed gradient family as
Observe.

**Commit:** `2ef6791a atlas: migrate remaining Plan + Act callsites to shared stageCard`
