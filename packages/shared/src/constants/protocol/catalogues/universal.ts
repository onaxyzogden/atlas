// catalogues/universal.ts
//
// The UNIVERSAL standing-protocol catalogue - protocols that apply to EVERY
// project regardless of type, one stratum at a time (S1..S7). This is the
// backbone of the per-type protocol model (mirrors constants/plan/catalogues/
// universal.ts on the objective side): the resolver lays these down first, then
// a project's primary + secondary types add their own deltas on top.
//
// Authoring conventions (see docs/protocols/protocol-authoring-guide.md):
//   - `condition` keeps numeric thresholds as [bracketed tokens]; the operator
//     supplies real values at activation. We encode the PRINCIPLE, not a number.
//   - `severityTier` is the response posture: stop (halt) / respond (make work) /
//     watch (log only) / abundance (observe before acting on a positive signal).
//   - `feeds` are display-only Observe-domain chips (the 16 universal domains).
//   - `source` is always 'universal' here; `stratumId` binds the protocol to the
//     stratum that authors it so the resolved set reads top-to-bottom S1..S7.
//
// Content is DRAFTED from regenerative/permaculture practice for operator
// review (per the 2026-06-03 "I draft full content" ruling); it is not
// transcribed verbatim from a spec table and the operator is the final
// authority on thresholds, cadence, and wording.

import type { StandardProtocolTemplate } from '../../../schemas/protocol/protocol.schema.js';

/**
 * Universal protocols spanning all 7 strata. Reading/decision strata (S1-S4)
 * carry mostly judgment/cyclical re-observation triggers; operational strata
 * (S5-S7) carry the threshold-driven "produces work" protocols. That asymmetry
 * is intentional - protocols are densest where the land is actively managed.
 */
