/**
 * Stage Zero Vision Builder — declarative questionnaire config.
 *
 * The full question set from the OLOS Stage Zero spec, expressed as a flat,
 * ordered list of questions. The page renders one question at a time
 * ("Question N of M") with upcoming questions collapsed beneath it, exactly
 * like the mockup.
 *
 * Each question maps to a single field in the VisionProfile (`profilePath`,
 * supporting dotted paths like `systemsInScope.food` and `livestock.roles`).
 * `visibleWhen(profile)` drives conditional questions (e.g. livestock detail
 * only appears once animals are in scope), so the effective question count is
 * dynamic.
 *
 * `activates` on options lists the Plan modules an answer emphasises — purely
 * for the informational "What this activates" strip (no real gating in this
 * MVP). See `deriveActivatedModules`.
 *
 * This file is the source of truth for valid option ids; the VisionProfile
 * zod schema is intentionally permissive so edits here don't require a schema
 * change.
 */

import type { VisionProfile } from '@ogden/shared';
import type { PlanModule } from '../../plan/types.js';

export type VisionAnswerKind = 'single' | 'multi';

export interface VisionOption {
  id: string;
  label: string;
  description?: string;
  /** Group key — only used by grouped questions (systems-in-scope). */
  group?: string;
  /** Plan modules this answer emphasises (for the activation strip). */
  activates?: PlanModule[];
}

export interface VisionGroup {
  id: string;
  label: string;
}

export interface VisionQuestion {
  /** Stable id (also used as the React key and deep-link anchor). */
  id: string;
  /** Short eyebrow shown above the heading, e.g. "Project Type". */
  eyebrow: string;
  /** The large question heading. */
  title: string;
  /** Supporting one-liner under the heading. */
  subtitle?: string;
  kind: VisionAnswerKind;
  /** For multi questions: cap on selections (omit = unlimited). */
  maxSelections?: number;
  /**
   * When true, this question is *deferred to the Plan stage* — it is not asked
   * in the Lean Stage Zero flow, but is preserved here (not deleted) so the
   * Plan stage can advise on it later from what OBSERVE captures and the guided
   * vision layout. `deriveDeferredTopics()` surfaces these to the steward as
   * "explored later", and `useVisionBuilder` filters them out of the active
   * question set. See the Stage Zero trim decision.
   */
  deferToPlan?: boolean;
  /** Dotted path into VisionProfile this question writes to. */
  profilePath: string;
  options: VisionOption[];
  /** Present for grouped layouts (systems-in-scope). */
  groups?: VisionGroup[];
  /**
   * Special handling marker. `projectType` routes the primary selection to
   * `project.projectType` (via toProjectType) and any extra selections to
   * `visionProfile.secondaryTypes`.
   */
  special?: 'projectType';
  /** Conditional visibility predicate over the in-progress profile. */
  visibleWhen?: (profile: VisionProfile) => boolean;
}

// ── conditional helpers ──────────────────────────────────────────────────
const NON_ANIMAL_IDS = new Set(['no_livestock', 'wildlife_only']);

/** True when the profile's animal systems imply real livestock in scope. */
export function hasLivestockInScope(profile: VisionProfile): boolean {
  const animals = profile.systemsInScope?.animals ?? [];
  return animals.some((a) => !NON_ANIMAL_IDS.has(a));
}

function willLiveOnLand(profile: VisionProfile): boolean {
  return profile.willLiveOnLand != null && profile.willLiveOnLand !== 'no';
}

