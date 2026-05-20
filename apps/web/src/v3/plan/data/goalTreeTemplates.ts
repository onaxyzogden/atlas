/**
 * Project-type-keyed Goal Compass templates.
 *
 * One template per PlanProjectTypeKey. Stewards pick on the Goal tree
 * tab; criteria targets/deadlines are editable, but add/remove is gated
 * behind an Advanced collapse to reduce decision fatigue.
 *
 * Homestead entry mirrors `homesteadGoalTree.ts` so the existing default
 * stays consistent.
 */

import type { GoalTree } from './goalCompassTypes.js';
import type { PlanProjectTypeKey } from './planProjectTypeTemplates.js';
import { HOMESTEAD_GOAL_TREE_TEMPLATE } from './homesteadGoalTree.js';

const REGENERATIVE_FARM: GoalTree = {
  archetype: 'regenerative-farm',
  parentGoal: {
    id: 'regen-farm-profitable',
    title: 'Profitable regenerative farm',
    narrative:
      'A commercially viable farm that produces cash crops and livestock ' +
      'while rebuilding soil, cycling water, and increasing biodiversity ' +
      'year over year.',
  },
  subGoals: [
    {
      id: 'cash-crop-yield',
      title: 'Cash crop yield',
      narrative: 'Marketable yield per acre at or above regional median.',
      criteria: [
        {
          id: 'regen-yield-lbs-per-acre',
          description: 'Average marketable yield per acre (lbs)',
          unit: 'lbs',
          target: 8000,
          deadlineYear: 5,
        },
        {
          id: 'regen-revenue-per-acre',
          description: 'Annual gross revenue per acre (USD)',
          unit: 'usd',
          target: 2500,
          deadlineYear: 5,
        },
      ],
    },
    {
      id: 'soil-health',
      title: 'Soil health',
      criteria: [
        {
          id: 'regen-soil-om',
          description: 'Average topsoil organic matter (%)',
          unit: 'pct',
          target: 4,
          deadlineYear: 7,
        },
        {
          id: 'regen-soil-cover',
          description: '% of bare ground replaced by living cover',
          unit: 'pct',
          target: 90,
          deadlineYear: 3,
        },
        {
          id: 'living-roots-coverage-pct',
          description:
            'Projected % of cropped area carrying living roots year-round (12-month coverage)',
          unit: 'pct',
          target: 70,
          deadlineYear: 3,
        },
      ],
    },
    {
      id: 'water-cycle',
      title: 'Water cycle',
      criteria: [
        {
          id: 'regen-water-infiltration',
          description: '% of seasonal rainfall infiltrated on-property',
          unit: 'pct',
          target: 75,
          deadlineYear: 5,
        },
      ],
    },
    {
      id: 'biodiversity-habitat',
      title: 'Biodiversity habitat',
      narrative:
        'A deliberate share of the parcel set aside and restored as ' +
        'undisturbed wildlife habitat and biological corridors — the ' +
        'Apricot Lane ~10% set-aside that hosts native predators and ' +
        'pollinators as primary biological pest-control tools.',
      criteria: [
        {
          id: 'regen-habitat-pct',
          description: '% of parcel allocated to undisturbed habitat / corridors',
          unit: 'pct',
          target: 10,
          deadlineYear: 1,
        },
        {
          id: 'beneficial-organism-habitat-pct',
          description:
            'Composite beneficial-organism habitat coverage from guilds + structural elements (%)',
          unit: 'pct',
          target: 60,
          deadlineYear: 3,
        },
      ],
    },
    {
      id: 'biodiversity-outcomes',
      title: 'Biodiversity outcomes',
      narrative:
        'Whether the habitat set-aside is actually working over time — ' +
        'native vegetative cover returning, invasive-species pressure ' +
        'falling, and the bird & pollinator community arriving on the ' +
        'classic Year 0 / 5 / 9 monitoring cadence. Ecological response ' +
        'only; no valuation, credit, or offset framing.',
      criteria: [
        {
          id: 'bio-native-cover',
          description: '% of monitored area in native vegetative cover',
          unit: 'pct',
          target: 60,
          deadlineYear: 7,
        },
        {
          id: 'bio-invasive-pressure',
          description: '% of monitored area under invasive-species pressure',
          unit: 'pct',
          target: 5,
          deadlineYear: 5,
        },
        {
          id: 'bio-species-richness',
          description: 'Distinct bird & pollinator species observed in census',
          unit: 'count',
          target: 45,
          deadlineYear: 9,
        },
      ],
    },
    {
      id: 'livestock-enterprise',
      title: 'Livestock enterprise',
      narrative:
        'A rotated herd or flock that produces saleable protein, passes ' +
        'welfare access audits (water within 100 m, shelter, sound ' +
        'fencing), and earns its keep without degrading the pasture.',
      criteria: [
        {
          id: 'livestock-paddocks-active-count',
          description: 'Paddocks on planned rotation (count)',
          unit: 'count',
          target: 8,
          deadlineYear: 3,
        },
        {
          id: 'livestock-welfare-pass-pct',
          description:
            'Paddocks passing welfare access audit — water ≤100 m, shelter, fencing (%)',
          unit: 'pct',
          target: 100,
          deadlineYear: 3,
        },
        {
          id: 'livestock-protein-lbs',
          description: 'Annual marketable protein yield (lbs)',
          unit: 'lbs',
          target: 5000,
          deadlineYear: 5,
        },
        {
          id: 'livestock-revenue-usd',
          description: 'Annual gross revenue from livestock enterprise (USD)',
          unit: 'usd',
          target: 20000,
          deadlineYear: 5,
        },
        {
          id: 'livestock-rotation-rest-compliance-pct',
          description:
            'Paddocks meeting their species rest-period requirement on the planned rotation (%)',
          unit: 'pct',
          target: 90,
          deadlineYear: 3,
        },
        {
          id: 'silvopasture-integration-pct',
          description:
            'Mean per-host silvopasture integration (fodder + canopy − toxicity) across the parcel (%)',
          unit: 'pct',
          target: 70,
          deadlineYear: 5,
        },
      ],
    },
  ],
};

