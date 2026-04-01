/**
 * ZonePanel — draw, name, and manage custom land-use zones.
 *
 * P1 features from Section 8:
 *   - Draw custom zones with naming and color coding
 *   - Zone categories, primary/secondary use designation
 *   - Zone sizing calculator
 */

import { useState, useCallback, useMemo } from 'react';
import * as turf from '@turf/turf';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type ZoneCategory,
  type LandZone,
} from '../../store/zoneStore.js';

interface ZonePanelProps {
  projectId: string;
  draw: MapboxDraw | null;
  map: mapboxgl.Map | null;
  isMapReady: boolean;
}

export default function ZonePanel({ projectId, draw, map, isMapReady }: ZonePanelProps) {
  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);
  const addZone = useZoneStore((s) => s.addZone);
  const deleteZone = useZoneStore((s) => s.deleteZone);

  const [isDrawing, setIsDrawing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [pendingArea, setPendingArea] = useState(0);
  const [collapsed, setCollapsed] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ZoneCategory>('commons');
  const [formPrimaryUse, setFormPrimaryUse] = useState('');
  const [formSecondaryUse, setFormSecondaryUse] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const startDraw = useCallback(() => {
    if (!draw || !map) return;
    setIsDrawing(true);
    draw.changeMode('draw_polygon');

    const handleCreate = () => {
      const all = draw.getAll();
      const lastFeature = all.features[all.features.length - 1];
      if (lastFeature?.geometry.type === 'Polygon') {
        const areaM2 = turf.area(lastFeature as GeoJSON.Feature<GeoJSON.Polygon>);
        setPendingGeometry(lastFeature.geometry as GeoJSON.Polygon);
        setPendingArea(areaM2);
        setIsDrawing(false);
        setShowForm(true);
      }
      map.off('draw.create', handleCreate);
    };

    map.on('draw.create', handleCreate);
  }, [draw, map]);

  const handleSaveZone = useCallback(() => {
    if (!pendingGeometry || !formName.trim()) return;

    const zone: LandZone = {
      id: crypto.randomUUID(),
      projectId,
      name: formName,
      category: formCategory,
      color: ZONE_CATEGORY_CONFIG[formCategory].color,
      primaryUse: formPrimaryUse,
      secondaryUse: formSecondaryUse,
      notes: formNotes,
      geometry: pendingGeometry,
      areaM2: pendingArea,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addZone(zone);

    // Show zone on map
    if (map && isMapReady) {
      renderZoneOnMap(map, zone);
    }

    // Reset form
    setShowForm(false);
    setPendingGeometry(null);
    setFormName('');
    setFormPrimaryUse('');
    setFormSecondaryUse('');
    setFormNotes('');
    draw?.deleteAll();
  }, [
    pendingGeometry, pendingArea, formName, formCategory,
    formPrimaryUse, formSecondaryUse, formNotes,
    projectId, addZone, map, isMapReady, draw,
  ]);

  const handleDeleteZone = useCallback(
    (zoneId: string) => {
      deleteZone(zoneId);
      if (map) {
        if (map.getLayer(`zone-fill-${zoneId}`)) map.removeLayer(`zone-fill-${zoneId}`);
        if (map.getLayer(`zone-line-${zoneId}`)) map.removeLayer(`zone-line-${zoneId}`);
        if (map.getLayer(`zone-label-${zoneId}`)) map.removeLayer(`zone-label-${zoneId}`);
        if (map.getSource(`zone-${zoneId}`)) map.removeSource(`zone-${zoneId}`);
      }
    },
    [deleteZone, map],
  );

  if (!isMapReady) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    fontSize: 12,
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.08)',
    color: '#f2ede3',
    fontFamily: 'inherit',
    outline: 'none',
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        flexShrink: 0,
        background: 'rgba(26, 22, 17, 0.92)',
        borderRadius: 10,
        padding: 12,
        backdropFilter: 'blur(10px)',
        color: '#f2ede3',
        width: collapsed ? 'auto' : 240,
        maxHeight: 'calc(100vh - 200px)',
        overflowY: 'auto',
        zIndex: 5,
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          color: '#9a8a74',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: 0,
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Zones ({zones.length})</span>
        <span>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div style={{ marginTop: 8 }}>
          {/* Draw button */}
          {!showForm && (
            <button
              onClick={startDraw}
              disabled={isDrawing}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                borderRadius: 6,
                background: isDrawing ? '#3d3328' : '#7d6140',
                color: '#fff',
                cursor: isDrawing ? 'wait' : 'pointer',
                marginBottom: 10,
              }}
            >
              {isDrawing ? 'Drawing… double-click to finish' : '+ Draw New Zone'}
            </button>
          )}

          {/* Zone creation form */}
          {showForm && (
            <div
              style={{
                border: '1px solid rgba(125, 97, 64, 0.4)',
                borderRadius: 8,
                padding: 10,
                marginBottom: 10,
                background: 'rgba(125, 97, 64, 0.1)',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9a8a74', marginBottom: 8, textTransform: 'uppercase' }}>
                New Zone — {formatArea(pendingArea)}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input
                  type="text"
                  placeholder="Zone name *"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={inputStyle}
                  autoFocus
                />

                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ZoneCategory)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {Object.entries(ZONE_CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.icon} {cfg.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Primary use"
                  value={formPrimaryUse}
                  onChange={(e) => setFormPrimaryUse(e.target.value)}
                  style={inputStyle}
                />

                <input
                  type="text"
                  placeholder="Secondary use"
                  value={formSecondaryUse}
                  onChange={(e) => setFormSecondaryUse(e.target.value)}
                  style={inputStyle}
                />

                <textarea
                  placeholder="Notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={handleSaveZone}
                    disabled={!formName.trim()}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: 12,
                      border: 'none',
                      borderRadius: 4,
                      background: formName.trim() ? '#527852' : '#3d3328',
                      color: '#fff',
                      cursor: formName.trim() ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Save Zone
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setPendingGeometry(null);
                      draw?.deleteAll();
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 4,
                      background: 'transparent',
                      color: '#9a8a74',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Zone list */}
          {zones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {zones.map((z) => (
                <div
                  key={z.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: z.color,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {z.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#9a8a74' }}>
                      {ZONE_CATEGORY_CONFIG[z.category].label} — {formatArea(z.areaM2)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteZone(z.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9a8a74',
                      cursor: 'pointer',
                      fontSize: 14,
                      padding: '0 2px',
                    }}
                    title="Delete zone"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {zones.length === 0 && !showForm && (
            <div style={{ fontSize: 11, color: '#9a8a74', textAlign: 'center', padding: 8 }}>
              No zones yet. Draw one to start organizing the land.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatArea(m2: number): string {
  if (m2 > 10000) {
    return `${(m2 / 10000).toFixed(2)} ha (${(m2 / 4046.86).toFixed(2)} ac)`;
  }
  return `${m2.toFixed(0)} m²`;
}

function renderZoneOnMap(map: mapboxgl.Map, zone: LandZone) {
  const sourceId = `zone-${zone.id}`;
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: zone.name, category: zone.category },
        geometry: zone.geometry,
      },
    ],
  };

  if (map.getSource(sourceId)) return;

  map.addSource(sourceId, { type: 'geojson', data: geojson });

  map.addLayer({
    id: `zone-fill-${zone.id}`,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-color': zone.color,
      'fill-opacity': 0.25,
    },
  });

  map.addLayer({
    id: `zone-line-${zone.id}`,
    type: 'line',
    source: sourceId,
    paint: {
      'line-color': zone.color,
      'line-width': 2,
    },
  });

  map.addLayer({
    id: `zone-label-${zone.id}`,
    type: 'symbol',
    source: sourceId,
    layout: {
      'text-field': zone.name,
      'text-size': 11,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-anchor': 'center',
    },
    paint: {
      'text-color': '#f2ede3',
      'text-halo-color': 'rgba(26, 22, 17, 0.8)',
      'text-halo-width': 1.5,
    },
  });
}
