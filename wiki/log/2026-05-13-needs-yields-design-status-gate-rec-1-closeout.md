# 2026-05-13 — Needs & Yields design-status gate (Rec #1 closeout)


**Why.** The 2026-04-28 Needs & Yields ADR called for a `draft` →
`ready-for-review` transition gated by orphan-output coverage, with a
per-project `allowOrphanOutputs` escape hatch surfaced prominently so
it remains a deliberate choice. The audit card already scored
coverage but had no transition; the legacy `FLAGS.RELATIONSHIPS` flag
hid the socket overlay from any user not patching code.

**What.** New pure validator
`packages/shared/src/relationships/statusGate.ts ::
canAdvanceToReadyForReview(edges, entities, allowOrphanOutputs)`
returns `{ ok, orphanCount, unmetCount, reason? }`. 4 vitest cases
in `packages/shared/src/tests/statusGate.test.ts` (vacuous-allow,
blocked-by-orphans, override-on, fully-routed). `ProjectMetadata`
gains `designStatus: enum(draft,ready-for-review,approved)`
and `allowOrphanOutputs: boolean`; `projectStore.ts` exports
`DesignStatus` + `getDesignStatus` / `getAllowOrphanOutputs`
accessors. New `useRelationshipsArmedStore` (ephemeral Zustand atom)
bypasses the legacy `FLAGS.RELATIONSHIPS` gate when the audit-card
CTA arms it; `RelationshipsOverlay` / `RelationshipsRail` now
fall through `FLAGS.RELATIONSHIPS || armed`. `NeedsYieldsAuditCard`
renders a status pill + "Mark ready for review →" CTA (disabled with
reason tooltip when `gate.ok === false`) + "Allow orphan outputs"
checkbox; "Open visual editor →" calls `arm()` before switching to
the map. New `apps/web/src/v3/plan/header/DesignStatusChip.tsx`
surfaces the same status as a top-left chip with a `⚠ Orphans
allowed` warning when the override is on, mounted from
`PlanLayout.tsx`.

**Verified.** `npx vitest run src/tests/statusGate.test.ts` from
`packages/shared` — 4/4 pass.
