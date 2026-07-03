// catalogues/recipe/homestead.ts
//
// Bespoke per-objective recipes for the HOMESTEAD project type — the live
// vertical slice (with silvopasture). Mirrors constants/protocol/catalogues/
// homestead.ts: homestead runs as a PRIMARY type, so this file contributes a
// PRIMARY recipe set only (no secondary — homestead is not layered onto a host
// in the encoded slice).
//
// Every recipe is `authored`, drafted from the named permaculture practice the
// codebase already cites — Mollison/Holmgren zone-and-sector design (place work
// by visit frequency), Holmgren P6 (produce no waste / closed fertility loop),
// Yeomans (water before structures). None contains a slaughter/capital/sales
// step: the animal-husbandry recipe covers welfare, shelter, feed, and water
// ONLY — the slaughter/Udhiyah pathway resolves to the universal `scholar-gated`
// slaughter-prep recipe and the upstream verbatim scopeNotes, never to anything
// authored here. The two financial objectives (budget-input-reduction,
// provision-phasing) are deliberately NOT encoded — they fall back to the
// universal domain recipe, keeping every capital touch off the authored layer.

import type { RecipeProcedure } from '../../../schemas/recipe/recipe.schema.js';
import { UNIVERSAL_DOMAIN_LABELS } from '../../universalDomain.js';
import { bespokeRecipe, step } from './_builders.js';

const TYPE = 'homestead' as const;

