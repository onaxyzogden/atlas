/**
 * Section 3 — Site Data Layers & Environmental Inputs ([P1])
 *
 * Catalog view of every `project_layers` row provisioned for this project by
 * the Tier-1 DataPipelineOrchestrator. Groups layers by category, surfaces
 * source adapter / confidence / fetch status, and offers a refresh action.
 * Coverage disclosure (which adapter fired for the project's country) lands
 * in Phase 2; this phase delivers the catalog chrome itself.
 */

import { useMemo } from 'react';
import type { LayerType } from '@ogden/shared';
import {
  useProjectLayers,
  useRefreshLayer,
  type ProjectLayerRow,
} from '../../hooks/useProjectQueries.js';
import p from '../../styles/panel.module.css';

interface SiteDataLayersPageProps {
  projectId: string;
}

/** Ordered categories — drives both grouping and render order. */
const CATEGORIES: ReadonlyArray<{
  id: string;
  label: string;
  blurb: string;
  layerTypes: readonly LayerType[];
}> = [
  {
    id: 'elevation',
    label: 'Elevation & Terrain',
    blurb: 'Digital elevation model, slope, aspect, curvature.',
    layerTypes: ['elevation'],
  },
  {
    id: 'hydrology',
    label: 'Hydrology',
    blurb: 'Watershed boundary, drainage network, groundwater.',
    layerTypes: ['watershed', 'groundwater'],
  },
  {
    id: 'wetlands',
    label: 'Wetlands & Flood',
    blurb: 'Regulated wetlands and mapped flood zones.',
    layerTypes: ['wetlands_flood'],
  },
  {
    id: 'soils',
    label: 'Soils',
    blurb: 'Soil survey, texture, drainage class, properties.',
    layerTypes: ['soils', 'soilgrids_global', 'soil_properties'],
  },
  {
    id: 'landcover',
    label: 'Land Cover & Vegetation',
    blurb: 'Classified land cover and vegetation.',
    layerTypes: ['land_cover'],
  },
  {
    id: 'climate',
    label: 'Climate',
    blurb: 'Precipitation, temperature, frost, station normals.',
    layerTypes: ['climate'],
  },
  {
    id: 'zoning',
    label: 'Zoning & Legal',
    blurb: 'Municipal zoning, setbacks, easements, overlays.',
    layerTypes: ['zoning'],
  },
];

export default function SiteDataLayersPage({ projectId }: SiteDataLayersPageProps) {
  const { data, isLoading, isError } = useProjectLayers(projectId);
  const refresh = useRefreshLayer(projectId);

  const byType = useMemo(() => {
    const map = new Map<LayerType, ProjectLayerRow>();
    for (const row of data ?? []) map.set(row.layerType, row);
    return map;
  }, [data]);

  const categorized = new Set<string>();
  const groups = CATEGORIES.map((cat) => {
    const rows = cat.layerTypes
      .map((lt) => {
        categorized.add(lt);
        return byType.get(lt);
      })
      .filter((r): r is ProjectLayerRow => !!r);
    return { cat, rows };
  });

  const other = (data ?? []).filter((r) => !categorized.has(r.layerType));

  return (
    <div className={p.container} data-section-id="3">
      <h3 className={p.sectionLabel}>Site Data Layers</h3>

      {isLoading && <div className={p.mb24}>Loading project layers…</div>}
      {isError && (
        <div className={p.mb24}>Could not load data layers for this project.</div>
      )}

      {data && data.length === 0 && (
        <div className={p.mb24}>
          No layers provisioned yet. Set a parcel boundary and the Tier-1 pipeline
          will populate this catalog automatically.
        </div>
      )}

      {groups.map(({ cat, rows }) => (
        <section key={cat.id} className={p.sectionGapLg}>
          <h4 className={p.sectionLabel}>{cat.label}</h4>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              marginBottom: 8,
            }}
          >
            {cat.blurb}
          </div>
          {rows.length === 0 ? (
            <div
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                padding: '6px 0',
              }}
            >
              Not fetched for this project yet.
            </div>
          ) : (
            rows.map((row) => (
              <LayerCard
                key={row.id}
                row={row}
                onRefresh={() => refresh.mutate(row.layerType)}
                refreshing={refresh.isPending && refresh.variables === row.layerType}
              />
            ))
          )}
        </section>
      ))}

      {other.length > 0 && (
        <section className={p.sectionGapLg}>
          <h4 className={p.sectionLabel}>Other detected layers</h4>
          {other.map((row) => (
            <LayerCard
              key={row.id}
              row={row}
              onRefresh={() => refresh.mutate(row.layerType)}
              refreshing={refresh.isPending && refresh.variables === row.layerType}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function LayerCard({
  row,
  onRefresh,
  refreshing,
}: {
  row: ProjectLayerRow;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const statusTone = fetchStatusTone(row.fetchStatus);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 8,
        padding: '8px 10px',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        marginBottom: 8,
      }}
    >
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <strong style={{ fontSize: 'var(--text-sm)' }}>
            {formatLayerType(row.layerType)}
          </strong>
          <span
            style={{
              fontSize: 11,
              padding: '1px 6px',
              borderRadius: 999,
              background: statusTone.bg,
              color: statusTone.fg,
              fontFamily: 'var(--font-mono)',
            }}
          >
            {row.fetchStatus}
          </span>
          {row.confidence && (
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 999,
                background: 'var(--color-surface-muted, rgba(255,255,255,0.06))',
                color: 'var(--color-text-muted)',
              }}
              title="Confidence tier"
            >
              {row.confidence}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            display: 'grid',
            gridTemplateColumns: '90px 1fr',
            rowGap: 2,
          }}
        >
          <span>Source</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{row.sourceApi ?? '—'}</span>
          <span>Data date</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{row.dataDate ?? '—'}</span>
          <span>Fetched</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>
            {row.fetchedAt ? new Date(row.fetchedAt).toLocaleString() : '—'}
          </span>
          {row.attributionText && (
            <>
              <span>Attribution</span>
              <span>{row.attributionText}</span>
            </>
          )}
        </div>
      </div>
      <div style={{ alignSelf: 'start' }}>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing || row.fetchStatus === 'fetching'}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            borderRadius: 4,
            border: '1px solid var(--color-border)',
            background: 'transparent',
            color: 'var(--color-text)',
            cursor: refreshing ? 'wait' : 'pointer',
          }}
        >
          {refreshing ? 'Queueing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}

function formatLayerType(lt: LayerType): string {
  return lt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function fetchStatusTone(s: ProjectLayerRow['fetchStatus']): { bg: string; fg: string } {
  switch (s) {
    case 'complete':
      return { bg: 'rgba(80, 180, 120, 0.18)', fg: '#5cc88a' };
    case 'fetching':
    case 'pending':
      return { bg: 'rgba(200, 170, 90, 0.18)', fg: '#d9b36a' };
    case 'failed':
      return { bg: 'rgba(208, 123, 123, 0.18)', fg: '#d07b7b' };
    case 'unavailable':
    default:
      return { bg: 'rgba(255,255,255,0.06)', fg: 'var(--color-text-muted)' };
  }
}