const RETREAT_CENTER: GoalTree = {
  archetype: 'retreat',
  parentGoal: {
    id: 'retreat-thriving',
    title: 'Thriving retreat center',
    narrative:
      'A landscape that hosts guests in restorative connection with the ' +
      'land — clean water, varied habitat, contemplative paths, and ' +
      'food grown within sight of the table.',
  },
  subGoals: [
    {
      id: 'guest-capacity',
      title: 'Guest capacity',
      criteria: [
        {
          id: 'retreat-annual-guest-nights',
          description: 'Annual guest-nights hosted',
          unit: 'count',
          target: 1500,
          deadlineYear: 5,
        },
      ],
    },
    {
      id: 'on-site-food',
      title: 'On-site food for guests',
      criteria: [
        {
          id: 'retreat-food-pct',
          description: '% of guest meals sourced from on-property',
          unit: 'pct',
          target: 40,
          deadlineYear: 5,
        },
        {
          id: 'retreat-fruit-lbs',
          description: 'Annual perennial-fruit yield (lbs)',
          unit: 'lbs',
          target: 600,
          deadlineYear: 7,
        },
      ],
    },
    {
      id: 'sanctuary-acres',
      title: 'Sanctuary & habitat',
      criteria: [
        {
          id: 'retreat-undisturbed-pct',
          description: '% of parcel in undisturbed wildlife habitat',
          unit: 'pct',
          target: 40,
          deadlineYear: 5,
        },
      ],
    },
  ],
};

const EDUCATIONAL_FARM: GoalTree = {
  archetype: 'education',
  parentGoal: {
    id: 'edu-farm-impact',
    title: 'Active educational farm',
    narrative:
      'A working farm whose primary output is learning — practitioners, ' +
      'students, and apprentices leave with literacy in regenerative ' +
      'design and the skills to apply it.',
  },
  subGoals: [
    {
      id: 'learner-throughput',
      title: 'Learner throughput',
      criteria: [
        {
          id: 'edu-annual-learners',
          description: 'Annual learners served (workshops + apprentices)',
          unit: 'count',
          target: 200,
          deadlineYear: 3,
        },
        {
          id: 'edu-apprentice-graduates',
          description: 'Apprentices graduating per year',
          unit: 'count',
          target: 6,
          deadlineYear: 5,
        },
      ],
    },
    {
      id: 'demo-systems',
      title: 'Demonstration systems',
      criteria: [
        {
          id: 'edu-demo-count',
          description: 'Distinct demonstration systems on display',
          unit: 'count',
          target: 8,
          deadlineYear: 5,
        },
      ],
    },
    {
      id: 'program-revenue',
      title: 'Program revenue',
      criteria: [
        {
          id: 'edu-program-usd',
          description: 'Annual program revenue (USD)',
          unit: 'usd',
          target: 80000,
          deadlineYear: 5,
        },
      ],
    },
  ],
};

