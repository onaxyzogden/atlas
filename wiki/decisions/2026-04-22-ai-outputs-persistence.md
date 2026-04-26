# 2026-04-22 — AI outputs persistence + narrative pipeline wiring

**Status:** Accepted
**Audit item:** §6.13 — "Wire `generateSiteNarrative` / `generateDesignRecommendation` so Claude outputs land in the database, not just client-side memory."

## Context

`ClaudeClient` in `apps/api/src/services/ai/ClaudeClient.ts` exposed
`generateSiteNarrative` and `generateDesignRecommendation` but nothing called
them server-side. The web app `AtlasAIPanel` called Anthropic directly from
the browser, with outputs kept in `siteDataStore` memory only — lost on
refresh, not persisted, not auditable, and keyed to the user's own API key.

Audit §6.13 required: (a) server-side invocation triggered by Tier-3
completion, (b) durable storage, (c) an HTTP read endpoint the panel can hit.

## Decision

Three additive changes, all opt-in behind `claudeClient.isConfigured()`:

1. **Table `ai_outputs`** — one row per generation. `(project_id, output_type,
   generated_at DESC)` gives latest-per-type lookup; `generated_at DESC` keeps
   history for later replay. Migration `010_ai_outputs.sql`, additive only.

2. **Pipeline integration** — `DataPipelineOrchestrator` gains a
   `narrativeQueue` + `startNarrativeWorker()`. `handleTier3Completion()`
   (new; consolidates the 4 duplicated writer-invocation blocks across the 4
   Tier-3 workers) enqueues a narrative job iff:
   - the assessment writer did not skip (`!result.skipped`), and
   - `claudeClient.isConfigured()` is true.

   The worker runs `generateSiteNarrative` + `generateDesignRecommendation`
   in parallel (`Promise.all`), builds the context via
   `buildNarrativeContext(db, projectId)` — server-side equivalent of
   `apps/web/src/features/ai/ContextBuilder.ts` — and persists both outputs
   via `writeAiOutput(db, output)`.

3. **HTTP read** — `GET /api/v1/projects/:id/ai-outputs` (any project role)
   returns `Record<outputType, StoredAiOutput>` via
   `getLatestAiOutputsForProject` — `DISTINCT ON (output_type) ORDER BY
   output_type, generated_at DESC` keeps it a single round trip.

## Consequences

- New-project narrative path is fully server-driven: no Claude API key on the
  browser, refresh-durable, auditable via `ai_outputs` row history.
- The old client-side path in `AtlasAIPanel` remains functional for local
  regeneration / preview — not torn out in this pass (minimizes risk); a
  follow-up flip switches the panel to read from `/ai-outputs` first and
  fall back to direct calls only when the endpoint returns empty.
- Dev-without-Claude-key is safe: the enqueue gate `isConfigured()` silences
  both queue growth and worker failures.
- Assessment writer refactor: 4 near-identical 11-line try/catch blocks in
  the Tier-3 workers collapsed into one `handleTier3Completion` method.
  This was a drive-by cleanup necessary to add the narrative enqueue without
  creating a fifth duplication.

## Files

- `apps/api/src/db/migrations/010_ai_outputs.sql` — new
- `apps/api/src/services/ai/AiOutputWriter.ts` — new
- `apps/api/src/services/ai/NarrativeContextBuilder.ts` — new
- `apps/api/src/services/pipeline/DataPipelineOrchestrator.ts` — narrative queue, worker, `handleTier3Completion`
- `apps/api/src/app.ts` — `startNarrativeWorker()` wired
- `apps/api/src/routes/projects/index.ts` — `/ai-outputs` route

## Alternatives considered

- **Trigger narrative from the web client** — rejected; audit specifically
  wanted server-side so non-owners see the same narrative and the Claude key
  stays server-side.
- **Single narrative output type** — rejected; we already had two distinct
  types on `ClaudeClient`; collapsing them would lose the "design recommendation
  vs. site narrative" separation the panel needs.
- **Inline narrative generation inside `maybeWriteAssessmentIfTier3Complete`**
  — rejected; writer is supposed to be idempotent + fast. Queue isolation
  keeps long Claude calls off the terrain/watershed worker critical path.
