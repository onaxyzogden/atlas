# Permaculture Alignment

## Summary
Atlas is being evaluated against permaculture's three ethics and Holmgren's twelve principles to surface design gaps and prioritise feature work. The assessment was produced 2026-04-28 from a structured 3-round dialogue with the **Permaculture Scholar** NotebookLM (`5aa3dcf3-e1de-44ac-82b8-bad5e94e6c4b`, 44 sources covering the Permaculture Design Course Weeks 1-10, Holmgren principles, ethics, watershed, zones, decision matrix, and regenerative investments). Conversation ID: `48a34396-5525-4a57-9884-108d93b1872f`.

The Scholar's verdict: Atlas is a **brilliant ally but distant cousin** — strong kin in ethical substrate (Amanah Gate, CSRA, gap-analysis humility), foreign in mechanical substrate (rigid merge gates, code-parity culture, deterministic pipelines).

## How It Works

The alignment is tracked along three axes:

### 1. Ethics
| Ethic | Status | Atlas evidence |
|---|---|---|
| Earth Care | **Strong** | Environmental data pipeline (SoilGrids, NWIS/PGMN, GAEZ, NASA POWER) gives designers precise climate/soil/water/groundwater data for ecologically regenerative decisions. |
| People Care | **Partial** | CSRA + financial modelling provide economic security, but framing is technical/financial; missing explicit social-integration surfaces (gathering nodes, harmonious interaction). |
| Fair Share / Future Care | **Partial** | Mission-scoring axis structurally rewards regenerative value beyond profit; no explicit consumption-limiting or systemic-equity mechanism. |

### 2. Holmgren's Twelve Principles
| # | Principle | Status | Notes |
|---|---|---|---|
| 1 | Observe and interact | Represented | Rich data integrations support pre-design study. |
| 2 | Catch and store energy | Partial | Computes demand; doesn't design passive surplus capture (rainwater routing, biomass storage). |
| 3 | Obtain a yield | Represented | Financial model + crop planning. |
| 4 | Self-regulation & feedback | Partial | Scoring gives analytical feedback, not on-the-ground feedback loops. |
| 5 | Renewable resources & services | Partial | Calculates raw entity demand; not designing for passive biological services. |
| 6 | Produce no waste | **Missing** | No mapping of waste cycles, composting, output→input flows. |
| 7 | Patterns to details | Represented | Macro datasets → micro placement. |
| 8 | Integrate rather than segregate | Partial | Co-locates entities; doesn't model functional interconnections between them. |
| 9 | Small & slow solutions | **Missing** | No multi-generational succession modelling. |
| 10 | Diversity | Partial | Mixed entities allowed; scoring doesn't reward polyculture resilience. |
| 11 | Edges & marginal | **Missing** | No optimisation for liminal spaces / borders / habitat intersections. |
| 12 | Respond to change | Partial | Climate-data-driven forecasting; static software can't adapt to unexpected ecological shifts. |

**Tally:** 4 represented · 6 partial · 3 missing.

### 3. Process Alignment

**Where Atlas embodies permaculture methodology:**
- Gap analysis + confidence laddering ≈ "protracted observation" / "land physician diagnosis." See [Gap Analysis](../entities/gap-analysis.md) and the confidence tiers in [Scoring Engine](scoring-engine.md).
- Iterative pipeline (Tier-1 → Tier-3, demand-model round-1 → round-2) embodies "feedback loop is built in." See [Tier-3 Pipeline Cleanup ADR](../decisions/2026-04-21-tier3-pipeline-cleanup.md) and [Demand Model Round 2 ADR](../decisions/2026-04-27-demand-model-round-2.md).

**Where Atlas diverges from permaculture methodology:**
- Pre-flight audits and deterministic merge gates seek to **eliminate** unexpected behaviour. Permaculture **embraces** it — when water unexpectedly pools, the marsh becomes a feature. Engineering culture controls variables; permaculture courts emergence. See [Pre-Flight Audit ADR](../decisions/2026-04-25-pre-flight-audit.md).
- ADR culture is closer to engineering risk-management than permaculture's "Apply self-regulation and accept feedback" — ADRs are static front-loaded justifications, not organic continuous observation of a living system.

**Where the ethical substrate genuinely aligns:**
- The Amanah Gate, mission-scoring, and CSRA framing are **genuinely equivalent** in practice to permaculture's three ethics. CSRA explicitly mirrors Fair Share's rejection of wealth accumulation; the Amanah Gate maps to "ethics-as-trunk-of-the-design-tree." This is structural alignment to lean into, not coincidence.

## Where It's Used

This concept governs feature prioritisation across:
- **Design canvas** (`apps/web/src/features/map/`) — recommendations 1, 2, 6 land here.
- **Scoring engine** (`packages/shared/src/scoring/`) — recommendations 3, 4 add new dimensions / penalty terms.
- **Financial model** (`packages/shared/src/financialModel/`) — recommendation 5 adds biological-substitution calculator.
- **Data layer** (`packages/shared/src/demand/`, layer adapters) — recommendation 1's needs/yields dependency graph requires a new shared module.
- **Process** — pre-flight audits (`scripts/preflight/`) and ADR conventions remain as-is; the recommendation set explicitly does not propose softening engineering rigour.

## Recommendations Backlog

The Scholar produced six ranked recommendations. Two are P0 and have dedicated ADRs; the remaining four are tracked as backlog items.

| # | Title | Priority | Principle / Ethic | ADR / Status |
|---|---|---|---|---|
| 1 | Needs & Yields dependency graph | **P0** | Produce No Waste · Integrate | [ADR 2026-04-28](../decisions/2026-04-28-needs-yields-dependency-graph.md) |
| 2 | Temporal slider (succession & maturity) | **P0** | Small & Slow · Respond to Change · Self-regulation | [ADR 2026-04-28](../decisions/2026-04-28-temporal-slider-succession-modeling.md) |
| 3 | Highest-potential water router | P1 | Catch & Store Energy | Backlog |
| 4 | Edge & connectivity evaluator | P1 | Edges · Diversity | Backlog |
| 5 | Local/biological material substitution calculator | P2 | Renewables · Slow | Backlog |
| 6 | "Nets in the flow" social node generator | P2 | Integrate · People Care | Backlog |

Detailed acceptance criteria for each are in the [permaculture-alignment-backlog.md](../../tasks/permaculture-alignment-backlog.md) ticket file.

## Constraints

1. **Recommendations must cite a permaculture source.** Each backlog item carries a citation to the originating PDC source so that future contributors can verify the framing rather than relitigate it.
2. **Don't soften engineering rigour to look more permaculture-like.** The pre-flight audit, ADR culture, and confidence laddering are kept. The recommendations *add* surfaces; they don't *remove* gates.
3. **Structural ceiling acknowledged.** Even with all six recommendations shipped, a permaculture designer would call Atlas "brilliant ally / distant cousin." Software is diagnostic; the actual medicine still requires hands in the soil. This page exists to close the closable gaps, not to claim biological kinship.
4. **Re-run the Scholar dialogue** when the recommendation set materially changes (new P0/P1 ships, new permaculture sources are added to the notebook). Do not treat this snapshot as canonical permanently.

## Notes

- Source notebook is on a separate Google account from the project's primary NotebookLM auth. Set `NOTEBOOKLM_HOME` per-account or re-`notebooklm login` to switch.
- The CLI's rich console rendering breaks on Windows cp1252 due to emoji titles in source list. Use `--json` or the Python helper at `C:\Temp\ask.py` (one-off scratch script).
- Conversation ID `48a34396-5525-4a57-9884-108d93b1872f` — pass via `-c` to continue this thread.
