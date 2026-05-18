# 2026-05-18 — Sub-project B Decomposition (Apricot Lane, non-covenant); Sub-project D reconciled to the ratified D0–D5 roadmap

**Status:** Scoped — NOT implemented. The Sub-project B decomposition
(B1–B5) below is the deliverable; each part is its own later-approved
build. **Sub-project D is NOT decomposed here** — it was ratified
out-of-band this same day as D0–D5; this document defers to that ADR (see
"Sub-project D — superseded/reconciled" below) rather than introducing a
conflicting D1–D4.
**Context source:** Approved B/D scoping plan, reconciled on execution
against newer ratified wiki content discovered on the (out-of-band
rebased) branch.

## Decision

The Apricot Lane replication ask was decomposed into four sub-projects on
a monitoring-first spine. Quoting the A1 ADR verbatim:

> The Apricot Lane replication ask was decomposed into four sub-projects on a
> **monitoring-first spine**:
>
> - **A** Ecological monitoring & habitat
> - **B** Biological systems engineering
> - **C** Transition economics (covenant-bounded — riba/gharar handled in C's own spec)
> - **D** End-to-end operating loop
>
> Only **A1 (the monitoring spine + dashboard)** was specced and built this
> session. B/C/D and A2 (habitat allocation) are deferred to their own specs.

State of the four tracks as of 2026-05-18:

- **A** — complete (A1/A2/A3, all committed).
- **B** — was deferred "to its own spec"; both the ratified positioning
  concept and the D0–D5 ADR explicitly state *"B stays track-level until
  it is itself decomposed in a dedicated session."* **This is that
  session.** B1–B5 below is the new, non-conflicting deliverable.
- **C** — intent-only, covenant-bounded, Scholar-Council-gated
  (`stages/design-mtc-transition-economics-review.md`, MILOS `77c3065`).
  Out of scope here.
- **D** — **already decomposed and ratified** this same day as **D0–D5**
  by [[2026-05-18-atlas-land-os-positioning-and-d-roadmap]] (Status:
  accepted) + [[land-os-positioning]]. Not re-decomposed here.

B is explicitly **non-covenant** — nothing in it touches capital
channels, surplus, offsets, credits, or payment economics (C's exclusive,
gated domain). B decisions rest on ecological correctness alone.

## Sub-project B — Biological Systems Engineering (full decomposition)

The biological *shells* already exist (plant-systems, livestock,
soil-fertility, habitat-allocation, biodiversity-monitor modules;
`polycultureStore.ts`, `livestockStore.ts`,
`successionMilestone.schema.ts`, `vegetationPatch.schema.ts`, guild
presets, intervention catalog). B adds the **design-integrity logic
inside them** — additive front-end + store + goal-tree criteria, in line
with the ratified "B closes the biological observe→act feedback, depends
on the A monitoring spine" framing. No new PlanModule is strictly
required; B deepens existing modules.

| Part | Scope | Builds on (reuse) | Module home |
|---|---|---|---|
| **B1 — Plant-system design integrity** | Companion-planting constraint checker (allelopathy, spacing, maturity-sync over guild members) + a Year0→Year30 succession-path designer | `polycultureStore.ts` (Guild/GuildLayer), `guildLayerOrder.ts`, `guildPresets.ts`, `successionMilestone.schema.ts`, plant-systems cards | plant-systems |
| **B2 — Soil food-web layer** | Root-exudate / mycorrhizal profile mapping per species feeding a soil-biology design view; compost / vermicompost / compost-tea cycle planning | plant catalog, soil-fertility module, `regen-soil-*` criteria | soil-fertility |
| **B3 — Rotational-grazing sequencer** | Paddock-move calendar vs. forage recovery / rest-period math; animal-integration carrying-capacity | `livestockStore.ts` (Paddock, stockingDensity, PastureQuality, AU factors), `livestock-*` criteria | livestock |
| **B4 — Guild↔livestock↔silvopasture integration** | Which guilds shade/shelter/fodder which herds; guild→livestock browse/fodder matrix; plant-diversity engineering | the existing `silvopastureId` pointer on both Guild and Paddock; B1 + B3 outputs | plant-systems / livestock (cross) |
| **B5 — Beneficial-organism habitat spec** | Guild/hedge/pond/box inventory feeding habitat & biodiversity outcomes; cover-crop & living-roots planning | habitat-allocation (A2) + biodiversity-monitor (A3) registries; B1 | habitat-allocation |

**Build order & rationale:** B1 first (design correctness — everything
downstream assumes valid guilds) → B2 (soil substrate) → B3 (grazing,
independent of B2) → **B4 depends on B1 + B3** (integration) → **B5
depends on B1 + B4** (habitat/biodiversity outcomes close the loop back to
the A-series). Only B4/B5 *may* warrant a new cross-cutting card surface;
decided per-part at build time, not here.

## Sub-project D — superseded / reconciled (NOT decomposed here)

The approved plan called for a D1–D4 decomposition plus a flagged
additive-vs-backend decision. On execution this was found to **conflict
with an accepted ADR ratified the same day**:
[[2026-05-18-atlas-land-os-positioning-and-d-roadmap]] (Status: accepted)
already decomposes D into the sequenced **D0–D5** backlog, affirms the
load-bearing **C-vs-D covenant boundary** (D3/D5 = project cost/budget
tracking & operating analytics only; financing/capital/advance-purchase/
investor/yield-as-return framing stays in covenant-bounded C; no
riba/gharar in any D surface), and sets *"the A-series pattern is the
default for D — additive only, no DB migration, client-side-first —
unless a slice's own spec justifies otherwise."*

Per CLAUDE.md (flag contradictions; do not overwrite ratified content),
this document **does not re-decompose D**. The ratified D0–D5 backlog is
authoritative. The earlier draft's analysis is retained here only as
**non-binding prior input**, already consistent with the ratified ADR:

- The "plan↔event linkage" and "operating-loop cockpit" concerns map onto
  ratified **D0** (operating-loop spine & data model) and **D5**
  (operating dashboards & adaptive recommendations); the "act→observe
  prompt" concern maps onto **D4** (field execution & proof).
- The additive-vs-backend question is **already governed** by the
  ratified ADR's standing rule: additive front-end-only (`taskId` in the
  schemaless `regeneration_events.observations` JSONB, client-side
  aggregation — the A1/A3 mechanism) is the default; any schema/API
  extension (`event.parentTaskId` column + an aggregation endpoint) must
  be justified by the relevant D-slice's own spec. No separate flagged
  decision is opened here — that governance already exists.

