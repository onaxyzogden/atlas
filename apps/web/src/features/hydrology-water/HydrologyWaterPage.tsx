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

import { useState } from 'react';
import type { HydrologyWaterResponse } from '@ogden/shared';
import { useHydrologyWater } from '../../hooks/useProjectQueries.js';
import { api } from '../../lib/apiClient.js';
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
      {data?.status === 'ready' && <ReadyView data={data} projectId={projectId} />}
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
  projectId,
}: {
  data: Extract<HydrologyWaterResponse, { status: 'ready' }>;
  projectId: string;
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
      </dl>

      <CandidatePlacement projectId={projectId} summary={summary} />

      <dl className={`${p.section} ${p.sectionGapLg}`}>
        <Row label="Data sources" value={summary.dataSources.join(', ')} />
      </dl>

      {summary.wetlandPlanning && (
        <>
          <h4 className={p.sectionLabel}>Wetland &amp; Riparian Planning</h4>
          <dl className={`${p.section} ${p.sectionGapLg}`}>
            <Row label="Dominant system" value={summary.wetlandPlanning.dominantSystem} />
            <Row label="Wetland coverage (est.)" value={`${summary.wetlandPlanning.coveragePct.toFixed(1)}%`} />
            <Row
              label="Wetland types"
              value={[
                summary.wetlandPlanning.hasForested && 'Forested',
                summary.wetlandPlanning.hasEmergent && 'Emergent',
              ].filter(Boolean).join(', ') || 'None identified'}
            />
            {summary.wetlandPlanning.nwiCodes.length > 0 && (
              <Row label="NWI codes" value={summary.wetlandPlanning.nwiCodes.join(', ')} />
            )}
            <Row label="FEMA SFHA" value={summary.wetlandPlanning.sfha ? 'Yes' : 'No'} />
            <Row label="Regulated" value={summary.wetlandPlanning.regulated ? 'Yes' : 'No'} />
            <Row label="Permits likely required" value={summary.wetlandPlanning.requiresPermits ? 'Yes' : 'No'} />
            <Row
              label="Recommended setback"
              value={summary.wetlandPlanning.recommendedSetbackM > 0
                ? `${summary.wetlandPlanning.recommendedSetbackM} m`
                : 'No wetland setback required'}
            />
            <Row
              label="Recommended riparian buffer"
              value={`${summary.wetlandPlanning.recommendedBufferM} m`}
            />
            <Row
              label="Restoration opportunity"
              value={summary.wetlandPlanning.restorationOpportunity ? 'Yes' : 'No'}
            />
          </dl>
          <div className={p.mb24} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {summary.wetlandPlanning.regulatoryNotes}
          </div>
        </>
      )}

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

      {summary.overflowRouting && (
        <>
          <h4 className={p.sectionLabel}>Overflow &amp; spillway</h4>
          <dl className={`${p.section} ${p.sectionGapLg}`}>
            <Row label="Pond candidates" value={`${summary.overflowRouting.pondCount}`} />
            <Row label="Mean overflow slope" value={`${summary.overflowRouting.meanOverflowSlopeDeg}°`} />
            <Row
              label="Critical (steep overflow)"
              value={`${summary.overflowRouting.criticalCount}`}
            />
          </dl>
          <div className={p.mb24} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {summary.overflowRouting.spillwayNotes}
          </div>
        </>
      )}

      {summary.roofCatchment && (
        <>
          <h4 className={p.sectionLabel}>Roof catchment &amp; storage</h4>
          <dl className={`${p.section} ${p.sectionGapLg}`}>
            <Row label="Structures" value={`${summary.roofCatchment.structureCount}`} />
            <Row label="Total roof area" value={`${summary.roofCatchment.totalRoofAreaM2} m²`} />
            <Row
              label="Annual harvest"
              value={`${fmtGal(summary.roofCatchment.annualHarvestGal)} gal`}
            />
            <Row
              label="Recommended cistern"
              value={`${fmtGal(summary.roofCatchment.recommendedStorageGal)} gal`}
            />
            <Row
              label="Harvest per ft²"
              value={`${summary.roofCatchment.harvestPerSqFtGal.toFixed(2)} gal/yr`}
            />
          </dl>
          <div className={p.mb24} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {summary.roofCatchment.notes}
          </div>
        </>
      )}

      {summary.gravityIrrigation && (
        <>
          <h4 className={p.sectionLabel}>Gravity irrigation &amp; livestock water</h4>
          <dl className={`${p.section} ${p.sectionGapLg}`}>
            <Row
              label="Gravity-friendly ponds"
              value={`${summary.gravityIrrigation.gravityPondCount}`}
            />
            <Row
              label="Estimated irrigable area"
              value={`${summary.gravityIrrigation.estimatedIrrigableHa} ha`}
            />
            <Row
              label="Recommended troughs"
              value={`${summary.gravityIrrigation.recommendedTroughCount}`}
            />
            <Row
              label="Livestock water access"
              value={summary.gravityIrrigation.livestockAccessScore}
            />
          </dl>
          <div className={p.mb24} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {summary.gravityIrrigation.notes}
          </div>
        </>
      )}

      {summary.waterPhasing && summary.waterPhasing.components.length > 0 && (
        <>
          <h4 className={p.sectionLabel}>Phasing &amp; dependencies</h4>
          <dl className={`${p.section} ${p.sectionGapLg}`}>
            {summary.waterPhasing.components
              .filter((c) => c.sourceKind !== 'recommended')
              .map((c) => (
                <Row
                  key={c.component}
                  label={`${c.component.replace(/_/g, ' ')} (${c.sourceKind}, ${c.sourceCount})`}
                  value={`Phase ${c.recommendedPhase}${c.dependsOn.length > 0 ? ` · after ${c.dependsOn.join(', ')}` : ''}`}
                />
              ))}
          </dl>
          {summary.waterPhasing.violations.length > 0 && (
            <ul className={p.mb24} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger, #b91c1c)' }}>
              {summary.waterPhasing.violations.map((v, i) => (
                <li key={i}>
                  <strong>{v.component}</strong> ({v.assignedPhase}): {v.reason}
                </li>
              ))}
            </ul>
          )}
          <div className={p.mb24} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {summary.waterPhasing.notes}
          </div>
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

type ReadySummary = Extract<HydrologyWaterResponse, { status: 'ready' }>['summary'];

function CandidatePlacement({
  projectId,
  summary,
}: {
  projectId: string;
  summary: ReadySummary;
}) {
  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ponds = summary.pondCandidates.candidates;
  const swales = summary.swaleCandidates.candidates;
  if (ponds.length === 0 && swales.length === 0) return null;

  async function place(
    key: string,
    subtype: 'pond' | 'swale',
    geometry: GeoJSON.Geometry,
    label: string,
    properties: Record<string, unknown>,
  ) {
    setPending(key);
    setError(null);
    try {
      await api.designFeatures.create(projectId, {
        featureType: subtype === 'pond' ? 'point' : 'path',
        subtype,
        geometry,
        label,
        properties,
        sortOrder: 0,
      });
      setPlaced((prev) => new Set(prev).add(key));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to place candidate');
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <h4 className={p.sectionLabel}>Place candidates</h4>
      <div className={p.mb24} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
        Promote a generated candidate into a design feature. Place once, then refine geometry on the map.
      </div>
      {error && (
        <div className={p.mb24} style={{ color: 'var(--color-danger, #b91c1c)', fontSize: 'var(--text-xs)' }}>
          {error}
        </div>
      )}
      {ponds.length > 0 && (
        <dl className={`${p.section} ${p.sectionGapLg}`}>
          {ponds.slice(0, 10).map((c, i) => {
            const key = `pond-${i}`;
            const isPlaced = placed.has(key);
            const isPending = pending === key;
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  padding: '4px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                  Pond #{i + 1} · slope {c.meanSlope.toFixed(1)}° · suitability {c.suitabilityScore.toFixed(2)}
                </div>
                <button
                  type="button"
                  disabled={isPlaced || isPending}
                  onClick={() =>
                    place(
                      key,
                      'pond',
                      { type: 'Point', coordinates: c.location },
                      `Pond candidate #${i + 1}`,
                      {
                        cellCount: c.cellCount,
                        meanSlope: c.meanSlope,
                        meanAccumulation: c.meanAccumulation,
                        suitabilityScore: c.suitabilityScore,
                        source: 'hydrology-water-candidate',
                      },
                    )
                  }
                  style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                >
                  {isPlaced ? 'Placed ✓' : isPending ? 'Placing…' : 'Place as feature'}
                </button>
              </div>
            );
          })}
        </dl>
      )}
      {swales.length > 0 && (
        <dl className={`${p.section} ${p.sectionGapLg}`}>
          {swales.slice(0, 10).map((c, i) => {
            const key = `swale-${i}`;
            const isPlaced = placed.has(key);
            const isPending = pending === key;
            return (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  padding: '4px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                  Swale #{i + 1} · {c.lengthCells} cells · slope {c.meanSlope.toFixed(1)}°
                </div>
                <button
                  type="button"
                  disabled={isPlaced || isPending}
                  onClick={() =>
                    place(
                      key,
                      'swale',
                      { type: 'LineString', coordinates: [c.start, c.end] },
                      `Swale candidate #${i + 1}`,
                      {
                        lengthCells: c.lengthCells,
                        meanSlope: c.meanSlope,
                        elevation: c.elevation,
                        suitabilityScore: c.suitabilityScore,
                        source: 'hydrology-water-candidate',
                      },
                    )
                  }
                  style={{ fontSize: 'var(--text-xs)', padding: '2px 8px' }}
                >
                  {isPlaced ? 'Placed ✓' : isPending ? 'Placing…' : 'Place as feature'}
                </button>
              </div>
            );
          })}
        </dl>
      )}
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
