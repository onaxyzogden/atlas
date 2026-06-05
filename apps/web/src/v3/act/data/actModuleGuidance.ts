/**
 * actModuleGuidance — Operations-Scholar guidance for the Act stage,
 * rebased onto UniversalDomain (slice 3b+3c).
 *
 * Collision groups (canonical insertion order — locked by slice-1
 * vitest):
 *   built-infrastructure ← [build, maintain]
 *   monitoring-records   ← [tracker, review]
 * For collision domains, `how` is the canonical-order concatenation of
 * the colliding modules' `how` arrays; `why` and `pitfall` are
 * first-wins. Unauthored cells ship empty. See ADR
 * 2026-05-26-atlas-universal-domain-step3-cutover.
 */

import type { GuidanceCardData } from '../../_shared/components/GuidanceCard.js';
import type { UniversalDomain } from '@ogden/shared';

const EMPTY: GuidanceCardData = { why: '', how: [], pitfall: '' };

export const ACT_MODULE_GUIDANCE: Record<UniversalDomain, GuidanceCardData> = {
  'vision-intent':        EMPTY,
  'land-base':            EMPTY,
  'climate':              EMPTY,
  'topography':           EMPTY,
  'hydrology':            EMPTY,
  'soil':                 EMPTY,
  'ecology':              EMPTY,
  'plants-food': {
    // ← harvest
    why: 'Yield is the visible return, but a harvest that is not logged against succession leaves the steward blind to whether the system is maturing or stalling. The harvest module ties each pick to the long succession arc so replanting and gap-filling stay ahead of decline (Mollison succession; Holmgren P3: Obtain a yield).',
    how: [
      'Record every pick in the Harvest log with date, zone, and quantity.',
      'Compare Structure yield against expectation to spot under-performing guilds early.',
      'Step the Succession tracker forward so aging plantings are replaced before they crash, not after.',
    ],
    pitfall:
      'Harvesting without recording — without dated yield data there is no way to tell a good year from the start of a long decline.',
  },
  'animals-livestock': {
    // ← livestock
    why: 'Rotational grazing is the engine of soil building, but only if moves match forage recovery — overstaying a cell compacts and bares it, understaying wastes the rest period. The livestock module tracks moves, pasture utilization, and forage quality so the herd works the land rather than mining it (Savory holistic planned grazing; Holmgren P4: self-regulation).',
    how: [
      'Log each Move and Yield so days-on and rest-period data accumulate per cell.',
      'Read Pasture utilization and Forage quality before the next move; rest a cell that has not recovered.',
      'Watch Browse pressure, Predator hotspots, and the Welfare access audit so animal health and habitat are not traded against grazing pressure.',
    ],
    pitfall:
      'Moving on a fixed calendar instead of on observed recovery — the rotation looks disciplined on paper while the ground tells a different story.',
  },
  'built-infrastructure': {
    // ← build (first) + maintain
    why: 'Earthworks, water lines, and structures are built once and lived with for decades. The build module keeps construction sequenced (water and access before structures) and costed against the budget so one phase does not overrun the corpus that funds the next (Yeomans Scale of Permanence; Holmgren P7: Design from patterns to details).',
    how: [
      // build
      'Track each build against the Build Gantt so dependencies (water → access → structures) stay in order.',
      'Log spend on Budget vs actuals as it happens; flag any phase trending over before it eats the next phase budget.',
      'Use Pilot plots to prove a technique at small scale before committing the full phase.',
      // maintain
      'Log every breakage, repair, and observation in the Event log so patterns surface over time.',
      'Work the Maintenance schedule for recurring upkeep; close tasks only when verified done on the ground.',
      'Check the Irrigation manager and Waste routing so water and nutrient loops keep flowing to their destinations.',
    ],
    pitfall:
      'Building structures before the water and access they depend on are settled — a Keyline-order violation that forces expensive retrofits.',
  },
  'access-circulation':   EMPTY,
  'energy-resources':     EMPTY,
  'people-governance': {
    // ← network
    why: 'A farm is embedded in a human system — labour, knowledge, markets, and mutual aid all flow through relationships. The network module keeps the people-and-tech web legible so the project draws on its community rather than carrying every load alone (Holmgren P8: Integrate rather than segregate; P11: Use edges and value the marginal).',
    how: [
      'Maintain the Network CRM — who supplies, buys, advises, and helps, and when they were last in contact.',
      'Plan Community events that bring labour and knowledge onto the land (work days, harvest gatherings, teaching).',
      'Record Appropriate tech adopted or shared so useful tools propagate through the network.',
    ],
    pitfall:
      'Letting relationships go transactional and undocumented — when the network lives only in one person’s memory, it collapses the moment they step away.',
  },
  'economics-capacity': {
    // ← schedule
    why: 'Field work is governed by weather and season, not the calendar alone. The schedule module aligns tasks to the forecast and the year’s rhythm so labour lands in the right window — the right job at the wrong time is wasted work (Holmgren P1: Observe & interact).',
    how: [
      'Read the Weather forecast before committing the week’s field tasks; defer soil-disturbing work ahead of heavy rain.',
      'Lay recurring and one-off operations onto the Event calendar so seasonal windows are not missed.',
      'Reconcile the schedule against the tracker and maintenance queues so nothing critical falls between them.',
    ],
    pitfall:
      'Scheduling by date instead of by weather and season — planting or earthworks forced into the wrong window cost far more than they save.',
  },
  'risk-compliance':      EMPTY,
  'monitoring-records': {
    // ← tracker (first) + review
    why: 'Act begins where Plan ends: the execution tracker turns the costed, phased plan into live work, surfacing which phase tasks are in progress, blocked, or done against the resourcing actually available. The plan is a hypothesis until execution tests it (Holmgren P1: Observe & interact).',
    how: [
      // tracker
      'Open the Plan tracker to see every phase task with its current status and dependency order.',
      'Reconcile Resourcing — match labour, capital, and materials against the tasks queued for this window.',
      'Re-sequence or defer tasks whose prerequisites slipped, rather than starting downstream work on an unfinished foundation.',
      // review
      'Revisit the Ongoing SWOT each season — retire resolved items, add newly emerged strengths and threats.',
      'Keep Hazard plans current for fire, flood, frost, and disease, with the response steps written before the event.',
      'Feed every lagging review verdict back to the upstream module (water, soil, livestock) that owns the fix.',
    ],
    pitfall:
      "Treating the tracker as a static to-do list — if it isn't reconciled against real resourcing each cycle, the plan drifts from the ground and “done” stops meaning verified.",
  },
};
