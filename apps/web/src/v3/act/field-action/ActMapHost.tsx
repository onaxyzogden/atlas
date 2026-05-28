/**
 * ActMapHost — thin wrapper around `DiagnoseMap` that scopes the map to
 * the Act stage's full-screen view per spec §5.4.2. Resolves boundary +
 * fallback centroid from the existing project record and adapter so the
 * full-screen Act map view mirrors the legacy Act canvas's map source.
 *
 * Slice 3.4 will add the per-proof-schema drawing toolbar and per-task
 * map pins; Slice 3.3 keeps the map itself basic (boundary + center)
 * so the View A → map flow is verifiable without leaning on proof tools.
 */

import { useMemo } from 'react';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import { useV3Project } from '../../data/useV3Project.js';
import { useProjectStore, MTC_SEED } from '../../../store/projectStore.js';
import css from './ActMapHost.module.css';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

interface Props {
  projectId: string;
}

export default function ActMapHost({ projectId }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(
    () => projects.find((p) => p.id === projectId || p.serverId === projectId) ?? MTC_SEED,
    [projects, projectId],
  );
  const boundary = project.parcelBoundaryGeojson?.features[0]?.geometry as
    | GeoJSON.Polygon
    | undefined;
  const v3Project = useV3Project(projectId);
  const fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID;

  return (
    <div className={css.host}>
      <DiagnoseMap centroid={fallbackCenter} boundary={boundary} />
    </div>
  );
}