// ── the question set ─────────────────────────────────────────────────────
export const VISION_QUESTIONS: VisionQuestion[] = [
  // Step 1 — Project Type
  {
    id: 'project-type',
    eyebrow: 'Project Type',
    title: 'What kind of land-based project are you creating?',
    subtitle:
      'This helps us tailor the planning frameworks, terminology, and recommendations.',
    kind: 'single',
    special: 'projectType',
    profilePath: 'primaryType',
    options: [
      // `activates` here lists the *type-distinctive* modules only — the four
      // baseline modules (water, soil, zones, phasing) are unioned in by
      // deriveActivatedModules once a type is chosen, so they're omitted below.
      { id: 'regenerative_farm', label: 'Regenerative Farm', description: 'Food, fiber, and ecosystem production', activates: ['plant-systems', 'dynamic-layering', 'machinery', 'principle-verification'] },
      { id: 'homestead', label: 'Homestead', description: 'Self-sufficient living on rural land', activates: ['plant-systems', 'structures-subsystems', 'cross-section-solar'] },
      { id: 'intentional_community', label: 'Intentional Community', description: 'Shared values, governance, and resources', activates: ['structures-subsystems', 'cross-section-solar'] },
      { id: 'eco_village', label: 'Eco-village', description: 'Sustainable village or co-living model', activates: ['structures-subsystems', 'cross-section-solar'] },
      { id: 'conservation', label: 'Conservation / Restoration', description: 'Protect and restore ecological function', activates: ['habitat-allocation', 'biodiversity-monitor', 'regeneration-monitor'] },
      { id: 'agritourism', label: 'Agritourism Destination', description: 'Revenue from on-land experiences', activates: ['structures-subsystems'] },
      { id: 'retreat_education', label: 'Retreat / Education Centre', description: 'Learning, research, and training', activates: ['structures-subsystems'] },
      { id: 'silvopasture', label: 'Silvopasture / Livestock', description: 'Integrated trees, forage, and animals', activates: ['livestock', 'plant-systems', 'dynamic-layering'] },
      { id: 'agroforestry', label: 'Agroforestry / Food Forest', description: 'Perennial, layered food systems', activates: ['plant-systems', 'dynamic-layering'] },
      { id: 'market_garden', label: 'Market Garden', description: 'Intensive crop production for sale', activates: ['plant-systems'] },
      { id: 'mixed_use', label: 'Mixed-Use Land Stewardship', description: 'Multiple uses and revenue streams', activates: ['plant-systems', 'structures-subsystems', 'principle-verification'] },
      { id: 'other', label: 'Other / Custom', description: 'Something not listed here' },
    ],
  },

  // Step 2 — Primary Outcomes
  {
    id: 'primary-outcomes',
    eyebrow: 'Primary Outcomes',
    title: 'What is the main outcome you want this land to produce?',
    subtitle: 'Choose all that apply. These become what the Plan optimises for.',
    kind: 'multi',
    profilePath: 'primaryOutcomes',
    options: [
      { id: 'household_self_sufficiency', label: 'Household self-sufficiency', activates: ['plant-systems', 'zone-circulation'] },
      { id: 'food_for_sale', label: 'Food production for sale', activates: ['plant-systems', 'phasing-budgeting'] },
      { id: 'food_for_community', label: 'Food for family / community', activates: ['plant-systems'] },
      { id: 'ecological_restoration', label: 'Ecological restoration', activates: ['habitat-allocation', 'regeneration-monitor'] },
      { id: 'soil_regeneration', label: 'Soil regeneration', activates: ['soil-fertility', 'regeneration-monitor'] },
      { id: 'livestock_land_improvement', label: 'Livestock-based land improvement', activates: ['livestock', 'soil-fertility'] },
      { id: 'community_living', label: 'Community living', activates: ['zone-circulation', 'structures-subsystems'] },
      { id: 'education_workshops', label: 'Education and workshops', activates: ['structures-subsystems'] },
      { id: 'retreat_wellness', label: 'Retreat / healing / wellness', activates: ['structures-subsystems'] },
      { id: 'agritourism_revenue', label: 'Agritourism revenue', activates: ['phasing-budgeting'] },
      { id: 'wildlife_habitat', label: 'Wildlife habitat', activates: ['habitat-allocation', 'biodiversity-monitor'] },
      { id: 'water_resilience', label: 'Water resilience', activates: ['water-management'] },
      { id: 'climate_resilience', label: 'Climate resilience', activates: ['water-management', 'plant-systems'] },
      { id: 'cultural_spiritual', label: 'Cultural / spiritual gathering place', activates: ['zone-circulation'] },
      { id: 'land_legacy', label: 'Long-term land-based legacy', activates: ['phasing-budgeting'] },
      { id: 'financial_enterprise', label: 'Financially sustainable enterprise', activates: ['phasing-budgeting'] },
    ],
  },

  // Step 3 — Desired Land Identity
  {
    id: 'land-identity',
    eyebrow: 'Land Identity',
    deferToPlan: true,
    title: 'When this project is mature, what should the land feel like?',
    subtitle: 'Choose one or more. This sets the Plan stage’s design posture.',
    kind: 'multi',
    profilePath: 'landIdentity',
    options: [
      { id: 'productive_farmstead', label: 'Productive farmstead' },
      { id: 'family_sanctuary', label: 'Quiet family sanctuary' },
      { id: 'working_regen_farm', label: 'Working regenerative farm' },
      { id: 'community_village', label: 'Community village' },
      { id: 'wild_restoration', label: 'Wild restoration landscape' },
      { id: 'demonstration_site', label: 'Educational demonstration site' },
      { id: 'livestock_landscape', label: 'Livestock-integrated landscape' },
      { id: 'food_forest', label: 'Food forest / perennial abundance' },
      { id: 'retreat_destination', label: 'Retreat-like destination' },
      { id: 'low_input_homestead', label: 'Low-input self-sufficient homestead' },
      { id: 'commercial_farm', label: 'High-functioning commercial farm' },
      { id: 'contemplative', label: 'Sacred / contemplative landscape' },
      { id: 'family_oriented', label: 'Children-and-family-oriented place' },
      { id: 'preparedness', label: 'Resilient preparedness property' },
    ],
  },

  // Step 4a — Who is the land for
  {
    id: 'users',
    eyebrow: 'Who It’s For',
    deferToPlan: true,
    title: 'Who will regularly use or depend on this land?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'users',
    options: [
      { id: 'owner_steward', label: 'Individual owner / steward' },
      { id: 'family_household', label: 'Couple / family household' },
      { id: 'children', label: 'Children' },
      { id: 'extended_family', label: 'Extended family' },
      { id: 'farming_team', label: 'Farming team' },
      { id: 'volunteers', label: 'Volunteers' },
      { id: 'paying_guests', label: 'Paying guests' },
      { id: 'workshop_participants', label: 'Workshop participants' },
      { id: 'community_members', label: 'Intentional community members' },
      { id: 'elders', label: 'Elders' },
      { id: 'livestock_caretakers', label: 'Livestock caretakers' },
      { id: 'csa_customers', label: 'Customers / CSA members' },
      { id: 'neighbours', label: 'Neighbours' },
      { id: 'community_partners', label: 'Indigenous / community partners' },
      { id: 'public_visitors', label: 'Public visitors' },
      { id: 'private_members', label: 'Private members only' },
    ],
  },

  // Step 4b — Public/private
  {
    id: 'public-access',
    eyebrow: 'Access Posture',
    deferToPlan: true,
    title: 'How public or private should the project be?',
    subtitle: 'This shapes circulation, parking, signage, privacy buffers, and risk.',
    kind: 'single',
    profilePath: 'publicAccessLevel',
    options: [
      { id: 'fully_private', label: 'Fully private' },
      { id: 'mostly_private', label: 'Mostly private with occasional invited guests' },
      { id: 'semi_public', label: 'Semi-public with workshops or tours', activates: ['zone-circulation'] },
      { id: 'public_facing', label: 'Public-facing agritourism / education site', activates: ['zone-circulation', 'structures-subsystems'] },
      { id: 'member_based', label: 'Community / member-based access', activates: ['zone-circulation'] },
      { id: 'mixed_zones', label: 'Mixed private / public zones', activates: ['zone-circulation'] },
    ],
  },

  // Step 5 — Core systems in scope (grouped)
  {
    id: 'systems-food',
    eyebrow: 'Food Systems',
    deferToPlan: true,
    title: 'Which food systems do you want this project to include?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'systemsInScope.food',
    options: [
      { id: 'kitchen_garden', label: 'Kitchen garden', activates: ['plant-systems', 'zone-circulation'] },
      { id: 'market_garden', label: 'Market garden', activates: ['plant-systems', 'soil-fertility'] },
      { id: 'greenhouse', label: 'Greenhouse', activates: ['structures-subsystems', 'plant-systems'] },
      { id: 'orchard', label: 'Orchard', activates: ['plant-systems', 'dynamic-layering'] },
      { id: 'food_forest', label: 'Food forest', activates: ['plant-systems', 'dynamic-layering'] },
      { id: 'agroforestry', label: 'Agroforestry', activates: ['plant-systems', 'dynamic-layering'] },
      { id: 'field_crops', label: 'Grain / field crops', activates: ['plant-systems', 'machinery'] },
      { id: 'mushrooms', label: 'Mushroom production', activates: ['plant-systems'] },
      { id: 'nursery', label: 'Nursery / propagation', activates: ['plant-systems'] },
      { id: 'herb_garden', label: 'Herb / medicinal garden', activates: ['plant-systems'] },
      { id: 'food_processing', label: 'Preserved food / processing area', activates: ['structures-subsystems'] },
    ],
  },
  {
    id: 'systems-animals',
    eyebrow: 'Animal Systems',
    deferToPlan: true,
    title: 'Which animal systems do you want to include?',
    subtitle: 'Choose all that apply. Select “No livestock” to skip animal planning.',
    kind: 'multi',
    profilePath: 'systemsInScope.animals',
    options: [
      { id: 'chickens_eggs', label: 'Chickens for eggs', activates: ['livestock'] },
      { id: 'chickens_meat', label: 'Chickens for meat', activates: ['livestock'] },
      { id: 'waterfowl', label: 'Ducks / geese', activates: ['livestock'] },
      { id: 'rabbits', label: 'Rabbits', activates: ['livestock'] },
      { id: 'goats', label: 'Goats', activates: ['livestock'] },
      { id: 'sheep', label: 'Sheep', activates: ['livestock'] },
      { id: 'cattle', label: 'Cattle', activates: ['livestock'] },
      { id: 'pigs', label: 'Pigs', activates: ['livestock'] },
      { id: 'bees', label: 'Bees', activates: ['biodiversity-monitor'] },
      { id: 'aquaculture', label: 'Fish / aquaculture', activates: ['water-management'] },
      { id: 'working_dogs', label: 'Working / guardian animals', activates: ['livestock'] },
      { id: 'wildlife_only', label: 'Wildlife habitat only', activates: ['habitat-allocation'] },
      { id: 'no_livestock', label: 'No livestock' },
    ],
  },
  {
    id: 'systems-water',
    eyebrow: 'Water Systems',
    deferToPlan: true,
    title: 'Which water systems do you want to include?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'systemsInScope.water',
    options: [
      { id: 'rainwater', label: 'Rainwater catchment', activates: ['water-management'] },
      { id: 'pond', label: 'Pond', activates: ['water-management'] },
      { id: 'swales', label: 'Swales', activates: ['water-management'] },
      { id: 'keyline', label: 'Keyline / contour harvesting', activates: ['water-management'] },
      { id: 'well', label: 'Well', activates: ['water-management'] },
      { id: 'irrigation', label: 'Irrigation', activates: ['water-management'] },
      { id: 'livestock_water', label: 'Livestock water points', activates: ['water-management', 'livestock'] },
      { id: 'wetland', label: 'Wetland protection', activates: ['habitat-allocation'] },
      { id: 'greywater', label: 'Greywater reuse', activates: ['water-management', 'structures-subsystems'] },
      { id: 'drainage', label: 'Flood / drainage management', activates: ['water-management'] },
    ],
  },
  {
    id: 'systems-built',
    eyebrow: 'Built Systems',
    deferToPlan: true,
    title: 'Which built systems do you want to include?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'systemsInScope.built',
    options: [
      { id: 'home', label: 'Home / cabin / yurt', activates: ['structures-subsystems'] },
      { id: 'barn', label: 'Barn', activates: ['structures-subsystems'] },
      { id: 'workshop', label: 'Workshop', activates: ['structures-subsystems'] },
      { id: 'greenhouse', label: 'Greenhouse', activates: ['structures-subsystems'] },
      { id: 'animal_shelter', label: 'Animal shelter', activates: ['structures-subsystems', 'livestock'] },
      { id: 'compost', label: 'Compost area', activates: ['soil-fertility'] },
      { id: 'outdoor_kitchen', label: 'Outdoor kitchen', activates: ['structures-subsystems'] },
      { id: 'washrooms', label: 'Washrooms', activates: ['structures-subsystems'] },
      { id: 'storage', label: 'Storage', activates: ['structures-subsystems'] },
      { id: 'farm_stand', label: 'Farm stand', activates: ['structures-subsystems', 'zone-circulation'] },
      { id: 'classroom', label: 'Classroom / gathering space', activates: ['structures-subsystems'] },
      { id: 'guest_cabins', label: 'Guest cabins', activates: ['structures-subsystems'] },
      { id: 'trails', label: 'Trails', activates: ['zone-circulation'] },
      { id: 'parking', label: 'Parking', activates: ['zone-circulation'] },
      { id: 'energy', label: 'Solar / off-grid energy', activates: ['cross-section-solar', 'structures-subsystems'] },
      { id: 'compost_toilet', label: 'Waste / compost toilet system', activates: ['structures-subsystems'] },
    ],
  },

  // Step 6 — Economic intent
  {
    id: 'economic-intent',
    eyebrow: 'Economic Intent',
    deferToPlan: true,
    title: 'How much income does this land need to generate?',
    kind: 'single',
    profilePath: 'economicIntentLevel',
    options: [
      { id: 'none', label: 'No income required' },
      { id: 'cover_expenses', label: 'Cover basic land expenses' },
      { id: 'side_income', label: 'Small side income' },
      { id: 'part_time', label: 'Reliable part-time income', activates: ['phasing-budgeting'] },
      { id: 'full_time', label: 'Full-time livelihood', activates: ['phasing-budgeting'] },
      { id: 'community_income', label: 'Multi-family / community income', activates: ['phasing-budgeting'] },
      { id: 'commercial', label: 'Commercial-scale enterprise', activates: ['phasing-budgeting', 'machinery'] },
    ],
  },
  {
    id: 'income-streams',
    eyebrow: 'Income Streams',
    deferToPlan: true,
    title: 'Which income streams are you considering?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'incomeStreams',
    options: [
      { id: 'eggs', label: 'Eggs', activates: ['livestock'] },
      { id: 'meat', label: 'Meat', activates: ['livestock'] },
      { id: 'vegetables', label: 'Vegetables', activates: ['plant-systems'] },
      { id: 'fruit', label: 'Fruit', activates: ['plant-systems'] },
      { id: 'honey', label: 'Honey' },
      { id: 'nursery_plants', label: 'Nursery plants', activates: ['plant-systems'] },
      { id: 'herbs', label: 'Herbs / medicinal plants', activates: ['plant-systems'] },
      { id: 'mushrooms', label: 'Mushrooms', activates: ['plant-systems'] },
      { id: 'compost_products', label: 'Compost / soil products', activates: ['soil-fertility'] },
      { id: 'workshops', label: 'Workshops', activates: ['structures-subsystems'] },
      { id: 'agritourism', label: 'Agritourism', activates: ['zone-circulation'] },
      { id: 'retreats', label: 'Retreats', activates: ['structures-subsystems'] },
      { id: 'farm_stays', label: 'Farm stays', activates: ['structures-subsystems'] },
      { id: 'csa', label: 'Membership / CSA' },
      { id: 'venue_rental', label: 'Venue rental', activates: ['structures-subsystems'] },
      { id: 'education_programs', label: 'Education programs', activates: ['structures-subsystems'] },
      { id: 'coaching', label: 'Land-based coaching / consulting' },
      { id: 'value_added', label: 'Value-added products', activates: ['structures-subsystems'] },
    ],
  },
  {
    id: 'economic-style',
    eyebrow: 'Economic Style',
    deferToPlan: true,
    title: 'What is your preferred economic style?',
    kind: 'single',
    profilePath: 'economicStyle',
    options: [
      { id: 'subsistence_first', label: 'Low-pressure subsistence first' },
      { id: 'direct_community', label: 'Small direct-to-community sales' },
      { id: 'premium_local', label: 'Premium local products' },
      { id: 'education_led', label: 'Education-led business', activates: ['structures-subsystems'] },
      { id: 'experience_led', label: 'Agritourism / experience-led', activates: ['zone-circulation'] },
      { id: 'community_supported', label: 'Community-supported model' },
      { id: 'commercial', label: 'Commercial production', activates: ['machinery', 'phasing-budgeting'] },
      { id: 'unsure', label: 'Not sure yet' },
    ],
  },

  // Step 7 — Stewardship values
  {
    id: 'values',
    eyebrow: 'Stewardship Values',
    title: 'Which principles should guide planning decisions?',
    subtitle: 'Choose all that apply. These help resolve trade-offs in the Plan stage.',
    kind: 'multi',
    profilePath: 'values',
    options: [
      { id: 'soil_first', label: 'Soil health first', activates: ['soil-fertility'] },
      { id: 'water_first', label: 'Water protection first', activates: ['water-management'] },
      { id: 'biodiversity_first', label: 'Biodiversity first', activates: ['biodiversity-monitor', 'habitat-allocation'] },
      { id: 'animal_welfare_first', label: 'Animal welfare first', activates: ['livestock'] },
      { id: 'food_security_first', label: 'Food security first', activates: ['plant-systems'] },
      { id: 'financial_sustainability', label: 'Financial sustainability', activates: ['phasing-budgeting'] },
      { id: 'low_input', label: 'Low-input simplicity' },
      { id: 'beauty_experience', label: 'Beauty and experience' },
      { id: 'community_benefit', label: 'Community benefit' },
      { id: 'privacy_family', label: 'Privacy and family life' },
      { id: 'education_demonstration', label: 'Education and demonstration', activates: ['structures-subsystems'] },
      { id: 'climate_resilience', label: 'Climate resilience', activates: ['water-management'] },
      { id: 'minimal_disturbance', label: 'Minimal disturbance', activates: ['habitat-allocation'] },
      { id: 'cultural_knowledge', label: 'Traditional / cultural knowledge' },
      { id: 'spiritual_purpose', label: 'Spiritual purpose' },
      { id: 'accessibility', label: 'Accessibility', activates: ['zone-circulation'] },
      { id: 'legacy', label: 'Long-term legacy' },
    ],
  },

  // Step 8 — Development style
  {
    id: 'development-style',
    eyebrow: 'Development Style',
    deferToPlan: true,
    title: 'How do you want to develop the land?',
    kind: 'single',
    profilePath: 'developmentStyle',
    options: [
      { id: 'very_slow', label: 'Very slowly and carefully' },
      { id: 'phased', label: 'Phased over several years', activates: ['phasing-budgeting'] },
      { id: 'essentials_first', label: 'Build essentials first, expand later', activates: ['phasing-budgeting'] },
      { id: 'move_quickly', label: 'Move quickly once the plan is clear' },
      { id: 'revenue_first', label: 'Revenue-first development', activates: ['phasing-budgeting'] },
      { id: 'home_first', label: 'Home-first development', activates: ['structures-subsystems'] },
      { id: 'ecology_first', label: 'Ecology-first development', activates: ['habitat-allocation', 'soil-fertility'] },
      { id: 'infrastructure_first', label: 'Infrastructure-first development', activates: ['structures-subsystems'] },
      { id: 'livestock_first', label: 'Livestock-first development', activates: ['livestock'] },
      { id: 'unsure', label: 'Not sure yet' },
    ],
  },
  {
    id: 'complexity-tolerance',
    eyebrow: 'Complexity',
    deferToPlan: true,
    title: 'What is your tolerance for complexity?',
    kind: 'single',
    profilePath: 'complexityTolerance',
    options: [
      { id: 'very_low', label: 'Very low — keep it simple' },
      { id: 'moderate', label: 'Moderate — manageable systems' },
      { id: 'high', label: 'High — complex integrated systems are okay' },
      { id: 'unsure', label: 'Unsure' },
    ],
  },
  {
    id: 'operating-style',
    eyebrow: 'Operating Style',
    deferToPlan: true,
    title: 'What is your preferred operating style?',
    kind: 'single',
    profilePath: 'operatingStyle',
    options: [
      { id: 'solo', label: 'Mostly solo' },
      { id: 'family_run', label: 'Family-run' },
      { id: 'small_team', label: 'Small team' },
      { id: 'volunteer', label: 'Volunteer-supported' },
      { id: 'contractor', label: 'Contractor-supported' },
      { id: 'community_run', label: 'Community-run' },
      { id: 'staffed', label: 'Staffed operation' },
      { id: 'hybrid', label: 'Hybrid' },
    ],
  },

  // Step 9 — Lifestyle and human use
  {
    id: 'will-live-on-land',
    eyebrow: 'Living on the Land',
    deferToPlan: true,
    title: 'Will people live on the land?',
    kind: 'single',
    profilePath: 'willLiveOnLand',
    options: [
      { id: 'no', label: 'No' },
      { id: 'one_household', label: 'Yes, one household', activates: ['structures-subsystems'] },
      { id: 'multiple_households', label: 'Yes, multiple households', activates: ['structures-subsystems', 'zone-circulation'] },
      { id: 'seasonal', label: 'Seasonal living only', activates: ['structures-subsystems'] },
      { id: 'future', label: 'Future possibility' },
      { id: 'unsure', label: 'Unsure' },
    ],
  },
  {
    id: 'residential-forms',
    eyebrow: 'Residential Forms',
    deferToPlan: true,
    title: 'What residential forms are being considered?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'residentialForms',
    visibleWhen: willLiveOnLand,
    options: [
      { id: 'existing_house', label: 'Existing house' },
      { id: 'new_house', label: 'New house' },
      { id: 'tiny_homes', label: 'Tiny homes' },
      { id: 'yurts', label: 'Yurts' },
      { id: 'cabins', label: 'Cabins' },
      { id: 'earthship', label: 'Earthship / earth-integrated' },
      { id: 'mobile', label: 'Mobile homes / trailers' },
      { id: 'shared_housing', label: 'Shared housing' },
      { id: 'mixed_housing', label: 'Mixed housing' },
    ],
  },
  {
    id: 'shared-spaces',
    eyebrow: 'Shared Spaces',
    deferToPlan: true,
    title: 'What shared spaces may be needed?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'sharedSpaces',
    options: [
      { id: 'communal_kitchen', label: 'Communal kitchen', activates: ['structures-subsystems'] },
      { id: 'gathering_hall', label: 'Gathering hall', activates: ['structures-subsystems'] },
      { id: 'prayer_space', label: 'Prayer / contemplation space', activates: ['structures-subsystems'] },
      { id: 'workshop_classroom', label: 'Workshop / classroom', activates: ['structures-subsystems'] },
      { id: 'fire_circle', label: 'Outdoor fire circle' },
      { id: 'childrens_area', label: 'Children’s area' },
      { id: 'guest_area', label: 'Guest area', activates: ['structures-subsystems'] },
      { id: 'tool_library', label: 'Tool library', activates: ['structures-subsystems'] },
      { id: 'processing_kitchen', label: 'Processing kitchen', activates: ['structures-subsystems'] },
      { id: 'washrooms', label: 'Washrooms', activates: ['structures-subsystems'] },
      { id: 'bathhouse', label: 'Bathhouse', activates: ['structures-subsystems'] },
      { id: 'laundry', label: 'Laundry', activates: ['structures-subsystems'] },
      { id: 'storage', label: 'Storage', activates: ['structures-subsystems'] },
      { id: 'none', label: 'None' },
    ],
  },

  // Step 10 — Livestock & animal philosophy (conditional)
  {
    id: 'livestock-roles',
    eyebrow: 'Animal Philosophy',
    deferToPlan: true,
    title: 'What role should animals play in the project?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'livestock.roles',
    visibleWhen: hasLivestockInScope,
    options: [
      { id: 'eggs', label: 'Eggs', activates: ['livestock'] },
      { id: 'meat', label: 'Meat', activates: ['livestock'] },
      { id: 'milk', label: 'Milk', activates: ['livestock'] },
      { id: 'fibre', label: 'Fibre', activates: ['livestock'] },
      { id: 'land_regeneration', label: 'Land regeneration', activates: ['livestock', 'soil-fertility'] },
      { id: 'brush_control', label: 'Brush control', activates: ['livestock'] },
      { id: 'pasture_management', label: 'Pasture management', activates: ['livestock', 'plant-systems'] },
      { id: 'manure_fertility', label: 'Manure fertility', activates: ['livestock', 'soil-fertility'] },
      { id: 'education', label: 'Education', activates: ['structures-subsystems'] },
      { id: 'companionship', label: 'Companionship' },
      { id: 'guardian', label: 'Guardian / protection', activates: ['livestock'] },
      { id: 'wildlife_support', label: 'Wildlife support only', activates: ['habitat-allocation'] },
    ],
  },
  {
    id: 'livestock-intensity',
    eyebrow: 'Animal Philosophy',
    deferToPlan: true,
    title: 'How intensive should animal integration be?',
    kind: 'single',
    profilePath: 'livestock.intensity',
    visibleWhen: hasLivestockInScope,
    options: [
      { id: 'occasional', label: 'Occasional / small-scale' },
      { id: 'seasonal', label: 'Seasonal' },
      { id: 'daily_core', label: 'Daily core system', activates: ['livestock'] },
      { id: 'main_enterprise', label: 'Main enterprise', activates: ['livestock', 'phasing-budgeting'] },
      { id: 'multi_species', label: 'Multi-species integrated system', activates: ['livestock'] },
      { id: 'unsure', label: 'Not sure yet' },
    ],
  },
  {
    id: 'livestock-management',
    eyebrow: 'Animal Philosophy',
    deferToPlan: true,
    title: 'What animal management style do you prefer?',
    kind: 'single',
    profilePath: 'livestock.managementStyle',
    visibleWhen: hasLivestockInScope,
    options: [
      { id: 'fixed_pens', label: 'Stationary pens / fixed areas', activates: ['livestock'] },
      { id: 'mobile_pasture', label: 'Mobile pasture systems', activates: ['livestock'] },
      { id: 'rotational', label: 'Rotational grazing', activates: ['livestock', 'soil-fertility'] },
      { id: 'silvopasture', label: 'Silvopasture', activates: ['livestock', 'plant-systems'] },
      { id: 'free_range', label: 'Free-range with boundaries', activates: ['livestock'] },
      { id: 'mixed', label: 'Mixed system', activates: ['livestock'] },
      { id: 'unsure', label: 'Not sure yet' },
    ],
  },
  {
    id: 'livestock-priorities',
    eyebrow: 'Animal Philosophy',
    deferToPlan: true,
    title: 'What animal-related priorities matter most?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'livestock.priorities',
    visibleWhen: hasLivestockInScope,
    options: [
      { id: 'animal_welfare', label: 'Animal welfare', activates: ['livestock'] },
      { id: 'predator_protection', label: 'Predator protection', activates: ['livestock'] },
      { id: 'low_labour', label: 'Low labour' },
      { id: 'regenerative_impact', label: 'Regenerative impact', activates: ['soil-fertility', 'regeneration-monitor'] },
      { id: 'production_efficiency', label: 'Production efficiency', activates: ['livestock'] },
      { id: 'low_infra_cost', label: 'Low infrastructure cost' },
      { id: 'child_family_safety', label: 'Child / family safety' },
      { id: 'clean_water', label: 'Clean water access', activates: ['water-management'] },
      { id: 'winter_resilience', label: 'Winter resilience', activates: ['structures-subsystems'] },
      { id: 'easy_chores', label: 'Ease of daily chores', activates: ['zone-circulation'] },
    ],
  },

  // Step 11 — Risk & non-negotiables
  {
    id: 'non-negotiables',
    eyebrow: 'Non-Negotiables',
    deferToPlan: true,
    title: 'What must the plan avoid?',
    subtitle: 'Choose all that apply. These become planning guardrails.',
    kind: 'multi',
    profilePath: 'nonNegotiablesAvoid',
    options: [
      { id: 'wetland_disturbance', label: 'Wetland disturbance', activates: ['habitat-allocation'] },
      { id: 'flood_building', label: 'Building in flood-prone areas', activates: ['water-management'] },
      { id: 'overgrazing', label: 'Overgrazing', activates: ['livestock'] },
      { id: 'soil_compaction', label: 'Soil compaction', activates: ['soil-fertility'] },
      { id: 'excessive_debt', label: 'Excessive debt', activates: ['phasing-budgeting'] },
      { id: 'high_labour', label: 'High labour burden' },
      { id: 'public_access_conflict', label: 'Public access conflicts', activates: ['zone-circulation'] },
      { id: 'neighbour_conflict', label: 'Neighbour conflict' },
      { id: 'expert_maintenance', label: 'Systems needing expert maintenance' },
      { id: 'unsafe_access', label: 'Unsafe roads or access', activates: ['zone-circulation'] },
      { id: 'poor_welfare', label: 'Poor animal welfare', activates: ['livestock'] },
      { id: 'loss_privacy', label: 'Loss of privacy' },
      { id: 'habitat_harm', label: 'Harm to sensitive habitat', activates: ['habitat-allocation'] },
      { id: 'regulatory_trouble', label: 'Regulatory trouble' },
      { id: 'expensive_inputs', label: 'Dependency on expensive inputs' },
      { id: 'overbuilding', label: 'Overbuilding too early', activates: ['phasing-budgeting'] },
    ],
  },
  {
    id: 'disqualifiers',
    eyebrow: 'Project Gates',
    deferToPlan: true,
    title: 'What would disqualify or pause the project?',
    subtitle: 'Choose all that apply. These become warning gates.',
    kind: 'multi',
    profilePath: 'disqualifiers',
    options: [
      { id: 'no_legal_access', label: 'No legal access' },
      { id: 'water_limitation', label: 'Unresolvable water limitation', activates: ['water-management'] },
      { id: 'flood_risk', label: 'Severe flood risk', activates: ['water-management'] },
      { id: 'fire_risk', label: 'Severe fire risk' },
      { id: 'zoning_conflict', label: 'Zoning conflict' },
      { id: 'soil_contamination', label: 'Soil contamination', activates: ['soil-fertility'] },
      { id: 'neighbour_conflict', label: 'Major neighbour conflict' },
      { id: 'cost_exceeds', label: 'Cost exceeds available resources', activates: ['phasing-budgeting'] },
      { id: 'no_building_area', label: 'No viable building area', activates: ['structures-subsystems'] },
      { id: 'no_livestock_area', label: 'No viable livestock area', activates: ['livestock'] },
      { id: 'too_complex', label: 'Too much complexity' },
      { id: 'unsure', label: 'Not sure yet' },
    ],
  },

  // Step 12 — Budget & resources
  {
    id: 'budget-range',
    eyebrow: 'Budget',
    title: 'What is your current development budget range?',
    kind: 'single',
    profilePath: 'budgetRange',
    options: [
      { id: 'under_10k', label: 'Under $10,000' },
      { id: '10k_50k', label: '$10,000 – $50,000' },
      { id: '50k_150k', label: '$50,000 – $150,000' },
      { id: '150k_500k', label: '$150,000 – $500,000' },
      { id: 'over_500k', label: '$500,000+' },
      { id: 'unknown', label: 'Unknown / not ready to answer' },
    ],
  },
  {
    id: 'resources-have',
    eyebrow: 'Resources',
    deferToPlan: true,
    title: 'What resources do you already have?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'resourcesHave',
    options: [
      { id: 'existing_home', label: 'Existing home' },
      { id: 'existing_barn', label: 'Existing barn / shed' },
      { id: 'tractor', label: 'Tractor', activates: ['machinery'] },
      { id: 'truck', label: 'Truck', activates: ['machinery'] },
      { id: 'trailer', label: 'Trailer', activates: ['machinery'] },
      { id: 'fencing', label: 'Fencing' },
      { id: 'water_tanks', label: 'Water tanks', activates: ['water-management'] },
      { id: 'tools', label: 'Tools' },
      { id: 'livestock', label: 'Livestock', activates: ['livestock'] },
      { id: 'greenhouse', label: 'Greenhouse', activates: ['structures-subsystems'] },
      { id: 'well', label: 'Well', activates: ['water-management'] },
      { id: 'solar', label: 'Solar system', activates: ['cross-section-solar'] },
      { id: 'road_access', label: 'Road access', activates: ['zone-circulation'] },
      { id: 'labour_help', label: 'Labour help' },
      { id: 'skilled_trades', label: 'Skilled trades' },
      { id: 'farming_experience', label: 'Farming experience' },
      { id: 'community_support', label: 'Community support' },
      { id: 'none', label: 'None yet' },
    ],
  },
  {
    id: 'resource-constraints',
    eyebrow: 'Constraints',
    deferToPlan: true,
    title: 'What are your biggest resource constraints?',
    subtitle: 'Choose all that apply.',
    kind: 'multi',
    profilePath: 'resourceConstraints',
    options: [
      { id: 'money', label: 'Money', activates: ['phasing-budgeting'] },
      { id: 'time', label: 'Time' },
      { id: 'labour', label: 'Labour' },
      { id: 'knowledge', label: 'Knowledge' },
      { id: 'equipment', label: 'Equipment', activates: ['machinery'] },
      { id: 'water', label: 'Water', activates: ['water-management'] },
      { id: 'access', label: 'Access', activates: ['zone-circulation'] },
      { id: 'permits', label: 'Permits' },
      { id: 'housing', label: 'Housing', activates: ['structures-subsystems'] },
      { id: 'infrastructure', label: 'Infrastructure', activates: ['structures-subsystems'] },
      { id: 'health', label: 'Health / physical capacity' },
      { id: 'weather', label: 'Seasonal weather' },
      { id: 'unsure', label: 'Not sure' },
    ],
  },

  // Step 13 — Timeline
  {
    id: 'timeline',
    eyebrow: 'Timeline',
    title: 'When do you want meaningful progress?',
    kind: 'single',
    profilePath: 'timelineProgress',
    options: [
      { id: 'immediately', label: 'Immediately' },
      { id: '3_months', label: 'Within 3 months' },
      { id: '6_months', label: 'Within 6 months' },
      { id: '1_year', label: 'Within 1 year' },
      { id: '1_3_years', label: '1 – 3 years' },
      { id: '3_5_years', label: '3 – 5 years' },
      { id: '5_plus_years', label: '5+ years' },
    ],
  },
  {
    id: 'first-working',
    eyebrow: 'Sequence',
    deferToPlan: true,
    title: 'What do you want working first?',
    subtitle: 'Choose one to three. This drives the development sequence.',
    kind: 'multi',
    maxSelections: 3,
    profilePath: 'firstWorkingSystems',
    options: [
      { id: 'safe_access', label: 'Safe access', activates: ['zone-circulation'] },
      { id: 'housing', label: 'Housing', activates: ['structures-subsystems'] },
      { id: 'water_security', label: 'Water security', activates: ['water-management'] },
      { id: 'garden', label: 'Garden', activates: ['plant-systems'] },
      { id: 'livestock_system', label: 'Livestock system', activates: ['livestock'] },
      { id: 'orchard', label: 'Orchard / food forest', activates: ['plant-systems', 'dynamic-layering'] },
      { id: 'income_stream', label: 'Income stream', activates: ['phasing-budgeting'] },
      { id: 'soil_regeneration', label: 'Soil regeneration', activates: ['soil-fertility'] },
      { id: 'gathering_space', label: 'Community gathering space', activates: ['structures-subsystems'] },
      { id: 'conservation_area', label: 'Conservation area', activates: ['habitat-allocation'] },
      { id: 'education_offering', label: 'Workshop / education offering', activates: ['structures-subsystems'] },
      { id: 'basic_infrastructure', label: 'Basic infrastructure', activates: ['structures-subsystems'] },
      { id: 'unsure', label: 'Not sure' },
    ],
  },

  // Step 14 — Success definition
  {
    id: 'success',
    eyebrow: 'Success Markers',
    title: 'How will you know this project is working?',
    subtitle: 'Choose all that apply. These become the Plan’s success metrics.',
    kind: 'multi',
    profilePath: 'successDefinition',
    options: [
      { id: 'meaningful_food', label: 'We produce a meaningful portion of our food', activates: ['plant-systems'] },
      { id: 'visibly_healthier', label: 'The land is visibly healthier', activates: ['regeneration-monitor'] },
      { id: 'soil_improves', label: 'Soil cover and fertility improve', activates: ['soil-fertility'] },
      { id: 'water_secure', label: 'Water is more secure', activates: ['water-management'] },
      { id: 'animals_healthy', label: 'Animals are healthy and well-managed', activates: ['livestock'] },
      { id: 'simpler_life', label: 'Daily life feels simpler and more grounded' },
      { id: 'reliable_income', label: 'The project generates reliable income', activates: ['phasing-budgeting'] },
      { id: 'community_uses_well', label: 'Community members use the land well', activates: ['zone-circulation'] },
      { id: 'learning', label: 'Guests / students are learning from the land', activates: ['structures-subsystems'] },
      { id: 'functional_infra', label: 'Infrastructure is functional, not overwhelming', activates: ['structures-subsystems'] },
      { id: 'manageable_maintenance', label: 'Maintenance is manageable' },
      { id: 'biodiversity_increase', label: 'Wildlife and biodiversity increase', activates: ['biodiversity-monitor'] },
      { id: 'peaceful_beautiful', label: 'The project feels peaceful and beautiful' },
      { id: 'no_burnout', label: 'The land can be stewarded without burnout' },
    ],
  },

  // Step 15 — Planning guidance style
  {
    id: 'guidance-style',
    eyebrow: 'Guidance',
    deferToPlan: true,
    title: 'How should OLOS guide the Plan stage?',
    kind: 'single',
    profilePath: 'guidanceStyle',
    options: [
      { id: 'conservative', label: 'Conservative and low-risk' },
      { id: 'simple_low_labour', label: 'Simple and low-labour' },
      { id: 'regenerative_first', label: 'Regenerative / ecological first', activates: ['soil-fertility', 'habitat-allocation'] },
      { id: 'production_first', label: 'Production and income first', activates: ['phasing-budgeting'] },
      { id: 'family_first', label: 'Family comfort first', activates: ['structures-subsystems'] },
      { id: 'community_first', label: 'Community experience first', activates: ['zone-circulation'] },
      { id: 'education_first', label: 'Education / demonstration first', activates: ['structures-subsystems'] },
      { id: 'balanced', label: 'Balanced' },
      { id: 'unsure', label: 'Unsure' },
    ],
  },
  {
    id: 'guidance-depth',
    eyebrow: 'Guidance',
    deferToPlan: true,
    title: 'How much guidance do you want?',
    kind: 'single',
    profilePath: 'guidanceDepth',
    options: [
      { id: 'simple_path', label: 'Give me a simple recommended path' },
      { id: 'few_options', label: 'Show a few options' },
      { id: 'compare_scenarios', label: 'Let me compare scenarios' },
      { id: 'detailed_technical', label: 'Give detailed technical planning support' },
      { id: 'expert_control', label: 'I want expert-level control' },
    ],
  },
];

