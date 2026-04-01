/**
 * MapLayersPanel — right-side panel for map layer management.
 * Precisely matches the target design with SVG icons, eye toggles,
 * and Ontario-specific environmental data sources.
 */

import { useMemo, useState, useCallback } from 'react';
import { useMapStore, type MapStyle } from '../../store/mapStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore, ZONE_CATEGORY_CONFIG } from '../../store/zoneStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { CROP_TYPES } from '../../features/livestock/speciesData.js';

interface MapLayersPanelProps {
  project: LocalProject;
  map?: mapboxgl.Map | null;
  marker?: mapboxgl.Marker | null;
  onCenterProperty?: () => void;
  boundaryColor?: string;
  onBoundaryColorChange?: (color: string) => void;
}

// ─── Environmental data rows (Ontario-specific) ─────────────────────────

interface EnvDataRow {
  label: string;
  source: string;
  status: 'Active' | 'Pending';
}

const ENV_DATA_CA: EnvDataRow[] = [
  { label: 'Elevation',       source: 'Ontario PDEM / NRCan HRDEM',    status: 'Active' },
  { label: 'Soil Survey',     source: 'OMAFRA / CanSIS',              status: 'Active' },
  { label: 'Hydrology',       source: 'Ontario Hydro Network (OHN)',   status: 'Active' },
  { label: 'Floodplain',      source: 'Conservation Authority',        status: 'Active' },
  { label: 'Wetlands',        source: 'OWES / MNRF',                  status: 'Active' },
  { label: 'LiDAR Point Cloud', source: 'MNRF LIO',                   status: 'Pending' },
];

const ENV_DATA_US: EnvDataRow[] = [
  { label: 'Elevation',       source: 'USGS 3DEP',                    status: 'Active' },
  { label: 'Soil Survey',     source: 'SSURGO / NRCS',               status: 'Active' },
  { label: 'Hydrology',       source: 'NHD Plus',                     status: 'Active' },
  { label: 'Floodplain',      source: 'FEMA NFHL',                   status: 'Active' },
  { label: 'Wetlands',        source: 'NWI / USFWS',                 status: 'Active' },
  { label: 'LiDAR Point Cloud', source: 'USGS 3DEP LPC',             status: 'Pending' },
];

// Map layer IDs controlled by each overlay toggle
const OVERLAY_LAYER_IDS: Record<string, string[]> = {
  boundary:   ['project-boundary-fill', 'project-boundary-line'],
  zones:      [], // dynamically matched by prefix
  structures: [],
  hotspots:   [],
};

