/**
 * Habitat-feature store (Sub-project A2).
 *
 * Local-first inventory of the discrete habitat commitments the steward
 * has made — wildlife pond, owl boxes, hawk/raptor perches, hedgerow
 * length, insectary strips, etc. (the Apricot Lane "primary biological
 * tools"). Persisted client-side exactly like `pathStore` /
 * `soilSampleStore`; no DB migration, no server endpoint.
 *
 * `kind` discriminates how a feature is quantified:
 *   - 'point' → a discrete count (`quantity`): owl boxes, perches, snags
 *   - 'line'  → a linear extent in metres (`lengthM`): hedgerow, strip
 *   - 'area'  → a singular landscape feature (`quantity` defaults 1):
 *               wildlife pond / wetland (its acreage lives on the zone
 *               it occupies — this row records the commitment itself)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

export type HabitatFeatureKind = 'point' | 'line' | 'area';

export type HabitatFeatureType =
  | 'wildlife_pond'
  | 'owl_box'
  | 'hawk_perch'
  | 'raptor_perch'
  | 'hedgerow'
  | 'insectary_strip'
  | 'nest_box'
  | 'brush_pile'
  | 'snag';

export interface HabitatFeatureTypeMeta {
  label: string;
  kind: HabitatFeatureKind;
}

export const HABITAT_FEATURE_TYPES: Record<
  HabitatFeatureType,
  HabitatFeatureTypeMeta
> = {
  wildlife_pond: { label: 'Wildlife pond / wetland', kind: 'area' },
  owl_box: { label: 'Owl box', kind: 'point' },
  hawk_perch: { label: 'Hawk perch', kind: 'point' },
  raptor_perch: { label: 'Raptor perch', kind: 'point' },
  hedgerow: { label: 'Hedgerow', kind: 'line' },
  insectary_strip: { label: 'Insectary strip', kind: 'line' },
  nest_box: { label: 'Nest box', kind: 'point' },
  brush_pile: { label: 'Brush / habitat pile', kind: 'point' },
  snag: { label: 'Standing snag', kind: 'point' },
};

export const HABITAT_FEATURE_TYPE_KEYS = Object.keys(
  HABITAT_FEATURE_TYPES,
) as HabitatFeatureType[];

export interface HabitatFeature {
  id: string;
  projectId: string;
  type: HabitatFeatureType;
  kind: HabitatFeatureKind;
  /** Discrete count — used when `kind` is 'point' or 'area'. */
  quantity?: number;
  /** Linear extent in metres — used when `kind` is 'line'. */
  lengthM?: number;
  geometry?: GeoJSON.Point | GeoJSON.LineString;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface HabitatFeatureState {
  features: HabitatFeature[];

  addFeature: (feature: HabitatFeature) => void;
  updateFeature: (id: string, updates: Partial<HabitatFeature>) => void;
  removeFeature: (id: string) => void;
}

export const useHabitatFeatureStore = create<HabitatFeatureState>()(
  persist(
    temporal(
      (set) => ({
        features: [],

        addFeature: (feature) =>
          set((s) => ({ features: [...s.features, feature] })),

        updateFeature: (id, updates) =>
          set((s) => ({
            features: s.features.map((f) =>
              f.id === id
                ? { ...f, ...updates, updatedAt: new Date().toISOString() }
                : f,
            ),
          })),

        removeFeature: (id) =>
          set((s) => ({ features: s.features.filter((f) => f.id !== id) })),
      }),
      { limit: 200 },
    ),
    {
      name: 'ogden-habitat-features',
      version: 1,
      migrate: (persisted) => persisted as never,
    },
  ),
);

// Hydrate from localStorage (Zustand v5)
useHabitatFeatureStore.persist.rehydrate();

/** Stable selector helper — features belonging to one project. */
export function featuresForProject(
  features: HabitatFeature[],
  projectId: string,
): HabitatFeature[] {
  return features.filter((f) => f.projectId === projectId);
}
