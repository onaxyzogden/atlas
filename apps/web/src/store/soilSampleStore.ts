/**
 * Soil sample store â€” manual lab results + biological-activity field notes
 * captured by stewards. Pre-site-visit, pre-API: free-form data entry that
 * sits alongside the SSURGO / SoilGrids canonical layers and surfaces on
 * the EcologicalDashboard FIELD OBSERVATIONS area.
 *
 * Spec: Â§7 "Manual soil test entry, biological activity notes" (featureManifest).
 *
 * Scope: presentation-layer only â€” zustand + localStorage, no server
 * roundtrip. Samples survive page reloads. Project deletion cascades via
 * cascadeDelete. Sample data is NOT cloned by duplicateProject because it
 * is an observation of the physical site, not design intent (mirrors how
 * comments and fieldwork are excluded from cascadeClone).
 *
 * Same persist pattern as nurseryStore / fieldworkStore.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { temporal } from 'zundo';

/** Coarse texture vocabulary â€” aligned with USDA soil texture triangle
 *  classes that show up most often on lab reports. `unknown` lets a steward
 *  capture a sample before they have texture results back. */
export type SoilTextureClass =
  | 'clay'
  | 'silty_clay'
  | 'silty_clay_loam'
  | 'clay_loam'
  | 'sandy_clay'
  | 'sandy_clay_loam'
  | 'loam'
  | 'silt_loam'
  | 'silt'
  | 'sandy_loam'
  | 'loamy_sand'
  | 'sand'
  | 'unknown';

/** Biological-activity heuristic â€” qualitative observation a steward can make
 *  in the field without a lab. "high" reads as visible earthworms /
 *  rooting / mycelium; "none" reads as compacted, lifeless. */
export type BiologicalActivity = 'none' | 'low' | 'moderate' | 'high' | 'unknown';

/** Sampling depth â€” bands match the SoilGrids canonical depth slices so a
 *  user can compare manual results to the raster surface at the same depth. */
export type SamplingDepth =
  | 'surface'
  | '0_5cm'
  | '5_15cm'
  | '15_30cm'
  | '30_60cm'
  | '60_100cm'
  | '100_200cm';

export interface SoilSample {
  id: string;
  projectId: string;
  /** YYYY-MM-DD â€” local calendar date, not UTC. */
  sampleDate: string;
  /** Short user-supplied label â€” "North paddock topsoil", "Pond bank silt". */
  label: string;
  /** [lng, lat] â€” point location, or null for site-wide. */
  location: [number, number] | null;
  depth: SamplingDepth;
  /** Lab results â€” every field optional so stewards can save partial entries. */
  ph: number | null;
  organicMatterPct: number | null;
  texture: SoilTextureClass | null;
  /** CEC, meq/100g â€” typical lab field. */
  cecMeq100g: number | null;
  /** EC, dS/m â€” typical lab field. */
  ecDsM: number | null;
  /** Bulk density, g/cmÂ³ â€” typical lab field. */
  bulkDensityGCm3: number | null;
  /** Optional macros (N, P, K) in ppm â€” included as a single field rather than
   *  three because labs report them on the same sheet and stewards typically
   *  copy them verbatim. */
  npkPpm: string | null;
  /** Qualitative biological-activity reading. */
  biologicalActivity: BiologicalActivity;
  /** Free-text notes â€” smell, color, root signs, anything the labels above
   *  don't cover. Pre-site-visit narrative. */
  notes: string;
  /** Optional lab name â€” "A&L Western", "Cornell Soil Health", or "Self-test". */
  lab: string | null;
  createdAt: string;
  updatedAt: string;
  /** Phase 4d â€” Jar test result (volumetric proportions, sums to ~100). */
  jarTest?: { sandPct: number; siltPct: number; clayPct: number };
  /** Phase 4d â€” Percolation rate (inches per hour). */
  percolationInPerHr?: number;
  /** Phase 4d â€” Depth to bedrock or refusal (metres). */
  depthToBedrockM?: number;
  /**
   * Phase 4d â€” Roof catchment context. Optional sub-object so a steward can
   * record harvested-rainwater-potential alongside the soil sample taken
   * downslope of a catchment.
   */
  roofCatchment?: {
    roofAreaM2: number;
    runoffCoeff?: number;
    annualPrecipMm?: number;
  };
}

interface SoilSampleState {
  samples: SoilSample[];

  addSample: (sample: SoilSample) => void;
  updateSample: (id: string, updates: Partial<SoilSample>) => void;
  deleteSample: (id: string) => void;
}

export const useSoilSampleStore = create<SoilSampleState>()(
  persist(
    temporal((set) => ({
      samples: [],

      addSample: (sample) =>
        set((s) => ({ samples: [...s.samples, sample] })),

      updateSample: (id, updates) =>
        set((s) => ({
          samples: s.samples.map((x) =>
            x.id === id
              ? { ...x, ...updates, updatedAt: new Date().toISOString() }
              : x,
          ),
        })),

      deleteSample: (id) =>
        set((s) => ({ samples: s.samples.filter((x) => x.id !== id) })),
    }), { limit: 200 }),
    { name: 'ogden-soil-samples', version: 1, migrate: (persisted) => persisted as never },
  ),
);

useSoilSampleStore.persist.rehydrate();

// â”€â”€â”€ Vocabulary helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const TEXTURE_LABELS: Record<SoilTextureClass, string> = {
  clay: 'Clay',
  silty_clay: 'Silty clay',
  silty_clay_loam: 'Silty clay loam',
  clay_loam: 'Clay loam',
  sandy_clay: 'Sandy clay',
  sandy_clay_loam: 'Sandy clay loam',
  loam: 'Loam',
  silt_loam: 'Silt loam',
  silt: 'Silt',
  sandy_loam: 'Sandy loam',
  loamy_sand: 'Loamy sand',
  sand: 'Sand',
  unknown: 'Unknown',
};

export const DEPTH_LABELS: Record<SamplingDepth, string> = {
  surface: 'Surface (0â€“2 cm)',
  '0_5cm': '0â€“5 cm',
  '5_15cm': '5â€“15 cm',
  '15_30cm': '15â€“30 cm',
  '30_60cm': '30â€“60 cm',
  '60_100cm': '60â€“100 cm',
  '100_200cm': '100â€“200 cm',
};

export const BIO_ACTIVITY_LABELS: Record<BiologicalActivity, string> = {
  none: 'None',
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  unknown: 'Unknown',
};
