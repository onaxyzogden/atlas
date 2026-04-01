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
import p from '../../styles/panel.module.css';
import s from './ZonePanel.module.css';

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

  return (
    <div className={`${s.root} ${collapsed ? s.rootCollapsed : s.rootExpanded}`}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={s.toggleBtn}
      >
        <span>Zones ({zones.length})</span>
        <span>{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className={s.body}>
          {/* Draw button */}
          {!showForm && (
            <button
              onClick={startDraw}
              disabled={isDrawing}
              className={s.drawBtn}
            >
              {isDrawing ? 'Drawing… double-click to finish' : '+ Draw New Zone'}
            </button>
          )}

          {/* Zone creation form */}
          {showForm && (
            <div className={s.formCard}>
              <div className={s.formTitle}>
                New Zone — {formatArea(pendingArea)}
              </div>

              <div className={s.formFields}>
                <input
                  type="text"
                  placeholder="Zone name *"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={p.input}
                  autoFocus
                />

                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ZoneCategory)}
                  className={`${p.input} ${s.selectInput}`}
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
                  className={p.input}
                />

                <input
                  type="text"
                  placeholder="Secondary use"
                  value={formSecondaryUse}
                  onChange={(e) => setFormSecondaryUse(e.target.value)}
                  className={p.input}
                />

                <textarea
                  placeholder="Notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className={`${p.input} ${s.textareaInput}`}
                />

                <div className={s.formActions}>
                  <button
                    onClick={handleSaveZone}
                    disabled={!formName.trim()}
                    className={`${s.saveBtn} ${formName.trim() ? s.saveBtnEnabled : s.saveBtnDisabled}`}
                  >
                    Save Zone
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setPendingGeometry(null);
                      draw?.deleteAll();
                    }}
                    className={s.cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Zone list */}
          {zones.length > 0 && (
            <div className={s.zoneList}>
              {zones.map((z) => (
                <div key={z.id} className={s.zoneItem}>
                  <span
                    className={s.zoneSwatch}
                    style={{ background: z.color }}
                  />
                  <div className={s.zoneInfo}>
                    <div className={s.zoneName}>
                      {z.name}
                    </div>
                    <div className={s.zoneMeta}>
                      {ZONE_CATEGORY_CONFIG[z.category].label} — {formatArea(z.areaM2)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteZone(z.id)}
                    className={s.deleteBtn}
                    title="Delete zone"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {zones.length === 0 && !showForm && (
            <div className={s.emptyState}>
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
