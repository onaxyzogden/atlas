// catalogues/recipe/universal.ts
//
// The UNIVERSAL recipe catalogue — the TOTALITY FLOOR of the Act recipe layer.
// Every task a steward can open in the Operations Hub must resolve to SOME
// recipe; this file guarantees that by providing:
//
//   1. one generic Act recipe per UniversalDomain (16) — the `ACT_TEMPLATE`
//      5-step spine (constants/olos/objectives.ts) flavoured by each domain's
//      purpose, ABSORBING the 6 authored `actModuleGuidance.ts` cells
//      (why -> why, how[] -> steps[], pitfall -> pitfall);
//   2. one default recipe per task-source enum value — every `WorkItemSource`,
//      `LivestockWorkKind`, `CommunityWorkKind`, and `FieldActionTaskType`;
//   3. a single universal-default recipe, the absolute last-resort fallback.
//
// Mirrors constants/protocol/catalogues/universal.ts: the resolver lays these
// down first, then a project's primary/secondary recipe catalogues add deltas.
//
// Authoring conventions:
//   - `authored` recipes are DRAFTED from named regenerative/permaculture
//     practice (Mollison/Holmgren, Savory, Yeomans) for operator review — the
//     operator is the final authority on wording. They may NOT contain a
//     slaughter/capital/sales step (conformance lint enforces this).
//   - `step.toolIds` reuse the EXACT Act-tool id strings from
//     relationships/objectiveActTools.ts — no new id space.
//   - The one fiqh-sensitive cell (`slaughter-prep`) ships as a `scholar-gated`
//     VERBATIM stub: its step instruction is transcribed character-for-character
//     from the operator-approved husbandry copy in generateLivestockWorkPlan.ts,
//     and `scopeNotes` restates the established operator rulings (on-farm dhakāh
//     only; pigs working-role only; abattoir/commercial → Scholar Council). No
//     new fiqh is fabricated here.

import type {
  RecipeProcedure,
  RecipeStep,
} from '../../../schemas/recipe/recipe.schema.js';
import type { UniversalDomain } from '../../../schemas/universalDomain.schema.js';
import type { WorkItemSource } from '../../../schemas/workItem.schema.js';
import type { LivestockWorkKind } from '../../../schemas/livestockWork/livestockWork.schema.js';
import type { CommunityWorkKind } from '../../../schemas/communityWork/communityWork.schema.js';
import type { FieldActionTaskType } from '../../../schemas/fieldAction/fieldAction.schema.js';
import {
  UNIVERSAL_DOMAINS,
  UNIVERSAL_DOMAIN_LABELS,
  UNIVERSAL_DOMAIN_PURPOSE,
} from '../../universalDomain.js';
import { step, withSpine } from './_builders.js';

// ---------------------------------------------------------------------------
// 1. Generic recipe per UniversalDomain (absorbing the 6 authored guidance cells)
// ---------------------------------------------------------------------------

interface DomainAuthoring {
  /** Recipe-level why (from actModuleGuidance.why where authored). */
  why: string;
  /** Recipe-level pitfall (from actModuleGuidance.pitfall where authored). */
  pitfall?: string;
  /** Body steps between the spine front and back. */
  body: RecipeStep[];
}

const GENERIC_PITFALL =
  'Treating execution as done before it is verified — without dated proof there is no way to tell finished work from work that merely looks finished.';

/** A non-authored domain: the bare ACT_TEMPLATE execute step, purpose as rationale. */
function genericDomainBody(domain: UniversalDomain): RecipeStep[] {
  return [
    step(
      'execute',
      'Carry out the work',
      'Execute the work; capture progress proof (photo, measurement, note) at key checkpoints.',
      'proof',
      { rationale: UNIVERSAL_DOMAIN_PURPOSE[domain] },
    ),
  ];
}

/** Lift an authored guidance `how[]` array into narration steps. */
function guidanceBody(how: readonly string[], citation: string): RecipeStep[] {
  return how.map((instruction, i) =>
    step(`how-${i + 1}`, `Step ${i + 1}`, instruction, undefined, { citation }),
  );
}

