/**
 * useFieldVerification — derives the field-verification axis on the fly from
 * the two persisted observation stores (soil samples + monitoring transects)
 * for the active project. No new persisted store: the observations ARE the
 * source of truth, so verification auto-updates the moment a steward logs.
 *
 * Returns:
 *   - `perLayer`: authoritative per-layer standing (badges/widgets).
 *   - `zones`:    buffered influence polygons for the Observe map glow.
 *
 * `asOf` defaults to now; pass a past/future date (e.g. from the Plan
 * year-scrubber) to animate decay — a noted stretch goal, supported here.
 */

import { useMemo } from 'react';
import {
  aggregateByLayer,
  TOPIC_TO_LAYERS,
  type LayerFieldVerification,
  type ObservationTopic,
  type RawObservation,
} from '@ogden/shared';
import { useSoilSampleStore } from '../../store/soilSampleStore.js';
import { useMonitoringTransectStore } from '../../store/monitoringTransectStore.js';
import {
  buildVerificationZones,
  type VerificationZoneCollection,
  type VerificationZoneInput,
} from './buildVerificationZones.js';

export interface FieldVerificationResult {
  perLayer: LayerFieldVerification[];
  zones: VerificationZoneCollection;
}

const EMPTY: FieldVerificationResult = {
  perLayer: [],
  zones: { type: 'FeatureCollection', features: [] },
};

export function useFieldVerification(
  projectId: string | undefined | null,
  asOf?: string | Date,
): FieldVerificationResult {
  const samples = useSoilSampleStore((s) => s.samples);
  const transects = useMonitoringTransectStore((s) => s.transects);

  return useMemo(() => {
    if (!projectId) return EMPTY;

    const observations: RawObservation[] = [];
    const zoneInputs: VerificationZoneInput[] = [];

    for (const sample of samples) {
      if (sample.projectId !== projectId) continue;
      observations.push({ topic: 'soil-sample', observedAt: sample.sampleDate });
      if (sample.location) {
        zoneInputs.push({
          geometry: { type: 'Point', coordinates: sample.location },
          layerTypes: TOPIC_TO_LAYERS['soil-sample'],
          observedDates: [sample.sampleDate],
        });
      }
    }

    for (const transect of transects) {
      if (transect.projectId !== projectId) continue;
      const topic = transect.monitoringKind as ObservationTopic;
      const layerTypes = TOPIC_TO_LAYERS[topic] ?? [];
      if (!layerTypes.length) continue;
      const dates = transect.observations.map((o) => o.date);
      if (!dates.length) continue;
      for (const date of dates) observations.push({ topic, observedAt: date });
      if (transect.geometry) {
        zoneInputs.push({
          geometry: transect.geometry,
          layerTypes,
          observedDates: dates,
        });
      }
    }

    const resolvedAsOf = asOf ?? new Date();
    return {
      perLayer: aggregateByLayer(observations, resolvedAsOf),
      zones: buildVerificationZones(zoneInputs, resolvedAsOf),
    };
  }, [projectId, samples, transects, asOf]);
}
