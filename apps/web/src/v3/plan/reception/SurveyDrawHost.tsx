/**
 * SurveyDrawHost -- the takeover-gated draw tool for ONE reception survey.
 * Generic over a `createSurveyStore` bundle (mirrors SlopeSurveyDrawHost).
 *
 * Reads the shared `useMapToolStore.activeTool`; when it is one of this survey's
 * per-class tool ids (bundle.CLASS_BY_TOOL -- `plan.reception.<survey>-<class>`),
 * it draws the geometry the armed class declares (KIND_BY_CLASS -> poly | line |
 * point) and appends a feature with the right measure (acres | metres | 1). The
 * one structural difference from the slope host: slope is always a polygon, here
 * the draw MODE switches per the armed class's geometry kind, so a flow path
 * draws a line while a wet zone draws a polygon from the same host.
 *
 * Snapping + the magnet `<SnapToggle/>` dock are reused unchanged via
 * `usePlanSnapTargets` (folds existing plan + slope/veg survey features).
 */

import { useCallback } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import {
  useMapboxDrawTool,
  type DrawGeometry,
  type DrawMode,
} from '../../observe/components/draw/useMapboxDrawTool.js';
import { usePlanSnapTargets } from '../draw/tools/usePlanSnapTargets.js';
import SnapToggle from '../../observe/components/draw/SnapToggle.js';
import css from '../../observe/components/draw/ObserveDrawHost.module.css';
import type {
  SurveyFeatureKind,
  SurveyStoreBundle,
} from '../../../store/createSurveyStore.js';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bundle: SurveyStoreBundle<any>;
  map: MaplibreMap;
  projectId: string | null;
  /** Plan objective active when this feature was drawn (provenance stamp). */
  sourceObjectiveId?: string | null;
}

const MODE_BY_KIND: Record<SurveyFeatureKind, DrawMode> = {
  poly: 'draw_polygon',
  line: 'draw_line_string',
  point: 'draw_point',
};

/** acres (poly) | length metres (line) | 1 (point); best-effort like the slope host. */
function measureFor(kind: SurveyFeatureKind, geometry: DrawGeometry): number {
  try {
    if (kind === 'poly') return turf.area(geometry as GeoJSON.Polygon) * 0.000247105;
    // turf.length wants a Feature/FeatureCollection (not a bare geometry), so
    // wrap the drawn LineString before measuring.
    if (kind === 'line')
      return turf.length(turf.feature(geometry as GeoJSON.LineString), { units: 'meters' });
    return 1;
  } catch {
    return kind === 'point' ? 1 : 0;
  }
}

export default function SurveyDrawHost({
  bundle,
  map,
  projectId,
  sourceObjectiveId,
}: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  // Snap targets (existing plan features + drawn survey polygons). Called
  // unconditionally before the enabled gate to respect the rules of hooks.
  const getSnapTargets = usePlanSnapTargets(projectId ?? '');

  const armedClass = activeTool ? bundle.CLASS_BY_TOOL[activeTool] : undefined;
  const armedKind = armedClass ? bundle.KIND_BY_CLASS[armedClass] : undefined;
  const enabled = armedClass != null && projectId != null;

  const onComplete = useCallback(
    (geometry: DrawGeometry) => {
      if (!projectId) return;
      // Re-read the armed tool at completion (not render time) so a mid-session
      // class swap takes effect on the next feature.
      const tool = useMapToolStore.getState().activeTool;
      const cls = tool ? bundle.CLASS_BY_TOOL[tool] : undefined;
      if (!cls) return;
      const kind = bundle.KIND_BY_CLASS[cls];
      if (!kind) return;
      bundle.useStore.getState().addFeature(projectId, {
        surveyClass: cls,
        kind,
        geometry,
        measure: measureFor(kind, geometry),
        sourceObjectiveId: sourceObjectiveId ?? undefined,
      });
    },
    [projectId, bundle, sourceObjectiveId],
  );

  const previewColor = armedClass ? bundle.CLASS_COLORS[armedClass] : undefined;

  useMapboxDrawTool<DrawGeometry>({
    map,
    mode: armedKind ? MODE_BY_KIND[armedKind] : 'draw_polygon',
    onComplete,
    enabled,
    previewColor,
    snap: true,
    getSnapTargets,
  });

  if (!enabled) return null;
  return (
    <div className={css.dock}>
      <SnapToggle />
    </div>
  );
}
