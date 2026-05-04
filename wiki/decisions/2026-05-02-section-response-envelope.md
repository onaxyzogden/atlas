# ADR: Shared `sectionResponse` envelope for the 27 section endpoints

**Date:** 2026-05-02
**Status:** Accepted
**Scope:** `packages/shared/src/schemas/section{2..29}.schema.ts`,
`apps/api/src/routes/<section>/index.ts` (27 routes), V3 read-paths
that consume per-section responses.

---

## Context

The section taxonomy (`section2..section29`, 27 sections covering basemap
through Moontrance-specific features) shipped on a scaffold generator
(`apps/api/scripts/scaffold-section.ts`) that produced two artefacts per
section: a Zod schema stub `<Domain>Placeholder = z.object({})` and a
Fastify route stub returning `{ data: [], meta: { total: 0 }, error: null }`
behind a phase gate. Section 2 (basemap-terrain) and Section 5
(hydrology-water) were hand-authored: both adopted the same response
envelope shape — a discriminated union over `status` with `'ready'`
carrying a typed `summary` and `'not_ready'` carrying a `reason`.

By 2026-05-02 every section had a target page in the V3 lifecycle but
26 schemas and 25 routes still carried the
`Generated stub. Replace with the real Zod types as this section
takes shape.` and `Generated stub from scaffold-section.ts. Add
handlers inline.` comments. The audit captured in
`.claude/plans/few-concerns-shiny-quokka.md` listed these as Phase 7.1
+ 7.2 closures. Two designs were on the table:

1. **Per-section bespoke envelopes.** Each route+schema pair would
   encode its own `'ready' | 'not_ready'` discriminated union with
   section-specific summary fields, mirroring the section2/section5
   hand-authored shapes. High-fidelity but 26 × ~40 LOC of duplicated
   envelope plumbing, and every consumer would still discriminate the
   same way.
2. **Single shared envelope helper.** Factor `'ready' | 'not_ready'`
   into a generic `sectionResponse(summary)` and let each section
   only contribute its `<Domain>Summary`. The discriminated-union
   semantics ride on one source of truth; bespoke processor shapes
   plug in by replacing the lean Summary object.

## Decision

Adopt **option 2**.

- New `packages/shared/src/schemas/sectionResponse.ts` exports
  `NotReadyReason` (`'no_boundary' | 'pending' | 'failed' |
  'not_implemented'`) and a generic
  `sectionResponse<S extends z.ZodTypeAny>(summary: S)` that returns
  the discriminated union.
- Each `section{N}.schema.ts` exports a typed `<Domain>Summary` (3-5
  fields the matching V3 page already consumes) plus
  `<Domain>Response = sectionResponse(<Domain>Summary)`.
- Route handlers under `apps/api/src/routes/<section>/index.ts` parse
  their `<Domain>Response` envelope before returning — until the
  matching processor lands they emit
  `{ status: 'not_ready', reason: 'not_implemented' }`.
- Section 2 and Section 5 keep their hand-authored response shapes
  (they predate this ADR and carry richer fields than the generic
  envelope captures); future processor work for sections 3, 4, 6..29
  widens the Summary in place without touching call sites.

## Consequences

**Positive.** One envelope shape across 27 sections — V3 consumers
discriminate on `response.status` uniformly and render a placeholder
when a processor hasn't filled in real data. The "Generated stub"
signal is gone from both halves of the contract. Tsc remains
authoritative: a section processor that emits a wrong field shape
fails type-check at the route, not at runtime in the UI.

**Negative.** The lean per-section Summary objects are intentionally
narrow. When a real processor lands it must explicitly widen the
Summary (and accept the type cascade) rather than appending free-form
fields. This is a feature, not a bug — but it means closing Phase 7.1
+ 7.2 didn't ship section-specific data, only the contract.

**Neutral.** `apps/api/scripts/scaffold-section.ts` still emits the
old `Placeholder` template for new sections. Updating it to emit the
envelope template is a follow-up; today's 27 sections are all
accounted for.

## References

- Plan: `.claude/plans/few-concerns-shiny-quokka.md`
  (Phase 7.1 + 7.2)
- Commits: `dae36f9` (schemas), `9f0cdff` (routes)
- Related ADRs:
  - `2026-04-21-layer-summary-discriminated-union.md` — same
    discriminated-union pattern applied at the layer level.
  - `2026-04-22-feature-manifest-scaffolding-pass.md` — original
    scaffold-section pass that planted the stubs being closed here.
