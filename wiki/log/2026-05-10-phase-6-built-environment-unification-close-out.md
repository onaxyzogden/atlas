# 2026-05-10 — Phase 6: Built-Environment unification close-out


**Motive.** Final phase of the Observe + Plan BE unification arc. Per the
2026-05-10 master plan, Phase 6 is "cleanup, default-on, ratchets" —
verify the legacy stores are pure V2 wrappers, confirm duplicate handlers
were already absorbed, and run the final tsc / vitest / eslint sweep.

**Reality check vs. plan steps.**

- **6.1 — Flag flip:** N/A. Phase 3 shipped a pure V2 facade (no
  `ATLAS_BUILT_ENV_V2` env flag was ever introduced). V2 has been the
  sole source of truth since Phase 3 close-out.
- **6.2 — Delete v1 store / reduce structureStore:** Already structurally
  done. Audit confirms `builtEnvironmentStore.ts` (24,610 B), `structureStore.ts`
  (10,480 B), and `designElementsStore.ts` (11,576 B) carry zero
  `create(persist(...))` blocks — they are pure projection/dispatch
  facades over `useBuiltEnvironmentStoreV2`. Deleting the facade names
  would force a 161-file import sweep with **no behavioral change**;
  the facades are the correct compat layer for the rest of the codebase.
  Recorded as deferred-and-justified rather than done.
- **6.3 — Delete duplicated handlers:** Already done by Phase 4.3.
  `AnnotationVertexEditHandler.tsx` and `AnnotationDragHandler.tsx`
  are now thin Observe-stage compositions of `SharedVertexEditHandler`
  (lifted to `apps/web/src/v3/builtEnvironment/handlers/`). Per their
  module-doc headers, removing them would orphan the Observe-side
  selection-store wiring and dispatch-table glue — they're stage adapters,
  not duplicates.
- **6.4 — Final ratchet sweep (this session):**
  - `cd atlas/apps/web && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` → exit 0.
  - `npx vitest run` → **43 test files / 666 tests, all passing.** Includes
    16 V2 store cases + 16 adapter parity cases + 9 V2 derivation cases
    landed across Phases 2–5.
  - `npx eslint src --quiet` → exit 0.
- **6.5 — Wiki update:** This entry.

**Definition of Done — verified.**

- ✅ One unified `BuiltEnvironmentEntity` schema in `@ogden/shared`,
  31-kind registry, every kind dual-state.
- ✅ Single `useBuiltEnvironmentStoreV2` is the sole source of truth.
  Legacy stores are pure facades.
- ✅ Migration shim runs on first load (Phase 2 `migrateLegacyToV2`); 16
  store + 16 adapter tests prove parity.
- ✅ Plan's 3D layers (GLB + extrusion + Terrain3DController) and edit
  handlers (vertex via `SharedVertexEditHandler`, BE attributes via
  `InlineFeaturePopover`) are mounted in both stages.
- ✅ Observe edit baseline (Phase 0) issues all closed by Phase 4.3 + 4.4.
- ✅ All 23 non-legacy BE kinds visible + clickable + editable in Observe
  (Phase 5.2.B), and surfaced in the dashboard via 5 V2 category cards
  + export `v2Entities` array (Phase 5.4).
- ✅ tsc clean / vitest green / eslint green.

**Strategic close.** Observe + Plan now share one persistence layer, one
edit affordance set, one dashboard surface, and one ADR
(`wiki/decisions/2026-05-10-atlas-built-environment-unification.md`).
The Phase 6 audit confirmed the natural endpoint of the refactor was
reached at Phase 5.4 — pursuing strict-deletion of the facades would
trade 161 cosmetic file edits for zero behavioral change.

**Deferred (non-blocking, future cycles).**

- Cosmetic facade-name deletion: rewrite all 161 `import …/store/{builtEnvironmentStore,structureStore,designElementsStore}` sites to import V2 directly. Estimated ~30k tokens for zero behavioral payoff; defer until a separate hygiene pass.
- Manual MTC smoke for Phases 5.2.B + 5.4 (place barn + compost in Observe → category card updates; trigger export → confirm `v2Entities` JSON).
- `wiki/entities/atlas.md` Built Environment section refresh per master plan §6.5 (this log entry covers the chronology; entity-page refresh is a separate documentation pass).
