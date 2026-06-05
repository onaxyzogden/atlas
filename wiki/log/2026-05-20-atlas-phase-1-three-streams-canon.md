# 2026-05-20 — Phase 1: Three Streams Farm site canon

Branch `feat/atlas-permaculture`. Documentation-only. Phase 1 of the
Apricot-Lane-inspired OLOS showcase program ([[log/2026-05-20-atlas-apricot-lane-showcase-program]]):
fix the site canon that every downstream phase (P2 demo seed, P3 portal,
P4 template) will quote verbatim. Follows the Phase-0 blocker close
([[log/2026-05-20-atlas-phase-0-showcase-blocker-close]]) which left the
platform clean for canon-grounded substrate work.

## Outcome

New canon doc [[entities/three-streams-farm.md]] (~2200 words, 11 sections)
+ one-line entry under `## Entities` in [[index.md]]. No code touched.

## Decisions fixed this phase

- **Parcel jurisdiction.** Rural northeast Milton, Halton Region, inside
  Conservation Halton (CH, census 3520), on the Sixteen Mile Creek
  headwaters. All six Tier-1 adapters (NRCan HRDEM, OMAFRA CanSIS, OHN,
  ConservationAuthority, AAFC ACI, ECCC normals, OntarioMunicipal, PGMN)
  verified live for this coverage envelope via direct read of
  `ADAPTER_REGISTRY` + `CONSERVATION_AUTHORITY_REGISTRY` in
  [packages/shared/src/constants/dataSources.ts](../../packages/shared/src/constants/dataSources.ts).
- **Parcel commitment.** Centroid 43.5600 °N, -79.9100 °W; bounding box
  [-79.9145, 43.5560] → [-79.9055, 43.5640]; descriptive locator
  *Lot 14, Concession 6 (geographic Trafalgar Township / now Town of
  Milton)*. Acreage ~180 (inside program-plan 150–250 envelope; distinct
  from the existing 12-acre 351 Glenashton Dr UI fixture). Formal MPAC
  PIN binding deferred to Phase 2 — fabricating a real PIN would violate
  the program's truthfulness constraint.
- **Year-of-Showcase scope.** Composite. Y2 (2026) = primary loadable
  Phase-2 demo state; Y5 (2029) + Y8 (2032) = forward scrollytelling
  scenes in Phase 3, sourced from the same canon. Per user direction on
  the AskUserQuestion this session.
- **Origin substrate.** Degraded continuous-corn / row-crop ground,
  purchased 2024 (Y0), 8-year rehabilitation arc. Fictional.
- **Phasing scaffold.** Yeomans scale-cap sequence
  (*climate → landshape → water → access → trees → buildings →
  subdivision → soil → uncapped*) lifted verbatim from
  [[decisions/2026-05-12-plan-phasestore-yeomans-adapter]], threaded
  through the existing 4-phase scaffold (Y0-1, Y1-3, Y3-5, Y5+) per
  [[log/2026-05-20-olos-new-user-journey-walkthrough]].
- **Monitoring trajectory anchor.** MDPI Apricot Lane study Y0/5/9
  sampling cadence verbatim — anything synthetic in Phase-2 seed will
  be labelled.
- **Audience-tier mapping.** Three tiers (Dreaming / Transitioning /
  Stewarding); each maps to scene-slice, foregrounded metric set, and
  terminal sign-up CTA.
- **Apricot Lane attribution.** Binding wording: *"inspired by farms
  like Apricot Lane Farms and the rehabilitation arc shown in The
  Biggest Little Farm; Three Streams Farm is a fictional Ontario
  operation."* No partnership claim, no brand co-mark.
- **Covenant framing.** No CSRA / salam / advance-purchase / investor /
  yield-share language anywhere in the canon. If capital framing is
  invoked at all it uses "capital partners & allies" per
  [[decisions/2026-05-04-atlas-csra-erasure]]. Yield framing reserved
  for future Scholar-Council-gated work.

## Reused, not built

- Wiki entity-page template from [[entities/shared-package]] (Type /
  Status / Path header; Purpose / Notes section conventions).
- Yeomans cap sequence verbatim from the 2026-05-12 phasestore ADR.
- 4-phase scaffold names verbatim from the walkthrough ADR.
- MDPI Apricot Lane Y0/5/9 sampling cadence verbatim from the
  walkthrough ADR.
- OLOS north-star sentence verbatim from [[concepts/land-os-positioning]].
- Conservation Halton coverage envelope from `CONSERVATION_AUTHORITY_REGISTRY['3520']`.
- Apricot Lane attribution wording verbatim from the showcase-program ADR.

## Out of scope (deferred per program)

- All Phase-2 substrate (seed script, adapter pulls, Observe-module
  population, designed map, A-series monitoring trajectories).
- Phase-3 portal route surface and scrollytelling scenes.
- Phase-4 template extraction and clone flow.
- Filing a separate `wiki/decisions/2026-05-20-atlas-apricot-lane-showcase-program.md`
  ADR — referenced from the program log entry but not yet written to
  disk; tracked as a separate wiki-absorption task (canon back-links it
  conditionally).
- Exact monitoring readings or full guild library — canon names
  categories + representative species; full library is Phase-2 work.

## Verification

- Canon doc structure matches the Phase-1 plan self-review checklist:
  parcel inside CH 3520; acreage 180 (inside 150–250 envelope); no
  CSRA/salam/investor language; Apricot Lane attribution exact;
  OLOS north-star verbatim; Yeomans cap sequence verbatim; 4-phase
  scaffold named; Y2/Y5/Y8 composite explicit; 3-tier audience table;
  each Observe-module → adapter mapping cites the constant from
  `dataSources.ts`; B-track Y2 limitation labelled honestly.
- `git status` shows only `wiki/` paths modified — no code touched.
- Phase-2 dry-run paragraph (in this log only, not committed code):
  the parcel coords + species canon + Y2 scope + adapter mappings are
  sufficient input for the Phase-2 seed script to populate without
  re-asking design questions.

## Next

Phase 2 — curated demo project seed (Artifact A): instantiate Three
Streams Farm in dev/staging DB with adapter-populated Observe modules,
designed map, 8-year Goal Compass scaffold, current-year Act tasks, and
24+ months of seeded A-series monitoring trajectories. Opens its own
brainstorm cycle.

ADR back-links: [[decisions/2026-05-20-olos-new-user-journey-walkthrough]]
(walkthrough that scoped the gap-set Phase 0 closed) and the showcase
program ratification at [[log/2026-05-20-atlas-apricot-lane-showcase-program]]
(program plan that scoped this Phase 1).
