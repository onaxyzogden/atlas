/**
 * CropPanel — orchard, garden, food forest, agroforestry placement.
 *
 * Reuses the MapboxDraw polygon flow. Includes tree spacing calculator.
 */

import { useState, useCallback, useMemo } from 'react';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import { CROP_TYPES } from '../livestock/speciesData.js';

interface CropPanelProps {
  projectId: string;
  draw: MapboxDraw | null;
  map: mapboxgl.Map | null;
}

export default function CropPanel({ projectId, draw, map }: CropPanelProps) {
  const allCrops = useCropStore((s) => s.cropAreas);
  const crops = useMemo(() => allCrops.filter((c) => c.projectId === projectId), [allCrops, projectId]);
  const addCropArea = useCropStore((s) => s.addCropArea);
  const deleteCropArea = useCropStore((s) => s.deleteCropArea);

  const [selectedType, setSelectedType] = useState<CropAreaType>('orchard');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [pendingArea, setPendingArea] = useState(0);

  // Form
  const [name, setName] = useState('');
  const [speciesText, setSpeciesText] = useState('');
  const [treeSpacing, setTreeSpacing] = useState(5);
  const [phase, setPhase] = useState('Phase 2');
  const [notes, setNotes] = useState('');

  const startDraw = useCallback(() => {
    if (!draw || !map) return;
    setIsDrawing(true);
    draw.changeMode('draw_polygon');

    const handleCreate = () => {
      const all = draw.getAll();
      const last = all.features[all.features.length - 1];
      if (last?.geometry.type === 'Polygon') {
        setPendingGeometry(last.geometry as GeoJSON.Polygon);
        try {
          import('@turf/turf').then((turf) => {
            setPendingArea(turf.area(last as GeoJSON.Feature<GeoJSON.Polygon>));
          }).catch(() => {});
        } catch { /* */ }
        const info = CROP_TYPES[selectedType];
        setName(info.label);
        setTreeSpacing(info.defaultSpacingM ?? 5);
        setSpeciesText('');
        setNotes('');
        setShowModal(true);
      }
      setIsDrawing(false);
      map.off('draw.create', handleCreate);
    };
    map.on('draw.create', handleCreate);
  }, [draw, map, selectedType]);

  const handleSave = useCallback(() => {
    if (!pendingGeometry || !name.trim()) return;

    const info = CROP_TYPES[selectedType];
    const info2 = CROP_TYPES[selectedType];
    const area: CropArea = {
      id: crypto.randomUUID(),
      projectId,
      name: name.trim(),
      color: info2.color,
      type: selectedType,
      geometry: pendingGeometry,
      areaM2: pendingArea,
      species: speciesText ? speciesText.split(',').map((s) => s.trim()).filter(Boolean) : [],
      treeSpacingM: info.defaultSpacingM !== null ? treeSpacing : null,
      rowSpacingM: null,
      waterDemand: info.waterDemand,
      irrigationType: 'rain_fed',
      phase,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addCropArea(area);
    if (map) renderCropOnMap(map, area);
    draw?.deleteAll();
    setShowModal(false);
    setPendingGeometry(null);
  }, [pendingGeometry, name, selectedType, speciesText, treeSpacing, phase, notes, pendingArea, projectId, addCropArea, map, draw]);

  const areaHa = pendingArea / 10000;
  const info = CROP_TYPES[selectedType];
  const treeCount = treeSpacing > 0 ? Math.floor(areaHa * 10000 / (treeSpacing * treeSpacing)) : 0;

  return (
    <>
      {/* Crop type selector */}
      <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 8 }}>Select Crop Type</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 14 }}>
        {(Object.entries(CROP_TYPES) as [CropAreaType, typeof CROP_TYPES[CropAreaType]][]).map(([key, ct]) => {
          const isSelected = selectedType === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 8px',
                background: isSelected ? `${ct.color}18` : 'transparent',
                border: isSelected ? `1px solid ${ct.color}40` : '1px solid var(--color-panel-subtle)',
                borderRadius: 6, cursor: 'pointer',
                color: isSelected ? ct.color : 'var(--color-panel-muted)',
                fontSize: 11, textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 13 }}>{ct.icon}</span>
              <span style={{ lineHeight: 1.2, fontWeight: isSelected ? 500 : 400 }}>{ct.label}</span>
              {isSelected && <span style={{ marginLeft: 'auto', fontSize: 10, color: ct.color }}>{'\u2713'}</span>}
            </button>
          );
        })}
      </div>

      {/* Draw button */}
      <button
        onClick={startDraw}
        disabled={isDrawing || !draw}
        style={{
          width: '100%', padding: '12px 16px', fontSize: 13, fontWeight: 600,
          border: 'none', borderRadius: 8,
          background: isDrawing ? 'var(--color-panel-subtle)' : `${info.color}20`,
          color: isDrawing ? 'var(--color-panel-muted)' : info.color,
          cursor: isDrawing ? 'wait' : 'pointer',
          marginBottom: 16, letterSpacing: '0.02em',
        }}
      >
        {isDrawing ? 'Drawing... double-click to finish' : `Draw ${info.label} Area`}
      </button>

      {/* Crop areas list */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
        Crop Areas ({crops.length})
      </div>
      {crops.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 16 }}>
          No crop areas drawn yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {crops.map((c) => {
            const ct = CROP_TYPES[c.type];
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--color-panel-card-border)', borderRadius: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: ct?.color ?? '#4A7C3F', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{c.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>
                    {ct?.label ?? c.type}{c.areaM2 > 0 && ` \u2014 ${(c.areaM2 / 10000).toFixed(2)} ha`}
                    {c.species.length > 0 && ` \u2014 ${c.species.join(', ')}`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    deleteCropArea(c.id);
                    if (map) {
                      ['fill', 'line', 'label'].forEach((t) => {
                        const id = `crop-${t}-${c.id}`;
                        if (map.getLayer(id)) map.removeLayer(id);
                      });
                      if (map.getSource(`crop-${c.id}`)) map.removeSource(`crop-${c.id}`);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 14 }}
                >
                  {'\u00D7'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Crop Properties Modal ── */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowModal(false); draw?.deleteAll(); }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '90vw', background: 'var(--color-panel-bg)', border: '1px solid rgba(196,162,101,0.15)', borderRadius: 14, padding: '28px 32px', color: 'var(--color-panel-text)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              {info.icon} {info.label}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-panel-muted)', marginBottom: 16 }}>
              {areaHa.toFixed(2)} ha \u2014 {info.description}
            </p>

            <label style={labelStyle}>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={inputStyle} />

            <label style={labelStyle}>Species (comma-separated)</label>
            <input type="text" value={speciesText} onChange={(e) => setSpeciesText(e.target.value)} style={inputStyle} placeholder="e.g. Apple, Pear, Plum" />

            {/* Tree spacing calculator */}
            {info.defaultSpacingM !== null && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Tree Spacing: {treeSpacing}m</label>
                <input
                  type="range" min={1} max={15} step={0.5} value={treeSpacing}
                  onChange={(e) => setTreeSpacing(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: info.color }}
                />
                <div style={{ fontSize: 11, color: info.color, marginTop: 4 }}>
                  ~{treeCount} trees at {treeSpacing}m spacing over {areaHa.toFixed(2)} ha
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Water Demand</label>
                <div style={{ padding: '8px 10px', background: 'var(--color-panel-subtle)', borderRadius: 6, fontSize: 12, color: 'var(--color-panel-text)' }}>
                  {info.waterDemand.charAt(0).toUpperCase() + info.waterDemand.slice(1)}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Phase</label>
                <select value={phase} onChange={(e) => setPhase(e.target.value)} style={inputStyle}>
                  <option value="Phase 1">Phase 1</option>
                  <option value="Phase 2">Phase 2</option>
                  <option value="Phase 3">Phase 3</option>
                  <option value="Phase 4">Phase 4</option>
                </select>
              </div>
            </div>

            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }} placeholder="Planting notes, irrigation plans..." />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowModal(false); draw?.deleteAll(); }} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSave} disabled={!name.trim()} style={{ ...saveBtnStyle, background: name.trim() ? `${info.color}30` : 'var(--color-panel-subtle)', color: name.trim() ? info.color : 'var(--color-panel-muted)', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
                Save {info.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--color-panel-muted)', display: 'block', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 12, background: 'var(--color-panel-subtle)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'var(--color-panel-text)', outline: 'none', fontFamily: 'inherit', marginBottom: 12 };
const cancelBtnStyle: React.CSSProperties = { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: 'transparent', color: 'var(--color-panel-muted)', cursor: 'pointer' };
const saveBtnStyle: React.CSSProperties = { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, letterSpacing: '0.02em' };

function renderCropOnMap(map: mapboxgl.Map, crop: CropArea) {
  const sourceId = `crop-${crop.id}`;
  if (map.getSource(sourceId)) return;

  const ct = CROP_TYPES[crop.type];
  const color = ct?.color ?? '#4A7C3F';

  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: crop.name }, geometry: crop.geometry }] },
  });
  map.addLayer({ id: `crop-fill-${crop.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.2 } });
  map.addLayer({ id: `crop-line-${crop.id}`, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': 1.5 } });
  map.addLayer({
    id: `crop-label-${crop.id}`, type: 'symbol', source: sourceId,
    layout: { 'text-field': crop.name, 'text-size': 10, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
    paint: { 'text-color': '#f2ede3', 'text-halo-color': 'rgba(26,22,17,0.8)', 'text-halo-width': 1.5 },
  });
}
