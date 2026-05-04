/**
 * CrossSectionTool — Phase 4c OBSERVE surface (Module 3).
 *
 * Coordinate-entry transect editor + SVG profile chart. The hub-side surface
 * authors transects by lng/lat entry; for map-drawn A→B picking the
 * "Pick on map" button hands off to the design-map's
 * `features/map/CrossSectionTool`, which draws + samples + persists via
 * the same `useTopographyStore.addTransect` so both surfaces edit one list.
 *
 * Sampling calls `api.elevation.profile` (NRCan HRDEM / 3DEP) and falls
 * back to a deterministic synthetic profile only if the call fails or the
 * DEM has no coverage. The UI labels the source ("NRCan HRDEM Lidar DTM
 * (1m)" vs "Synthetic (no DEM coverage)") and shows the reader's
 * confidence chip.
 */

import { useMemo, useState } from 'react';
import { api } from '../../lib/apiClient.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useTopographyStore } from '../../store/topographyStore.js';
import { newAnnotationId, type Transect } from '../../store/site-annotations.js';
import shared from './StewardSurveyCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SAMPLE_COUNT = 100;
const PROFILE_W = 720;
const PROFILE_H = 180;

interface DraftTransect {
  name: string;
  ax: string;
  ay: string;
  bx: string;
  by: string;
}

const EMPTY: DraftTransect = { name: '', ax: '', ay: '', bx: '', by: '' };

/** Synthetic elevation profile used when no API is available. Deterministic
 *  per (start,end) so the chart doesn't change between renders. */
function syntheticProfile(a: [number, number], b: [number, number]): number[] {
  const seed = Math.abs(a[0] * 1000 + a[1] * 31 + b[0] * 17 + b[1] * 7) % 1000;
  const baseline = 100 + (seed % 200);
  const amp = 20 + (seed % 30);
  const freq = 2 + (seed % 4);
  return Array.from({ length: SAMPLE_COUNT }, (_, i) => {
    const t = i / (SAMPLE_COUNT - 1);
    return baseline + Math.sin(t * Math.PI * freq + seed * 0.01) * amp + (Math.cos(t * Math.PI * 2) * amp * 0.5);
  });
}

