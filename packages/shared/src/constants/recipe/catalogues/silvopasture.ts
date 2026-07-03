// catalogues/recipe/silvopasture.ts
//
// Bespoke per-objective recipes for the SILVOPASTURE project type — the live
// vertical slice (with homestead). Mirrors constants/protocol/catalogues/
// silvopasture.ts: a PRIMARY set (resolves when silvopasture is the project's
// primary type) and a SECONDARY set (resolves when silvopasture is layered onto
// a host such as a homestead or orchard that adds grazing under trees).
//
// Every recipe here is `authored` — drafted from the named regenerative practice
// the codebase already cites (Savory holistic planned grazing; Yeomans Scale of
// Permanence / Keyline water-before-fences ordering; the silvopasture integrated
// browse window) for OPERATOR REVIEW. None contains a slaughter/capital/sales
// step (the conformance lint forbids it): the fiqh-sensitive husbandry/slaughter
// ground resolves to the universal `scholar-gated` slaughter-prep recipe and the
// upstream verbatim scopeNotes, never to anything authored here. Objectives left
// out of these maps fall back to the universal domain recipe (graceful — exactly
// like a not-yet-encoded protocol objective).

import type { RecipeProcedure } from '../../../schemas/recipe/recipe.schema.js';
import { UNIVERSAL_DOMAIN_LABELS } from '../../universalDomain.js';
import { bespokeRecipe, step } from './_builders.js';

const TYPE = 'silvopasture' as const;

