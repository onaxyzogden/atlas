/**
 * Flow connector store â€” directed line-string connectors that express
 * material / energy flows in a closed-loop fertility system (Plan
 * Toolbar Tier B / B3). Lives under `soil-fertility` in the PLAN
 * toolbar.
 *
 * Stewards drop a connector to express "compost goes from kitchen to
 * orchard" or "manure flows from chicken paddock to garden bed." The
 * line carries flow direction (start â†’ end of geometry) and a
 * `flowKind` (compost / manure / mulch / water / grain / energy /
 * other), each with its own colour palette so the loop reads at a
 * glance against the underlying fertility infra and crop areas.
 *
 * Surfaces in:
 *   - Regenerative Farm #6 (closed-loop compost / manure / residue)
 *   - Homestead #5 (kitchen / animal / wood-stove fertility loop)
 *
 * v1 scope: free LineString geometry â€” endpoints are wherever the
 * steward clicked, no automatic snap-to-fertility-unit. Optional
 * `fromName` / `toName` strings let the steward describe the endpoints
 * in their own words ("kitchen scraps", "compost tumbler", etc.). A
 * future revision may add hit-test snapping to existing fertility
 * infra / crop area / paddock features and persist concrete
 * `sourceId` / `sinkId` references.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export type FlowKind =
  | 'compost'
  | 'manure'
  | 'mulch'
  | 'water'
  | 'grain'
  | 'energy'
  | 'other';

export interface FlowConnector {
  id: string;
  projectId: string;
  name: string;
  flowKind: FlowKind;
  geometry: GeoJSON.LineString;
  /** Hex colour â€” defaults to the flow-kind palette entry. */
  color: string;
  /** Free-text descriptor for the line's start point ("kitchen"). */
  fromName?: string;
  /** Free-text descriptor for the line's end point ("orchard"). */
  toName?: string;
  notes: string;
  phase?: string;
  enterprise?: string;
  createdAt: string;
  updatedAt: string;
}

export const FLOW_KIND_CONFIG: Record<
  FlowKind,
  { label: string; color: string }
> = {
  compost: { label: 'Compost',  color: '#6a4a28' },
  manure:  { label: 'Manure',   color: '#8a6a3a' },
  mulch:   { label: 'Mulch',    color: '#7aae3c' },
  water:   { label: 'Water',    color: '#4a90d9' },
  grain:   { label: 'Grain',    color: '#caa46c' },
  energy:  { label: 'Energy',   color: '#e6b34a' },
  other:   { label: 'Other',    color: '#9a8070' },
};

interface FlowConnectorState {
  connectors: FlowConnector[];

  addConnector: (c: FlowConnector) => void;
  updateConnector: (id: string, patch: Partial<FlowConnector>) => void;
  deleteConnector: (id: string) => void;
}

export const useFlowConnectorStore = create<FlowConnectorState>()(
  persist(
    temporal(
      (set) => ({
        connectors: [],

        addConnector: (c) =>
          set((s) => ({ connectors: [...s.connectors, c] })),

        updateConnector: (id, patch) =>
          set((s) => ({
            connectors: s.connectors.map((c) =>
              c.id === id
                ? { ...c, ...patch, updatedAt: new Date().toISOString() }
                : c,
            ),
          })),

        deleteConnector: (id) =>
          set((s) => ({
            connectors: s.connectors.filter((c) => c.id !== id),
          })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-flow-connectors', version: 1, migrate: (persisted) => persisted as never },
  ),
);

useFlowConnectorStore.persist.rehydrate();
