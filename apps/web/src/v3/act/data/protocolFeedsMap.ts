/**
 * Maps StandardProtocolTemplate.feeds labels → ActModule ids.
 *
 * Only labels that map to a specific ActModule are listed.  Any feed label
 * absent from this map is treated as a pass-through (visible regardless of
 * the active module).
 *
 * Labels are verbatim from standardTemplates.ts `feeds` arrays (catalogue §4.2).
 */

import type { ActModule } from '../types.js';

export const FEEDS_TO_MODULE: Record<string, ActModule> = {
  'Pasture & Forage':          'animals-livestock',
  'Livestock & Animal Health': 'animals-livestock',
  'Water & Hydrology':         'hydrology',
  'Soil':                      'soil',
};