// ---------------------------------------------------------------------------
// PRIMARY — silvopasture as the project's primary type (silv-s* objectives)
// ---------------------------------------------------------------------------
export const SILVOPASTURE_PRIMARY_RECIPES: readonly RecipeProcedure[] = [
  bespokeRecipe({
    id: 'silv-recipe-paddock-layout',
    title: 'Lay out the rotational paddock cells',
    objectiveId: 'silv-s4-paddock-layout',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'animals-livestock',
    stratumId: 's4-foundation-decisions',
    why: 'The cell count and size are what actually set the rest period the pasture receives — the single most important lever in the whole rotation. More, smaller cells mean a longer recovery between grazings and a herd that builds soil rather than mining it (Savory holistic planned grazing).',
    pitfall:
      'Too few, too-large cells — the rest period collapses, the most palatable plants are grazed to death, and the rotation degrades the pasture it was meant to build.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['animals-livestock']],
    body: [
      step(
        'size-cells',
        'Size the cells to the rest period',
        'Divide the grazing area into cells sized so the mob’s planned graze period matches the forage on offer — then count back from the recovery each cell needs to confirm there are enough cells to give it.',
        'decision',
        { toolIds: ['paddocks'], citation: 'Savory holistic planned grazing' },
      ),
      step(
        'mark-cells',
        'Mark the cells and fence lines',
        'Draw the cell boundaries and the fence lines that divide them, working with the contour and the existing water points rather than against them.',
        'map-action',
        { toolIds: ['paddocks', 'fencing'] },
      ),
      step(
        'confirm-water-and-flow',
        'Confirm water and stock flow per cell',
        'Confirm every cell has a water point and a stock-flow route (gate or lane) back to the yards before committing the layout — a cell the mob cannot water or reach cannot hold its graze period.',
        'decision',
        { toolIds: ['gates', 'water-lines'] },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'silv-recipe-stock-water-strategy',
    title: 'Plan the stock-water reticulation',
    objectiveId: 'silv-s4-stock-water-strategy',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'built-infrastructure',
    stratumId: 's4-foundation-decisions',
    why: 'Stock water is the constraint that decides whether a paddock layout can actually rotate. Reticulation planned to storage and gravity keeps every cell watered without hauling, and settling it before the fences is the Keyline ordering (water → access → fences).',
    pitfall:
      'Designing the fence layout before the water it depends on — cells without a reliable trough cannot hold stock through their graze period, forcing expensive re-fencing.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['built-infrastructure']],
    body: [
      step(
        'size-source-storage',
        'Confirm source and size the reserve',
        'Confirm the source and storage that feed the system, sizing the reserve for the hottest, driest stretch the mob will face — not the average day.',
        'decision',
        { toolIds: ['tanks'], citation: 'Yeomans Scale of Permanence' },
      ),
      step(
        'route-lines',
        'Route lines to a trough in every cell',
        'Route the supply lines so a trough reaches every cell, taking fall from storage where the land allows so the system runs on gravity rather than pumping.',
        'map-action',
        { toolIds: ['water-lines', 'tanks'] },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'silv-recipe-tree-integration',
    title: 'Integrate the trees into the pasture',
    objectiveId: 'silv-s4-tree-integration',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'plants-food',
    stratumId: 's4-foundation-decisions',
    why: 'Silvopasture stacks a tree yield and shelter over the grazing without surrendering the pasture beneath. The layout has to hold the browse window open — trees protected until they are above the mob’s reach — while leaving light and lanes for the forage and the rotation.',
    pitfall:
      'Planting trees into the grazing before protection and the browse window are settled — unguarded stems are browsed out in a single graze and the integration fails before it starts.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['plants-food']],
    body: [
      step(
        'set-rows',
        'Set the tree rows and grazing lanes',
        'Set the tree rows so they shelter the pasture and follow the contour, leaving lanes wide enough for the mob and the forage between them to keep their light.',
        'map-action',
        { toolIds: ['orchards', 'paddocks'] },
      ),
      step(
        'plan-protection',
        'Plan the browse-window protection',
        'Plan the guard or temporary exclusion that holds the browse window open for each planting until the stems are above the mob’s reach.',
        'decision',
        { toolIds: ['fencing', 'orchards'], citation: 'Silvopasture integrated browse window' },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'silv-recipe-fencing',
    title: 'Build the rotational fencing',
    objectiveId: 'silv-s5-fencing',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'animals-livestock',
    stratumId: 's5-system-design',
    why: 'The fence is what turns a paddock plan into a working rotation — it holds the rest period and keeps stock off the cells that are recovering. A rotation is only ever as good as the fence and energiser that hold it.',
    pitfall:
      'Under-building the energiser or strain points — one breach during a graze undoes the rest period across the cells the mob walks into, and risks stock on the road.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['animals-livestock']],
    body: [
      step(
        'build-lines',
        'Build the fence lines and gates',
        'Build the cell fences and gates to the marked layout, setting strain posts and the energiser so the whole network holds tension and charge.',
        'proof',
        { toolIds: ['fencing', 'gates'] },
      ),
      step(
        'test-charge',
        'Test charge and containment',
        'Walk and test the energised network end to end, confirming charge reaches the furthest cell and the gates close stock-tight, before the first mob goes in.',
        'verification',
        { toolIds: ['fencing'] },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'silv-recipe-tree-planting',
    title: 'Plant and protect the pasture trees',
    objectiveId: 'silv-s5-tree-planting',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'plants-food',
    stratumId: 's5-system-design',
    why: 'The trees are the slowest, longest-lived element of the silvopasture — planted once and lived with for decades. Planting them well and guarding them through the browse window is what lets the tree layer and the grazing share the same ground.',
    pitfall:
      'Skimping on guards or mulch to plant more trees faster — an unprotected or moisture-starved stem in a grazed pasture is a loss, not an establishment.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['plants-food']],
    body: [
      step(
        'plant',
        'Plant at the mapped positions',
        'Plant each tree at its mapped position and depth, and mulch it to hold moisture through the first seasons.',
        'proof',
        { toolIds: ['orchards'] },
      ),
      step(
        'protect',
        'Guard against browse',
        'Fit the guard or exclusion that holds the browse window open, and record each planting as an as-built so the protection can be tracked until the stems clear the mob’s reach.',
        'proof',
        { toolIds: ['orchards', 'fencing'], citation: 'Silvopasture integrated browse window' },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'silv-recipe-pasture-monitoring',
    title: 'Monitor pasture condition and recovery',
    objectiveId: 'silv-s6-pasture-monitoring',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'monitoring-records',
    stratumId: 's6-integration-design',
    why: 'The rotation is a hypothesis the pasture tests every cycle. Reading recovery, ground cover, and species along a fixed transect is what tells the steward whether the rest periods are matched to the land — and lets the plan bend to the ground rather than the other way round.',
    pitfall:
      'Reading the pasture by impression instead of a fixed transect — without a repeatable measure, slow decline hides behind a green flush and the rotation drifts off the land.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['monitoring-records']],
    body: [
      step(
        'walk-transect',
        'Walk the fixed transect',
        'Walk the same transect each cycle and record ground cover, recovery, and species shift so the readings are comparable over time.',
        'reading',
        { toolIds: ['transect', 'paddocks'] },
      ),
      step(
        'reconcile-rest',
        'Reconcile rest periods against recovery',
        'Compare the recovery you measured against the rest each cell actually received, and flag any cell whose rest period needs to lengthen.',
        'reading',
        { toolIds: ['paddocks'], citation: 'Savory holistic planned grazing' },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'silv-recipe-pasture-spelling',
    title: 'Run the pasture spell and recovery',
    objectiveId: 'silv-s7-pasture-spelling',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'animals-livestock',
    stratumId: 's7-phasing-resourcing',
    why: 'A pasture spell is a deliberate long rest — pulling stock off a cell or block long enough for the deep-rooted perennials and any integrated trees to recover fully. It is the recovery side of the rotation made explicit, and it protects establishment and drought reserves.',
    pitfall:
      'Cutting the spell short under stocking pressure — ending the rest before recovery is complete spends the very reserve the spell was building.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['animals-livestock']],
    body: [
      step(
        'close-block',
        'Close and exclude the block',
        'Close the cells under spell, confirm the fencing excludes stock for the full rest, and record the spell start against the block.',
        'decision',
        { toolIds: ['paddocks', 'fencing'] },
      ),
      step(
        'confirm-recovery',
        'Confirm recovery before reopening',
        'Before reopening, confirm the forage and any protected trees have recovered to the agreed measure — extend the spell rather than reopen early.',
        'verification',
        { toolIds: ['paddocks'], citation: 'Savory holistic planned grazing' },
      ),
    ],
  }),
];

// ---------------------------------------------------------------------------
// SECONDARY — silvopasture layered onto a host (silv-sec-s* objectives)
// ---------------------------------------------------------------------------
export const SILVOPASTURE_SECONDARY_RECIPES: readonly RecipeProcedure[] = [
  bespokeRecipe({
    id: 'silv-recipe-sec-grazing-design',
    title: 'Design the integrated grazing rotation',
    objectiveId: 'silv-sec-s4-grazing-design',
    source: 'secondary',
    sourceTypeId: TYPE,
    domain: 'animals-livestock',
    stratumId: 's4-foundation-decisions',
    why: 'Layering grazing onto a host system (an orchard or homestead) means designing the rotation around assets that were never built for stock — young trees, beds, and infrastructure. The browse window and the nutrient distribution have to be planned in from the start so the animals add fertility without damaging the host (Savory; silvopasture integrated browse window).',
    pitfall:
      'Treating the host’s trees and beds as if they were open pasture — without the browse window and exclusion designed in, the grazing damages the very system it is meant to enrich.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['animals-livestock']],
    body: [
      step(
        'map-grazeable',
        'Map the grazeable cells around the host',
        'Map which parts of the host system can carry stock and when, marking the cells, lanes, and the assets that must stay excluded.',
        'map-action',
        { toolIds: ['paddocks', 'fencing', 'gates'] },
      ),
      step(
        'set-browse-window',
        'Set the browse window and nutrient spread',
        'Set the entry rules that hold the browse window open for young trees, and plan the rotation so livestock nutrient load is spread across the host rather than concentrated.',
        'decision',
        { toolIds: ['paddocks'], citation: 'Silvopasture integrated browse window' },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'silv-recipe-sec-tree-establishment',
    title: 'Establish trees under grazing',
    objectiveId: 'silv-sec-s5-tree-establishment',
    source: 'secondary',
    sourceTypeId: TYPE,
    domain: 'plants-food',
    stratumId: 's5-system-design',
    why: 'Establishing trees inside a grazed host is the hardest moment in the integration: the stems are most vulnerable exactly where the stock are. Protection and the browse window carry the planting through until it is above reach.',
    pitfall:
      'Letting stock back onto a freshly planted block before the guards are proven — a single graze can undo a season’s establishment.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['plants-food']],
    body: [
      step(
        'plant-protect',
        'Plant and guard inside the host',
        'Plant each tree at its mapped position and fit the guard or exclusion that holds the browse window, recording it as an as-built.',
        'proof',
        { toolIds: ['orchards', 'fencing'], citation: 'Silvopasture integrated browse window' },
      ),
      step(
        'verify-exclusion',
        'Verify exclusion before re-grazing',
        'Confirm the protection excludes the mob before any stock return to the block; extend the exclusion rather than risk the establishment.',
        'verification',
        { toolIds: ['fencing'] },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'silv-recipe-sec-pasture-tree-monitoring',
    title: 'Monitor the pasture–tree balance',
    objectiveId: 'silv-sec-s6-pasture-tree-monitoring',
    source: 'secondary',
    sourceTypeId: TYPE,
    domain: 'monitoring-records',
    stratumId: 's6-integration-design',
    why: 'In an integrated system the tree layer and the pasture compete for the same light and water, and the stock press on both. A fixed reading of browse damage, shade, and ground cover keeps the balance honest before either side is lost.',
    pitfall:
      'Watching only the forage or only the trees — the integration fails at the interface, so the reading has to track both and the browse pressure between them.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['monitoring-records']],
    body: [
      step(
        'read-interface',
        'Read browse, shade, and cover together',
        'Walk the transect and record browse damage on the trees, shade over the pasture, and ground cover together, so the trade-off between the layers is visible.',
        'reading',
        { toolIds: ['transect', 'orchards'] },
      ),
      step(
        'flag-imbalance',
        'Flag and route any imbalance',
        'Flag any reading where browse, shade, or cover is trending past its threshold and route it back to the grazing-design or tree-establishment objective that owns the fix.',
        'reading',
        { toolIds: ['paddocks'], citation: 'Silvopasture integrated browse window' },
      ),
    ],
  }),
];
