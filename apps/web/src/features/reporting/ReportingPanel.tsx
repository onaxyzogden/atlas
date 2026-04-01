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
  const paddocks = useLivestockStore((s) => s.paddocks).filter((p) => p.projectId === project.id);
  const crops = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === project.id);
  const paths = usePathStore((s) => s.paths).filter((p) => p.projectId === project.id);
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
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 6 }}>
        Reports & Export
      </h2>
      <p style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 16, lineHeight: 1.5 }}>
        Export your project data for presentations, grant applications, or GIS analysis.
      </p>

      {/* Export options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {EXPORT_OPTIONS.map((opt) => {
          const cfg = PHASE_CONFIG[opt.phase];
          const isDisabled = opt.phase === 'coming';
          const isGenerating = generating === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => handleExport(opt)}
              disabled={isDisabled || isGenerating}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px', borderRadius: 8, textAlign: 'left',
                background: isGenerating ? 'rgba(196,162,101,0.08)' : 'var(--color-panel-card)',
                border: `1px solid ${isGenerating ? 'rgba(196,162,101,0.3)' : 'var(--color-panel-card-border)'}`,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                color: 'var(--color-panel-text)',
                width: '100%',
              }}
            >
              <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{opt.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{opt.name}</span>
                  <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: cfg.bg, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', lineHeight: 1.4 }}>{opt.description}</div>
                <div style={{ fontSize: 9, color: 'var(--color-panel-muted)', marginTop: 4, opacity: 0.7 }}>Format: {opt.format}</div>
              </div>
              {isGenerating && (
                <span style={{ fontSize: 12, color: '#c4a265', animation: 'spin 1s linear infinite' }}>{'\u23F3'}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* White-label note */}
      <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 8, background: 'rgba(196,162,101,0.06)', border: '1px solid rgba(196,162,101,0.15)' }}>
        <div style={{ fontSize: 11, lineHeight: 1.5 }}>
          <span style={{ fontWeight: 600, color: '#c4a265' }}>White-Label Mode:</span>{' '}
          <span style={{ color: 'var(--color-panel-muted)' }}>
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

  // Add zones
  for (const z of spatial.zones) {
    features.push({ type: 'Feature', properties: { layer: 'zone', name: z.name, category: z.category, color: z.color, areaM2: z.areaM2 }, geometry: z.geometry });
  }

  // Add structures
  for (const s of spatial.structures) {
    features.push({ type: 'Feature', properties: { layer: 'structure', name: s.name, structureType: s.type }, geometry: s.geometry });
  }

  // Add paddocks
  for (const p of spatial.paddocks) {
    features.push({ type: 'Feature', properties: { layer: 'paddock', name: p.name }, geometry: p.geometry });
  }

  // Add crops
  for (const c of spatial.crops) {
    features.push({ type: 'Feature', properties: { layer: 'crop', name: c.name, cropType: c.type }, geometry: c.geometry });
  }

  // Add paths
  for (const p of spatial.paths) {
    features.push({ type: 'Feature', properties: { layer: 'path', name: p.name, pathType: p.type }, geometry: p.geometry });
  }

  // Add utilities
  for (const u of spatial.utilities) {
    features.push({ type: 'Feature', properties: { layer: 'utility', name: u.name, utilityType: u.type }, geometry: { type: 'Point', coordinates: u.center } });
  }

  const data: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

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
