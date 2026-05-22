/**
 * Monitoring transect store â€” recurring observation walks recorded as
 * line-strings on the map (Plan Toolbar Tier B / B4). Lives under
 * `principle-verification` in the PLAN toolbar alongside ecological
 * notes (B5 / Holmgren principle 1: Observe and interact).
 *
 * A transect is a fixed walking line + a cadence + an observation log:
 *   - geometry: the line the steward walks every cadence interval
 *   - monitoringKind: what they're tracking on this line (invasives /
 *     indicator-species / soil-health / water-quality / wildlife / general)
 *   - cadence: how often the walk repeats (weekly / monthly / quarterly
 *     / yearly / one-off)
 *   - observations: chronological log of dated entries â€” bare-bones in v1
 *     (date + free-text notes); a follow-up may add structured species
 *     counts, photos, density grids, etc.
 *
 * Surfaces in:
 *   - Conservation #5 (invasives-monitoring transect)
 *   - Conservation #6 (indicator-species + baseline-monitoring protocol)
 *   - Educational Farm â€” broadly applicable for any "demo plot
 *     observation walk" use case (not currently a checklist item)
 *
 * Cross-check chip: any transect created for a project flips
 * `principle-verification` from "non-spatial" to "spatial-when-present"
 * (alongside ecological notes). See `planModuleArtifactPresence.ts`.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rehydrateWithLogging } from './persistRehydrate.js';
import { temporal } from 'zundo';

export type TransectMonitoringKind =
  | 'invasives'
  | 'indicator-species'
  | 'soil-health'
  | 'water-quality'
  | 'wildlife'
  | 'general';

export type TransectCadence =
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'one-off';

export interface TransectObservation {
  id: string;
  /** ISO date-time when the walk was performed. */
  date: string;
  /** Free-text notes from the walk â€” counts, sightings, conditions. */
  notes: string;
}

export interface MonitoringTransect {
  id: string;
  projectId: string;
  name: string;
  monitoringKind: TransectMonitoringKind;
  geometry: GeoJSON.LineString;
  /** Hex colour â€” defaults to the monitoring-kind palette entry. */
  color: string;
  cadence: TransectCadence;
  /** Chronological observation log; newest first by convention. */
  observations: TransectObservation[];
  notes: string;
  phase?: string;
  enterprise?: string;
  createdAt: string;
  updatedAt: string;
}

export const TRANSECT_MONITORING_CONFIG: Record<
  TransectMonitoringKind,
  { label: string; color: string }
> = {
  'invasives':         { label: 'Invasives',         color: '#c44a3a' },
  'indicator-species': { label: 'Indicator species', color: '#7aae3c' },
  'soil-health':       { label: 'Soil health',       color: '#8a6a3a' },
  'water-quality':     { label: 'Water quality',     color: '#4a90d9' },
  'wildlife':          { label: 'Wildlife',          color: '#caa46c' },
  'general':           { label: 'General',           color: '#9a8070' },
};

export const TRANSECT_CADENCE_LABEL: Record<TransectCadence, string> = {
  'weekly':    'Weekly',
  'monthly':   'Monthly',
  'quarterly': 'Quarterly',
  'yearly':    'Yearly',
  'one-off':   'One-off',
};

interface MonitoringTransectState {
  transects: MonitoringTransect[];

  addTransect: (t: MonitoringTransect) => void;
  updateTransect: (id: string, patch: Partial<MonitoringTransect>) => void;
  deleteTransect: (id: string) => void;

  /** Append a new observation to the transect's log. */
  appendObservation: (transectId: string, obs: TransectObservation) => void;
  /** Patch an existing observation's notes / date. */
  updateObservation: (
    transectId: string,
    observationId: string,
    patch: Partial<TransectObservation>,
  ) => void;
  /** Remove an observation from the log. */
  deleteObservation: (transectId: string, observationId: string) => void;
}

export const useMonitoringTransectStore = create<MonitoringTransectState>()(
  persist(
    temporal(
      (set) => ({
        transects: [],

        addTransect: (t) =>
          set((s) => ({ transects: [...s.transects, t] })),

        updateTransect: (id, patch) =>
          set((s) => ({
            transects: s.transects.map((t) =>
              t.id === id
                ? { ...t, ...patch, updatedAt: new Date().toISOString() }
                : t,
            ),
          })),

        deleteTransect: (id) =>
          set((s) => ({
            transects: s.transects.filter((t) => t.id !== id),
          })),

        appendObservation: (transectId, obs) =>
          set((s) => ({
            transects: s.transects.map((t) =>
              t.id === transectId
                ? {
                    ...t,
                    observations: [obs, ...t.observations],
                    updatedAt: new Date().toISOString(),
                  }
                : t,
            ),
          })),

        updateObservation: (transectId, observationId, patch) =>
          set((s) => ({
            transects: s.transects.map((t) =>
              t.id === transectId
                ? {
                    ...t,
                    observations: t.observations.map((o) =>
                      o.id === observationId ? { ...o, ...patch } : o,
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : t,
            ),
          })),

        deleteObservation: (transectId, observationId) =>
          set((s) => ({
            transects: s.transects.map((t) =>
              t.id === transectId
                ? {
                    ...t,
                    observations: t.observations.filter(
                      (o) => o.id !== observationId,
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : t,
            ),
          })),
      }),
      { limit: 200 },
    ),
    { name: 'ogden-monitoring-transects', version: 1, migrate: (persisted) => persisted as never },
  ),
);

rehydrateWithLogging(useMonitoringTransectStore);