export default function MapLayersPanel({ project, map: mapInstance, marker, onCenterProperty, boundaryColor, onBoundaryColorChange }: MapLayersPanelProps) {
  const { style, setStyle } = useMapStore();
  const [overlayStates, setOverlayStates] = useState<Record<string, boolean>>({
    boundary: true,
    zones: true,
    structures: false,
    hotspots: true,
    marker: true,
  });

  const envData = project.country === 'CA' ? ENV_DATA_CA : ENV_DATA_US;

  const toggleOverlay = (key: string) => {
    const currentlyOn = overlayStates[key] ?? true;
    const newVal = !currentlyOn;
    setOverlayStates((prev) => ({ ...prev, [key]: newVal }));

    if (key === 'marker') {
      if (marker) {
        const el = marker.getElement();
        el.style.display = newVal ? '' : 'none';
      }
      return;
    }

    if (!mapInstance || !mapInstance.isStyleLoaded()) return;
    const visibility = newVal ? 'visible' : 'none';

    try {
      if (key === 'boundary') {
        for (const id of ['project-boundary-fill', 'project-boundary-line']) {
          if (mapInstance.getLayer(id)) {
            mapInstance.setLayoutProperty(id, 'visibility', visibility);
          }
        }
      } else if (key === 'zones') {
        const allLayers = mapInstance.getStyle()?.layers ?? [];
        for (const layer of allLayers) {
          if (layer.id.startsWith('zone-')) {
            mapInstance.setLayoutProperty(layer.id, 'visibility', visibility);
          }
        }
      } else if (key === 'structures') {
        const allLayers = mapInstance.getStyle()?.layers ?? [];
        for (const layer of allLayers) {
          if (layer.id.includes('building') || layer.id.includes('3d-building')) {
            mapInstance.setLayoutProperty(layer.id, 'visibility', visibility);
          }
        }
        if (mapInstance.getLayer('ogden-buildings-3d')) {
          mapInstance.setLayoutProperty('ogden-buildings-3d', 'visibility', visibility);
        }
      }
    } catch (e) {
      console.warn('[OGDEN] Failed to toggle overlay:', key, e);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <PanelTitle>Map Layers</PanelTitle>

      {/* ── Base Map Style ──────────────────────────────────────────── */}
      <SectionLabel>Base Map Style</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {([
          { id: 'satellite' as MapStyle, label: 'Satellite', desc: 'Aerial imagery' },
          { id: 'terrain' as MapStyle,   label: 'Terrain',   desc: 'Topographic' },
          { id: 'street' as MapStyle,    label: 'Dark',      desc: 'Road map' },
        ]).map((s) => {
          const active = style === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: active ? 'rgba(196, 162, 101, 0.08)' : 'var(--color-panel-card)',
                border: active ? '1px solid rgba(196, 162, 101, 0.25)' : '1px solid var(--color-panel-card-border)',
                borderRadius: 8,
                cursor: 'pointer',
                textAlign: 'left',
                color: 'var(--color-panel-text)',
                width: '100%',
              }}
            >
              <BaseMapIcon type={s.id} active={active} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 400, letterSpacing: '0.01em' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginTop: 1 }}>{s.desc}</div>
              </div>
              {active && (
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#c4a265', flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Overlay Layers ──────────────────────────────────────────── */}
      <SectionLabel>Overlay Layers</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 24 }}>
        {([
          { key: 'boundary',   label: 'Property Boundary',   desc: 'Property perimeter outline' },
          { key: 'zones',      label: 'Land Use Zones',      desc: 'Zone polygons with colors' },
          { key: 'structures', label: 'Structures',          desc: 'Building and feature markers' },
          { key: 'hotspots',   label: 'Educational Hotspots', desc: 'Learning annotations' },
          { key: 'marker',     label: 'Property Marker',      desc: 'Address pin on map' },
        ]).map((overlay) => (
          <div
            key={overlay.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '10px 14px',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'var(--color-panel-card)',
              border: '1px solid var(--color-panel-card-border)',
            }}
            onClick={() => toggleOverlay(overlay.key)}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-panel-text)', letterSpacing: '0.01em' }}>{overlay.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginTop: 1 }}>{overlay.desc}</div>
            </div>
            <EyeIcon active={overlayStates[overlay.key] ?? false} />
          </div>
        ))}
      </div>

      {/* ── Boundary Colors ──────────────────────────────────────── */}
      <BoundaryColorsSection
        project={project}
        map={mapInstance}
        boundaryColor={boundaryColor}
        onBoundaryColorChange={onBoundaryColorChange}
      />

      {/* ── Return to Property ────────────────────────────────────── */}
      {onCenterProperty && (
        <button
          onClick={onCenterProperty}
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: 12,
            fontWeight: 500,
            border: '1px solid var(--color-panel-card-border)',
            borderRadius: 8,
            background: 'var(--color-panel-card)',
            color: 'var(--color-panel-text)',
            cursor: 'pointer',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={8} cy={8} r={6} />
            <circle cx={8} cy={8} r={2} />
            <line x1={8} y1={0} x2={8} y2={3} />
            <line x1={8} y1={13} x2={8} y2={16} />
            <line x1={0} y1={8} x2={3} y2={8} />
            <line x1={13} y1={8} x2={16} y2={8} />
          </svg>
          Return to Property
        </button>
      )}

      {/* ── Environmental Data ──────────────────────────────────────── */}
      <SectionLabel>Environmental Data</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {envData.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: i < envData.length - 1 ? '1px solid var(--color-panel-card-border)' : 'none',
            }}
          >
            <span style={{ fontSize: 13, color: 'var(--color-panel-text)', letterSpacing: '0.01em' }}>{row.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--color-panel-muted)' }}>{row.source}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: row.status === 'Active'
                    ? 'rgba(45, 122, 79, 0.12)'
                    : 'rgba(138, 109, 30, 0.12)',
                  color: row.status === 'Active' ? '#2d7a4f' : '#8a6d1e',
                }}
              >
                {row.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--color-panel-title)',
        marginBottom: 20,
      }}
    >
      {children}
    </h2>
  );
}

// ─── Boundary Colors Section ──────────────────────────────────────────

