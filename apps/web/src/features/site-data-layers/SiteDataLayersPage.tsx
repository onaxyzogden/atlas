/**
 * Section 3 — Site Data Layers & Environmental Inputs ([P1])
 *
 * Catalog view of every `project_layers` row provisioned for this project by
 * the Tier-1 DataPipelineOrchestrator. Groups layers by category, surfaces
 * source adapter / confidence / fetch status, and offers a refresh action.
 * Each card also shows coverage disclosure: the primary adapter expected for
 * the project's country and the alternate country lanes available, so the
 * partial-ness of cross-country coverage is explicit instead of implicit.
 */

import { useMemo } from 'react';
import {
  ADAPTER_REGISTRY,
  type Country,
  type LayerType,
} from '@ogden/shared';
import {
  useCompleteness,
  useProject,
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
  const { data: project } = useProject(projectId);
  const { data: completeness } = useCompleteness(projectId);
  const refresh = useRefreshLayer(projectId);
  const country = (project as { country?: Country } | undefined)?.country ?? 'US';

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

      <CompletenessMeter
        score={completeness?.score ?? null}
        groups={groups}
      />

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
                country={country}
                onRefresh={() => refresh.mutate(row.layerType)}
                refreshing={refresh.isPending && refresh.variables === row.layerType}
              />
            ))
          )}
        </section>
      ))}

      <Tier2Placeholders />

      {other.length > 0 && (
        <section className={p.sectionGapLg}>
          <h4 className={p.sectionLabel}>Other detected layers</h4>
          {other.map((row) => (
            <LayerCard
              key={row.id}
              row={row}
              country={country}
              onRefresh={() => refresh.mutate(row.layerType)}
              refreshing={refresh.isPending && refresh.variables === row.layerType}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function CompletenessMeter({
  score,
  groups,
}: {
  score: number | null;
  groups: Array<{ cat: (typeof CATEGORIES)[number]; rows: ProjectLayerRow[] }>;
}) {
  const pct = score !== null ? Math.round(score * 100) : null;
  return (
    <div
      style={{
        padding: '10px 12px',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
        }}
      >
        <strong style={{ fontSize: 'var(--text-sm)' }}>Data Completeness</strong>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-lg)' }}>
          {pct !== null ? `${pct}%` : '—'}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 999,
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: `${pct ?? 0}%`,
            height: '100%',
            background: pct !== null && pct >= 75 ? '#5cc88a' : pct !== null && pct >= 40 ? '#d9b36a' : '#d07b7b',
            transition: 'width 200ms ease',
          }}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: 6,
          fontSize: 'var(--text-xs)',
        }}
      >
        {groups.map(({ cat, rows }) => {
          const complete = rows.filter((r) => r.fetchStatus === 'complete').length;
          const total = cat.layerTypes.length;
          return (
            <div
              key={cat.id}
              style={{
                padding: '4px 6px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 4,
                display: 'flex',
                justifyContent: 'space-between',
                gap: 6,
              }}
            >
              <span style={{ color: 'var(--color-text-muted)' }}>{cat.label}</span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: complete === total && total > 0 ? '#5cc88a' : 'var(--color-text)',
                }}
              >
                {complete}/{total}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TIER2_PLACEHOLDERS: ReadonlyArray<{ key: string; label: string; blurb: string }> = [
  { key: 'drone-ortho-terrain', label: 'Drone / orthomosaic imagery', blurb: 'Upload user-captured drone imagery, orthomosaics, and terrain models.' },
  { key: 'manual-soil-water-tests', label: 'Manual soil & water tests', blurb: 'Log on-site soil and water test results with lab attribution.' },
  { key: 'geological-bedrock-notes', label: 'Geological & bedrock notes', blurb: 'Capture geological substrate and bedrock-depth observations.' },
  { key: 'solar-wind-fire', label: 'Solar, wind, fire risk', blurb: 'Solar radiation model, wind rose, and regional fire risk overlays.' },
  { key: 'habitat-wildlife-corridors', label: 'Habitat & wildlife corridors', blurb: 'Protected-species presence and corridor continuity notes.' },
  { key: 'adjacent-landuse-utilities', label: 'Adjacent land use & utilities', blurb: 'Neighbouring parcels, utility proximity, infrastructure access.' },
];

function Tier2Placeholders() {
  return (
    <section className={p.sectionGapLg}>
      <h4 className={p.sectionLabel}>Tier 2 inputs (P2)</h4>
      <div
        style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-muted)',
          marginBottom: 8,
        }}
      >
        User-supplied and enrichment datasets. Unlocked when the project's phase gate
        advances to P2.
      </div>
      {TIER2_PLACEHOLDERS.map((item) => (
        <div
          key={item.key}
          style={{
            padding: '8px 10px',
            border: '1px dashed var(--color-border)',
            borderRadius: 6,
            marginBottom: 6,
            opacity: 0.72,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <strong style={{ fontSize: 'var(--text-sm)' }}>{item.label}</strong>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              P2 · locked
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
            {item.blurb}
          </div>
        </div>
      ))}
    </section>
  );
}

function LayerCard({
  row,
  country,
  onRefresh,
  refreshing,
}: {
  row: ProjectLayerRow;
  country: Country;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const statusTone = fetchStatusTone(row.fetchStatus);
  const coverage = describeCoverage(row.layerType, country, row.sourceApi, row.fetchStatus);
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
        {coverage && <CoverageStrip coverage={coverage} />}
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

interface CoverageDescription {
  primaryCountry: Country;
  primaryAdapter: string | null;
  primarySource: string | null;
  matched: 'matched' | 'mismatched' | 'not_fetched' | 'no_primary_adapter' | 'unregistered';
  alternates: Array<{ country: Country; adapter: string; source: string }>;
  actualSourceApi: string | null;
}

function describeCoverage(
  layerType: LayerType,
  country: Country,
  actualSourceApi: string | null,
  fetchStatus: ProjectLayerRow['fetchStatus'],
): CoverageDescription | null {
  const reg = (ADAPTER_REGISTRY as Partial<Record<LayerType, Partial<Record<Country, { adapter: string; source: string }>>>>)[layerType];
  if (!reg) {
    return {
      primaryCountry: country,
      primaryAdapter: null,
      primarySource: null,
      matched: 'unregistered',
      alternates: [],
      actualSourceApi,
    };
  }
  const primary = reg[country];
  const alternates = (Object.entries(reg) as Array<[Country, { adapter: string; source: string }]>)
    .filter(([c]) => c !== country)
    .map(([c, info]) => ({ country: c, adapter: info.adapter, source: info.source }));

  let matched: CoverageDescription['matched'];
  if (!primary) {
    matched = 'no_primary_adapter';
  } else if (fetchStatus !== 'complete' || !actualSourceApi) {
    matched = 'not_fetched';
  } else {
    const adapterSlug = primary.source.toLowerCase();
    const adapterName = primary.adapter.toLowerCase();
    const actual = actualSourceApi.toLowerCase();
    matched =
      actual.includes(adapterSlug) ||
      actual.includes(adapterName.replace(/adapter$/, '')) ||
      actual.includes(primary.source.split('_')[0]?.toLowerCase() ?? '')
        ? 'matched'
        : 'mismatched';
  }
  return {
    primaryCountry: country,
    primaryAdapter: primary?.adapter ?? null,
    primarySource: primary?.source ?? null,
    matched,
    alternates,
    actualSourceApi,
  };
}

function CoverageStrip({ coverage }: { coverage: CoverageDescription }) {
  const { primaryCountry, primaryAdapter, matched, alternates, actualSourceApi } = coverage;
  const tone = coverageTone(matched);
  const label = coverageLabel(matched, primaryCountry, primaryAdapter, actualSourceApi);
  return (
    <div
      style={{
        marginTop: 6,
        padding: '6px 8px',
        borderRadius: 4,
        background: tone.bg,
        fontSize: 11,
        color: 'var(--color-text)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '4px 8px',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          color: tone.fg,
          fontWeight: 'var(--font-semibold)',
        }}
      >
        {tone.symbol}
      </span>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      {alternates.length > 0 && (
        <>
          <span />
          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {alternates.map((a) => (
              <span
                key={a.country}
                title={`${a.adapter} (${a.source})`}
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {a.country}: {a.adapter.replace(/Adapter$/, '')}
              </span>
            ))}
          </span>
        </>
      )}
    </div>
  );
}

function coverageLabel(
  m: CoverageDescription['matched'],
  country: Country,
  adapter: string | null,
  actual: string | null,
): string {
  switch (m) {
    case 'matched':
      return `${country} primary lane fired via ${adapter ?? '—'}.`;
    case 'mismatched':
      return `Expected ${adapter ?? 'primary adapter'} for ${country}, but row reports "${actual ?? '—'}". Likely a manual-flag fallback.`;
    case 'not_fetched':
      return `${country} primary: ${adapter ?? 'none'}. Not yet fetched for this project.`;
    case 'no_primary_adapter':
      return `No ${country} adapter registered for this layer. Falls back to ManualFlagAdapter or a global source.`;
    case 'unregistered':
    default:
      return 'Layer is not in the Tier-1 adapter registry (derived or Tier-2/3 layer).';
  }
}

function coverageTone(m: CoverageDescription['matched']): { bg: string; fg: string; symbol: string } {
  switch (m) {
    case 'matched':
      return { bg: 'rgba(80, 180, 120, 0.10)', fg: '#5cc88a', symbol: '✓' };
    case 'mismatched':
      return { bg: 'rgba(200, 170, 90, 0.10)', fg: '#d9b36a', symbol: '≈' };
    case 'not_fetched':
      return { bg: 'rgba(255, 255, 255, 0.04)', fg: 'var(--color-text-muted)', symbol: '·' };
    case 'no_primary_adapter':
      return { bg: 'rgba(200, 170, 90, 0.08)', fg: '#d9b36a', symbol: '!' };
    case 'unregistered':
    default:
      return { bg: 'rgba(255, 255, 255, 0.04)', fg: 'var(--color-text-muted)', symbol: 'ℹ' };
  }
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
