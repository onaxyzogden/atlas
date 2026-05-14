/**
 * Default homestead goal-tree — 5 sub-goals × 2-3 measurable criteria each.
 *
 * Sub-goal selection follows Mollison's "self-reliant homestead" outline
 * (Designer's Manual ch. 3) plus Holmgren's Three Ethics frame (earth-care,
 * people-care, fair-share). Criteria targets are illustrative defaults the
 * steward can edit on the Goal Tree tab.
 */

import type { GoalTree } from './goalCompassTypes.js';

export const HOMESTEAD_GOAL_TREE_TEMPLATE: GoalTree = {
  archetype: 'homestead',
  parentGoal: {
    id: 'homestead-self-sufficient',
    title: 'Self-sufficient homestead',
    narrative:
      'A family-scale homestead that meets most of the household needs ' +
      'for food, water, fuel, and shelter from the land itself within 7-10 ' +
      'years, while rebuilding soil and ecological function.',
  },
  subGoals: [
    {
      id: 'food-sovereignty',
      title: 'Food sovereignty',
      narrative:
        'Most calories, protein, and micronutrients come from the land — ' +
        'kitchen garden, food forest, pasture, and small livestock.',
      criteria: [
        {
          id: 'food-sov-calories-pct',
          description: '% of household calories produced on-property',
          unit: 'pct',
          target: 70,
          deadlineYear: 7,
        },
        {
          id: 'food-sov-protein-pct',
          description: '% of household protein produced on-property',
          unit: 'pct',
          target: 60,
          deadlineYear: 7,
        },
        {
          id: 'food-sov-fruit-lbs',
          description: 'Annual perennial-fruit yield (lbs)',
          unit: 'lbs',
          target: 800,
          deadlineYear: 10,
        },
      ],
    },
    {
      id: 'water-security',
      title: 'Water security',
      narrative:
        'Captured, stored, and infiltrated rainfall meets household and ' +
        'agricultural demand without external irrigation.',
      criteria: [
        {
          id: 'water-storage-gal',
          description: 'Total surface + tank water storage (gallons)',
          unit: 'gallons',
          target: 250000,
          deadlineYear: 5,
        },
        {
          id: 'water-self-sufficient-pct',
          description: '% of growing-season water demand met from captured sources',
          unit: 'pct',
          target: 80,
          deadlineYear: 7,
        },
      ],
    },
    {
      id: 'shelter-fuel',
      title: 'Shelter & fuel',
      narrative:
        'Dwelling, outbuildings, and heat/cooking energy provided by the ' +
        'land or by on-site renewables.',
      criteria: [
        {
          id: 'fuel-cordwood-cords',
          description: 'Annual cordwood produced from coppice / woodlot',
          unit: 'count',
          target: 6,
          deadlineYear: 7,
        },
        {
          id: 'solar-kwh-yr',
          description: 'Annual on-site solar generation (kWh)',
          unit: 'kwh',
          target: 8000,
          deadlineYear: 3,
        },
      ],
    },
    {
      id: 'soil-rebuilding',
      title: 'Soil rebuilding',
      narrative:
        'Compacted, depleted former-cropland transitions to ≥5% organic ' +
        'matter, deep aggregate structure, and active soil biology.',
      criteria: [
        {
          id: 'soil-om-pct',
          description: 'Average topsoil organic matter (%)',
          unit: 'pct',
          target: 5,
          deadlineYear: 10,
        },
        {
          id: 'soil-cover-pct',
          description: '% of bare ground replaced by living cover year-round',
          unit: 'pct',
          target: 95,
          deadlineYear: 5,
        },
      ],
    },
    {
      id: 'income-optionality',
      title: 'Household income optionality',
      narrative:
        'Surplus from the land funds a portion of household cash needs ' +
        'without forcing scale-up beyond the family\'s labor capacity.',
      criteria: [
        {
          id: 'income-surplus-usd',
          description: 'Annual gross surplus revenue from on-property yields (USD)',
          unit: 'usd',
          target: 15000,
          deadlineYear: 7,
        },
        {
          id: 'income-streams-count',
          description: 'Distinct revenue streams (eggs, fruit, value-add, etc.)',
          unit: 'count',
          target: 3,
          deadlineYear: 5,
        },
      ],
    },
  ],
};
