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
      { id: 'regenerative_farm', label: 'Regenerative Farm', description: 'Food, fiber, and ecosystem production', activates: ['plants-food', 'access-circulation', 'built-infrastructure', 'risk-compliance'] },
      { id: 'homestead', label: 'Homestead', description: 'Self-sufficient living on rural land', activates: ['plants-food', 'built-infrastructure', 'climate'] },
      { id: 'intentional_community', label: 'Intentional Community', description: 'Shared values, governance, and resources', activates: ['built-infrastructure', 'climate'] },
      { id: 'eco_village', label: 'Eco-village', description: 'Sustainable village or co-living model', activates: ['built-infrastructure', 'climate'] },
      { id: 'conservation', label: 'Conservation / Restoration', description: 'Protect and restore ecological function', activates: ['ecology'] },
      { id: 'agritourism', label: 'Agritourism Destination', description: 'Revenue from on-land experiences', activates: ['built-infrastructure'] },
      { id: 'retreat_education', label: 'Retreat / Education Centre', description: 'Learning, research, and training', activates: ['built-infrastructure'] },
      { id: 'silvopasture', label: 'Silvopasture / Livestock', description: 'Integrated trees, forage, and animals', activates: ['animals-livestock', 'plants-food', 'access-circulation'] },
      { id: 'agroforestry', label: 'Agroforestry / Food Forest', description: 'Perennial, layered food systems', activates: ['plants-food', 'access-circulation'] },
      { id: 'market_garden', label: 'Market Garden', description: 'Intensive crop production for sale', activates: ['plants-food'] },
      { id: 'mixed_use', label: 'Mixed-Use Land Stewardship', description: 'Multiple uses and revenue streams', activates: ['plants-food', 'built-infrastructure', 'risk-compliance'] },
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
      { id: 'household_self_sufficiency', label: 'Household self-sufficiency', activates: ['plants-food', 'access-circulation'] },
      { id: 'food_for_sale', label: 'Food production for sale', activates: ['plants-food', 'economics-capacity'] },
      { id: 'food_for_community', label: 'Food for family / community', activates: ['plants-food'] },
      { id: 'ecological_restoration', label: 'Ecological restoration', activates: ['ecology'] },
      { id: 'soil_regeneration', label: 'Soil regeneration', activates: ['soil', 'ecology'] },
      { id: 'livestock_land_improvement', label: 'Livestock-based land improvement', activates: ['animals-livestock', 'soil'] },
      { id: 'community_living', label: 'Community living', activates: ['access-circulation', 'built-infrastructure'] },
      { id: 'education_workshops', label: 'Education and workshops', activates: ['built-infrastructure'] },
      { id: 'retreat_wellness', label: 'Retreat / healing / wellness', activates: ['built-infrastructure'] },
      { id: 'agritourism_revenue', label: 'Agritourism revenue', activates: ['economics-capacity'] },
      { id: 'wildlife_habitat', label: 'Wildlife habitat', activates: ['ecology'] },
      { id: 'water_resilience', label: 'Water resilience', activates: ['hydrology'] },
      { id: 'climate_resilience', label: 'Climate resilience', activates: ['hydrology', 'plants-food'] },
      { id: 'cultural_spiritual', label: 'Cultural / spiritual gathering place', activates: ['access-circulation'] },
      { id: 'land_legacy', label: 'Long-term land-based legacy', activates: ['economics-capacity'] },
      { id: 'financial_enterprise', label: 'Financially sustainable enterprise', activates: ['economics-capacity'] },
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
      { id: 'semi_public', label: 'Semi-public with workshops or tours', activates: ['access-circulation'] },
      { id: 'public_facing', label: 'Public-facing agritourism / education site', activates: ['access-circulation', 'built-infrastructure'] },
      { id: 'member_based', label: 'Community / member-based access', activates: ['access-circulation'] },
      { id: 'mixed_zones', label: 'Mixed private / public zones', activates: ['access-circulation'] },
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
      { id: 'kitchen_garden', label: 'Kitchen garden', activates: ['plants-food', 'access-circulation'] },
      { id: 'market_garden', label: 'Market garden', activates: ['plants-food', 'soil'] },
      { id: 'greenhouse', label: 'Greenhouse', activates: ['built-infrastructure', 'plants-food'] },
      { id: 'orchard', label: 'Orchard', activates: ['plants-food', 'access-circulation'] },
      { id: 'food_forest', label: 'Food forest', activates: ['plants-food', 'access-circulation'] },
      { id: 'agroforestry', label: 'Agroforestry', activates: ['plants-food', 'access-circulation'] },
      { id: 'field_crops', label: 'Grain / field crops', activates: ['plants-food', 'built-infrastructure'] },
      { id: 'mushrooms', label: 'Mushroom production', activates: ['plants-food'] },
      { id: 'nursery', label: 'Nursery / propagation', activates: ['plants-food'] },
      { id: 'herb_garden', label: 'Herb / medicinal garden', activates: ['plants-food'] },
      { id: 'food_processing', label: 'Preserved food / processing area', activates: ['built-infrastructure'] },
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
      { id: 'chickens_eggs', label: 'Chickens for eggs', activates: ['animals-livestock'] },
      { id: 'chickens_meat', label: 'Chickens for meat', activates: ['animals-livestock'] },
      { id: 'waterfowl', label: 'Ducks / geese', activates: ['animals-livestock'] },
      { id: 'rabbits', label: 'Rabbits', activates: ['animals-livestock'] },
      { id: 'goats', label: 'Goats', activates: ['animals-livestock'] },
      { id: 'sheep', label: 'Sheep', activates: ['animals-livestock'] },
      { id: 'cattle', label: 'Cattle', activates: ['animals-livestock'] },
      { id: 'pigs', label: 'Pigs', activates: ['animals-livestock'] },
      { id: 'bees', label: 'Bees', activates: ['ecology'] },
      { id: 'aquaculture', label: 'Fish / aquaculture', activates: ['hydrology'] },
      { id: 'working_dogs', label: 'Working / guardian animals', activates: ['animals-livestock'] },
      { id: 'wildlife_only', label: 'Wildlife habitat only', activates: ['ecology'] },
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
      { id: 'rainwater', label: 'Rainwater catchment', activates: ['hydrology'] },
      { id: 'pond', label: 'Pond', activates: ['hydrology'] },
      { id: 'swales', label: 'Swales', activates: ['hydrology'] },
      { id: 'keyline', label: 'Keyline / contour harvesting', activates: ['hydrology'] },
      { id: 'well', label: 'Well', activates: ['hydrology'] },
      { id: 'irrigation', label: 'Irrigation', activates: ['hydrology'] },
      { id: 'livestock_water', label: 'Livestock water points', activates: ['hydrology', 'animals-livestock'] },
      { id: 'wetland', label: 'Wetland protection', activates: ['ecology'] },
      { id: 'greywater', label: 'Greywater reuse', activates: ['hydrology', 'built-infrastructure'] },
      { id: 'drainage', label: 'Flood / drainage management', activates: ['hydrology'] },
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
      { id: 'home', label: 'Home / cabin / yurt', activates: ['built-infrastructure'] },
      { id: 'barn', label: 'Barn', activates: ['built-infrastructure'] },
      { id: 'workshop', label: 'Workshop', activates: ['built-infrastructure'] },
      { id: 'greenhouse', label: 'Greenhouse', activates: ['built-infrastructure'] },
      { id: 'animal_shelter', label: 'Animal shelter', activates: ['built-infrastructure', 'animals-livestock'] },
      { id: 'compost', label: 'Compost area', activates: ['soil'] },
      { id: 'outdoor_kitchen', label: 'Outdoor kitchen', activates: ['built-infrastructure'] },
      { id: 'washrooms', label: 'Washrooms', activates: ['built-infrastructure'] },
      { id: 'storage', label: 'Storage', activates: ['built-infrastructure'] },
      { id: 'farm_stand', label: 'Farm stand', activates: ['built-infrastructure', 'access-circulation'] },
      { id: 'classroom', label: 'Classroom / gathering space', activates: ['built-infrastructure'] },
      { id: 'guest_cabins', label: 'Guest cabins', activates: ['built-infrastructure'] },
      { id: 'trails', label: 'Trails', activates: ['access-circulation'] },
      { id: 'parking', label: 'Parking', activates: ['access-circulation'] },
      { id: 'energy', label: 'Solar / off-grid energy', activates: ['climate', 'built-infrastructure'] },
      { id: 'compost_toilet', label: 'Waste / compost toilet system', activates: ['built-infrastructure'] },
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
      { id: 'part_time', label: 'Reliable part-time income', activates: ['economics-capacity'] },
      { id: 'full_time', label: 'Full-time livelihood', activates: ['economics-capacity'] },
      { id: 'community_income', label: 'Multi-family / community income', activates: ['economics-capacity'] },
      { id: 'commercial', label: 'Commercial-scale enterprise', activates: ['economics-capacity', 'built-infrastructure'] },
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
      { id: 'eggs', label: 'Eggs', activates: ['animals-livestock'] },
      { id: 'meat', label: 'Meat', activates: ['animals-livestock'] },
      { id: 'vegetables', label: 'Vegetables', activates: ['plants-food'] },
      { id: 'fruit', label: 'Fruit', activates: ['plants-food'] },
      { id: 'honey', label: 'Honey' },
      { id: 'nursery_plants', label: 'Nursery plants', activates: ['plants-food'] },
      { id: 'herbs', label: 'Herbs / medicinal plants', activates: ['plants-food'] },
      { id: 'mushrooms', label: 'Mushrooms', activates: ['plants-food'] },
      { id: 'compost_products', label: 'Compost / soil products', activates: ['soil'] },
      { id: 'workshops', label: 'Workshops', activates: ['built-infrastructure'] },
      { id: 'agritourism', label: 'Agritourism', activates: ['access-circulation'] },
      { id: 'retreats', label: 'Retreats', activates: ['built-infrastructure'] },
      { id: 'farm_stays', label: 'Farm stays', activates: ['built-infrastructure'] },
      { id: 'csa', label: 'Membership / CSA' },
      { id: 'venue_rental', label: 'Venue rental', activates: ['built-infrastructure'] },
      { id: 'education_programs', label: 'Education programs', activates: ['built-infrastructure'] },
      { id: 'coaching', label: 'Land-based coaching / consulting' },
      { id: 'value_added', label: 'Value-added products', activates: ['built-infrastructure'] },
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
      { id: 'education_led', label: 'Education-led business', activates: ['built-infrastructure'] },
      { id: 'experience_led', label: 'Agritourism / experience-led', activates: ['access-circulation'] },
      { id: 'community_supported', label: 'Community-supported model' },
      { id: 'commercial', label: 'Commercial production', activates: ['built-infrastructure', 'economics-capacity'] },
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
      { id: 'soil_first', label: 'Soil health first', activates: ['soil'] },
      { id: 'water_first', label: 'Water protection first', activates: ['hydrology'] },
      { id: 'biodiversity_first', label: 'Biodiversity first', activates: ['ecology'] },
      { id: 'animal_welfare_first', label: 'Animal welfare first', activates: ['animals-livestock'] },
      { id: 'food_security_first', label: 'Food security first', activates: ['plants-food'] },
      { id: 'financial_sustainability', label: 'Financial sustainability', activates: ['economics-capacity'] },
      { id: 'low_input', label: 'Low-input simplicity' },
      { id: 'beauty_experience', label: 'Beauty and experience' },
      { id: 'community_benefit', label: 'Community benefit' },
      { id: 'privacy_family', label: 'Privacy and family life' },
      { id: 'education_demonstration', label: 'Education and demonstration', activates: ['built-infrastructure'] },
      { id: 'climate_resilience', label: 'Climate resilience', activates: ['hydrology'] },
      { id: 'minimal_disturbance', label: 'Minimal disturbance', activates: ['ecology'] },
      { id: 'cultural_knowledge', label: 'Traditional / cultural knowledge' },
      { id: 'spiritual_purpose', label: 'Spiritual purpose' },
      { id: 'accessibility', label: 'Accessibility', activates: ['access-circulation'] },
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
      { id: 'phased', label: 'Phased over several years', activates: ['economics-capacity'] },
      { id: 'essentials_first', label: 'Build essentials first, expand later', activates: ['economics-capacity'] },
      { id: 'move_quickly', label: 'Move quickly once the plan is clear' },
      { id: 'revenue_first', label: 'Revenue-first development', activates: ['economics-capacity'] },
      { id: 'home_first', label: 'Home-first development', activates: ['built-infrastructure'] },
      { id: 'ecology_first', label: 'Ecology-first development', activates: ['ecology', 'soil'] },
      { id: 'infrastructure_first', label: 'Infrastructure-first development', activates: ['built-infrastructure'] },
      { id: 'livestock_first', label: 'Livestock-first development', activates: ['animals-livestock'] },
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
      { id: 'one_household', label: 'Yes, one household', activates: ['built-infrastructure'] },
      { id: 'multiple_households', label: 'Yes, multiple households', activates: ['built-infrastructure', 'access-circulation'] },
      { id: 'seasonal', label: 'Seasonal living only', activates: ['built-infrastructure'] },
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
      { id: 'communal_kitchen', label: 'Communal kitchen', activates: ['built-infrastructure'] },
      { id: 'gathering_hall', label: 'Gathering hall', activates: ['built-infrastructure'] },
      { id: 'prayer_space', label: 'Prayer / contemplation space', activates: ['built-infrastructure'] },
      { id: 'workshop_classroom', label: 'Workshop / classroom', activates: ['built-infrastructure'] },
      { id: 'fire_circle', label: 'Outdoor fire circle' },
      { id: 'childrens_area', label: 'Children’s area' },
      { id: 'guest_area', label: 'Guest area', activates: ['built-infrastructure'] },
      { id: 'tool_library', label: 'Tool library', activates: ['built-infrastructure'] },
      { id: 'processing_kitchen', label: 'Processing kitchen', activates: ['built-infrastructure'] },
      { id: 'washrooms', label: 'Washrooms', activates: ['built-infrastructure'] },
      { id: 'bathhouse', label: 'Bathhouse', activates: ['built-infrastructure'] },
      { id: 'laundry', label: 'Laundry', activates: ['built-infrastructure'] },
      { id: 'storage', label: 'Storage', activates: ['built-infrastructure'] },
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
      { id: 'eggs', label: 'Eggs', activates: ['animals-livestock'] },
      { id: 'meat', label: 'Meat', activates: ['animals-livestock'] },
      { id: 'milk', label: 'Milk', activates: ['animals-livestock'] },
      { id: 'fibre', label: 'Fibre', activates: ['animals-livestock'] },
      { id: 'land_regeneration', label: 'Land regeneration', activates: ['animals-livestock', 'soil'] },
      { id: 'brush_control', label: 'Brush control', activates: ['animals-livestock'] },
      { id: 'pasture_management', label: 'Pasture management', activates: ['animals-livestock', 'plants-food'] },
      { id: 'manure_fertility', label: 'Manure fertility', activates: ['animals-livestock', 'soil'] },
      { id: 'education', label: 'Education', activates: ['built-infrastructure'] },
      { id: 'companionship', label: 'Companionship' },
      { id: 'guardian', label: 'Guardian / protection', activates: ['animals-livestock'] },
      { id: 'wildlife_support', label: 'Wildlife support only', activates: ['ecology'] },
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
      { id: 'daily_core', label: 'Daily core system', activates: ['animals-livestock'] },
      { id: 'main_enterprise', label: 'Main enterprise', activates: ['animals-livestock', 'economics-capacity'] },
      { id: 'multi_species', label: 'Multi-species integrated system', activates: ['animals-livestock'] },
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
      { id: 'fixed_pens', label: 'Stationary pens / fixed areas', activates: ['animals-livestock'] },
      { id: 'mobile_pasture', label: 'Mobile pasture systems', activates: ['animals-livestock'] },
      { id: 'rotational', label: 'Rotational grazing', activates: ['animals-livestock', 'soil'] },
      { id: 'silvopasture', label: 'Silvopasture', activates: ['animals-livestock', 'plants-food'] },
      { id: 'free_range', label: 'Free-range with boundaries', activates: ['animals-livestock'] },
      { id: 'mixed', label: 'Mixed system', activates: ['animals-livestock'] },
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
      { id: 'animal_welfare', label: 'Animal welfare', activates: ['animals-livestock'] },
      { id: 'predator_protection', label: 'Predator protection', activates: ['animals-livestock'] },
      { id: 'low_labour', label: 'Low labour' },
      { id: 'regenerative_impact', label: 'Regenerative impact', activates: ['soil', 'ecology'] },
      { id: 'production_efficiency', label: 'Production efficiency', activates: ['animals-livestock'] },
      { id: 'low_infra_cost', label: 'Low infrastructure cost' },
      { id: 'child_family_safety', label: 'Child / family safety' },
      { id: 'clean_water', label: 'Clean water access', activates: ['hydrology'] },
      { id: 'winter_resilience', label: 'Winter resilience', activates: ['built-infrastructure'] },
      { id: 'easy_chores', label: 'Ease of daily chores', activates: ['access-circulation'] },
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
      { id: 'wetland_disturbance', label: 'Wetland disturbance', activates: ['ecology'] },
      { id: 'flood_building', label: 'Building in flood-prone areas', activates: ['hydrology'] },
      { id: 'overgrazing', label: 'Overgrazing', activates: ['animals-livestock'] },
      { id: 'soil_compaction', label: 'Soil compaction', activates: ['soil'] },
      { id: 'excessive_debt', label: 'Excessive debt', activates: ['economics-capacity'] },
      { id: 'high_labour', label: 'High labour burden' },
      { id: 'public_access_conflict', label: 'Public access conflicts', activates: ['access-circulation'] },
      { id: 'neighbour_conflict', label: 'Neighbour conflict' },
      { id: 'expert_maintenance', label: 'Systems needing expert maintenance' },
      { id: 'unsafe_access', label: 'Unsafe roads or access', activates: ['access-circulation'] },
      { id: 'poor_welfare', label: 'Poor animal welfare', activates: ['animals-livestock'] },
      { id: 'loss_privacy', label: 'Loss of privacy' },
      { id: 'habitat_harm', label: 'Harm to sensitive habitat', activates: ['ecology'] },
      { id: 'regulatory_trouble', label: 'Regulatory trouble' },
      { id: 'expensive_inputs', label: 'Dependency on expensive inputs' },
      { id: 'overbuilding', label: 'Overbuilding too early', activates: ['economics-capacity'] },
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
      { id: 'water_limitation', label: 'Unresolvable water limitation', activates: ['hydrology'] },
      { id: 'flood_risk', label: 'Severe flood risk', activates: ['hydrology'] },
      { id: 'fire_risk', label: 'Severe fire risk' },
      { id: 'zoning_conflict', label: 'Zoning conflict' },
      { id: 'soil_contamination', label: 'Soil contamination', activates: ['soil'] },
      { id: 'neighbour_conflict', label: 'Major neighbour conflict' },
      { id: 'cost_exceeds', label: 'Cost exceeds available resources', activates: ['economics-capacity'] },
      { id: 'no_building_area', label: 'No viable building area', activates: ['built-infrastructure'] },
      { id: 'no_livestock_area', label: 'No viable livestock area', activates: ['animals-livestock'] },
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
      { id: 'tractor', label: 'Tractor', activates: ['built-infrastructure'] },
      { id: 'truck', label: 'Truck', activates: ['built-infrastructure'] },
      { id: 'trailer', label: 'Trailer', activates: ['built-infrastructure'] },
      { id: 'fencing', label: 'Fencing' },
      { id: 'water_tanks', label: 'Water tanks', activates: ['hydrology'] },
      { id: 'tools', label: 'Tools' },
      { id: 'livestock', label: 'Livestock', activates: ['animals-livestock'] },
      { id: 'greenhouse', label: 'Greenhouse', activates: ['built-infrastructure'] },
      { id: 'well', label: 'Well', activates: ['hydrology'] },
      { id: 'solar', label: 'Solar system', activates: ['climate'] },
      { id: 'road_access', label: 'Road access', activates: ['access-circulation'] },
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
      { id: 'money', label: 'Money', activates: ['economics-capacity'] },
      { id: 'time', label: 'Time' },
      { id: 'labour', label: 'Labour' },
      { id: 'knowledge', label: 'Knowledge' },
      { id: 'equipment', label: 'Equipment', activates: ['built-infrastructure'] },
      { id: 'water', label: 'Water', activates: ['hydrology'] },
      { id: 'access', label: 'Access', activates: ['access-circulation'] },
      { id: 'permits', label: 'Permits' },
      { id: 'housing', label: 'Housing', activates: ['built-infrastructure'] },
      { id: 'infrastructure', label: 'Infrastructure', activates: ['built-infrastructure'] },
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
      { id: 'safe_access', label: 'Safe access', activates: ['access-circulation'] },
      { id: 'housing', label: 'Housing', activates: ['built-infrastructure'] },
      { id: 'water_security', label: 'Water security', activates: ['hydrology'] },
      { id: 'garden', label: 'Garden', activates: ['plants-food'] },
      { id: 'livestock_system', label: 'Livestock system', activates: ['animals-livestock'] },
      { id: 'orchard', label: 'Orchard / food forest', activates: ['plants-food', 'access-circulation'] },
      { id: 'income_stream', label: 'Income stream', activates: ['economics-capacity'] },
      { id: 'soil_regeneration', label: 'Soil regeneration', activates: ['soil'] },
      { id: 'gathering_space', label: 'Community gathering space', activates: ['built-infrastructure'] },
      { id: 'conservation_area', label: 'Conservation area', activates: ['ecology'] },
      { id: 'education_offering', label: 'Workshop / education offering', activates: ['built-infrastructure'] },
      { id: 'basic_infrastructure', label: 'Basic infrastructure', activates: ['built-infrastructure'] },
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
      { id: 'meaningful_food', label: 'We produce a meaningful portion of our food', activates: ['plants-food'] },
      { id: 'visibly_healthier', label: 'The land is visibly healthier', activates: ['ecology'] },
      { id: 'soil_improves', label: 'Soil cover and fertility improve', activates: ['soil'] },
      { id: 'water_secure', label: 'Water is more secure', activates: ['hydrology'] },
      { id: 'animals_healthy', label: 'Animals are healthy and well-managed', activates: ['animals-livestock'] },
      { id: 'simpler_life', label: 'Daily life feels simpler and more grounded' },
      { id: 'reliable_income', label: 'The project generates reliable income', activates: ['economics-capacity'] },
      { id: 'community_uses_well', label: 'Community members use the land well', activates: ['access-circulation'] },
      { id: 'learning', label: 'Guests / students are learning from the land', activates: ['built-infrastructure'] },
      { id: 'functional_infra', label: 'Infrastructure is functional, not overwhelming', activates: ['built-infrastructure'] },
      { id: 'manageable_maintenance', label: 'Maintenance is manageable' },
      { id: 'biodiversity_increase', label: 'Wildlife and biodiversity increase', activates: ['ecology'] },
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
      { id: 'regenerative_first', label: 'Regenerative / ecological first', activates: ['soil', 'ecology'] },
      { id: 'production_first', label: 'Production and income first', activates: ['economics-capacity'] },
      { id: 'family_first', label: 'Family comfort first', activates: ['built-infrastructure'] },
      { id: 'community_first', label: 'Community experience first', activates: ['access-circulation'] },
      { id: 'education_first', label: 'Education / demonstration first', activates: ['built-infrastructure'] },
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
 * `visionProfile.primaryType`). Targets are OLOS v1.2 enum values: agritourism
 * and regenerative_farm replace the dropped retreat_center / multi_enterprise
 * (the same homes migration 046 backfills). This path writes projectType via
 * updateProject, which does not normalize, so it must emit valid enum values.
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
      return 'agritourism';
    case 'conservation':
      return 'conservation';
    case 'intentional_community':
    case 'eco_village':
    case 'mixed_use':
      return 'regenerative_farm';
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
