/**
 * PaddockTool — polygon → Paddock (Plan Module 4: Livestock & Subdivision).
 *
 * Persist-first: skeleton Paddock on draw.create, popover patches the 4
 * essential fields (name, primary species, fencing, stocking density),
 * removes the record on Cancel for true ESC rollback.
 *
 * Schema notes — Paddock (apps/web/src/store/livestockStore.ts):
 *   - geometry: GeoJSON.Polygon (full coords; areaM2 derived via turf)
 *   - species: LivestockSpecies[] — popover captures the *primary* species
 *     (single-select); the slide-up remains the home for multi-species
 *     paddock authoring.
 *   - fencing: FenceType
 *   - stockingDensity: head per hectare (number | null)
 *
 * Yeomans rank 9 (Animals — Holmgren P3 *Obtain a yield*) and rank 4
 * (Access). Paddock geometry threads back to: water (waterPointNote),
 * shelter (shelterNote), and the access network — surfacing it on the
 * map closes Module 4's "draw the paddock graph" loop.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useLivestockStore,
  type FenceType,
  type LivestockSpecies,
  type PastureQuality,
} from '../../../../store/livestockStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import DrawAreaReadout from '../../../observe/components/draw/DrawAreaReadout.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { useDimensionDrawStore, useDimensionValues } from '../dimensionDrawStore.js';
import { useDimensionDrawTool } from '../useDimensionDrawTool.js';
import DimensionPanel from '../DimensionPanel.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const SPECIES_OPTIONS: { value: LivestockSpecies; label: string }[] = [
  { value: 'sheep',       label: 'Sheep' },
  { value: 'cattle',      label: 'Cattle' },
  { value: 'goats',       label: 'Goats' },
  { value: 'poultry',     label: 'Poultry' },
  { value: 'pigs',        label: 'Pigs' },
  { value: 'horses',      label: 'Horses' },
  { value: 'ducks_geese', label: 'Ducks & geese' },
  { value: 'rabbits',     label: 'Rabbits' },
  { value: 'bees',        label: 'Bees' },
];

const FENCE_OPTIONS: { value: FenceType; label: string }[] = [
  { value: 'electric',    label: 'Electric' },
  { value: 'post_wire',   label: 'Post & wire' },
  { value: 'post_rail',   label: 'Post & rail' },
  { value: 'woven_wire',  label: 'Woven wire' },
  { value: 'temporary',   label: 'Temporary' },
  { value: 'none',        label: 'None' },
];

const PASTURE_QUALITY_OPTIONS: { value: PastureQuality; label: string }[] = [
  { value: 'poor',      label: 'Poor (~0.7 AUE/ha)' },
  { value: 'fair',      label: 'Fair (~1.2 AUE/ha)' },
  { value: 'good',      label: 'Good (~2.5 AUE/ha)' },
  { value: 'excellent', label: 'Excellent (3.7+ AUE/ha)' },
];

// Per-species fill colour. Ruminants on warm clay tones; mono-gastrics on
// cooler greys; poultry/waterfowl on amber; bees on gold.
const SPECIES_COLOR: Record<LivestockSpecies, string> = {
  sheep:       '#c8a97a',
  cattle:      '#a07050',
  goats:       '#b58c5e',
  poultry:     '#d6a35a',
  pigs:        '#9b8a7a',
  horses:      '#6b5a45',
  ducks_geese: '#c8b070',
  rabbits:     '#a0a08a',
  bees:        '#d4b94a',
};

export default function PaddockTool({ map, projectId }: Props) {
  const addPaddock = useLivestockStore((s) => s.addPaddock);
  const updatePaddock = useLivestockStore((s) => s.updatePaddock);
  const deletePaddock = useLivestockStore((s) => s.deletePaddock);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimShape = useDimensionDrawStore((s) => s.shape);
  const dimValues = useDimensionValues();

  const handleComplete = (geom: GeoJSON.Polygon) => {
      const id = newAnnotationId('pad');
      const areaM2 = turf.area(geom);
      const anchor = turf.centroid(geom).geometry.coordinates as [number, number];
      const now = new Date().toISOString();
      const species: LivestockSpecies = 'sheep';

      addPaddock({
        id,
        projectId,
        name: 'Paddock',
        color: SPECIES_COLOR[species],
        geometry: geom,
        areaM2,
        grazingCellGroup: null,
        species: [species],
        stockingDensity: null,
        fencing: 'electric',
        guestSafeBuffer: false,
        waterPointNote: '',
        shelterNote: '',
        phase: phaseDefault,
        notes: '',
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Paddock',
        anchor,
        fields: [
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'species',
            label: 'Primary species',
            kind: 'select',
            required: true,
            options: SPECIES_OPTIONS,
          },
          {
            key: 'fencing',
            label: 'Fencing',
            kind: 'select',
            required: true,
            options: FENCE_OPTIONS,
          },
          {
            key: 'stockingDensity',
            label: 'Stocking (head/ha)',
            kind: 'text',
            placeholder: 'e.g. 12',
          },
          {
            key: 'pastureQuality',
            label: 'Pasture quality',
            kind: 'select',
            options: [
              { value: '', label: '— not assessed —' },
              ...PASTURE_QUALITY_OPTIONS,
            ],
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          name: 'Paddock',
          species,
          fencing: 'electric',
          stockingDensity: '',
          pastureQuality: '',
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const sp = values.species as LivestockSpecies;
          const raw = String(values.stockingDensity ?? '').trim();
          const density = raw === '' ? null : Number.isFinite(Number(raw)) ? Number(raw) : null;
          const pqRaw = String(values.pastureQuality ?? '').trim();
          const pq: PastureQuality | undefined =
            pqRaw === 'poor' || pqRaw === 'fair' || pqRaw === 'good' || pqRaw === 'excellent'
              ? pqRaw
              : undefined;
          updatePaddock(id, {
            name: String(values.name ?? 'Paddock'),
            color: SPECIES_COLOR[sp] ?? SPECIES_COLOR.sheep,
            species: [sp],
            fencing: values.fencing as FenceType,
            stockingDensity: density,
            pastureQuality: pq,
            phase: String(values.phase ?? ''),
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => deletePaddock(id),
      });
    };

  const { liveArea } = useMapboxDrawTool<GeoJSON.Polygon>({
    map,
    mode: 'draw_polygon',
    onComplete: handleComplete,
    enabled: dimMode === 'freehand',
  });

  useDimensionDrawTool({
    map,
    shape: dimShape === 'line' ? 'rect' : dimShape,
    values: dimValues,
    enabled: dimMode === 'dimensions',
    onComplete: (geom) => handleComplete(geom as GeoJSON.Polygon),
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Paddock tool">
      <span className={css.title}>Paddock</span>
      <span className={css.hint}>
        Outline a paddock — pick primary species, fencing, and stocking
        density (head per ha). For welfare audit credit, place a water tank,
        well, or rain catchment within 100 m of the paddock centroid.
      </span>
      <DimensionPanel allowedShapes={['rect', 'circle']} />
      {liveArea !== null && (
        <div className={css.readout}>
          <DrawAreaReadout
            m2={liveArea}
            labelClassName={css.readoutLabel}
            valueClassName={css.readoutValue}
          />
        </div>
      )}
    </div>
  );
}
