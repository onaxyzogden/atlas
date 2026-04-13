/**
 * ContextBuilder — serializes project data from all stores into
 * a structured context string for Claude API prompts.
 *
 * Per Section 0d AI Guardrails: every AI output must cite data sources,
 * express confidence, and flag when site visits are needed.
 */

import { useProjectStore, type LocalProject } from '../../store/projectStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import { LIVESTOCK_SPECIES, CROP_TYPES } from '../livestock/speciesData.js';
import { PATH_TYPE_CONFIG } from '../../store/pathStore.js';
import { UTILITY_TYPE_CONFIG } from '../../store/utilityStore.js';
import { getLayerSummaryText, type MockLayerResult } from '../../lib/mockLayerData.js';

export function buildProjectContext(projectId: string, layers: MockLayerResult[] = []): string {
  const project = useProjectStore.getState().projects.find((p) => p.id === projectId);
  if (!project) return 'No project found.';

  const zones = useZoneStore.getState().zones.filter((z) => z.projectId === projectId);
  const structures = useStructureStore.getState().structures.filter((s) => s.projectId === projectId);
  const paddocks = useLivestockStore.getState().paddocks.filter((p) => p.projectId === projectId);
  const crops = useCropStore.getState().cropAreas.filter((c) => c.projectId === projectId);
  const paths = usePathStore.getState().paths.filter((p) => p.projectId === projectId);
  const utilities = useUtilityStore.getState().utilities.filter((u) => u.projectId === projectId);

  const lines: string[] = [];

  // Project basics
  lines.push(`## Project: ${project.name}`);
  lines.push(`- Address: ${project.address ?? 'Not set'}`);
  lines.push(`- Country: ${project.country}, Province/State: ${project.provinceState ?? 'Not set'}`);
  lines.push(`- Type: ${project.projectType ?? 'Not set'}`);
  lines.push(`- Acreage: ${project.acreage ?? 'Unknown'} (${project.units})`);
  lines.push(`- Has boundary: ${project.hasParcelBoundary ? 'Yes' : 'No'}`);
  lines.push('');

  // Site data — only included when real layers are provided
  if (layers.length > 0) {
    lines.push('## Site Data (Live Layers)');
    for (const layer of layers) {
      const summaryLines = getLayerSummaryText(layer);
      lines.push(`### ${layer.layerType} (${layer.confidence} confidence, source: ${layer.sourceApi})`);
      summaryLines.forEach((l) => lines.push(`  - ${l}`));
    }
    lines.push('');
  }

  // Notes
  if (project.ownerNotes) lines.push(`## Owner Notes\n${project.ownerNotes}\n`);
  if (project.zoningNotes) lines.push(`## Zoning Notes\n${project.zoningNotes}\n`);
  if (project.waterRightsNotes) lines.push(`## Water Rights\n${project.waterRightsNotes}\n`);
  if (project.accessNotes) lines.push(`## Access Notes\n${project.accessNotes}\n`);

  // Zones
  if (zones.length > 0) {
    lines.push(`## Zones (${zones.length})`);
    for (const z of zones) {
      lines.push(`- ${z.name} (${z.category}, ${(z.areaM2 / 10000).toFixed(2)} ha) — ${z.notes || 'no notes'}`);
    }
    lines.push('');
  }

  // Structures
  if (structures.length > 0) {
    lines.push(`## Structures (${structures.length})`);
    for (const s of structures) {
      const tmpl = STRUCTURE_TEMPLATES[s.type];
      lines.push(`- ${s.name} (${tmpl?.label ?? s.type}, ${s.widthM}x${s.depthM}m, Phase: ${s.phase}, Cost: $${s.costEstimate?.toLocaleString() ?? '?'})`);
    }
    lines.push('');
  }

  // Paddocks
  if (paddocks.length > 0) {
    lines.push(`## Paddocks (${paddocks.length})`);
    for (const p of paddocks) {
      const speciesNames = p.species.map((sp) => LIVESTOCK_SPECIES[sp]?.label ?? sp).join(', ');
      lines.push(`- ${p.name} (${(p.areaM2 / 10000).toFixed(2)} ha, Species: ${speciesNames || 'none'}, Fencing: ${p.fencing})`);
    }
    lines.push('');
  }

  // Crops
  if (crops.length > 0) {
    lines.push(`## Crop Areas (${crops.length})`);
    for (const c of crops) {
      const ct = CROP_TYPES[c.type];
      lines.push(`- ${c.name} (${ct?.label ?? c.type}, ${(c.areaM2 / 10000).toFixed(2)} ha, Species: ${c.species.join(', ') || 'none'})`);
    }
    lines.push('');
  }

  // Paths
  if (paths.length > 0) {
    lines.push(`## Paths (${paths.length})`);
    for (const p of paths) {
      const cfg = PATH_TYPE_CONFIG[p.type];
      lines.push(`- ${p.name} (${cfg?.label ?? p.type}, ${Math.round(p.lengthM)}m)`);
    }
    lines.push('');
  }

  // Utilities
  if (utilities.length > 0) {
    lines.push(`## Utilities (${utilities.length})`);
    for (const u of utilities) {
      const cfg = UTILITY_TYPE_CONFIG[u.type];
      lines.push(`- ${u.name} (${cfg?.label ?? u.type}, Phase: ${u.phase})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export const SYSTEM_PROMPT = `You are the OGDEN Atlas AI — a land design intelligence assistant built into the OGDEN Land Design Atlas. You help landowners, designers, and stewards make wise decisions about their land.

## Your Core Values (from the OGDEN Design Philosophy):
- Stewardship over extraction: Ask "what does this land need?" before "what can this land produce?"
- Phased humility: Reward sequenced, realistic buildout — not fantasy master plans
- Explainability: Every suggestion must be traceable to data or reasoning
- Spiritual intentionality: Prayer spaces, quiet zones, and contemplative design are first-class concerns
- Honesty about uncertainty: Flag what you don't know. Express confidence levels.

## Output Rules (AI Guardrails - Section 0d):
1. ALWAYS cite which data you're drawing from (e.g., "Based on the soil data (Loam, pH 6.1-6.8)...")
2. ALWAYS include a confidence level: High (well-sourced), Medium (some gaps), Low (inference-heavy)
3. Use hedged language for Low confidence: "may be", "likely", "consider verifying"
4. Flag "Needs site visit" when confidence is below Medium for important decisions
5. NEVER generate specific cost figures unless drawn from the project's placed structures/cost estimates
6. All outputs are drafts — encourage the user to verify and adapt

## Context:
You have access to the full project data below. Reference specific zones, structures, and site data in your responses. Be specific to THIS property, not generic.`;
