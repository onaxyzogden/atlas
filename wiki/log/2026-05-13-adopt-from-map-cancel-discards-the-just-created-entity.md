# 2026-05-13 — Adopt-from-map: Cancel discards the just-created entity


**Follow-up to the dedup-guard fix above.** Steward feedback: hitting
Cancel in the inline-edit popover after a fresh adopt should *discard*
the captured building, not leave a stub "Adopted building" entity in
the store.

Previously the tool called `useBuiltEnvironmentStoreV2.create(...)` first
and then `openBeInlineEditById(entity.id, anchor)` — which uses the
shared `buildBuildingEditSchema` whose `onCancel` is a documented no-op
("record already exists"). That contract is correct for edit flows but
wrong for fresh adopts where the entity is provisional until Save.

**Fix:** in [apps/web/src/v3/observe/components/draw/AdoptBasemapBuildingTool.tsx](apps/web/src/v3/observe/components/draw/AdoptBasemapBuildingTool.tsx),
the fresh-adopt branch now builds the schema locally and opens the
inline-form store directly, wrapping `onCancel` to call
`store.delete(entity.id)`. The dedup branch is unchanged — re-opening
an already-adopted building keeps the default no-op cancel (no
destructive side effect on existing data).

`useInlineFormStore.open` already invokes the previous form's onCancel
when a new form replaces it (singleton replace-semantics), so switching
tools mid-adopt also cleans up the provisional entity.

**Verification (Chrome MCP, live preview, HMR-loaded modules):**
- Created a stub entity via the actual `useBuiltEnvironmentStoreV2.create`.
- Opened the inline form with the wrapped onCancel.
- Triggered onCancel.
- Result: before 47 → afterCreate 48 → afterCancel 47. Entity removed.

`tsc --noEmit` clean.