// The 6 authored cells, absorbed VERBATIM from apps/web/.../actModuleGuidance.ts
// (why -> why, how[] -> steps[], pitfall -> pitfall). Unauthored domains fall
// through to genericDomainBody.
const AUTHORED_DOMAINS: Partial<Record<UniversalDomain, DomainAuthoring>> = {
  'plants-food': {
    why: 'Yield is the visible return, but a harvest that is not logged against succession leaves the steward blind to whether the system is maturing or stalling. The harvest module ties each pick to the long succession arc so replanting and gap-filling stay ahead of decline (Mollison succession; Holmgren P3: Obtain a yield).',
    pitfall:
      'Harvesting without recording — without dated yield data there is no way to tell a good year from the start of a long decline.',
    body: guidanceBody(
      [
        'Record every pick in the Harvest log with date, zone, and quantity.',
        'Compare Structure yield against expectation to spot under-performing guilds early.',
        'Step the Succession tracker forward so aging plantings are replaced before they crash, not after.',
      ],
      'Mollison succession; Holmgren P3',
    ),
  },
  'animals-livestock': {
    why: 'Rotational grazing is the engine of soil building, but only if moves match forage recovery — overstaying a cell compacts and bares it, understaying wastes the rest period. The livestock module tracks moves, pasture utilization, and forage quality so the herd works the land rather than mining it (Savory holistic planned grazing; Holmgren P4: self-regulation).',
    pitfall:
      'Moving on a fixed calendar instead of on observed recovery — the rotation looks disciplined on paper while the ground tells a different story.',
    body: guidanceBody(
      [
        'Log each Move and Yield so days-on and rest-period data accumulate per cell.',
        'Read Pasture utilization and Forage quality before the next move; rest a cell that has not recovered.',
        'Watch Browse pressure, Predator hotspots, and the Welfare access audit so animal health and habitat are not traded against grazing pressure.',
      ],
      'Savory holistic planned grazing; Holmgren P4',
    ),
  },
  'built-infrastructure': {
    why: 'Earthworks, water lines, and structures are built once and lived with for decades. The build module keeps construction sequenced (water and access before structures) and costed against the budget so one phase does not overrun the corpus that funds the next (Yeomans Scale of Permanence; Holmgren P7: Design from patterns to details).',
    pitfall:
      'Building structures before the water and access they depend on are settled — a Keyline-order violation that forces expensive retrofits.',
    body: guidanceBody(
      [
        'Track each build against the Build Gantt so dependencies (water → access → structures) stay in order.',
        'Log spend on Budget vs actuals as it happens; flag any phase trending over before it eats the next phase budget.',
        'Use Pilot plots to prove a technique at small scale before committing the full phase.',
        'Log every breakage, repair, and observation in the Event log so patterns surface over time.',
        'Work the Maintenance schedule for recurring upkeep; close tasks only when verified done on the ground.',
        'Check the Irrigation manager and Waste routing so water and nutrient loops keep flowing to their destinations.',
      ],
      'Yeomans Scale of Permanence; Holmgren P7',
    ),
  },
  'people-governance': {
    why: 'A farm is embedded in a human system — labour, knowledge, markets, and mutual aid all flow through relationships. The network module keeps the people-and-tech web legible so the project draws on its community rather than carrying every load alone (Holmgren P8: Integrate rather than segregate; P11: Use edges and value the marginal).',
    pitfall:
      'Letting relationships go transactional and undocumented — when the network lives only in one person’s memory, it collapses the moment they step away.',
    body: guidanceBody(
      [
        'Maintain the Network CRM — who supplies, buys, advises, and helps, and when they were last in contact.',
        'Plan Community events that bring labour and knowledge onto the land (work days, harvest gatherings, teaching).',
        'Record Appropriate tech adopted or shared so useful tools propagate through the network.',
      ],
      'Holmgren P8, P11',
    ),
  },
  'economics-capacity': {
    why: 'Field work is governed by weather and season, not the calendar alone. The schedule module aligns tasks to the forecast and the year’s rhythm so labour lands in the right window — the right job at the wrong time is wasted work (Holmgren P1: Observe & interact).',
    pitfall:
      'Scheduling by date instead of by weather and season — planting or earthworks forced into the wrong window cost far more than they save.',
    body: guidanceBody(
      [
        'Read the Weather forecast before committing the week’s field tasks; defer soil-disturbing work ahead of heavy rain.',
        'Lay recurring and one-off operations onto the Event calendar so seasonal windows are not missed.',
        'Reconcile the schedule against the tracker and maintenance queues so nothing critical falls between them.',
      ],
      'Holmgren P1',
    ),
  },
  'monitoring-records': {
    why: 'Act begins where Plan ends: the execution tracker turns the costed, phased plan into live work, surfacing which phase tasks are in progress, blocked, or done against the resourcing actually available. The plan is a hypothesis until execution tests it (Holmgren P1: Observe & interact).',
    pitfall:
      "Treating the tracker as a static to-do list — if it isn't reconciled against real resourcing each cycle, the plan drifts from the ground and “done” stops meaning verified.",
    // Verbatim absorption of the monitoring-records guidance how[] (tracker +
    // review collision group). "capital" here is project resourcing (labour /
    // capital / materials), NOT a financing instrument — the conformance lint
    // targets advance-purchase / investor / riba patterns, not this word.
    body: guidanceBody(
      [
        'Open the Plan tracker to see every phase task with its current status and dependency order.',
        'Reconcile Resourcing — match labour, capital, and materials against the tasks queued for this window.',
        'Re-sequence or defer tasks whose prerequisites slipped, rather than starting downstream work on an unfinished foundation.',
        'Revisit the Ongoing SWOT each season — retire resolved items, add newly emerged strengths and threats.',
        'Keep Hazard plans current for fire, flood, frost, and disease, with the response steps written before the event.',
        'Feed every lagging review verdict back to the upstream module (water, soil, livestock) that owns the fix.',
      ],
      'Holmgren P1',
    ),
  },
};