/**
 * Map a Vision Builder primary-type id to the closest strict `ProjectType`
 * enum value (which Plan reads via `useEffectivePlanProjectType`). Returns
 * undefined for ids with no clean enum home (kept only in
 * `visionProfile.primaryType`).
 */
export function toProjectType(builderTypeId: string | undefined): string | undefined {
  switch (builderTypeId) {
    case 'regenerative_farm':
    case 'agroforestry':
    case 'market_garden':
    case 'silvopasture':
      return 'regenerative_farm';
    case 'homestead':
      return 'homestead';
    case 'retreat_education':
    case 'agritourism':
      return 'retreat_center';
    case 'conservation':
      return 'conservation';
    case 'intentional_community':
    case 'eco_village':
    case 'mixed_use':
      return 'multi_enterprise';
    default:
      return undefined;
  }
}

/** A topic deferred from Stage Zero to the Plan stage, for surfacing. */
export interface DeferredTopic {
  id: string;
  eyebrow: string;
  title: string;
}

/**
 * Derive the list of questions flagged `deferToPlan` from the static catalog.
 *
 * These are *not* asked in the Lean Stage Zero flow but are preserved so the
 * Plan stage can advise on them later. The list is identical for every project
 * (it's a property of the catalog, not the profile), so it's derived on demand
 * rather than persisted — the sidebar shows it as "explored later in the Plan
 * stage" so the steward sees nothing was lost.
 */
export function deriveDeferredTopics(): DeferredTopic[] {
  return VISION_QUESTIONS.filter((q) => q.deferToPlan).map((q) => ({
    id: q.id,
    eyebrow: q.eyebrow,
    title: q.title,
  }));
}
