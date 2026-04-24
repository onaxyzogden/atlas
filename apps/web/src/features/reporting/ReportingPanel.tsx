/**
 * ReportingPanel — export catalog, generation, history, and bulk export.
 * Calls POST /api/v1/projects/:id/exports for PDF generation.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import type { ExportRecord } from '@ogden/shared';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useFieldworkStore } from '../../store/fieldworkStore.js';
import { useScenarioStore } from '../../store/scenarioStore.js';
import { useSiteDataStore } from '../../store/siteDataStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import { api } from '../../lib/apiClient.js';
import InvestorSummaryExport from '../export/InvestorSummaryExport.js';
import EducationalBookletExport from '../export/EducationalBookletExport.js';
import { useOfflineGate } from '../../hooks/useOfflineGate.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import { group, warning, sage, error as errorToken, semantic } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type ExportTypeId =
  | 'site_assessment'
  | 'design_brief'
  | 'feature_schedule'
  | 'field_notes'
  | 'investor_summary'
  | 'scenario_comparison'
  | 'educational_booklet';

type Audience = 'internal' | 'landowner' | 'investor' | 'regulatory';

interface CatalogEntry {
  exportType: ExportTypeId;
  name: string;
  description: string;
  estimatedPages: string;
  audience: Audience[];
}

interface Readiness {
  ready: boolean;
  reason?: string;
}

// ─── Export Catalog ─────────────────────────────────────────────────────────

const EXPORT_CATALOG: CatalogEntry[] = [
  {
    exportType: 'site_assessment',
    name: 'Site Assessment',
    description: 'Summary with data layers, suitability scores, and flags',
    estimatedPages: '~3 pages',
    audience: ['internal', 'regulatory'],
  },
  {
    exportType: 'design_brief',
    name: 'Design Brief',
    description: 'Comprehensive design document with zones, phasing, and economics',
    estimatedPages: '~8 pages',
    audience: ['internal', 'landowner'],
  },
  {
    exportType: 'feature_schedule',
    name: 'Feature Schedule',
    description: 'Detailed schedule of all design features, phases, and costs',
    estimatedPages: '~4 pages',
    audience: ['internal'],
  },
  {
    exportType: 'field_notes',
    name: 'Field Notes',
    description: 'Site visit observations, walk routes, soil samples, and punch list',
    estimatedPages: 'Variable',
    audience: ['internal'],
  },
  {
    exportType: 'investor_summary',
    name: 'Investor Summary',
    description: 'Financial overview with cashflow projections, ROI, and mission scores',
    estimatedPages: '~5 pages',
    audience: ['investor'],
  },
  {
    exportType: 'scenario_comparison',
    name: 'Scenario Comparison',
    description: 'Side-by-side comparison of saved design scenarios',
    estimatedPages: '~6 pages',
    audience: ['internal', 'investor'],
  },
  {
    exportType: 'educational_booklet',
    name: 'Educational Booklet',
    description: 'Interpretive guide explaining design decisions and ecology',
    estimatedPages: '~8 pages',
    audience: ['landowner'],
  },
];

const AUDIENCE_LABELS: Record<Audience, { label: string; color: string; bg: string }> = {
  internal:   { label: 'Internal',   color: group.reporting, bg: 'rgba(21,128,61,0.10)' },
  landowner:  { label: 'Landowner',  color: group.reporting, bg: 'rgba(21,128,61,0.10)' },
  investor:   { label: 'Investor',   color: warning.DEFAULT, bg: 'rgba(202,138,4,0.10)' },
  regulatory: { label: 'Regulatory', color: sage[900], bg: 'rgba(20,83,45,0.10)' },
};

const TYPE_LABELS: Record<ExportTypeId, string> = {
  site_assessment: 'Site Assessment',
  design_brief: 'Design Brief',
  feature_schedule: 'Feature Schedule',
  field_notes: 'Field Notes',
  investor_summary: 'Investor Summary',
  scenario_comparison: 'Scenario Comparison',
  educational_booklet: 'Educational Booklet',
};

// ─── SVG Icons (inline, small) ──────────────────────────────────────────────

function IconDoc() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={group.reporting} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={warning.DEFAULT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={group.reporting} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={group.reporting} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={group.reporting} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={warning.DEFAULT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={group.reporting} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={warning.DEFAULT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

const EXPORT_ICONS: Record<ExportTypeId, () => JSX.Element> = {
  site_assessment: IconDoc,
  design_brief: IconClipboard,
  feature_schedule: IconLayers,
  field_notes: IconPencil,
  investor_summary: IconChart,
  scenario_comparison: IconLayers,
  educational_booklet: IconBook,
};

// ─── Component ──────────────────────────────────────────────────────────────

interface ReportingPanelProps {
  project: LocalProject;
  onOpenExport: () => void;
}

export default function ReportingPanel({ project, onOpenExport }: ReportingPanelProps) {
  const { isOffline, requireOnline } = useOfflineGate();
  // ── Local UI state ──
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<ExportTypeId>>(new Set());
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showInvestor, setShowInvestor] = useState(false);
  const [showEducational, setShowEducational] = useState(false);

  // ── Store data for readiness checks ──
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === project.id);
  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === project.id);
  const paddocks = useLivestockStore((s) => s.paddocks).filter((pk) => pk.projectId === project.id);
  const crops = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === project.id);
  const paths = usePathStore((s) => s.paths).filter((pa) => pa.projectId === project.id);
  const utilities = useUtilityStore((s) => s.utilities).filter((u) => u.projectId === project.id);
  const fieldworkEntries = useFieldworkStore((s) => s.entries).filter((e) => e.projectId === project.id);
  const walkRoutes = useFieldworkStore((s) => s.walkRoutes).filter((r) => r.projectId === project.id);
  const punchList = useFieldworkStore((s) => s.punchList).filter((pl) => pl.projectId === project.id);
  const scenarios = useScenarioStore((s) => s.scenarios).filter((sc) => sc.projectId === project.id);
  const siteData = useSiteDataStore((s) => s.dataByProject[project.id]);
  const financialModel = useFinancialModel(project.id);

  const hasBoundary = !!project.parcelBoundaryGeojson;
  const hasLayers = siteData?.status === 'complete' && siteData.layers.length > 0;
  const hasDesignFeatures = zones.length + structures.length + paddocks.length + crops.length + paths.length + utilities.length > 0;

  // ── Readiness checks ──
  const readiness: Record<ExportTypeId, Readiness> = {
    site_assessment: hasBoundary && hasLayers
      ? { ready: true }
      : { ready: false, reason: !hasBoundary ? 'Draw a project boundary first' : 'Fetch site data layers first' },
    design_brief: hasBoundary && hasDesignFeatures
      ? { ready: true }
      : { ready: false, reason: !hasBoundary ? 'Draw a project boundary first' : 'Add zones or structures to your design' },
    feature_schedule: hasDesignFeatures
      ? { ready: true }
      : { ready: false, reason: 'Add zones, structures, or other design features first' },
    field_notes: fieldworkEntries.length > 0
      ? { ready: true }
      : { ready: false, reason: 'Record field observations during a site visit first' },
    investor_summary: financialModel != null
      ? { ready: true }
      : { ready: false, reason: 'Add design features to generate a financial model' },
    scenario_comparison: scenarios.length >= 2
      ? { ready: true }
      : { ready: false, reason: `Need at least 2 saved scenarios (currently ${scenarios.length})` },
    educational_booklet: { ready: true },
  };

  // ── Payload assembly for export types that need client data ──
  const buildPayload = useCallback((exportType: ExportTypeId): { payload?: Record<string, unknown> } => {
    if (exportType === 'investor_summary' && financialModel) {
      return {
        payload: {
          financial: {
            region: financialModel.region,
            totalInvestment: financialModel.totalInvestment,
            annualRevenueAtMaturity: financialModel.annualRevenueAtMaturity,
            costLineItems: financialModel.costLineItems.map((item) => ({
              name: item.name,
              category: item.category,
              phase: item.phaseName,
              cost: item.cost,
            })),
            revenueStreams: financialModel.revenueStreams.map((stream) => ({
              name: stream.name,
              enterprise: stream.enterprise,
              annualRevenue: stream.annualRevenue,
              startYear: stream.startYear,
            })),
            cashflow: financialModel.cashflow,
            breakEven: financialModel.breakEven,
            enterprises: financialModel.enterprises,
            missionScore: financialModel.missionScore,
            assumptions: financialModel.assumptions,
          },
        },
      };
    }
    if (exportType === 'field_notes') {
      return {
        payload: {
          fieldNotes: {
            entries: fieldworkEntries.map((e) => ({
              id: e.id,
              type: e.type,
              location: e.location,
              timestamp: e.timestamp,
              data: e.data,
              notes: e.notes,
              photos: e.photos,
              noteType: e.noteType,
            })),
            walkRoutes: walkRoutes.map((r) => ({
              id: r.id,
              name: r.name,
              coordinates: r.coordinates,
              distanceM: r.distanceM,
              durationMs: r.durationMs,
              startedAt: r.startedAt,
              completedAt: r.completedAt,
              annotations: r.annotations,
            })),
            punchList: punchList.map((pl) => ({
              featureType: pl.featureType,
              featureName: pl.featureName,
              status: pl.status,
              notes: pl.notes,
            })),
          },
        },
      };
    }
    if (exportType === 'scenario_comparison') {
      return {
        payload: {
          scenarios: scenarios.map((sc) => ({
            id: sc.id,
            name: sc.name,
            description: sc.description,
            isBaseline: sc.isBaseline,
            variantConfig: sc.variantConfig,
            zoneCount: sc.zoneCount,
            structureCount: sc.structureCount,
            paddockCount: sc.paddockCount,
            cropCount: sc.cropCount,
            zoneCategories: sc.zoneCategories,
            structureTypes: sc.structureTypes,
            enterprises: sc.enterprises,
            totalCapitalMid: sc.totalCapitalMid,
            breakEvenYear: sc.breakEvenYear,
            year5Cashflow: sc.year5Cashflow,
            year10Cashflow: sc.year10Cashflow,
            tenYearROI: sc.tenYearROI,
            annualRevenueMid: sc.annualRevenueMid,
            missionScore: sc.missionScore,
          })),
        },
      };
    }
    return {};
  }, [financialModel, fieldworkEntries, walkRoutes, punchList, scenarios]);

  // ── Generate a single export ──
  const handleGenerate = useCallback(async (exportType: ExportTypeId) => {
    setGenerating((prev) => ({ ...prev, [exportType]: true }));
    setErrors((prev) => { const n = { ...prev }; delete n[exportType]; return n; });

    try {
      const body = { exportType, ...buildPayload(exportType) };
      const { data } = await api.exports.generate(project.id, body);
      setDownloadUrls((prev) => ({ ...prev, [exportType]: data.storageUrl }));
      // Refresh history
      loadHistory();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      setErrors((prev) => ({ ...prev, [exportType]: msg }));
    } finally {
      setGenerating((prev) => ({ ...prev, [exportType]: false }));
    }
  }, [project.id, buildPayload]);

  // ── Bulk generate ──
  const handleBulkGenerate = useCallback(async () => {
    if (selected.size === 0) return;
    setBulkGenerating(true);
    for (const exportType of selected) {
      if (readiness[exportType].ready) {
        await handleGenerate(exportType);
      }
    }
    setBulkGenerating(false);
    setSelected(new Set());
  }, [selected, readiness, handleGenerate]);

  // ── Load export history ──
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.exports.list(project.id);
      setHistory(data);
    } catch {
      // Silent — history is supplementary
    } finally {
      setHistoryLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Toggle selection ──
  const toggleSelect = (exportType: ExportTypeId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(exportType)) next.delete(exportType);
      else next.add(exportType);
      return next;
    });
  };

  const selectedReadyCount = [...selected].filter((t) => readiness[t].ready).length;

  return (
    <div className={p.container}>
      <h2 className={p.title} style={{ marginBottom: 6 }}>Reports & Export</h2>
      <p className={p.subtitle}>
        Generate professional PDF reports for presentations, grants, investors, or regulatory filings.
      </p>

      {/* ── Bulk controls ── */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 12px', marginBottom: 12, borderRadius: 10,
          background: 'rgba(21,128,61,0.06)', border: '1px solid rgba(21,128,61,0.15)',
        }}>
          <span className={p.text11} style={{ color: group.reporting, fontWeight: 500 }}>
            {selectedReadyCount} of {selected.size} selected ready
          </span>
          <button
            onClick={handleBulkGenerate}
            disabled={bulkGenerating || selectedReadyCount === 0}
            className={p.btnSmall}
            style={{
              background: group.reporting, color: '#fff', border: 'none', padding: '5px 14px',
              borderRadius: 6, cursor: bulkGenerating ? 'not-allowed' : 'pointer',
              fontWeight: 500, fontSize: 11, opacity: bulkGenerating ? 0.6 : 1,
            }}
          >
            {bulkGenerating ? 'Generating...' : 'Generate Selected'}
          </button>
        </div>
      )}

      {/* ── Export Catalog ── */}
      <div className={`${p.section} ${p.sectionGapLg}`}>
        {EXPORT_CATALOG.map((entry) => {
          const Icon = EXPORT_ICONS[entry.exportType];
          const rd = readiness[entry.exportType];
          const isGen = generating[entry.exportType];
          const url = downloadUrls[entry.exportType];
          const err = errors[entry.exportType];
          const isSelected = selected.has(entry.exportType);

          return (
            <div
              key={entry.exportType}
              className={p.card}
              style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                opacity: rd.ready ? 1 : 0.6,
                borderColor: isSelected ? 'rgba(21,128,61,0.35)' : undefined,
                background: isSelected ? 'rgba(21,128,61,0.04)' : undefined,
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(entry.exportType)}
                  style={{ marginTop: 2, accentColor: group.reporting, cursor: 'pointer' }}
                />
                {/* Icon */}
                <div style={{ flexShrink: 0, marginTop: 1 }}><Icon /></div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span className={`${p.text12} ${p.fontMedium}`}>{entry.name}</span>
                    <span className={p.text9} style={{ color: '#6b7280' }}>{entry.estimatedPages}</span>
                  </div>
                  <div className={`${p.text10} ${p.muted} ${p.leading14}`}>{entry.description}</div>
                  {/* Audience badges */}
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {entry.audience.map((a) => {
                      const cfg = AUDIENCE_LABELS[a];
                      return (
                        <span key={a} style={{
                          fontSize: 9, padding: '1px 6px', borderRadius: 3,
                          background: cfg.bg, color: cfg.color, fontWeight: 600,
                        }}>
                          {cfg.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Readiness warning */}
              {!rd.ready && rd.reason && (
                <div style={{
                  fontSize: 10, color: warning.DEFAULT, background: 'rgba(202,138,4,0.06)',
                  padding: '4px 8px', borderRadius: 6, lineHeight: 1.4,
                }}>
                  {rd.reason}
                </div>
              )}

              {/* Error message */}
              {err && (
                <div style={{
                  fontSize: 10, color: errorToken.DEFAULT, background: 'rgba(220,38,38,0.06)',
                  padding: '4px 8px', borderRadius: 6, lineHeight: 1.4,
                }}>
                  {err}
                </div>
              )}

              {/* Actions row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <DelayedTooltip label="PDF export requires internet" disabled={!isOffline}>
                <button
                  onClick={() => requireOnline(() => handleGenerate(entry.exportType), 'PDF Export')}
                  disabled={!rd.ready || isGen || isOffline}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', fontSize: 11, fontWeight: 500,
                    border: 'none', borderRadius: 6,
                    background: rd.ready && !isOffline ? group.reporting : '#d1d5db',
                    color: rd.ready && !isOffline ? '#fff' : '#9ca3af',
                    cursor: rd.ready && !isGen && !isOffline ? 'pointer' : 'not-allowed',
                    opacity: isGen ? 0.7 : 1,
                  }}
                >
                  {isGen ? <><IconSpinner /> Generating...</> : 'Generate'}
                </button>
                </DelayedTooltip>
                {url && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 12px', fontSize: 11, fontWeight: 500,
                      border: '1px solid rgba(21,128,61,0.2)', borderRadius: 6,
                      color: group.reporting, textDecoration: 'none', background: 'rgba(21,128,61,0.04)',
                    }}
                  >
                    <IconDownload /> Download PDF
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Client-side exports (GeoJSON, Screenshot) ── */}
      <h3 className={p.sectionLabel}>Local Exports</h3>
      <div className={`${p.section} ${p.sectionGapLg}`} style={{ marginBottom: 20 }}>
        <button
          onClick={() => exportGeoJSON(project, { zones, structures, paddocks, crops, paths, utilities })}
          disabled={!hasDesignFeatures}
          className={p.btn}
          style={{ justifyContent: 'flex-start', gap: 10 }}
        >
          <IconMap />
          <div style={{ textAlign: 'left' }}>
            <div className={`${p.text12} ${p.fontMedium}`}>GeoJSON Export</div>
            <div className={`${p.text10} ${p.muted}`}>All design layers as standard GeoJSON</div>
          </div>
        </button>
        <button
          onClick={exportMapScreenshot}
          className={p.btn}
          style={{ justifyContent: 'flex-start', gap: 10 }}
        >
          <IconDoc />
          <div style={{ textAlign: 'left' }}>
            <div className={`${p.text12} ${p.fontMedium}`}>Map Screenshot</div>
            <div className={`${p.text10} ${p.muted}`}>High-resolution PNG of current map view</div>
          </div>
        </button>
      </div>

      {/* ── Export History ── */}
      <h3 className={p.sectionLabel}>Export History</h3>
      <div className={p.section}>
        {historyLoading && (
          <div className={`${p.text11} ${p.muted}`} style={{ padding: 8 }}>Loading history...</div>
        )}
        {!historyLoading && history.length === 0 && (
          <div className={`${p.text11} ${p.muted}`} style={{ padding: 8, fontStyle: 'italic' }}>
            No exports generated yet
          </div>
        )}
        {history.map((record) => (
          <div key={record.id} className={p.listItem}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={`${p.text11} ${p.fontMedium}`}>
                {TYPE_LABELS[record.exportType as ExportTypeId] ?? record.exportType}
              </div>
              <div className={`${p.text9} ${p.muted}`}>
                {new Date(record.generatedAt).toLocaleString()}
              </div>
            </div>
            <a
              href={record.storageUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                fontSize: 10, color: group.reporting, textDecoration: 'none',
                padding: '3px 8px', borderRadius: 4,
                border: '1px solid rgba(21,128,61,0.15)',
              }}
            >
              <IconDownload /> PDF
            </a>
            <button
              onClick={() => handleGenerate(record.exportType as ExportTypeId)}
              disabled={generating[record.exportType]}
              style={{
                fontSize: 10, color: warning.DEFAULT, background: 'transparent',
                border: '1px solid rgba(202,138,4,0.2)', borderRadius: 4,
                padding: '3px 8px', cursor: 'pointer', fontWeight: 500,
              }}
            >
              Regenerate
            </button>
          </div>
        ))}
      </div>

      {/* ── White-label note ── */}
      <div className={p.noteBox}>
        <div className={`${p.text11} ${p.leading15}`}>
          <span className={p.fontSemibold} style={{ color: warning.DEFAULT }}>White-Label Mode:</span>{' '}
          <span className={p.muted}>
            Future update will allow custom branding on all exports — your logo, colors, and organization name.
          </span>
        </div>
      </div>

      {/* ── Export modals ── */}
      {showInvestor && <InvestorSummaryExport project={project} onClose={() => setShowInvestor(false)} />}
      {showEducational && <EducationalBookletExport project={project} onClose={() => setShowEducational(false)} />}
    </div>
  );
}

// ── GeoJSON & Screenshot helpers (client-only) ──────────────────────────────

interface SpatialData {
  zones: { name: string; category: string; color: string; geometry: GeoJSON.Geometry; areaM2: number }[];
  structures: { name: string; type: string; geometry: GeoJSON.Geometry }[];
  paddocks: { name: string; geometry: GeoJSON.Geometry }[];
  crops: { name: string; type: string; geometry: GeoJSON.Geometry }[];
  paths: { name: string; type: string; geometry: GeoJSON.Geometry }[];
  utilities: { name: string; type: string; center: [number, number] }[];
}

async function exportGeoJSON(project: LocalProject, spatial: SpatialData) {
  const features: GeoJSON.Feature[] = [];

  if (project.parcelBoundaryGeojson) {
    try {
      const boundary = typeof project.parcelBoundaryGeojson === 'string'
        ? JSON.parse(project.parcelBoundaryGeojson)
        : project.parcelBoundaryGeojson;
      if (boundary.features) {
        for (const f of boundary.features) {
          features.push({ ...f, properties: { ...f.properties, layer: 'boundary' } });
        }
      }
    } catch { /* */ }
  }

  for (const z of spatial.zones) {
    features.push({ type: 'Feature', properties: { layer: 'zone', name: z.name, category: z.category, color: z.color, areaM2: z.areaM2 }, geometry: z.geometry });
  }
  for (const s of spatial.structures) {
    features.push({ type: 'Feature', properties: { layer: 'structure', name: s.name, structureType: s.type }, geometry: s.geometry });
  }
  for (const pk of spatial.paddocks) {
    features.push({ type: 'Feature', properties: { layer: 'paddock', name: pk.name }, geometry: pk.geometry });
  }
  for (const c of spatial.crops) {
    features.push({ type: 'Feature', properties: { layer: 'crop', name: c.name, cropType: c.type }, geometry: c.geometry });
  }
  for (const pa of spatial.paths) {
    features.push({ type: 'Feature', properties: { layer: 'path', name: pa.name, pathType: pa.type }, geometry: pa.geometry });
  }
  for (const u of spatial.utilities) {
    features.push({ type: 'Feature', properties: { layer: 'utility', name: u.name, utilityType: u.type }, geometry: { type: 'Point', coordinates: u.center } });
  }

  const data: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_export.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportMapScreenshot() {
  const canvas = document.querySelector('.mapboxgl-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    alert('Map canvas not found. Make sure the map is visible.');
    return;
  }

  try {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `map_screenshot_${Date.now()}.png`;
    a.click();
  } catch {
    alert('Unable to capture map screenshot. This may be a browser security restriction.');
  }
}