## Constraints inherited from the A-series

Any B part that adds a PlanModule must satisfy the **6-touchpoint
registration contract** (the `never`-guarded switch +
`Record<PlanModule,_>` maps fail tsc if any touchpoint is missed):
`types.ts` (union + `PLAN_MODULES` + `PLAN_MODULE_LABEL` +
`PLAN_MODULE_FULL_LABEL` + `MODULE_CARDS`), `PlanViewContext.tsx`
(`PLAN_MODULE_SCOPE`), `PlanChecklistAside.tsx` (`PLAN_MODULE_GUIDANCE`),
`data/planModulePalette.ts` (dot colour),
`data/planModuleArtifactPresence.ts` (`never`-guarded switch),
`PlanModuleSlideUp.tsx` (lazy import + render switch). Most B parts deepen
existing modules and skip this contract; only B4/B5 *may* introduce one.

- **Additive-first covenant:** prefer no DB migration / no new endpoint;
  any deviation is its own documented ADR.
- **Goal-tree pattern:** new sub-goals are siblings in `REGENERATIVE_FARM`
  (`apps/web/src/v3/plan/data/goalTreeTemplates.ts`), criterion IDs
  mirrored in any metric registry; intervention entries in
  `apps/web/src/v3/plan/data/interventionCatalog/`.
- **Verification rigor (per built part, not this doc):** tsc clean
  (`apps/web` + `packages/shared`), vitest green, vite build; the
  screenshot-honesty rule.

## Verification (scoping doc — correctness, not tests)

- Decomposition quoted verbatim from the A1 ADR; B1–B5 each name concrete
  reuse targets with paths; build order states its dependency rationale.
- **Cross-source consistency checked.** The earlier D1–D4 draft was
  caught contradicting the accepted D0–D5 ADR and was **withdrawn**, not
  committed; D now defers to the ratified roadmap. B1–B5 is consistent
  with the ratified "B stays track-level until decomposed in a dedicated
  session" and "B closes the biological observe→act feedback" framing.
- B explicitly non-covenant (no riba/gharar), structurally distinct from
  the gated C.
- **No code touched** — zero edits outside this wiki doc and the
  session-close log/index entries.

## Consequences

- B now has a durable up-front decomposition (B1–B5), mirroring what the
  A-series carried inside its own ADRs. Each B-part is a separate, later,
  approved build; this document sequences them, authorises none.
- **D is not decomposed by this document.** D0–D5 in
  [[2026-05-18-atlas-land-os-positioning-and-d-roadmap]] /
  [[land-os-positioning]] remains the single authoritative D backlog. Any
  future D work orients there, including the additive-vs-backend default
  already encoded in that ADR.
- The originally-planned "combined B/D doc with a flagged D decision" was
  reduced to a B decomposition + D reconciliation because D was ratified
  out-of-band between plan approval and execution. Flagged here rather
  than silently resolved.
- C's covenant gate is unaffected; B progressing does not unblock C, and
  the C-vs-D boundary in the ratified D ADR is untouched.

## References

- [[2026-05-17-atlas-regeneration-monitoring-a1]] — decomposition source
  + ADR template/style; additive-first covenant origin.
- [[2026-05-18-atlas-biodiversity-outcome-monitoring-a3]] — A3 outcome
  monitor; 6-touchpoint precedent; domain-discriminator pattern.
- [[2026-05-18-atlas-land-os-positioning-and-d-roadmap]] +
  [[land-os-positioning]] — **authoritative** ratified D0–D5
  decomposition and C-vs-D covenant boundary; supersedes any D
  decomposition this document might otherwise have proposed.
- A2 Habitat Allocation — commit `c0e12776`.
- Sub-project C scoping spec — `stages/design-mtc-transition-economics-review.md`
  (MILOS `77c3065`); the covenant-gated sibling, out of scope here.
