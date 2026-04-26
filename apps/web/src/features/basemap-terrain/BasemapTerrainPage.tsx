/**
 * Section 2 — Base Map, Imagery & Terrain Visualization ([P1])
 *
 * Server-data stats surface that reads the typed `BasemapTerrainResponse`
 * from `/api/v1/basemap-terrain/:projectId`. The live map surface lives in
 * `features/map/`; this page is the inventory + diagnostic read-path.
 */

import type { BasemapTerrainResponse } from '@ogden/shared';
import { useBasemapTerrain } from '../../hooks/useProjectQueries.js';
import p from '../../styles/panel.module.css';

interface BasemapTerrainPageProps {
  projectId: string;
}

export default function BasemapTerrainPage({ projectId }: BasemapTerrainPageProps) {
  const { data, isLoading, isError } = useBasemapTerrain(projectId);

  return (
    <div className={p.container} data-section-id="2">
      <h3 className={p.sectionLabel}>Base Map, Imagery & Terrain</h3>

      {isLoading && <div className={p.mb24}>Loading terrain data…</div>}
      {isError && (
        <div className={p.mb24}>Could not load basemap/terrain data for this project.</div>
      )}
      {data?.status === 'not_ready' && <NotReadyBanner reason={data.reason} />}
      {data?.status === 'ready' && <ReadyView data={data} />}
    </div>
  );
}

function NotReadyBanner({
  reason,
}: {
  reason: Extract<BasemapTerrainResponse, { status: 'not_ready' }>['reason'];
}) {
  const copy = {
    no_boundary: 'Set a parcel boundary to run terrain analysis.',
    terrain_pending: 'Terrain analysis is queued. Check back once the Tier-3 pipeline finishes.',
    terrain_failed: 'Terrain analysis failed for this project. Retry from the pipeline panel.',
  }[reason];
  return <div className={p.mb24}>{copy}</div>;
}

function ReadyView({
  data,
}: {
  data: Extract<BasemapTerrainResponse, { status: 'ready' }>;
}) {
  const { summary } = data;
  return (
    <>
      <dl className={`${p.section} ${p.sectionGapLg}`}>
        <Row label="Elevation min" value={fmtM(summary.elevation.minM)} />
        <Row label="Elevation max" value={fmtM(summary.elevation.maxM)} />
        <Row label="Elevation mean" value={fmtM(summary.elevation.meanM)} />
        <Row label="Relief" value={fmtM(summary.elevation.reliefM)} />
        <Row label="Contour lines" value={summary.elevation.hasContours ? 'Available' : '—'} />
      </dl>

      {summary.slopeAspect && (
        <>
          <h4 className={p.sectionLabel}>Slope &amp; aspect</h4>
          <dl className={`${p.section} ${p.sectionGapLg}`}>
            <Row label="Slope mean" value={`${summary.slopeAspect.slopeMeanDeg.toFixed(1)}°`} />
            <Row
              label="Slope range"
              value={`${summary.slopeAspect.slopeMinDeg.toFixed(1)}°–${summary.slopeAspect.slopeMaxDeg.toFixed(1)}°`}
            />
            <Row label="Slope class" value={summary.slopeAspect.slopeClass.replace('_', ' ')} />
            <Row label="Dominant aspect" value={summary.slopeAspect.aspectDominant ?? '—'} />
            <Row
              label="Slope heatmap"
              value={summary.slopeAspect.slopeHeatmapUrl ? 'Available' : '—'}
            />
            <Row
              label="Aspect heatmap"
              value={summary.slopeAspect.aspectHeatmapUrl ? 'Available' : '—'}
            />
          </dl>
        </>
      )}

      {summary.terrainFeatures && (
        <>
          <h4 className={p.sectionLabel}>Terrain features</h4>
          <dl className={`${p.section} ${p.sectionGapLg}`}>
            <Row
              label="TPI dominant class"
              value={summary.terrainFeatures.tpiDominantClass ?? '—'}
            />
            <Row
              label="TWI dominant class"
              value={summary.terrainFeatures.twiDominantClass ?? '—'}
            />
            <Row
              label="TRI mean"
              value={summary.terrainFeatures.triMeanM !== null ? `${summary.terrainFeatures.triMeanM.toFixed(1)} m` : '—'}
            />
            <Row
              label="TRI class"
              value={summary.terrainFeatures.triDominantClass ?? '—'}
            />
            <Row
              label="Frost pocket area"
              value={
                summary.terrainFeatures.frostPocketAreaPct !== null
                  ? `${summary.terrainFeatures.frostPocketAreaPct.toFixed(1)}%`
                  : '—'
              }
            />
            <Row
              label="Frost severity"
              value={summary.terrainFeatures.frostPocketSeverity ?? '—'}
            />
            <Row
              label="Cold-air risk"
              value={summary.terrainFeatures.coldAirRiskRating ?? '—'}
            />
          </dl>
        </>
      )}

      {summary.viewshed && (
        <>
          <h4 className={p.sectionLabel}>Viewshed</h4>
          <dl className={`${p.section} ${p.sectionGapLg}`}>
            <Row
              label="Observer point"
              value={summary.viewshed.observerSet ? 'Set' : 'Not set'}
            />
            <Row
              label="Visible area"
              value={
                summary.viewshed.visiblePct !== null
                  ? `${summary.viewshed.visiblePct.toFixed(1)}%`
                  : '—'
              }
            />
            <Row
              label="Viewshed geometry"
              value={summary.viewshed.hasGeojson ? 'Available' : '—'}
            />
          </dl>
        </>
      )}

      <h4 className={p.sectionLabel}>Basemap styles</h4>
      <dl className={`${p.section} ${p.sectionGapLg}`}>
        {summary.basemapStyles.map((s) => (
          <Row key={s.key} label={s.label} value={s.description} />
        ))}
      </dl>

      <h4 className={p.sectionLabel}>Vector overlays</h4>
      <dl className={`${p.section} ${p.sectionGapLg}`}>
        {summary.vectorOverlays.map((o) => (
          <Row key={o.key} label={o.label} value={o.available ? 'Available' : 'Not yet fetched'} />
        ))}
      </dl>

      <h4 className={p.sectionLabel}>Map modes</h4>
      <dl className={`${p.section} ${p.sectionGapLg}`}>
        {summary.mapModes.map((m) => (
          <Row key={m} label={m.toUpperCase()} value="Enabled" />
        ))}
      </dl>

      <div className={p.mb24} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        <div>Data sources: {summary.dataSources.join(', ') || '—'}</div>
        <div>Confidence: {summary.confidence}</div>
        {summary.computedAt && <div>Computed: {new Date(summary.computedAt).toLocaleString()}</div>}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        padding: '4px 0',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <dt style={{ color: 'var(--color-text-muted)' }}>{label}</dt>
      <dd style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--font-semibold)' }}>{value}</dd>
    </div>
  );
}

function fmtM(n: number | null): string {
  if (n === null || !isFinite(n)) return '—';
  return `${n.toFixed(1)} m`;
}