export const UNIVERSAL_PROTOCOL_TEMPLATES: readonly StandardProtocolTemplate[] = [
  // --- S1 Project Foundation ------------------------------------------------
  {
    id: 'u-s1-stewardship-capacity-recheck',
    name: 'Stewardship Capacity Re-check',
    type: 'judgment',
    source: 'universal',
    stratumId: 's1-project-foundation',
    severityTier: 'watch',
    condition:
      'IF available steward labour drops below [committed capacity] OR a key steward departs',
    response:
      'Re-run the stewardship-capacity assessment and re-scope active phases to what can actually be tended.',
    rationale:
      'Keeps the plan honest to who is genuinely available to steward it; over-scoped land degrades faster than under-scoped land.',
    feeds: ['People & Governance'],
  },
  {
    id: 'u-s1-working-agreement-review',
    name: 'Working Agreement Review',
    type: 'cyclical',
    source: 'universal',
    stratumId: 's1-project-foundation',
    severityTier: 'respond',
    condition: 'IF [review interval] elapsed since the working agreement was last affirmed',
    response:
      'Convene the stewards to re-affirm or amend the working agreement that anchors the project.',
    rationale:
      'A foundation agreement left unreviewed silently drifts out of step with how the people and the land have changed.',
    feeds: ['People & Governance', 'Vision'],
  },
  {
    id: 'u-s1-vision-drift-check',
    name: 'Vision Drift Check',
    type: 'judgment',
    source: 'universal',
    stratumId: 's1-project-foundation',
    objectiveId: 's1-vision',
    severityTier: 'watch',
    condition: 'IF an executed action is observed to conflict with a stated vision principle',
    response: 'Pause and reconcile the action against the vision before continuing.',
    rationale:
      'Catches the slow substitution of convenience for intent before it compounds into a project that no longer serves its purpose.',
    feeds: ['Vision'],
  },

  // --- S2 Land Reading ------------------------------------------------------
  {
    id: 'u-s2-baseline-staleness-resurvey',
    name: 'Baseline Staleness Re-survey',
    type: 'judgment',
    source: 'universal',
    stratumId: 's2-land-reading',
    severityTier: 'respond',
    condition: 'IF no observation has been recorded for a land-reading domain in [staleness window]',
    response: 'Schedule a re-survey of that domain so the baseline reflects current ground truth.',
    rationale:
      'A baseline reading is a snapshot, not a fact; land changes, and decisions resting on a stale reading inherit its error.',
    feeds: ['Climate', 'Soil', 'Hydrology', 'Ecology'],
  },
  {
    id: 'u-s2-new-erosion-signal',
    name: 'New Erosion Signal',
    type: 'threshold',
    source: 'universal',
    stratumId: 's2-land-reading',
    objectiveId: 's2-terrain',
    severityTier: 'respond',
    condition: 'IF new erosion or bare-soil extent observed beyond [baseline extent]',
    response: 'Re-read the affected land unit and flag it for design review.',
    rationale:
      'Erosion is the land reporting a failure of cover or water flow; reading it early keeps a gully from becoming a redesign.',
    feeds: ['Soil', 'Hydrology'],
  },
  {
    id: 'u-s2-contamination-signal',
    name: 'Contamination Signal',
    type: 'judgment',
    source: 'universal',
    stratumId: 's2-land-reading',
    severityTier: 'stop',
    condition: 'IF a contamination indicator (chemical, biological, or debris) is observed',
    response:
      'Halt activity in the affected unit and re-assess soil and water safety before any further work.',
    rationale:
      'Contamination is a life-and-safety signal; the cost of pausing is always smaller than the cost of building on poisoned ground.',
    feeds: ['Soil', 'Hydrology', 'Risk & Compliance'],
  },

  // --- S3 Systems Reading ---------------------------------------------------
  {
    id: 'u-s3-flow-anomaly-reassess',
    name: 'Flow Anomaly Re-assessment',
    type: 'judgment',
    source: 'universal',
    stratumId: 's3-systems-reading',
    severityTier: 'respond',
    condition:
      'IF an observed water, nutrient, or energy flow diverges from the documented system map',
    response: 'Re-assess the affected flow and update the systems reading to match what the land is doing.',
    rationale:
      'The system map is a hypothesis; when the land contradicts it, the map is wrong, not the land.',
    feeds: ['Hydrology', 'Soil', 'Energy & Resources'],
  },
  {
    id: 'u-s3-current-use-change',
    name: 'Current-Use Change',
    type: 'judgment',
    source: 'universal',
    stratumId: 's3-systems-reading',
    severityTier: 'watch',
    condition: 'IF current land use changes (lease, neighbouring activity, or access shifts)',
    response: 'Re-read system boundaries and external dependencies against the new context.',
    rationale:
      'A system is defined partly by what surrounds it; a change next door can quietly invalidate an internal assumption.',
    feeds: ['People & Governance', 'Access'],
  },

  // --- S4 Foundation Decisions ----------------------------------------------
  {
    id: 'u-s4-sector-event-zone-review',
    name: 'Sector Event Zone Review',
    type: 'threshold',
    source: 'universal',
    stratumId: 's4-foundation-decisions',
    severityTier: 'respond',
    condition:
      'IF a sector event (fire, flood, extreme wind, or frost beyond [design tolerance]) occurs',
    response: 'Review the zone and sector plan against the observed behaviour of the event.',
    rationale:
      'Sector design is a prediction about energies crossing the site; a real event is the only honest test of that prediction.',
    feeds: ['Climate', 'Risk & Compliance'],
  },
  {
    id: 'u-s4-zone-pressure-review',
    name: 'Zone Pressure Review',
    type: 'judgment',
    source: 'universal',
    stratumId: 's4-foundation-decisions',
    severityTier: 'watch',
    condition: 'IF an activity repeatedly spills outside its assigned zone',
    response: 'Review the zone allocation for that activity against how it is actually used.',
    rationale:
      'Repeated spillover is the design telling you the zone boundary was drawn against the grain of real use.',
    feeds: ['People & Governance', 'Access'],
  },

  // --- S5 System Design -----------------------------------------------------
  {
    id: 'u-s5-water-store-low',
    name: 'Water Store Low',
    type: 'threshold',
    source: 'universal',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF stored water falls below [reserve threshold]',
    response: 'Activate water-conservation measures and review the supply/demand balance.',
    rationale:
      'Water is the first limit on almost every system; crossing the reserve floor is the moment to act, not the moment to notice.',
    feeds: ['Hydrology', 'Built Infrastructure'],
  },
  {
    id: 'u-s5-earthworks-overflow',
    name: 'Earthworks Overflow / Breach',
    type: 'threshold',
    source: 'universal',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF earthworks overflow or breach is observed after a [rain event threshold]',
    response: 'Inspect and repair the earthworks before the next event.',
    rationale:
      'A swale or dam that overtopped once will overtop worse next time; the window to fix it is between events, not during.',
    feeds: ['Hydrology', 'Soil'],
  },
  {
    id: 'u-s5-access-track-erosion',
    name: 'Access Track Erosion',
    type: 'threshold',
    source: 'universal',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF access track erosion or impassability is observed',
    response: 'Repair the track and review its design and drainage.',
    rationale:
      'Access is the circulatory system of the site; a failing track compounds into isolated zones and deferred maintenance everywhere downstream.',
    feeds: ['Access', 'Soil'],
  },
  {
    id: 'u-s5-infrastructure-failure',
    name: 'Infrastructure Failure',
    type: 'judgment',
    source: 'universal',
    stratumId: 's5-system-design',
    severityTier: 'respond',
    condition: 'IF a built-infrastructure component fails or degrades past [service threshold]',
    response: 'Repair or replace it and review the design assumption that failed.',
    rationale:
      'A failure is free design feedback; repairing without reviewing the assumption buys the same failure again.',
    feeds: ['Built Infrastructure'],
  },

  // --- S6 Integration Design (monitoring heartland) -------------------------
  {
    id: 'u-s6-yield-shortfall',
    name: 'Yield Shortfall',
    type: 'threshold',
    source: 'universal',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition: 'IF a system yield falls below [expected yield] for [review window]',
    response: 'Review the integration assumption (inputs, timing, guild) behind that yield.',
    rationale:
      'A persistent shortfall is rarely the plant’s fault; it points at how the element was integrated with everything around it.',
    feeds: ['Plants', 'Economics', 'Monitoring'],
  },
  {
    id: 'u-s6-ecology-indicator-decline',
    name: 'Ecology Indicator Decline',
    type: 'threshold',
    source: 'universal',
    stratumId: 's6-integration-design',
    severityTier: 'respond',
    condition:
      'IF a tracked ecological indicator (species count, ground cover, pollinator presence) declines past [threshold]',
    response: 'Investigate the cause and review the integration design.',
    rationale:
      'Ecological indicators are the early-warning layer; they move before yield does and give the cheapest chance to correct course.',
    feeds: ['Ecology', 'Soil'],
  },
  {
    id: 'u-s6-stewardship-overload',
    name: 'Stewardship Overload',
    type: 'judgment',
    source: 'universal',
    stratumId: 's6-integration-design',
    severityTier: 'watch',
    condition: 'IF maintenance hours exceed the [stewardship-intensity budget] for [window]',
    response: 'Re-balance the design toward a lower-maintenance configuration.',
    rationale:
      'A design that demands more care than the stewards can give is failing regardless of its yield on paper.',
    feeds: ['People & Governance', 'Monitoring'],
  },
  {
    id: 'u-s6-abundance-surplus',
    name: 'Abundance Surplus',
    type: 'judgment',
    source: 'universal',
    stratumId: 's6-integration-design',
    severityTier: 'abundance',
    condition: 'IF a yield consistently exceeds [surplus threshold]',
    response:
      'Begin an observation cycle to design a use, store, or exchange for the surplus before acting on it.',
    rationale:
      'Surplus is a positive signal, not an emergency; permaculture observes the abundance and designs its use rather than reacting.',
    feeds: ['Plants', 'Economics'],
  },

  // --- S7 Phasing & Resourcing ----------------------------------------------
  {
    id: 'u-s7-phase-gate-review',
    name: 'Phase Gate Review',
    type: 'cyclical',
    source: 'universal',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition: 'IF a phase reaches its completion criteria OR its [phase review date] arrives',
    response: 'Run the phase-gate review before committing resources to the next phase.',
    rationale:
      'A gate between phases is where learning from the last phase is allowed to change the next one; skipping it locks in early mistakes.',
    feeds: ['Economics', 'Monitoring'],
  },
  {
    id: 'u-s7-budget-variance',
    name: 'Budget Variance',
    type: 'threshold',
    source: 'universal',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition: 'IF actual spend diverges from the phase budget by more than [variance threshold]',
    response: 'Review the capital schedule and re-sequence the remaining work.',
    rationale:
      'Budget variance caught at the phase level is recoverable; caught at the project level it is a crisis.',
    feeds: ['Economics'],
  },
  {
    id: 'u-s7-material-availability',
    name: 'Material Availability',
    type: 'judgment',
    source: 'universal',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'respond',
    condition: 'IF a scheduled material or input becomes unavailable or exceeds its [cost ceiling]',
    response: 'Trigger a material-substitution review against the design intent.',
    rationale:
      'Resourcing reality changes constantly; a standing substitution trigger keeps a supply shock from stalling a whole phase.',
    feeds: ['Economics', 'Built Infrastructure'],
  },
  {
    id: 'u-s7-labour-shortfall',
    name: 'Labour Shortfall',
    type: 'judgment',
    source: 'universal',
    stratumId: 's7-phasing-resourcing',
    severityTier: 'watch',
    condition: 'IF available labour for an upcoming phase falls below the [required labour]',
    response: 'Re-sequence or re-scope the phase to match the labour actually on hand.',
    rationale:
      'Labour is the resource most often assumed and least often confirmed; checking it before a phase opens prevents half-finished work.',
    feeds: ['People & Governance', 'Economics'],
  },
];