function domainRecipe(domain: UniversalDomain): RecipeProcedure {
  const authored = AUTHORED_DOMAINS[domain];
  const why = authored?.why ?? UNIVERSAL_DOMAIN_PURPOSE[domain];
  const pitfall = authored?.pitfall ?? GENERIC_PITFALL;
  const body = authored?.body ?? genericDomainBody(domain);
  return {
    id: `u-recipe-domain-${domain}`,
    title: `Carry out & verify — ${UNIVERSAL_DOMAIN_LABELS[domain]}`,
    domain,
    source: 'universal',
    provenanceTier: 'authored',
    why,
    steps: withSpine(body),
    pitfall,
    scholarCouncilGated: false,
    feeds: [UNIVERSAL_DOMAIN_LABELS[domain]],
  };
}

/** Generic recipe for every one of the 16 universal domains. */
export const UNIVERSAL_DOMAIN_RECIPES: Record<UniversalDomain, RecipeProcedure> =
  Object.fromEntries(
    UNIVERSAL_DOMAINS.map((d) => [d, domainRecipe(d)]),
  ) as Record<UniversalDomain, RecipeProcedure>;

// ---------------------------------------------------------------------------
// 2. Default recipe per task-source enum value
// ---------------------------------------------------------------------------

interface KindRecipeOpts {
  domain?: UniversalDomain;
  pitfall?: string;
  feeds?: string[];
}

/** Build a compact authored kind recipe: spine front + body + spine back. */
function kindRecipe(
  id: string,
  title: string,
  why: string,
  body: RecipeStep[],
  opts: KindRecipeOpts = {},
): RecipeProcedure {
  return {
    id,
    title,
    ...(opts.domain ? { domain: opts.domain } : {}),
    source: 'universal',
    provenanceTier: 'authored',
    why,
    steps: withSpine(body),
    ...(opts.pitfall ? { pitfall: opts.pitfall } : {}),
    scholarCouncilGated: false,
    feeds: opts.feeds ?? [],
  };
}

// --- WorkItemSource (13) ---------------------------------------------------
export const UNIVERSAL_WORK_ITEM_SOURCE_RECIPES: Record<
  WorkItemSource,
  RecipeProcedure
