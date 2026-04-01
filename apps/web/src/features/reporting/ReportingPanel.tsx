/**
 * ReportingPanel — export project data in various formats.
 * PDF site assessment, GIS exports, image captures, branded presentations.
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import InvestorSummaryExport from '../export/InvestorSummaryExport.js';
import EducationalBookletExport from '../export/EducationalBookletExport.js';
import p from '../../styles/panel.module.css';

interface ReportingPanelProps {
  project: LocalProject;
  onOpenExport: () => void;
}

interface ExportOption {
  id: string;
  name: string;
  description: string;
  format: string;
  icon: string;
  phase: 'ready' | 'preview' | 'coming';
}

const EXPORT_OPTIONS: ExportOption[] = [
  { id: 'pdf-summary', name: 'Site Assessment PDF', description: 'One-page project summary with data layers, scores, and notes', format: 'PDF', icon: '\u{1F4C4}', phase: 'ready' },
  { id: 'pdf-brief', name: 'Design Brief', description: 'Comprehensive design document with zones, phasing, and economics', format: 'PDF', icon: '\u{1F4D1}', phase: 'preview' },
  { id: 'geojson', name: 'GeoJSON Export', description: 'All zones, structures, paths as standard GeoJSON', format: '.geojson', icon: '\u{1F30D}', phase: 'ready' },
  { id: 'kml', name: 'KML Export', description: 'Google Earth compatible file with all design layers', format: '.kml', icon: '\u{1F310}', phase: 'preview' },
  { id: 'image', name: 'Map Screenshot', description: 'High-resolution PNG of current map view', format: 'PNG', icon: '\u{1F4F8}', phase: 'ready' },
  { id: 'investor', name: 'Investor Summary', description: 'Financial overview with cashflow projections and ROI analysis', format: 'PDF', icon: '\u{1F4CA}', phase: 'ready' },
  { id: 'presentation', name: 'Branded Presentation', description: 'Slide deck with map views, data, and design rationale', format: 'JSON', icon: '\u{1F4C8}', phase: 'preview' },
  { id: 'educational', name: 'Educational Booklet', description: 'Interpretive guide explaining design decisions and ecology', format: 'PDF', icon: '\u{1F4D6}', phase: 'ready' },
];

const PHASE_CONFIG = {
  ready: { label: 'Ready', bg: 'rgba(45,122,79,0.1)', color: '#2d7a4f' },
  preview: { label: 'Preview', bg: 'rgba(196,162,101,0.1)', color: '#c4a265' },
  coming: { label: 'Coming', bg: 'rgba(107,107,107,0.1)', color: '#6b6b6b' },
};

export default function ReportingPanel({ project, onOpenExport }: ReportingPanelProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [showInvestor, setShowInvestor] = useState(false);
  const [showEducational, setShowEducational] = useState(false);

  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === project.id);
  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === project.id);
  const paddocks = useLivestockStore((s) => s.paddocks).filter((pk) => pk.projectId === project.id);
  const crops = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === project.id);
  const paths = usePathStore((s) => s.paths).filter((pa) => pa.projectId === project.id);
  const utilities = useUtilityStore((s) => s.utilities).filter((u) => u.projectId === project.id);

  const handleExport = async (option: ExportOption) => {
    if (option.phase === 'coming') return;

    setGenerating(option.id);

    if (option.id === 'pdf-summary') {
      onOpenExport();
    } else if (option.id === 'investor') {
      setShowInvestor(true);
    } else if (option.id === 'educational') {
      setShowEducational(true);
    } else if (option.id === 'geojson') {
      await exportGeoJSON(project, { zones, structures, paddocks, crops, paths, utilities });
    } else if (option.id === 'image') {
      exportMapScreenshot();
    } else {
      alert(`${option.name} export will be available in a future update.`);
    }

    setTimeout(() => setGenerating(null), 500);
  };

  return (
    <div className={p.container}>
      <h2 className={p.title} style={{ marginBottom: 6 }}>
        Reports & Export
      </h2>
      <p className={p.subtitle}>
        Export your project data for presentations, grant applications, or GIS analysis.
      </p>

      {/* Export options */}
      <div className={`${p.section} ${p.sectionGapLg}`}>
        {EXPORT_OPTIONS.map((opt) => {
          const cfg = PHASE_CONFIG[opt.phase];
          const isDisabled = opt.phase === 'coming';
          const isGenerating = generating === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => handleExport(opt)}
              disabled={isDisabled || isGenerating}
              className={p.card}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                color: 'var(--color-panel-text)',
                width: '100%',
                ...(isGenerating ? { background: 'rgba(196,162,101,0.08)', borderColor: 'rgba(196,162,101,0.3)' } : {}),
              }}
            >
              <span className={p.textXl} style={{ flexShrink: 0, lineHeight: 1 }}>{opt.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={`${p.row} ${p.mb4}`} style={{ gap: 6 }}>
                  <span className={`${p.text12} ${p.fontMedium}`}>{opt.name}</span>
                  <span className={p.badge} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                </div>
                <div className={`${p.text10} ${p.muted} ${p.leading14}`}>{opt.description}</div>
                <div className={`${p.text9} ${p.muted} ${p.mt4} ${p.opacity70}`}>Format: {opt.format}</div>
              </div>
              {isGenerating && (
                <span className={p.text12} style={{ color: '#c4a265', animation: 'spin 1s linear infinite' }}>{'\u23F3'}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* White-label note */}
      <div className={p.noteBox}>
        <div className={`${p.text11} ${p.leading15}`}>
          <span className={p.fontSemibold} style={{ color: '#c4a265' }}>White-Label Mode:</span>{' '}
          <span className={p.muted}>
            Future update will allow custom branding on all exports — your logo, colors, and organization name.
          </span>
        </div>
      </div>

      {/* Export modals */}
      {showInvestor && <InvestorSummaryExport project={project} onClose={() => setShowInvestor(false)} />}
      {showEducational && <EducationalBookletExport project={project} onClose={() => setShowEducational(false)} />}
    </div>
  );
}

// ── Export helpers ────────────────────────────────────────────────────────

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

  // Add boundary if exists
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
