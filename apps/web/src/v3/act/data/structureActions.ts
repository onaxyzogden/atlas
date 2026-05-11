/**
 * Per-structure-type action menu for the Act-stage structure inspector.
 *
 * The inspector pops on click of any placed structure; this map decides
 * which log buttons render in the footer. Maintenance is the universal
 * action (every structure can be inspected / cleared / repaired). Barns
 * and animal shelters can also be the target of a livestock-move log.
 * Greenhouses can be the target of a harvest log.
 */

import type { StructureType } from '../../../store/structureStore.js';

export type StructureActionKind =
  | 'maintenance'
  | 'livestockMove'
  | 'scheduleLivestockMove'
  | 'harvest';

const MAP: Partial<Record<StructureType, StructureActionKind[]>> = {
  barn:           ['maintenance', 'livestockMove', 'scheduleLivestockMove'],
  animal_shelter: ['maintenance', 'livestockMove', 'scheduleLivestockMove'],
  greenhouse:     ['maintenance', 'harvest'],
};

export function getActionsForType(type: StructureType): StructureActionKind[] {
  return MAP[type] ?? ['maintenance'];
}

export const ACTION_LABELS: Record<StructureActionKind, string> = {
  maintenance:           'Log maintenance',
  livestockMove:         'Log livestock move',
  scheduleLivestockMove: 'Schedule move',
  harvest:               'Log harvest',
};