> = {
  'goal-compass': kindRecipe(
    'u-recipe-work-goal-compass',
    'Advance a goal-compass objective',
    'Goal-compass work items carry a strategic objective down to a concrete field action. The point is to move the objective forward by one verifiable increment, not to treat it as a vague aspiration.',
    [
      step(
        'execute',
        'Take the next concrete step',
        'Carry out the single increment this work item represents and capture proof tied back to its parent objective.',
        'proof',
      ),
    ],
    { domain: 'vision-intent' },
  ),
  'field-task': kindRecipe(
    'u-recipe-work-field-task',
    'Complete the field task',
    'A field task is the atomic unit of on-the-ground work. Execute it within its window and record proof so the objective rollup reflects what actually happened.',
    [
      step(
        'execute',
        'Do the work on the ground',
        'Carry out the field task; photograph or measure the result at the key checkpoint.',
        'proof',
      ),
    ],
  ),
  maintenance: kindRecipe(
    'u-recipe-work-maintenance',
    'Carry out scheduled maintenance',
    'Maintenance keeps built systems and plantings in service. Recurring upkeep done on schedule is far cheaper than the failure it prevents (Yeomans Scale of Permanence — structures are lived with for decades).',
    [
      step(
        'execute',
        'Service the asset',
        'Carry out the maintenance, then log the work in the Event log so patterns of wear surface over time.',
        'proof',
      ),
    ],
    {
      domain: 'built-infrastructure',
      pitfall:
        'Deferring upkeep until failure — reactive repair costs more and strands the systems that depend on the failed asset.',
    },
  ),
  'scheduled-livestock-move': kindRecipe(
    'u-recipe-work-livestock-move',
    'Move stock to the next cell',
    'A planned rotation move only builds soil if it matches forage recovery. Read the destination cell before opening the gate, not after (Savory holistic planned grazing).',
    [
      step(
        'check-recovery',
        'Check the destination cell',
        'Confirm the next cell has recovered enough forage before moving; rest it longer if it has not.',
        'reading',
        { toolIds: ['paddocks'] },
      ),
      step(
        'move',
        'Move the herd',
        'Move the stock and log the move so days-on and rest-period data accumulate per cell.',
        'proof',
        { toolIds: ['livestock', 'paddocks'] },
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'nursery-batch': kindRecipe(
    'u-recipe-work-nursery-batch',
    'Tend the nursery batch',
    'A nursery batch is a cohort of young stock moving toward field-readiness. Consistent tending and accurate batch records are what make later planting predictable.',
    [
      step(
        'tend',
        'Tend and assess the batch',
        'Water, pot-on, or harden-off as the batch stage requires; record survival and readiness against the batch.',
        'proof',
      ),
    ],
    { domain: 'plants-food' },
  ),
  'cover-crop': kindRecipe(
    'u-recipe-work-cover-crop',
    'Establish the cover crop',
    'Cover crops armour bare soil, fix nitrogen, and feed the soil biology between cash crops. Timing the sowing to the window is most of the battle (Holmgren P3: Obtain a yield, including the soil yield).',
    [
      step(
        'sow',
        'Sow into the window',
        'Sow the cover-crop mix into a prepared bed within its seasonal window; record species and date.',
        'proof',
      ),
    ],
    { domain: 'plants-food' },
  ),
  'rotation-sequence': kindRecipe(
    'u-recipe-work-rotation-sequence',
    'Advance the rotation sequence',
    'A rotation sequence steps a bed or paddock through its planned succession of crops or grazing. Advancing it on schedule preserves the soil-health logic the rotation was designed around.',
    [
      step(
        'advance',
        'Step the rotation forward',
        'Carry out the next entry in the rotation and record it so the sequence stays aligned with the plan.',
        'proof',
      ),
    ],
    { domain: 'plants-food' },
  ),
  'habitat-feature': kindRecipe(
    'u-recipe-work-habitat-feature',
    'Install the habitat feature',
    'Habitat features (hedgerows, ponds, beetle banks, nest boxes) build the biodiversity that regulates pests and pollinates crops (Holmgren P10: Use and value diversity).',
    [
      step(
        'install',
        'Build the feature on the ground',
        'Install the habitat feature at its mapped location and record it as an as-built.',
        'proof',
        { toolIds: ['wildlife-sector'] },
      ),
    ],
    { domain: 'ecology' },
  ),
  'tree-planting': kindRecipe(
    'u-recipe-work-tree-planting',
    'Plant the trees',
    'Trees are the slowest, longest-lived element of the system — planting them well, in the right place, at the right depth, is a decision lived with for decades.',
    [
      step(
        'plant',
        'Plant and protect',
        'Plant each tree at its mapped position, mulch and protect it from browse, and record it as an as-built.',
        'proof',
        { toolIds: ['orchards'] },
      ),
    ],
    { domain: 'plants-food' },
  ),
  agroforestry: kindRecipe(
    'u-recipe-work-agroforestry',
    'Implement the agroforestry layout',
    'Agroforestry integrates trees with crops or grazing so the layers stack yields in the same space (Holmgren P8: Integrate rather than segregate).',
    [
      step(
        'implement',
        'Set out the layout',
        'Establish the agroforestry rows/alleys as designed and record the as-built geometry.',
        'proof',
        { toolIds: ['orchards', 'paddocks'] },
      ),
    ],
    { domain: 'plants-food' },
  ),
  'livestock-plan': kindRecipe(
    'u-recipe-work-livestock-plan',
    'Carry out the livestock-plan task',
    'This task was compiled from the approved livestock plan. Execute it as specified and record proof so the husbandry record stays current.',
    [
      step(
        'execute',
        'Carry out the husbandry task',
        'Perform the livestock-plan task and record the outcome against the herd.',
        'proof',
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'community-plan': kindRecipe(
    'u-recipe-work-community-plan',
    'Carry out the community-plan task',
    'This task was compiled from the approved community/governance plan. Carry it out and record the outcome so the governance log stays current.',
    [
      step(
        'execute',
        'Carry out the governance task',
        'Perform the community-plan task and record the outcome in the governance log.',
        'decision',
      ),
    ],
    { domain: 'people-governance' },
  ),
  manual: kindRecipe(
    'u-recipe-work-manual',
    'Carry out the task',
    'A manually-created work item has no upstream source — it is whatever the steward added. Carry it out and record proof so it rolls up like any other work.',
    [
      step(
        'execute',
        'Carry out the work',
        'Do the work this item describes and capture proof at the key checkpoint.',
        'proof',
      ),
    ],
  ),
};

// --- LivestockWorkKind (14) ------------------------------------------------

/**
 * The operator-approved husbandry slaughter copy, transcribed VERBATIM from
 * generateLivestockWorkPlan.ts (the only authority for this string). Used as the
 * sole step instruction of the scholar-gated slaughter-prep recipe — no new
 * procedure is authored here.
 */
const SLAUGHTER_PREP_VERBATIM =
  'Confirm dhakah readiness before any stock are taken for meat: sharp blade prepared out of sight, Tasmiyah, calm handling, full blood drainage, and the slaughter record kept with the stock register.';

/**
 * Restatement of the ESTABLISHED operator rulings that gate this pathway (pigs
 * working-role only; on-farm dhakāh/Udhiyah only; abattoir/commercial-scale and
 * any sale of meat → Scholar Council). No new fiqh is introduced; this surfaces
 * the existing gate verbatim alongside the gated recipe.
 */
const SLAUGHTER_PREP_SCOPE_NOTES =
  'Scholar-Council-gated. On-farm dhakāh (Udhiyah) pathway only; pigs (khinzir) are working-role only and never yield a meat or consumption pathway under any input. Any abattoir or commercial-scale slaughter, and any sale of the meat, is routed to Scholar Council review before adoption — never defaulted, never auto-generated.';

export const UNIVERSAL_LIVESTOCK_KIND_RECIPES: Record<
  LivestockWorkKind,
  RecipeProcedure
> = {
  'welfare-check': kindRecipe(
    'u-recipe-livestock-welfare-check',
    'Carry out the welfare check',
    'A welfare check is the steward’s daily covenant with the animals in their care — water, feed, soundness, and shelter confirmed before anything else (Holmgren P1: Observe & interact).',
    [
      step(
        'observe',
        'Walk and observe the stock',
        'Walk the mob and confirm each animal is sound, fed, watered, and sheltered; flag any concern.',
        'reading',
        { toolIds: ['livestock'] },
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'feed-water-check': kindRecipe(
    'u-recipe-livestock-feed-water',
    'Check feed and water',
    'Stock can go off water in hours in heat or after a trough failure. Confirming supply before it runs short is the cheapest welfare insurance there is.',
    [
      step(
        'check',
        'Confirm feed and water supply',
        'Check troughs, lines, and feed stores are clean, flowing, and adequate for the mob and the weather.',
        'reading',
        { toolIds: ['tanks', 'water-lines'] },
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'health-treatment': kindRecipe(
    'u-recipe-livestock-health-treatment',
    'Administer the health treatment',
    'A health treatment is a targeted intervention. Record dose, date, and withholding so the treatment is traceable and the animal record stays honest.',
    [
      step(
        'treat',
        'Administer and record',
        'Administer the treatment as prescribed and record dose, date, and any withholding period against the animal.',
        'proof',
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  vaccination: kindRecipe(
    'u-recipe-livestock-vaccination',
    'Carry out the vaccination',
    'Vaccination protects the mob against known disease pressure. The schedule and the batch record are what make the protection real rather than assumed.',
    [
      step(
        'vaccinate',
        'Vaccinate and record',
        'Vaccinate the mob per schedule and record product, batch, and date against the animals treated.',
        'proof',
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'parasite-monitoring': kindRecipe(
    'u-recipe-livestock-parasite-monitoring',
    'Monitor parasite burden',
    'Monitoring parasite burden before treating avoids both under-treatment (animal suffers) and blanket-treatment (resistance builds). Measure, then decide (Holmgren P4: Apply self-regulation).',
    [
      step(
        'sample',
        'Sample and read the burden',
        'Take the relevant samples or counts and record the parasite burden so treatment is decided on evidence, not habit.',
        'reading',
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'breeding-event': kindRecipe(
    'u-recipe-livestock-breeding-event',
    'Manage the breeding event',
    'Breeding events set the herd’s next generation. Recording mating, expected dates, and outcomes keeps the breeding plan and the carrying-capacity maths in step.',
    [
      step(
        'record',
        'Carry out and record the event',
        'Manage the breeding event and record the pairing and expected dates against the herd.',
        'proof',
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'fence-integrity-check': kindRecipe(
    'u-recipe-livestock-fence-integrity',
    'Check fence integrity',
    'A rotation is only as good as the fence that holds it. A single failure undoes the rest period and risks stock on the road — walk the line before you trust it.',
    [
      step(
        'walk',
        'Walk and test the fence',
        'Walk the boundary and internal fences, test energiser and tension, and flag any breach for repair.',
        'reading',
        { toolIds: ['fencing', 'gates'] },
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'tree-protection-check': kindRecipe(
    'u-recipe-livestock-tree-protection',
    'Check tree protection',
    'Newly-integrated trees and grazing animals are in tension until the trees are above browse height. Guards and the browse window are what let both share the ground (silvopasture integrated browse window).',
    [
      step(
        'inspect',
        'Inspect guards and browse damage',
        'Inspect tree guards and protected stems for browse damage; repair protection before the next graze.',
        'reading',
        { toolIds: ['orchards'] },
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'contingency-review': kindRecipe(
    'u-recipe-livestock-contingency-review',
    'Review the contingency plan',
    'Drought, disease, and feed-gap contingencies must be current before the event, not improvised during it. A standing review keeps the destock/shelter/feed plan honest.',
    [
      step(
        'review',
        'Re-affirm the contingency plan',
        'Review the contingency triggers and responses, update them to current conditions, and record the review.',
        'decision',
      ),
    ],
    { domain: 'risk-compliance' },
  ),
  'graze-rest-review': kindRecipe(
    'u-recipe-livestock-graze-rest-review',
    'Review graze and rest periods',
    'The whole rotation logic lives in the balance between days grazed and days rested. Reviewing it against observed recovery is how the plan stays matched to the land (Savory holistic planned grazing).',
    [
      step(
        'review',
        'Reconcile grazing against recovery',
        'Review days-on and rest-period data against observed recovery and adjust the rotation where the ground disagrees with the plan.',
        'reading',
        { toolIds: ['paddocks'] },
      ),
    ],
    { domain: 'animals-livestock' },
  ),
  'records-reconciliation': kindRecipe(
    'u-recipe-livestock-records-reconciliation',
    'Reconcile the stock records',
    'The stock register is the source of truth for numbers, health, and provenance. Reconciling it against the ground each cycle keeps every downstream decision trustworthy.',
    [
      step(
        'reconcile',
        'Reconcile register against ground',
        'Count and reconcile the stock register against the animals actually present; correct discrepancies and record the reconciliation.',
        'reading',
      ),
    ],
    { domain: 'monitoring-records' },
  ),
  'slaughter-prep': {
    id: 'u-recipe-livestock-slaughter-prep',
    title: 'Halal slaughter pathway preparation',
    domain: 'animals-livestock',
    source: 'universal',
    provenanceTier: 'scholar-gated',
    scholarCouncilGated: true,
    why: 'On-farm dhakāh preparation for the Udhiyah pathway. This recipe is Scholar-Council-gated and ships as a verbatim stub: the single step below is the operator-approved husbandry copy, transcribed character-for-character. No procedure is authored beyond it.',
    scopeNotes: SLAUGHTER_PREP_SCOPE_NOTES,
    steps: [
      step(
        'dhakah-readiness',
        'Confirm dhakāh readiness',
        SLAUGHTER_PREP_VERBATIM,
        'verification',
        { scopeNotes: SLAUGHTER_PREP_SCOPE_NOTES },
      ),
    ],
    feeds: ['Animals, Livestock & Wildlife'],
  },
  custom: kindRecipe(
    'u-recipe-livestock-custom',
    'Carry out the husbandry task',
    'A custom husbandry task is whatever the steward added outside the standard cadences. Carry it out and record the outcome against the herd.',
    [
      step(
        'execute',
        'Carry out the task',
        'Perform the custom husbandry task and record the outcome against the affected stock.',
        'proof',
      ),
    ],
    { domain: 'animals-livestock' },
  ),
};

// --- CommunityWorkKind (9) -------------------------------------------------
export const UNIVERSAL_COMMUNITY_KIND_RECIPES: Record<
  CommunityWorkKind,
  RecipeProcedure
> = {
  'governance-meeting': kindRecipe(
    'u-recipe-community-governance-meeting',
    'Hold the governance meeting',
    'Governance meetings are where the community’s decisions are actually made and recorded. A meeting whose decisions are not minuted may as well not have happened.',
    [
      step(
        'convene',
        'Convene and minute the meeting',
        'Hold the meeting against its agenda and record decisions and action owners in the governance log.',
        'decision',
      ),
    ],
    { domain: 'people-governance' },
  ),
  'commons-review': kindRecipe(
    'u-recipe-community-commons-review',
    'Review the commons',
    'Shared resources degrade without stewardship of the commons itself. A standing review keeps use, maintenance, and access fair and current.',
    [
      step(
        'review',
        'Assess shared-resource condition',
        'Review the condition and use of the shared commons and record any maintenance or access decisions.',
        'decision',
      ),
    ],
    { domain: 'people-governance' },
  ),
  'adaptive-review': kindRecipe(
    'u-recipe-community-adaptive-review',
    'Run the adaptive review',
    'Adaptive management closes the loop: what was decided, what happened, what changes. The review is where the community learns rather than just records (Holmgren P4: self-regulation and feedback).',
    [
      step(
        'review',
        'Compare intent against outcome',
        'Review outcomes against the decisions that produced them and record the adaptations agreed.',
        'decision',
      ),
    ],
    { domain: 'people-governance' },
  ),
  'five-year-review': kindRecipe(
    'u-recipe-community-five-year-review',
    'Conduct the five-year review',
    'The five-year review steps back from operations to ask whether the whole direction still serves the founding intent. It is the longest feedback loop the community runs.',
    [
      step(
        'review',
        'Re-affirm or amend direction',
        'Review the project against its founding vision over the period and record what is re-affirmed and what is amended.',
        'decision',
      ),
    ],
    { domain: 'vision-intent' },
  ),
  'member-ratification': kindRecipe(
    'u-recipe-community-member-ratification',
    'Ratify the membership decision',
    'Ratification is how a proposal becomes binding. Recording who ratified, when, and by what threshold is what makes the decision defensible later.',
    [
      step(
        'ratify',
        'Hold and record the ratification',
        'Hold the ratification per the agreed threshold and record the result and participants in the governance log.',
        'decision',
      ),
    ],
    { domain: 'people-governance' },
  ),
  'onboarding-step': kindRecipe(
    'u-recipe-community-onboarding-step',
    'Complete the onboarding step',
    'Onboarding turns a newcomer into a contributing steward. Each step done and recorded keeps the path repeatable rather than improvised per person.',
    [
      step(
        'complete',
        'Carry out the onboarding step',
        'Complete this onboarding step with the incoming member and record it against their onboarding path.',
        'decision',
      ),
    ],
    { domain: 'people-governance' },
  ),
  'legal-review': kindRecipe(
    'u-recipe-community-legal-review',
    'Carry out the legal review',
    'Legal and compliance review keeps the project on the right side of the rules it operates under. A standing review catches drift before it becomes liability.',
    [
      step(
        'review',
        'Review compliance status',
        'Review the relevant legal/compliance obligations and record status and any required action.',
        'reference',
      ),
    ],
    { domain: 'risk-compliance' },
  ),
  'settlement-milestone': kindRecipe(
    'u-recipe-community-settlement-milestone',
    'Reach the settlement milestone',
    'Settlement milestones mark the phased build-out of a community on the land. Confirming each before the next preserves the phasing logic and the capacity ceiling it respects.',
    [
      step(
        'confirm',
        'Confirm milestone completion',
        'Confirm the settlement milestone is met against its criteria and record completion before opening the next phase.',
        'verification',
      ),
    ],
    { domain: 'people-governance' },
  ),
  custom: kindRecipe(
    'u-recipe-community-custom',
    'Carry out the community task',
    'A custom community task is whatever the stewards added outside the standard governance cadences. Carry it out and record the outcome in the governance log.',
    [
      step(
        'execute',
        'Carry out the task',
        'Perform the custom community task and record the outcome in the governance log.',
        'decision',
      ),
    ],
    { domain: 'people-governance' },
  ),
};

// --- FieldActionTaskType (4) -----------------------------------------------
export const UNIVERSAL_FIELD_ACTION_TYPE_RECIPES: Record<
  FieldActionTaskType,
  RecipeProcedure
> = {
  field_survey: kindRecipe(
    'u-recipe-fieldaction-field-survey',
    'Carry out the field survey',
    'A survey turns ground truth into a record the whole system can read. Walk the area, capture what is actually there, and tag it to the right overlay (Holmgren P1: Observe & interact).',
    [
      step(
        'survey',
        'Walk and capture the survey',
        'Walk the area, capture the survey readings/photos, and tag them to the relevant overlay.',
        'evidence',
      ),
    ],
    { domain: 'monitoring-records' },
  ),
  monitoring_task: kindRecipe(
    'u-recipe-fieldaction-monitoring-task',
    'Complete the monitoring task',
    'Monitoring is the measurement that tells whether the system is trending toward the plan or away from it. A monitoring task writes one data point through the Observe path.',
    [
      step(
        'measure',
        'Take and record the reading',
        'Take the monitoring reading and record it so it writes through to the Observe stream for this domain.',
        'reading',
      ),
    ],
    { domain: 'monitoring-records' },
  ),
  implementation_task: kindRecipe(
    'u-recipe-fieldaction-implementation-task',
    'Carry out the implementation task',
    'An implementation task builds or changes something on the ground. Execute it as designed and capture proof of the as-built result.',
    [
      step(
        'implement',
        'Build it on the ground',
        'Carry out the implementation as designed and capture proof of the completed as-built.',
        'proof',
      ),
    ],
    { domain: 'built-infrastructure' },
  ),
  administrative_task: kindRecipe(
    'u-recipe-fieldaction-administrative-task',
    'Complete the administrative task',
    'Administrative tasks keep the project’s records, agreements, and obligations current. They are off-the-land work that nonetheless gates on-the-land progress.',
    [
      step(
        'complete',
        'Carry out and file the task',
        'Complete the administrative task and file the resulting record or decision.',
        'reference',
      ),
    ],
    { domain: 'people-governance' },
  ),
};

// ---------------------------------------------------------------------------
// 3. Universal-default — the absolute last-resort fallback
// ---------------------------------------------------------------------------
export const UNIVERSAL_DEFAULT_RECIPE: RecipeProcedure = {
  id: 'u-recipe-universal-default',
  title: 'Carry out & verify this task',
  source: 'universal',
  provenanceTier: 'authored',
  why: 'Every task, whatever its source, follows the same Act arc: confirm the handoff, schedule and resource it, do the work with proof, and verify before signing off. This is the generic backbone used when no more specific recipe applies.',
  steps: withSpine([
    step(
      'execute',
      'Carry out the work',
      'Execute the work; capture progress proof (photo, measurement, note) at key checkpoints.',
      'proof',
    ),
  ]),
  pitfall: GENERIC_PITFALL,
  scholarCouncilGated: false,
  feeds: [],
};

// ---------------------------------------------------------------------------
// Flat list — every universal recipe (iterated by the conformance test + the
// resolver's recipe index). Mirrors UNIVERSAL_PROTOCOL_TEMPLATES.
// ---------------------------------------------------------------------------
export const UNIVERSAL_RECIPES: readonly RecipeProcedure[] = [
  ...Object.values(UNIVERSAL_DOMAIN_RECIPES),
  ...Object.values(UNIVERSAL_WORK_ITEM_SOURCE_RECIPES),
  ...Object.values(UNIVERSAL_LIVESTOCK_KIND_RECIPES),
  ...Object.values(UNIVERSAL_COMMUNITY_KIND_RECIPES),
  ...Object.values(UNIVERSAL_FIELD_ACTION_TYPE_RECIPES),
  UNIVERSAL_DEFAULT_RECIPE,
];
