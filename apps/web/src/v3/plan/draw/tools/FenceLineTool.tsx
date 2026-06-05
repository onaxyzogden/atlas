/**
 * FenceLineTool — line → FenceLine (Plan Module 4: Livestock & Subdivision).
 *
 * Added per Farm-Scholar (Newman) ADR 2026-05-10. Strip and mob grazing
 * depend on temporary, frequently-moved electric wire that the polygon
 * `PaddockTool` cannot represent. This tool drops a LineString fence
 * with `mobility: 'permanent' | 'temporary-strip'` so stewards can
 * model the dynamic subdivisions they actually run on the ground.
 *
 * Persist-first lifecycle mirrors `PaddockTool`:
 *   - draw.create → addFenceLine(skeleton) with default fenceType
 *     'temporary' and mobility 'temporary-strip' (the more common
 *     authoring case)
 *   - popover Save → updateFenceLine(id, patch)
 *   - popover Cancel / ESC → deleteFenceLine(id)
 *
 * Schema notes — FenceLine (apps/web/src/store/livestockStore.ts):
 *   - geometry: GeoJSON.LineString
 *   - fenceType: FenceType (electric / post-wire / post-rail / woven-wire /
 *     temporary / none) — same enum as Paddock.fencing
 *   - mobility: 'permanent' | 'temporary-strip' — drives the dashed-vs-solid
 *     render in PlanDataLayers
 *   - paddockId?: string — optional pointer to parent Paddock
 *
 * See wiki/decisions/2026-05-10-atlas-plan-module6-livestock-farm-scholar.md.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useLivestockStore,
  type FenceType,
  type FenceLineMobility,
} from '../../../../store/livestockStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useDimensionDrawStore, useDimensionValues } from '../dimensionDrawStore.js';
import { useDimensionDrawTool } from '../useDimensionDrawTool.js';
import DimensionPanel from '../DimensionPanel.js';
import DrawLengthReadout from '../../../observe/components/draw/DrawLengthReadout.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  getSnapTargets?: () => SnapTargets;
}

const FENCE_OPTIONS: { value: FenceType; label: string }[] = [
  { value: 'electric',    label: 'Electric' },
  { value: 'post_wire',   label: 'Post & wire' },
  { value: 'post_rail',   label: 'Post & rail' },
  { value: 'woven_wire',  label: 'Woven wire' },
  { value: 'temporary',   label: 'Temporary' },
  { value: 'none',        label: 'None' },
];

const MOBILITY_OPTIONS: { value: FenceLineMobility; label: string }[] = [
  { value: 'permanent',       label: 'Permanent' },
  { value: 'temporary-strip', label: 'Temporary strip wire' },
];

export default function FenceLineTool({ map, projectId, getSnapTargets }: Props) {
  const addFenceLine = useLivestockStore((s) => s.addFenceLine);
  const updateFenceLine = useLivestockStore((s) => s.updateFenceLine);
  const deleteFenceLine = useLivestockStore((s) => s.deleteFenceLine);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const dimMode = useDimensionDrawStore((s) => s.mode);
  const dimValues = useDimensionValues();

  const handleComplete = (geom: GeoJSON.LineString) => {
      const id = newAnnotationId('fnc');
      const coords = geom.coordinates;
      const midIdx = Math.floor(coords.length / 2);
      const anchor = coords[midIdx] as [number, number];
      const now = new Date().toISOString();

      addFenceLine({
        id,
        projectId,
        name: 'Fence',
        geometry: geom,
        fenceType: 'temporary',
        mobility: 'temporary-strip',
        phase: phaseDefault,
        notes: '',
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Fence line',
        anchor,
        fields: [
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'fenceType',
            label: 'Fence type',
            kind: 'select',
            required: true,
            options: FENCE_OPTIONS,
          },
          {
            key: 'mobility',
            label: 'Mobility',
            kind: 'select',
            required: true,
            options: MOBILITY_OPTIONS,
          },
          phaseField,
        ],
        initial: {
          name: 'Fence',
          fenceType: 'temporary',
          mobility: 'temporary-strip',
          phase: phaseDefault,
        },
        onSave: (values) => {
          updateFenceLine(id, {
            name: String(values.name ?? 'Fence'),
            fenceType: values.fenceType as FenceType,
            mobility: values.mobility as FenceLineMobility,
            phase: String(values.phase ?? ''),
          });
        },
        onCancel: () => deleteFenceLine(id),
      });
    };

  const { liveLength } = useMapboxDrawTool<GeoJSON.LineString>({
    map,
    mode: 'draw_line_string',
    onComplete: handleComplete,
    enabled: dimMode === 'freehand',
    snap: true,
    getSnapTargets,
  });

  useDimensionDrawTool({
    map,
    shape: 'line',
    values: dimValues,
    enabled: dimMode === 'dimensions',
    onComplete: (geom) => handleComplete(geom as GeoJSON.LineString),
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Fence-line tool">
      <span className={css.title}>Fence line</span>
      <span className={css.hint}>
        Trace a fence line — pick fence type and whether it&rsquo;s a
        permanent perimeter or a moveable temporary-strip wire.
      </span>
      <DimensionPanel allowedShapes={['line']} />
      {liveLength !== null && (
        <div className={css.readout}>
          <DrawLengthReadout
            meters={liveLength}
            labelClassName={css.readoutLabel}
            valueClassName={css.readoutValue}
          />
        </div>
      )}
    </div>
  );
}