// ---------------------------------------------------------------------------
// PRIMARY — homestead as the project's primary type (hms-s* objectives)
// ---------------------------------------------------------------------------
export const HOMESTEAD_PRIMARY_RECIPES: readonly RecipeProcedure[] = [
  bespokeRecipe({
    id: 'hms-recipe-water-quality',
    title: 'Verify the household water quality',
    objectiveId: 'hms-s3-water-quality',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'hydrology',
    stratumId: 's3-systems-reading',
    why: 'Every downstream provisioning decision — drinking, kitchen, stock, irrigation — rests on knowing what the household water actually is. A test against the real source and storage turns an assumption into a record the whole homestead can rely on.',
    pitfall:
      'Assuming source water is potable because it looks clean — contamination is usually invisible, and an untested supply puts the household at risk.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['hydrology']],
    body: [
      step(
        'sample-source',
        'Sample at source and storage',
        'Take samples at the source and at stored water, recording where each was drawn so a problem can be traced to its point.',
        'evidence',
        { toolIds: ['wells', 'tanks'] },
      ),
      step(
        'record-result',
        'Record the result against each use',
        'Record the test result and note which uses (drinking, kitchen, stock, irrigation) the water is fit for, flagging any treatment the result requires.',
        'reading',
        { toolIds: ['water'] },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'hms-recipe-food-production-strategy',
    title: 'Set the home food-production strategy',
    objectiveId: 'hms-s4-food-production-strategy',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'plants-food',
    stratumId: 's4-foundation-decisions',
    why: 'The strategy decides what the household grows for itself and how much of its food need that covers. Matching production to the real household need — and closing the gap with preserves and storage — is what turns a garden into provisioning (Holmgren P3: Obtain a yield).',
    pitfall:
      'Planting by enthusiasm rather than the household’s actual food need — a glut of one crop and a gap in staples leaves the household no more provisioned than before.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['plants-food']],
    body: [
      step(
        'map-need-to-yield',
        'Match production to the household need',
        'Set what to grow against the household’s actual food need, prioritising the staples and the calorie/keep crops that close the largest part of the gap.',
        'decision',
        { toolIds: ['crops', 'beds'] },
      ),
      step(
        'plan-store-preserve',
        'Plan the storage and preserving',
        'Plan how the surplus from each window is stored or preserved so production carries the household through the lean season, not just the harvest glut.',
        'decision',
        { toolIds: ['storage'], citation: 'Holmgren P3' },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'hms-recipe-fertility-strategy',
    title: 'Establish the homestead fertility loop',
    objectiveId: 'hms-s4-fertility-strategy',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'soil',
    stratumId: 's4-foundation-decisions',
    why: 'A homestead that cycles its own fertility — kitchen and garden waste, manure, and crop residues returned as compost — feeds its soil without buying in inputs. Closing that loop is the difference between a system that builds its own foundation and one that depends on the gate (Holmgren P6: Produce no waste).',
    pitfall:
      'Exporting waste and importing fertility — sending kitchen and garden residues off-site while buying bagged inputs leaks the very nutrients the homestead already has.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['soil']],
    body: [
      step(
        'site-compost',
        'Site the compost and fertility nodes',
        'Site the compost and any fertility nodes within easy reach of both the kitchen that feeds them and the beds they feed — short loops get used, long ones get abandoned.',
        'map-action',
        { toolIds: ['compost', 'fertility-unit'] },
      ),
      step(
        'close-the-loop',
        'Route the waste-to-fertility flows',
        'Route each waste stream (kitchen, garden, manure) to the compost and each finished output back to the beds, so the nutrient loop closes on the homestead.',
        'decision',
        { toolIds: ['flow-connector', 'compost'], citation: 'Holmgren P6' },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'hms-recipe-food-zones-layout',
    title: 'Lay out the food zones and guilds',
    objectiveId: 'hms-s5-food-zones-layout',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'plants-food',
    stratumId: 's5-system-design',
    why: 'Zone design places each element by how often it needs the steward’s hand: the salad bed and herbs by the door, the orchard and forage further out. Getting the zoning right is what makes daily provisioning effortless instead of a chore (Mollison/Holmgren zone-and-sector design).',
    pitfall:
      'Placing high-attention plantings far from the door — a herb bed or salad crop in Zone 3 is visited late, tended poorly, and quietly fails.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['plants-food']],
    body: [
      step(
        'zone-by-frequency',
        'Zone by visit frequency',
        'Lay out the production zones by how often each needs attention — daily-harvest beds and herbs closest to the door, the orchard and rougher ground furthest out.',
        'map-action',
        { toolIds: ['zone', 'beds'], citation: 'Mollison/Holmgren zone-and-sector design' },
      ),
      step(
        'place-guilds',
        'Place the planting guilds',
        'Set the planting guilds within each zone so companion species stack the same ground, marking the beds, trees, and supporting plants as they will be planted.',
        'map-action',
        { toolIds: ['guild', 'orchards', 'beds'] },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'hms-recipe-animal-husbandry',
    title: 'Set up the small-livestock husbandry',
    objectiveId: 'hms-s5-animal-husbandry',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'animals-livestock',
    stratumId: 's5-system-design',
    why: 'Small livestock on a homestead earn their keep through eggs, milk, manure, and pest control — but only on a base of good welfare: secure shelter, clean water, sound feed, and protection from predators. This recipe sets up that welfare base; it does not touch the slaughter pathway, which is gated separately.',
    pitfall:
      'Bringing animals home before the shelter, water, and predator protection are ready — stock that arrive ahead of their infrastructure suffer, and so does the steward.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['animals-livestock']],
    body: [
      step(
        'build-shelter',
        'Build shelter and secure the run',
        'Build the housing and secure the run or paddock so the stock have dry shelter and protection from predators before they arrive.',
        'proof',
        { toolIds: ['barns', 'paddocks', 'fencing'] },
      ),
      step(
        'set-feed-water',
        'Set up feed and clean water',
        'Set up reliable feed storage and a clean water supply sized for the stock and the weather, so daily welfare does not depend on hauling.',
        'proof',
        { toolIds: ['water-lines', 'tanks'] },
      ),
      step(
        'confirm-welfare',
        'Confirm the welfare base',
        'Confirm shelter, water, feed, and predator protection are all in place and sound before the animals come onto the homestead.',
        'verification',
        { toolIds: ['barns'] },
      ),
    ],
  }),
  bespokeRecipe({
    id: 'hms-recipe-energy-shelter-systems',
    title: 'Install the energy and shelter systems',
    objectiveId: 'hms-s5-energy-shelter-systems',
    source: 'primary',
    sourceTypeId: TYPE,
    domain: 'built-infrastructure',
    stratumId: 's5-system-design',
    why: 'Energy and shelter systems — heating, power, rainwater, the dwelling envelope — are the homestead’s resilience backbone, built once and lived with for years. Sequencing them so water and access are settled before the structures they serve follows the Keyline ordering and avoids costly retrofits (Yeomans Scale of Permanence).',
    pitfall:
      'Installing power and structures before the water capture and access they depend on — a Keyline-order violation that forces expensive rework.',
    feeds: [UNIVERSAL_DOMAIN_LABELS['built-infrastructure']],
    body: [
      step(
        'place-systems',
        'Place the energy and water-capture systems',
        'Place the power, heating, and rainwater-capture systems against the dwelling, settling the water capture and storage before the structures that draw on them.',
        'map-action',
        { toolIds: ['power', 'buildings', 'tanks'], citation: 'Yeomans Scale of Permanence' },
      ),
      step(
        'commission',
        'Commission and verify the systems',
        'Commission each system and verify it delivers (charge, heat, captured water) before relying on it through the season; record each as an as-built.',
        'verification',
        { toolIds: ['buildings', 'power'] },
      ),
    ],
  }),
];
