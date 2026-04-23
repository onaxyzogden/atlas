/**
 * Section 5 — Hydrology & Water Systems Planning ([P1])
 *
 * Server-data stats surface for the three P1 items of the feature manifest:
 *   - water-flow-runoff-visualization
 *   - watershed-delineation
 *   - drainage-line-flood-accumulation
 *
 * Reads from `/api/v1/hydrology-water/:projectId` (typed as
 * `HydrologyWaterResponse`), which surfaces the Tier-3 pipeline's
 * `watershed_derived` layer. The Mapbox overlay for the same data lives
 * in the legacy `HydrologyPanel` (also re-exported from this folder's
 * `index.ts`) — use that for on-map rendering.
 */

import type { HydrologyWaterResponse } from '@ogden/shared';
import { useHydrologyWater } from '../../hooks/useProjectQueries.js';
import p from '../../styles/panel.module.css';

interface HydrologyWaterPageProps {
  projectId: string;
}

export default function HydrologyWaterPage({ projectId }: HydrologyWaterPageProps) {
  const { data, isLoading, isError } = useHydrologyWater(projectId);

  return (
    <div className={p.container} data-section-id="5">
      <h3 className={p.sectionLabel}>Hydrology & Water Systems</h3>

      {isLoading && <div className={p.mb24}>Loading watershed data…</div>}
      {isError && (
        <div className={p.mb24}>Could not load hydrology data for this project.</div>
      )}
      {data?.status === 'not_ready' && <NotReadyBanner reason={data.reason} />}
      {data?.status === 'ready' && <ReadyView data={data} />}
    </div>
  );
}

function NotReadyBanner({
  reason,
}: {
  reason: Extract<HydrologyWaterResponse, { status: 'not_ready' }>['reason'];
}) {
  const copy = {
    no_boundary: 'Set a parcel boundary to compute watershed and drainage.',
    pipeline_pending: 'Watershed analysis is queued. Check back once the Tier-3 pipeline finishes.',
    pipeline_failed: 'Watershed analysis failed for this project. Retry from the pipeline panel.',
  }[reason];
  return <div className={p.mb24}>{copy}</div>;
}

function ReadyView({
  data,
}: {
  data: Extract<HydrologyWaterResponse, { status: 'ready' }>;
}) {
  const { summary, attribution, dataDate, fetchedAt } = data;
  return (
    <>
      <dl className={`${p.section} ${p.sectionGapLg}`}>
        <Row label="Runoff — max accumulation" value={summary.runoff.maxAccumulation.toFixed(0)} />
        <Row label="Runoff — mean accumulation" value={summary.runoff.meanAccumulation.toFixed(1)} />
        <Row
          label="High-concentration runoff"
          value={`${summary.runoff.highConcentrationPct.toFixed(1)}%`}
        />
        <Row
          label="Flood detention zones"
          value={`${summary.flood.detentionZoneCount} · ${summary.flood.detentionAreaPct.toFixed(1)}% area`}
        />
        <Row
          label="Drainage divides"
          value={`${summary.drainageDivides.divideCount} · ${summary.drainageDivides.divideCellPct.toFixed(1)}% cells`}
        />
        <Row
          label="Drainage density"
          value={`${summary.drainageDensity.drainageDensityKmPerKm2.toFixed(2)} km/km² (${summary.drainageDensity.drainageDensityClass})`}
        />
        <Row
          label="Pond candidates"
          value={`${summary.pondCandidates.candidateCount}`}
        />
        <Row
          label="Swale candidates"
          value={`${summary.swaleCandidates.candidateCount}`}
        />
        <Row label="Confidence" value={summary.confidence} />
        <Row label="Data sources" value={summary.dataSources.join(', ')} />
      </dl>

      {summary.waterBudget && (
        <>
          <h4 className={p.sectionLabel}>Water budget</h4>
          <dl className={`${p.section} ${p.sectionGapLg}`}>
            <Row
              label="Annual rainfall"
              value={`${fmtGal(summary.waterBudget.annualRainfallGal)} gal`}
            />
            <Row
              label="Rainwater harvest potential"
              value={`${fmtGal(summary.waterBudget.rwhPotentialGal)} gal/yr`}
            />
            <Row
              label="Recommended storage (2-wk buffer)"
              value={`${fmtGal(summary.waterBudget.recommendedStorageGal)} gal`}
            />
            <Row
              label="Irrigation demand"
              value={`${fmtGal(summary.waterBudget.irrigationDemandGal)} gal/yr`}
            />
            <Row
              label="Surplus / deficit"
              value={`${summary.waterBudget.surplusGal >= 0 ? '+' : ''}${fmtGal(summary.waterBudget.surplusGal)} gal/yr`}
            />
            <Row
              label="Drought buffer"
              value={`${summary.waterBudget.droughtBufferDays.toFixed(0)} days`}
            />
            <Row
              label="Annual water balance"
              value={`${summary.waterBudget.waterBalanceMm >= 0 ? '+' : ''}${summary.waterBudget.waterBalanceMm.toFixed(0)} mm`}
            />
            <Row label="Aridity class" value={summary.waterBudget.aridityClass} />
          </dl>
        </>
      )}

      <div className={p.mb24} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        {attribution && <div>{attribution}</div>}
        {dataDate && <div>Source date: {dataDate}</div>}
        {fetchedAt && <div>Computed: {new Date(fetchedAt).toLocaleString()}</div>}
      </div>
    </>
  );
}

function fmtGal(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(0);
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