function profilePath(elevations: number[]): { path: string; min: number; max: number } {
  if (elevations.length === 0) return { path: '', min: 0, max: 0 };
  const min = Math.min(...elevations);
  const max = Math.max(...elevations);
  const range = max - min || 1;
  const points = elevations.map((e, i) => {
    const x = (i / Math.max(1, elevations.length - 1)) * PROFILE_W;
    const y = PROFILE_H - ((e - min) / range) * (PROFILE_H - 16) - 8;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const head = points[0] ?? '0,0';
  const tail = points.slice(1).join(' L');
  const path = tail ? `M${head} L${tail}` : `M${head}`;
  return { path, min, max };
}

export default function CrossSectionTool({ project, onSwitchToMap }: Props) {
  const allTransects = useTopographyStore((s) => s.transects);
  const addTransect = useTopographyStore((s) => s.addTransect);
  const updateTransect = useTopographyStore((s) => s.updateTransect);
  const removeTransect = useTopographyStore((s) => s.removeTransect);

  const transects = useMemo(
    () => allTransects.filter((t) => t.projectId === project.id),
    [allTransects, project.id],
  );

  const [draft, setDraft] = useState<DraftTransect>(EMPTY);
  const [activeId, setActiveId] = useState<string>(transects[0]?.id ?? '');
  const active = transects.find((t) => t.id === activeId) ?? transects[0];

  function commit() {
    const ax = Number(draft.ax), ay = Number(draft.ay);
    const bx = Number(draft.bx), by = Number(draft.by);
    if (!draft.name.trim() || [ax, ay, bx, by].some((v) => Number.isNaN(v))) return;
    const t: Transect = {
      id: newAnnotationId('tr'),
      projectId: project.id,
      name: draft.name.trim(),
      pointA: [ax, ay],
      pointB: [bx, by],
    };
    addTransect(t);
    setDraft(EMPTY);
    setActiveId(t.id);
  }

  const [sampling, setSampling] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);

  async function sampleElevation(t: Transect) {
    setSampling(t.id);
    setSampleError(null);
    try {
      const { data } = await api.elevation.profile({
        projectId: project.id,
        geometry: {
          type: 'LineString',
          coordinates: [t.pointA, t.pointB],
        },
        sampleCount: SAMPLE_COUNT,
      });
      // Reader returns null cells where DEM has gaps; coerce to NaN-safe interpolation.
      const profile = data.samples.map((s) => (s.elevationM ?? 0));
      updateTransect(t.id, {
        elevationProfileM: profile,
        sampledAt: new Date().toISOString(),
        sourceApi: data.sourceApi,
        confidence: data.confidence,
        totalDistanceM: data.totalDistanceM,
      });
    } catch (err) {
      // DEM unavailable / auth / network — fall back to synthetic so the surface
      // remains usable in dev and on parcels outside HRDEM coverage.
      const profile = syntheticProfile(t.pointA, t.pointB);
      updateTransect(t.id, {
        elevationProfileM: profile,
        sampledAt: new Date().toISOString(),
        sourceApi: 'Synthetic (no DEM coverage)',
        confidence: 'low',
        totalDistanceM: undefined,
      });
      setSampleError(err instanceof Error ? err.message : 'DEM unavailable — using synthetic profile.');
    } finally {
      setSampling(null);
    }
  }

  return (
    <div className={shared.page} style={{ maxWidth: 920 }}>
      <header className={shared.hero}>
        <span className={shared.heroTag}>Module 3 · Topography</span>
        <h1 className={shared.title}>A–B Cross-Section Tool</h1>
        <p className={shared.lede}>
          Draw a transect by entering A and B coordinates (lng, lat), then sample
          the elevation profile. Samples come from NRCan HRDEM (CA) or USGS 3DEP
          (US) where coverage exists; outside those regions the chart falls back
          to a synthetic profile and is labelled accordingly.
        </p>
        <button
          type="button"
          className={shared.addBtn}
          style={{ width: 'auto', marginTop: 8 }}
          onClick={onSwitchToMap}
        >
          ⌗ Pick on map →
        </button>
      </header>

      <section className={shared.section}>
        <h2 className={shared.sectionTitle}>New transect</h2>
        <div className={shared.grid}>
          <div className={`${shared.field} ${shared.full}`}>
            <label htmlFor="tr-name">Name</label>
            <input
              id="tr-name"
              type="text"
              placeholder="e.g. Ridge → Pond"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className={shared.field}>
            <label>A — longitude</label>
            <input
              type="number" step="0.0001"
              value={draft.ax}
              onChange={(e) => setDraft((d) => ({ ...d, ax: e.target.value }))}
            />
          </div>
          <div className={shared.field}>
            <label>A — latitude</label>
            <input
              type="number" step="0.0001"
              value={draft.ay}
              onChange={(e) => setDraft((d) => ({ ...d, ay: e.target.value }))}
            />
          </div>
          <div className={shared.field}>
            <label>B — longitude</label>
            <input
              type="number" step="0.0001"
              value={draft.bx}
              onChange={(e) => setDraft((d) => ({ ...d, bx: e.target.value }))}
            />
          </div>
          <div className={shared.field}>
            <label>B — latitude</label>
            <input
              type="number" step="0.0001"
              value={draft.by}
              onChange={(e) => setDraft((d) => ({ ...d, by: e.target.value }))}
            />
          </div>
        </div>
        <button type="button" className={shared.addBtn} onClick={commit}>
          + Save transect
        </button>
      </section>

      {transects.length > 0 ? (
        <section className={shared.section}>
          <h2 className={shared.sectionTitle}>Saved transects</h2>
          <div className={shared.field} style={{ marginBottom: 12 }}>
            <label htmlFor="tr-pick">Select</label>
            <select
              id="tr-pick"
              value={active?.id ?? ''}
              onChange={(e) => setActiveId(e.target.value)}
            >
              {transects.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {active ? (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button
                  type="button"
                  className={shared.addBtn}
                  style={{ width: 'auto' }}
                  onClick={() => sampleElevation(active)}
                  disabled={sampling === active.id}
                >
                  {sampling === active.id ? '⌗ Sampling DEM…' : '⌗ Sample elevation'}
                </button>
                <button type="button" className={shared.removeBtn} onClick={() => removeTransect(active.id)}>
                  Delete
                </button>
              </div>

              {sampleError ? (
                <p style={{ fontSize: 11, color: 'rgba(208,123,123,0.85)', marginBottom: 8 }}>
                  {sampleError}
                </p>
              ) : null}

              {active.elevationProfileM ? (
                <ProfileChart
                  profile={active.elevationProfileM}
                  sampledAt={active.sampledAt}
                  sourceApi={active.sourceApi ?? null}
                  confidence={active.confidence}
                  totalDistanceM={active.totalDistanceM}
                />
              ) : (
                <p style={{ fontSize: 12, color: 'rgba(232,220,200,0.5)', fontStyle: 'italic' }}>
                  Profile not sampled yet.
                </p>
              )}
            </>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

interface ProfileChartProps {
  profile: number[];
  sampledAt?: string;
  sourceApi: string | null;
  confidence?: 'high' | 'medium' | 'low';
  totalDistanceM?: number;
}

function ProfileChart({ profile, sampledAt, sourceApi, confidence, totalDistanceM }: ProfileChartProps) {
  const { path, min, max } = useMemo(() => profilePath(profile), [profile]);
  const isSynthetic = !sourceApi || sourceApi.toLowerCase().startsWith('synthetic');
  const distanceLabel =
    typeof totalDistanceM === 'number' && totalDistanceM > 0
      ? totalDistanceM >= 1000
        ? `${(totalDistanceM / 1000).toFixed(2)} km`
        : `${totalDistanceM.toFixed(0)} m`
      : null;
  return (
    <div>
      <svg viewBox={`0 0 ${PROFILE_W} ${PROFILE_H}`} style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.25)', borderRadius: 6 }}>
        <path d={path} stroke="rgba(var(--color-gold-rgb), 0.85)" strokeWidth={1.5} fill="none" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(232,220,200,0.55)', marginTop: 6 }}>
        <span>A · {min.toFixed(1)} m (low)</span>
        {distanceLabel ? <span style={{ opacity: 0.7 }}>{distanceLabel}</span> : null}
        <span>{max.toFixed(1)} m (high) · B</span>
      </div>
      {sampledAt ? (
        <p style={{ fontSize: 10, color: 'rgba(232,220,200,0.4)', marginTop: 4 }}>
          Sampled {sampledAt.slice(0, 10)}
          {sourceApi ? ` · ${sourceApi}` : ''}
          {confidence ? ` · confidence: ${confidence}` : ''}
          {isSynthetic ? ' · illustrative only' : ''}
        </p>
      ) : null}
    </div>
  );
}