function BoundaryColorsSection({ project, map, boundaryColor, onBoundaryColorChange }: {
  project: LocalProject;
  map?: mapboxgl.Map | null;
  boundaryColor?: string;
  onBoundaryColorChange?: (color: string) => void;
}) {
  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const updateZone = useZoneStore((s) => s.updateZone);

  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(() => allPaddocks.filter((p) => p.projectId === project.id), [allPaddocks, project.id]);
  const updatePaddock = useLivestockStore((s) => s.updatePaddock);

  const allCrops = useCropStore((s) => s.cropAreas);
  const crops = useMemo(() => allCrops.filter((c) => c.projectId === project.id), [allCrops, project.id]);
  const updateCrop = useCropStore((s) => s.updateCropArea);

  const updateMapColor = useCallback((prefix: string, id: string, color: string) => {
    if (!map) return;
    const fillId = `${prefix}-fill-${id}`;
    const lineId = `${prefix}-line-${id}`;
    if (map.getLayer(fillId)) map.setPaintProperty(fillId, 'fill-color', color);
    if (map.getLayer(lineId)) map.setPaintProperty(lineId, 'line-color', color);
  }, [map]);

  const colorRow = (label: string, color: string, onChange: (c: string) => void) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 6, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, flex: 1, color: 'var(--color-panel-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 24, height: 20, border: 'none', borderRadius: 3, cursor: 'pointer', background: 'transparent', padding: 0 }}
      />
    </div>
  );

  const hasItems = zones.length > 0 || paddocks.length > 0 || crops.length > 0 || onBoundaryColorChange;
  if (!hasItems) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionLabel>Boundary Colors</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {onBoundaryColorChange && colorRow('Property Boundary', boundaryColor ?? '#7d6140', onBoundaryColorChange)}

        {zones.map((z) => colorRow(
          z.name,
          z.color,
          (c) => { updateZone(z.id, { color: c }); updateMapColor('zone', z.id, c); },
        ))}

        {paddocks.map((p) => colorRow(
          p.name,
          p.color ?? '#7A6B3A',
          (c) => { updatePaddock(p.id, { color: c }); updateMapColor('paddock', p.id, c); },
        ))}

        {crops.map((c) => {
          const ct = CROP_TYPES[c.type];
          return colorRow(
            c.name,
            c.color ?? ct?.color ?? '#4A7C3F',
            (newColor) => { updateCrop(c.id, { color: newColor }); updateMapColor('crop', c.id, newColor); },
          );
        })}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--color-panel-section)',
        marginBottom: 10,
      }}
    >
      {children}
    </h3>
  );
}

/** SVG icon for base map style selector */
function BaseMapIcon({ type, active }: { type: MapStyle; active: boolean }) {
  const color = active ? '#c4a265' : '#7a6b56';
  const size = 22;
  const sw = 1.5;
  const p = { width: size, height: size, viewBox: '0 0 20 20', fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (type) {
    case 'satellite':
      return (
        <svg {...p}>
          <circle cx="10" cy="10" r="7" />
          <ellipse cx="10" cy="10" rx="3" ry="7" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <path d="M4 6h12M4 14h12" strokeWidth={1} opacity={0.5} />
        </svg>
      );
    case 'terrain':
      return (
        <svg {...p}>
          <path d="M2 16L7 7L11 12L14 8L18 16H2Z" />
          <circle cx="14" cy="5" r="2" strokeWidth={1} />
        </svg>
      );
    case 'street':
      return (
        <svg {...p}>
          <path d="M3 4C3 4 7 3 10 5C13 7 17 6 17 6" />
          <path d="M3 10C3 10 7 9 10 11C13 13 17 12 17 12" />
          <path d="M3 16C3 16 7 15 10 17C13 19 17 18 17 18" strokeWidth={1} opacity={0.5} />
          <circle cx="5" cy="7" r="1.5" fill={color} fillOpacity={0.3} />
        </svg>
      );
    default:
      return null;
  }
}

/** SVG eye icon for overlay visibility toggle */
function EyeIcon({ active }: { active: boolean }) {
  const color = active ? '#c4a265' : '#5a4f3e';
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      style={{ flexShrink: 0, cursor: 'pointer' }}
    >
      <path
        d="M2 10C2 10 5 4 10 4C15 4 18 10 18 10C18 10 15 16 10 16C5 16 2 10 2 10Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <circle
        cx={10}
        cy={10}
        r={3}
        stroke={color}
        strokeWidth={1.5}
        fill={active ? `${color}30` : 'none'}
      />
      {active && <circle cx={10} cy={10} r={1.2} fill={color} />}
      {!active && (
        <line x1={4} y1={4} x2={16} y2={16} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      )}
    </svg>
  );
}
