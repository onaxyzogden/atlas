/**
 * Template store — reusable project templates and design frameworks.
 * Templates include pre-configured zones, structures, and phasing plans
 * that can be applied to new or existing projects.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ZoneTemplate {
  category: string;
  name: string;
  primaryUse: string;
  areaPercent: number; // % of total property
  color: string;
}

export interface StructureTemplate {
  type: string;
  name: string;
  phase: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'regenerative' | 'retreat' | 'homestead' | 'education' | 'conservation' | 'moontrance' | 'custom';
  isBuiltIn: boolean;
  zones: ZoneTemplate[];
  structures: StructureTemplate[];
  phases: { name: string; yearRange: string; description: string; features: string[] }[];
  costEstimateRange: [number, number]; // [lowK, highK]
  createdAt: string;
}

interface TemplateState {
  customTemplates: ProjectTemplate[];
  addTemplate: (template: ProjectTemplate) => void;
  deleteTemplate: (id: string) => void;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set) => ({
      customTemplates: [],
      addTemplate: (template) => set((s) => ({ customTemplates: [...s.customTemplates, template] })),
      deleteTemplate: (id) => set((s) => ({ customTemplates: s.customTemplates.filter((t) => t.id !== id) })),
    }),
    { name: 'ogden-templates', version: 1 },
  ),
);

// Hydrate from localStorage (Zustand v5)
useTemplateStore.persist.rehydrate();

// ── Built-in Templates ──────────────────────────────────────────────────

export const BUILT_IN_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-regen-farm',
    name: 'Regenerative Farm',
    description: 'Multi-enterprise regenerative agriculture with livestock, orchards, market garden, and water management.',
    icon: '\u{1F33E}',
    category: 'regenerative',
    isBuiltIn: true,
    zones: [
      { category: 'habitation', name: 'Habitation Core', primaryUse: 'Dwelling & workspace', areaPercent: 5, color: '#8B6E4E' },
      { category: 'food_forest', name: 'Food Forest', primaryUse: 'Orchard & agroforestry', areaPercent: 15, color: '#4A7C3F' },
      { category: 'livestock', name: 'Rotational Pasture', primaryUse: '8-paddock grazing', areaPercent: 35, color: '#7A6B3A' },
      { category: 'water_retention', name: 'Water Retention', primaryUse: 'Keyline pond & swales', areaPercent: 8, color: '#4A6B8A' },
      { category: 'commons', name: 'Market Garden', primaryUse: 'Vegetables & herbs', areaPercent: 5, color: '#6B8A4A' },
      { category: 'forest_regen', name: 'Forest Regeneration', primaryUse: 'Native forest restoration', areaPercent: 20, color: '#3D6B3D' },
      { category: 'service', name: 'Service Area', primaryUse: 'Workshop, compost, storage', areaPercent: 4, color: '#6B6B6B' },
    ],
    structures: [
      { type: 'cabin', name: 'Farmhouse', phase: 'Phase 1' },
      { type: 'barn', name: 'Barn', phase: 'Phase 1' },
      { type: 'greenhouse', name: 'Greenhouse', phase: 'Phase 2' },
      { type: 'workshop', name: 'Workshop', phase: 'Phase 2' },
      { type: 'pump_house', name: 'Pump House', phase: 'Phase 1' },
    ],
    phases: [
      { name: 'Foundation', yearRange: '0-1', description: 'Establish presence, secure water, build core infrastructure.', features: ['Well & water system', 'Road access', 'Main dwelling', 'Initial fencing', 'Soil amendment'] },
      { name: 'Productive Systems', yearRange: '1-3', description: 'Build productive agricultural systems generating sustenance and early revenue.', features: ['Keyline pond & swales', 'Rotational grazing setup', 'Orchard planting (200 trees)', 'Market garden', 'Livestock acquisition'] },
      { name: 'Expansion', yearRange: '3-5', description: 'Diversify enterprises and optimize systems.', features: ['Greenhouse expansion', 'Farm store', 'Additional pasture', 'Forest planting', 'Value-added processing'] },
      { name: 'Maturity', yearRange: '5+', description: 'Full production, carbon credits, education programs.', features: ['Carbon monitoring', 'Farm tours', 'Apprenticeship program', 'Regional food hub participation'] },
    ],
    costEstimateRange: [380, 650],
    createdAt: '2025-01-01',
  },
  {
    id: 'tpl-retreat',
    name: 'Retreat Center',
    description: 'Guest-focused property with cabins, gathering spaces, contemplation gardens, and educational facilities.',
    icon: '\u{1F3E1}',
    category: 'retreat',
    isBuiltIn: true,
    zones: [
      { category: 'habitation', name: 'Host Residence', primaryUse: 'Owner dwelling', areaPercent: 3, color: '#8B6E4E' },
      { category: 'guest', name: 'Guest Village', primaryUse: 'Cabins & glamping', areaPercent: 10, color: '#A0845C' },
      { category: 'prayer', name: 'Contemplation Garden', primaryUse: 'Prayer & reflection', areaPercent: 5, color: '#6B5B8A' },
      { category: 'commons', name: 'Community Commons', primaryUse: 'Gathering & events', areaPercent: 8, color: '#c4a265' },
      { category: 'food_forest', name: 'Kitchen Garden', primaryUse: 'Farm-to-table produce', areaPercent: 5, color: '#4A7C3F' },
      { category: 'education', name: 'Educational Zone', primaryUse: 'Classroom & trails', areaPercent: 10, color: '#7B6DAA' },
      { category: 'forest_regen', name: 'Forest Preserve', primaryUse: 'Walking trails & habitat', areaPercent: 40, color: '#3D6B3D' },
      { category: 'water_retention', name: 'Water Feature', primaryUse: 'Pond & wetland garden', areaPercent: 5, color: '#4A6B8A' },
    ],
    structures: [
      { type: 'cabin', name: 'Host House', phase: 'Phase 1' },
      { type: 'cabin', name: 'Guest Cabin 1', phase: 'Phase 2' },
      { type: 'cabin', name: 'Guest Cabin 2', phase: 'Phase 2' },
      { type: 'pavilion', name: 'Gathering Pavilion', phase: 'Phase 2' },
      { type: 'prayer_space', name: 'Prayer Pavilion', phase: 'Phase 2' },
      { type: 'classroom', name: 'Learning Center', phase: 'Phase 3' },
      { type: 'fire_circle', name: 'Fire Circle', phase: 'Phase 1' },
    ],
    phases: [
      { name: 'Site Intelligence', yearRange: '0-1', description: 'Establish presence and core infrastructure.', features: ['Host house', 'Road & access', 'Water system', 'Fire circle', 'Initial landscaping'] },
      { name: 'Guest Experience', yearRange: '1-3', description: 'Open to guests with cabins and gathering spaces.', features: ['2 guest cabins', 'Gathering pavilion', 'Prayer garden', 'Kitchen garden', 'Trail system'] },
      { name: 'Full Program', yearRange: '3-5', description: 'Complete educational and community facilities.', features: ['Learning center', 'Additional cabins', 'Event lawn', 'Farm-to-table kitchen', 'Retreat programming'] },
    ],
    costEstimateRange: [525, 843],
    createdAt: '2025-01-01',
  },
  {
    id: 'tpl-homestead',
    name: 'Homestead',
    description: 'Self-sufficient family property with food production, energy independence, and modest guest capacity.',
    icon: '\u{1F3E0}',
    category: 'homestead',
    isBuiltIn: true,
    zones: [
      { category: 'habitation', name: 'Home Site', primaryUse: 'Family dwelling', areaPercent: 8, color: '#8B6E4E' },
      { category: 'food_forest', name: 'Food Forest', primaryUse: 'Fruit & nut trees', areaPercent: 12, color: '#4A7C3F' },
      { category: 'commons', name: 'Kitchen Garden', primaryUse: 'Annual vegetables', areaPercent: 4, color: '#6B8A4A' },
      { category: 'livestock', name: 'Small Pasture', primaryUse: 'Poultry & small ruminants', areaPercent: 15, color: '#7A6B3A' },
      { category: 'water_retention', name: 'Rain Garden', primaryUse: 'Water harvesting', areaPercent: 3, color: '#4A6B8A' },
      { category: 'forest_regen', name: 'Woodlot', primaryUse: 'Firewood & wildlife', areaPercent: 30, color: '#3D6B3D' },
    ],
    structures: [
      { type: 'cabin', name: 'Main House', phase: 'Phase 1' },
      { type: 'workshop', name: 'Workshop', phase: 'Phase 1' },
      { type: 'greenhouse', name: 'Greenhouse', phase: 'Phase 2' },
      { type: 'animal_shelter', name: 'Chicken Coop', phase: 'Phase 1' },
      { type: 'storage_shed', name: 'Root Cellar', phase: 'Phase 2' },
    ],
    phases: [
      { name: 'Essentials', yearRange: '0-1', description: 'Build shelter, secure water, plant first trees.', features: ['Main house', 'Well & septic', 'Chicken coop', 'First 50 fruit trees', 'Garden beds'] },
      { name: 'Production', yearRange: '1-3', description: 'Expand food production and storage.', features: ['Greenhouse', 'Root cellar', 'Expanded garden', 'Small ruminants', 'Firewood management'] },
      { name: 'Refinement', yearRange: '3+', description: 'Optimize systems and add comfort.', features: ['Solar expansion', 'Food preservation', 'Guest accommodation', 'Forest management'] },
    ],
    costEstimateRange: [180, 320],
    createdAt: '2025-01-01',
  },
  {
    id: 'tpl-moontrance',
    name: 'OGDEN Model',
    description: 'The signature Moontrance template: regenerative agriculture, spiritual spaces, education, community hospitality — all integrated.',
    icon: '\u2726',
    category: 'moontrance',
    isBuiltIn: true,
    zones: [
      { category: 'habitation', name: 'Habitation Core', primaryUse: 'Family dwelling & operations', areaPercent: 4, color: '#8B6E4E' },
      { category: 'prayer', name: 'Prayer & Contemplation', primaryUse: 'Prayer pavilion & garden', areaPercent: 3, color: '#6B5B8A' },
      { category: 'guest', name: 'Guest Retreat', primaryUse: '4-8 guest cabins', areaPercent: 6, color: '#A0845C' },
      { category: 'commons', name: 'Community Commons', primaryUse: 'Gathering & hospitality', areaPercent: 5, color: '#c4a265' },
      { category: 'education', name: 'Educational Zone', primaryUse: 'Learning center & trails', areaPercent: 5, color: '#7B6DAA' },
      { category: 'food_forest', name: 'Food Forest', primaryUse: 'Orchard & agroforestry', areaPercent: 12, color: '#4A7C3F' },
      { category: 'livestock', name: 'Rotational Pasture', primaryUse: 'Livestock grazing', areaPercent: 25, color: '#7A6B3A' },
      { category: 'water_retention', name: 'Water Retention', primaryUse: 'Keyline ponds & swales', areaPercent: 6, color: '#4A6B8A' },
      { category: 'forest_regen', name: 'Forest Regeneration', primaryUse: 'Carolinian restoration', areaPercent: 25, color: '#3D6B3D' },
      { category: 'service', name: 'Service & Maintenance', primaryUse: 'Workshop & compost', areaPercent: 3, color: '#6B6B6B' },
    ],
    structures: [
      { type: 'cabin', name: 'Main Dwelling', phase: 'Phase 1' },
      { type: 'prayer_space', name: 'Prayer Pavilion', phase: 'Phase 2' },
      { type: 'cabin', name: 'Guest Cabin 1-4', phase: 'Phase 3' },
      { type: 'pavilion', name: 'Community Hall', phase: 'Phase 3' },
      { type: 'classroom', name: 'Learning Pavilion', phase: 'Phase 3' },
      { type: 'barn', name: 'Barn', phase: 'Phase 2' },
      { type: 'greenhouse', name: 'Greenhouse', phase: 'Phase 2' },
      { type: 'fire_circle', name: 'Fire Circle', phase: 'Phase 1' },
      { type: 'lookout_point', name: 'Dawn Overlook', phase: 'Phase 2' },
    ],
    phases: [
      { name: 'Site Intelligence', yearRange: '0-1', description: 'Establish presence, secure water, build core infrastructure. The foundation from which all else grows.', features: ['Well drilling & water system', 'Road grading & access', 'Off-grid solar installation', 'Main cabin construction', 'Initial soil amendment & cover cropping', 'Emergency fencing', 'Conservation Halton pre-consultation', 'Tile drain assessment & control structures'] },
      { name: 'Design Atlas', yearRange: '1-3', description: 'Establish productive systems — food, water, livestock — generating sustenance and early revenue.', features: ['Keyline pond & swale network', '8-paddock rotational grazing', 'Orchard planting (200 trees)', 'Market garden with irrigation', 'Livestock acquisition', 'Forest edge reforestation'] },
      { name: 'Collaboration & Community', yearRange: '3-5', description: 'Open the land to guests, seekers, and community. Build the hospitality and educational infrastructure.', features: ['4 guest cabins', 'Prayer pavilion & contemplation garden', 'Community hall & classroom', 'Educational farm trail', 'Event lawn & fire circle', 'Guest-safe livestock buffers'] },
      { name: 'Full Vision', yearRange: '5+', description: 'The mature expression — a living sanctuary for land, spirit, family, and community.', features: ['Expanded retreat (8+ units)', "Men's cohort facilities", 'Mature food forest canopy', 'Carbon monitoring program', 'Atlas template publication', 'Advanced water system management'] },
    ],
    costEstimateRange: [525, 843],
    createdAt: '2025-01-01',
  },
  {
    id: 'tpl-conservation',
    name: 'Conservation First',
    description: 'Land protection focus with minimal development footprint, habitat restoration, and monitoring.',
    icon: '\u{1F33F}',
    category: 'conservation',
    isBuiltIn: true,
    zones: [
      { category: 'habitation', name: 'Caretaker Site', primaryUse: 'Minimal dwelling', areaPercent: 2, color: '#8B6E4E' },
      { category: 'forest_regen', name: 'Forest Restoration', primaryUse: 'Native species planting', areaPercent: 45, color: '#3D6B3D' },
      { category: 'water_retention', name: 'Wetland Restoration', primaryUse: 'Wetland creation & buffer', areaPercent: 15, color: '#4A6B8A' },
      { category: 'commons', name: 'Meadow Habitat', primaryUse: 'Pollinator meadow', areaPercent: 20, color: '#8A9A4A' },
      { category: 'education', name: 'Monitoring Stations', primaryUse: 'Wildlife & water monitoring', areaPercent: 3, color: '#7B6DAA' },
    ],
    structures: [
      { type: 'cabin', name: 'Caretaker Cabin', phase: 'Phase 1' },
      { type: 'storage_shed', name: 'Equipment Shed', phase: 'Phase 1' },
      { type: 'lookout_point', name: 'Wildlife Blind', phase: 'Phase 2' },
    ],
    phases: [
      { name: 'Assessment', yearRange: '0-1', description: 'Baseline ecological inventory and protection plan.', features: ['Species inventory', 'Hydrology assessment', 'Invasive species removal', 'Caretaker dwelling'] },
      { name: 'Restoration', yearRange: '1-5', description: 'Active habitat restoration and monitoring.', features: ['10,000 native tree plantings', 'Wetland creation', 'Meadow establishment', 'Trail system', 'Monitoring infrastructure'] },
      { name: 'Stewardship', yearRange: '5+', description: 'Ongoing management and public access.', features: ['Conservation easement', 'Educational tours', 'Carbon credit program', 'Research partnerships'] },
    ],
    costEstimateRange: [120, 250],
    createdAt: '2025-01-01',
  },
];
