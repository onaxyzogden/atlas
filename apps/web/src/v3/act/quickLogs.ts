/**
 * quickLogs.ts — the Act stage's in-field quick-log registry.
 *
 * Single source of truth for the three map-tool-backed field logs (harvest,
 * water check, livestock move). Extracted from ActTools.tsx so both the
 * field-action quick-log strip and the tier-shell bottom tools rail render
 * the same set without copy-paste drift. Pure data + types — no React, no
 * store reads.
 */

import { Sprout, Droplet, Shuffle } from 'lucide-react';
import type { MapToolId } from '../observe/components/measure/useMapToolStore.js';
import type { ActModule } from './types.js';

export interface QuickLog {
  id: string;
  label: string;
  hint: string;
  Icon: typeof Sprout;
  module: ActModule;
  toolId?: MapToolId;
}

export const QUICK_LOGS: QuickLog[] = [
  {
    id: 'plants-food',
    label: 'Log harvest',
    hint: 'Drop a yield entry on a crop area or paddock',
    Icon: Sprout,
    module: 'plants-food',
    toolId: 'act.harvest.log-entry',
  },
  {
    id: 'water',
    label: 'Log water check',
    hint: 'Click a swale, cistern, or pond to log a maintenance event',
    Icon: Droplet,
    module: 'built-infrastructure',
    toolId: 'act.maintain.log-event',
  },
  {
    id: 'animals-livestock',
    label: 'Log livestock move',
    hint: 'Click a paddock to log a move-in / out / rotate-through',
    Icon: Shuffle,
    module: 'animals-livestock',
    toolId: 'act.livestock.log-move',
  },
];
