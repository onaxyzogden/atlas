/**
 * zoneEmphasisStore — transient hover bridge between the BaseMapCard zone
 * sub-legend and ZonesOverlay's map highlight layer. The two live in
 * unrelated subtrees, so a tiny shared store is the clean channel.
 *
 * Pure UI state: no persistence, no per-project scoping.
 */

import { create } from 'zustand';
import type { ZoneIndex } from '../lib/zones/types.js';

export interface ZoneEmphasisState {
  hoveredZone: ZoneIndex | null;
  setHoveredZone: (zone: ZoneIndex | null) => void;
}

export const useZoneEmphasisStore = create<ZoneEmphasisState>()((set) => ({
  hoveredZone: null,
  setHoveredZone: (zone) => set({ hoveredZone: zone }),
}));
