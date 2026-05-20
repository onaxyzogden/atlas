# 2026-05-18 — D0.1 implemented: coupled reader/writer cut-overs + `seedSaving` carry


**Branch.** `feat/atlas-permaculture` (working tree, uncommitted).

Completed the supersede D0 deliberately deferred. Added the second lossy
carry `seedSaving?: boolean` to the `@ogden/shared` WorkItem schema and
`propagationBatchToWorkItem` (the pure mapper shared with the
planting-calendar regen seam — migrated and regenerated rows stay
byte-identical); migration test asserts it both ways. Cut over the four
coupled CRUD/domain surfaces to read **and write** the spine via the
projection pattern: each render block stays byte-unchanged while a
`useMemo` projects spine `WorkItem`s back into the legacy entity shape,
and writers redirect to `workItemStore` actions that mirror the D0
migration mappers exactly (fidelity by construction). Surfaces:
`MaintenanceScheduleCard` (CRUD), `NurseryLedgerDashboard` (reader;
`StockTransfer` stays on `nurseryStore`), `RotationScheduleCard`
(coupled reader+writer; auto-fulfilment stamps the actual-move event's
`workItemId`, event-log not migrated), `PhasingScaleMatrixCard`
(per-phase pivot off `phaseId!=null`). `PhasingDashboard` verified
no-change by inspection (rolls up off built-environment `structures`,
never `phase.tasks`). Legacy stores now fully write-dead (migration
input + rollback only). One seam flagged not silently regressed:
`startScheduledLivestockMove` (`ActStructurePopover.actions`) still
writes the legacy store — a separate surface, its own later cut-over.

Verified: shared+web tsc clean (only the pre-existing unrelated
`useFlowEndpointOptions` Paddock errors); web vitest **1155/1156** (the
1 failure is the pre-existing `syncManifest` coverage guard —
`ogden-compost-cycle`/`ogden-habitat-features`/`ogden-succession-path`
B2/A2/A-series debt, proven by clean-tree stash repro; `ogden-work-items`
itself correctly classified); migration unit test **10/10** (incl. new
`seedSaving` assertions); `vite build` ok (52s). Live: app runs
error-free under Vite HMR after all edits, zero console errors,
`migratedSources` = all five, empty-state correct on a no-planned-work
dev profile. Screenshots not attempted — disclosed MapLibre/WebGL hang;
DOM/console + test matrix are verification of record.
ADR: [[2026-05-18-atlas-d0-1-coupled-cutovers]].