const CONSERVATION: GoalTree = {
  archetype: 'conservation',
  parentGoal: {
    id: 'conservation-thriving-habitat',
    title: 'Thriving native habitat',
    narrative:
      'Land managed for ecological function and native biodiversity. ' +
      'Stewardship interventions favor habitat restoration over yield.',
  },
  subGoals: [
    {
      id: 'native-vegetation',
      title: 'Native vegetation cover',
      criteria: [
        {
          id: 'cons-native-cover-pct',
          description: '% of parcel under native plant cover',
          unit: 'pct',
          target: 80,
          deadlineYear: 10,
        },
        {
          id: 'cons-invasive-pct',
          description: '% of parcel with active invasive infestation',
          unit: 'pct',
          target: 5,
          deadlineYear: 5,
        },
      ],
    },
    {
      id: 'wildlife-presence',
      title: 'Wildlife presence',
      criteria: [
        {
          id: 'cons-indicator-species-count',
          description: 'Indicator species detected (annual surveys)',
          unit: 'count',
          target: 15,
          deadlineYear: 7,
        },
      ],
    },
    {
      id: 'watershed-function',
      title: 'Watershed function',
      criteria: [
        {
          id: 'cons-riparian-cover-pct',
          description: '% of riparian zone with continuous canopy',
          unit: 'pct',
          target: 90,
          deadlineYear: 7,
        },
      ],
    },
  ],
};

const MULTI_ENTERPRISE: GoalTree = {
  archetype: 'multi-enterprise',
  parentGoal: {
    id: 'multi-enterprise-balanced',
    title: 'Balanced multi-enterprise operation',
    narrative:
      'Several complementary revenue streams (cash crops, livestock, ' +
      'agritourism, value-add) sharing land and labor — no single ' +
      'enterprise carries the whole farm.',
  },
  subGoals: [
    {
      id: 'enterprise-diversity',
      title: 'Enterprise diversity',
      criteria: [
        {
          id: 'multi-enterprise-streams',
          description: 'Distinct revenue streams operating year-round',
          unit: 'count',
          target: 4,
          deadlineYear: 5,
        },
        {
          id: 'multi-largest-enterprise-pct',
          description: 'Share of revenue from the single largest stream (%)',
          unit: 'pct',
          target: 50,
          deadlineYear: 5,
        },
      ],
    },
    {
      id: 'gross-revenue',
      title: 'Gross revenue',
      criteria: [
        {
          id: 'multi-gross-revenue-usd',
          description: 'Combined annual gross revenue (USD)',
          unit: 'usd',
          target: 200000,
          deadlineYear: 7,
        },
      ],
    },
    {
      id: 'land-use-balance',
      title: 'Land use balance',
      criteria: [
        {
          id: 'multi-production-pct',
          description: '% of parcel in active production',
          unit: 'pct',
          target: 60,
          deadlineYear: 5,
        },
        {
          id: 'multi-rest-pct',
          description: '% of parcel in habitat / rest / sanctuary',
          unit: 'pct',
          target: 25,
          deadlineYear: 5,
        },
      ],
    },
  ],
};

export const GOAL_TREE_TEMPLATES: Record<PlanProjectTypeKey, GoalTree> = {
  homestead: HOMESTEAD_GOAL_TREE_TEMPLATE,
  regenerative_farm: REGENERATIVE_FARM,
  retreat_center: RETREAT_CENTER,
  educational_farm: EDUCATIONAL_FARM,
  conservation: CONSERVATION,
  multi_enterprise: MULTI_ENTERPRISE,
};

export const GOAL_TREE_TEMPLATE_LABEL: Record<PlanProjectTypeKey, string> = {
  homestead: 'Homestead',
  regenerative_farm: 'Regenerative farm',
  retreat_center: 'Retreat center',
  educational_farm: 'Educational farm',
  conservation: 'Conservation',
  multi_enterprise: 'Multi-enterprise',
};

/**
 * Resolve any project-type-ish string to a concrete template key.
 *
 * Accepts both the underscore `PlanProjectTypeKey` form (the value the real
 * wizard stores, e.g. `regenerative_farm`) and the hyphenated
 * `ProjectArchetype` form (e.g. `regenerative-farm`) by reverse-matching on
 * each template's `archetype`. Returns `null` only for genuinely unknown
 * input — callers decide the fallback.
 */
export function resolveTemplateKey(
  input: string | null | undefined,
): PlanProjectTypeKey | null {
  if (!input) return null;
  if (input in GOAL_TREE_TEMPLATES) return input as PlanProjectTypeKey;
  for (const key of Object.keys(GOAL_TREE_TEMPLATES) as PlanProjectTypeKey[]) {
    if (GOAL_TREE_TEMPLATES[key].archetype === input) return key;
  }
  return null;
}

export function getGoalTreeTemplate(key: string | null | undefined): GoalTree {
  const resolved = resolveTemplateKey(key);
  if (resolved) return GOAL_TREE_TEMPLATES[resolved];
  if (key && import.meta.env.DEV) {
    console.warn(
      `[goalTreeTemplates] unknown projectType "${key}" → HOMESTEAD fallback`,
    );
  }
  return HOMESTEAD_GOAL_TREE_TEMPLATE;
}
