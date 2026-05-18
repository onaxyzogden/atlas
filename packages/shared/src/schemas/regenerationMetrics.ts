/**
 * Monitored metric vocabulary for longitudinal outcome tracking.
 * Carries two `domain`s over one shared `regeneration_events` stream:
 *   - `regeneration` — soil/water/biology (Sub-project A1)
 *   - `biodiversity` — native cover, invasive pressure, species
 *     richness, beneficial-predator activity (Sub-project A3)
 *
 * This is a TYPED NARROWING of the deliberately-permissive
 * `observations` JSONB on `regeneration_events` (migration 015 /
 * `regenerationEvent.schema.ts`). It introduces NO schema or DB change:
 * a steward records an `observation`-type event whose `observations`
 * object carries any subset of these metric keys plus the two grouping
 * conventions (`roundLabel`, `zoneRef`). Unknown keys pass through
 * untouched — this vocabulary only gives the dashboard a canonical set
 * to chart and link to goal-tree targets.
 *
 * The `goalCriterionId` values intentionally mirror criterion ids in
 * `apps/web/src/v3/plan/data/goalTreeTemplates.ts` (REGENERATIVE_FARM).
 * If a criterion id there changes, update the mapping here in the same PR.
 */

import { z } from 'zod';

export type MonitoredMetricKey =
  | 'soil_om_pct'
  | 'living_cover_pct'
  | 'infiltration_pct'
  | 'microbial_biomass_index'
  | 'water_stable_aggregate_pct'
  | 'bulk_density'
  | 'native_veg_cover_pct'
  | 'invasive_pressure_pct'
  | 'bird_pollinator_species_count'
  | 'beneficial_predator_index';

/**
 * Which monitoring dashboard a metric belongs to. The same
 * `regeneration_events` stream and `observations` JSONB carry both
 * families; the discriminator keeps each card (A1 Regeneration Monitor
 * vs A3 Biodiversity Outcome Monitor) from rendering the other's series.
 */
export type MetricDomain = 'regeneration' | 'biodiversity';

export interface MonitoredMetric {
  key: MonitoredMetricKey;
  label: string;
  /** Which monitoring dashboard this metric is charted on. */
  domain: MetricDomain;
  /** Display unit suffix, e.g. "%", "g/cm³", "index". */
  unit: string;
  /**
   * Criterion id in the regenerative-farm goal tree this metric is
   * scored against, when one exists. `null` ⇒ tracked for trend only,
   * no target line / verdict.
   */
  goalCriterionId: string | null;
  /**
   * Direction of improvement. `true` ⇒ rising values are regeneration
   * (organic matter, cover). `false` ⇒ falling values are regeneration
   * (bulk density / compaction).
   */
  higherIsBetter: boolean;
  /** One-line steward-facing explanation of what the sample captures. */
  description: string;
}

export const MONITORED_METRICS: Record<MonitoredMetricKey, MonitoredMetric> = {
  soil_om_pct: {
    key: 'soil_om_pct',
    label: 'Soil organic matter',
    domain: 'regeneration',
    unit: '%',
    goalCriterionId: 'regen-soil-om',
    higherIsBetter: true,
    description:
      'Topsoil organic matter by loss-on-ignition or lab carbon. The MDPI Apricot Lane study tracked 13–100% gains over 9 years.',
  },
  living_cover_pct: {
    key: 'living_cover_pct',
    label: 'Living ground cover',
    domain: 'regeneration',
    unit: '%',
    goalCriterionId: 'regen-soil-cover',
    higherIsBetter: true,
    description:
      'Share of bare ground replaced by living cover (cover crop, sward, mulch canopy).',
  },
  infiltration_pct: {
    key: 'infiltration_pct',
    label: 'Rainfall infiltration',
    domain: 'regeneration',
    unit: '%',
    goalCriterionId: 'regen-water-infiltration',
    higherIsBetter: true,
    description:
      'Share of seasonal rainfall infiltrated on-property rather than lost to runoff.',
  },
  microbial_biomass_index: {
    key: 'microbial_biomass_index',
    label: 'Microbial biomass',
    domain: 'regeneration',
    unit: 'index',
    goalCriterionId: null,
    higherIsBetter: true,
    description:
      'Relative microbial biomass (PLFA / respiration proxy), indexed to the year-0 baseline = 100.',
  },
  water_stable_aggregate_pct: {
    key: 'water_stable_aggregate_pct',
    label: 'Water-stable aggregates',
    domain: 'regeneration',
    unit: '%',
    goalCriterionId: null,
    higherIsBetter: true,
    description:
      'Share of soil aggregates that survive slaking — the physical signature of fungal/bacterial binding.',
  },
  bulk_density: {
    key: 'bulk_density',
    label: 'Bulk density',
    domain: 'regeneration',
    unit: 'g/cm³',
    goalCriterionId: null,
    higherIsBetter: false,
    description:
      'Compaction proxy. Falling values mean the soil is opening up; lower is better.',
  },
  native_veg_cover_pct: {
    key: 'native_veg_cover_pct',
    label: 'Native vegetative cover',
    domain: 'biodiversity',
    unit: '%',
    goalCriterionId: 'bio-native-cover',
    higherIsBetter: true,
    description:
      'Share of the monitored area in native vegetative cover — the hedgerows, corridors, and restored ground the habitat plan is meant to re-establish.',
  },
  invasive_pressure_pct: {
    key: 'invasive_pressure_pct',
    label: 'Invasive-species pressure',
    domain: 'biodiversity',
    unit: '%',
    goalCriterionId: 'bio-invasive-pressure',
    higherIsBetter: false,
    description:
      'Share of the monitored area under invasive-species pressure. Falling values mean the corridors are holding; lower is better.',
  },
  bird_pollinator_species_count: {
    key: 'bird_pollinator_species_count',
    label: 'Bird & pollinator species',
    domain: 'biodiversity',
    unit: 'count',
    goalCriterionId: 'bio-species-richness',
    higherIsBetter: true,
    description:
      'Distinct bird & pollinator species observed in a standardised census — the classic Year 0 / 5 / 9 richness trajectory.',
  },
  beneficial_predator_index: {
    key: 'beneficial_predator_index',
    label: 'Beneficial-predator activity',
    domain: 'biodiversity',
    unit: 'index',
    goalCriterionId: null,
    higherIsBetter: true,
    description:
      'Owl / hawk / beneficial-insect activity proxy, indexed to the year-0 baseline = 100. Trend only — no defensible absolute target.',
  },
};

export const MONITORED_METRIC_KEYS = Object.keys(
  MONITORED_METRICS,
) as MonitoredMetricKey[];

/**
 * Metric keys belonging to a single dashboard domain, in registry order.
 * The A1 Regeneration Monitor passes `'regeneration'` and the A3
 * Biodiversity Outcome Monitor passes `'biodiversity'` so each charts
 * only its own family from the shared event stream.
 */
export function metricKeysForDomain(
  domain: MetricDomain,
): MonitoredMetricKey[] {
  return MONITORED_METRIC_KEYS.filter(
    (k) => MONITORED_METRICS[k].domain === domain,
  );
}

/** Reserved `observations` keys that group samples rather than carry metrics. */
export const ROUND_LABEL_KEY = 'roundLabel' as const;
export const ZONE_REF_KEY = 'zoneRef' as const;

/**
 * Permissive narrowing of an event's `observations` record: every
 * monitored metric is an optional finite number, the two grouping
 * conventions are optional strings, and any other key still passes
 * through (`.passthrough()`), so this never rejects legacy events.
 */
export const TypedObservations = z
  .object({
    soil_om_pct: z.number().finite().optional(),
    living_cover_pct: z.number().finite().optional(),
    infiltration_pct: z.number().finite().optional(),
    microbial_biomass_index: z.number().finite().optional(),
    water_stable_aggregate_pct: z.number().finite().optional(),
    bulk_density: z.number().finite().optional(),
    native_veg_cover_pct: z.number().finite().optional(),
    invasive_pressure_pct: z.number().finite().optional(),
    bird_pollinator_species_count: z.number().finite().optional(),
    beneficial_predator_index: z.number().finite().optional(),
    [ROUND_LABEL_KEY]: z.string().min(1).max(80).optional(),
    [ZONE_REF_KEY]: z.string().min(1).max(120).optional(),
  })
  .passthrough();

export type TypedObservations = z.infer<typeof TypedObservations>;

/**
 * Best-effort extraction of typed metric values + grouping fields from a
 * raw observations record. Never throws — malformed numbers are dropped,
 * so a single bad legacy event can't break the dashboard.
 */
export function readTypedObservations(
  raw: Record<string, unknown> | null | undefined,
): {
  metrics: Partial<Record<MonitoredMetricKey, number>>;
  roundLabel: string | null;
  zoneRef: string | null;
} {
  const parsed = TypedObservations.safeParse(raw ?? {});
  const obs: TypedObservations = parsed.success
    ? parsed.data
    : ({} as TypedObservations);
  const metrics: Partial<Record<MonitoredMetricKey, number>> = {};
  for (const key of MONITORED_METRIC_KEYS) {
    const v = obs[key];
    if (typeof v === 'number' && Number.isFinite(v)) metrics[key] = v;
  }
  const roundLabel = typeof obs[ROUND_LABEL_KEY] === 'string' ? obs[ROUND_LABEL_KEY] : null;
  const zoneRef = typeof obs[ZONE_REF_KEY] === 'string' ? obs[ZONE_REF_KEY] : null;
  return { metrics, roundLabel, zoneRef };
}
