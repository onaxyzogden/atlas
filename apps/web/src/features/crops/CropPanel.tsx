/**
 * CropPanel — orchard, garden, food forest, agroforestry placement.
 *
 * Reuses the MapboxDraw polygon flow. Includes tree spacing calculator.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useCallback, useMemo } from 'react';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import { CROP_TYPES } from '../livestock/speciesData.js';
import { earth, zone, map as mapTokens } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';

interface CropPanelProps {
  projectId: string;
  draw: MapboxDraw | null;
  map: maplibregl.Map | null;
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
          }).catch((err) => { console.warn('[OGDEN] Turf area calculation failed:', err); });
        } catch (err) { console.warn('[OGDEN] Turf import failed:', err); }
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
      <div className={`${p.label} ${p.mb8}`}>Select Crop Type</div>
      <div className={p.selectorGrid2}>
        {(Object.entries(CROP_TYPES) as [CropAreaType, typeof CROP_TYPES[CropAreaType]][]).map(([key, ct]) => {
          const isSelected = selectedType === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              className={p.selectorBtn}
              style={{
                background: isSelected ? `${ct.color}18` : 'transparent',
                border: isSelected ? `1px solid ${ct.color}40` : undefined,
                color: isSelected ? ct.color : undefined,
              }}
            >
              <span className={p.selectorIcon}>{ct.icon}</span>
              <span style={{ lineHeight: 1.2, fontWeight: isSelected ? 500 : 400 }}>{ct.label}</span>
              {isSelected && <span className={p.selectorCheck} style={{ color: ct.color }}>{'\u2713'}</span>}
            </button>
          );
        })}
      </div>

      {/* Draw button */}
      <button
        onClick={startDraw}
        disabled={isDrawing || !draw}
        className={`${p.drawBtn} ${isDrawing ? p.drawBtnDisabled : ''}`}
        style={!isDrawing ? { background: `${info.color}20`, color: info.color } : undefined}
      >
        {isDrawing ? 'Drawing... double-click to finish' : `Draw ${info.label} Area`}
      </button>

      {/* Crop areas list */}
      <div className={p.sectionLabel}>
        Crop Areas ({crops.length})
      </div>
      {crops.length === 0 ? (
        <div className={p.empty}>
          No crop areas drawn yet
        </div>
      ) : (
        <div className={p.section}>
          {crops.map((c) => {
            const ct = CROP_TYPES[c.type];
            return (
              <div key={c.id} className={p.itemRow}>
                <span className={p.swatchSm} style={{ background: ct?.color ?? zone.food_production }} />
                <div className={p.itemContent}>
                  <div className={p.itemTitle}>{c.name}</div>
                  <div className={p.itemMeta}>
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
                  className={p.deleteBtn}
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
          className={p.modalOverlay}
          onClick={() => { setShowModal(false); draw?.deleteAll(); }}
        >
          <div onClick={(e) => e.stopPropagation()} className={p.modalContent}>
            <h2 className={p.modalTitle}>
              {info.icon} {info.label}
            </h2>
            <p className={p.modalSubtitle}>
              {areaHa.toFixed(2)} ha \u2014 {info.description}
            </p>

            <label className={p.formLabel}>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus className={p.formInput} />

            <label className={p.formLabel}>Species (comma-separated)</label>
            <input type="text" value={speciesText} onChange={(e) => setSpeciesText(e.target.value)} className={p.formInput} placeholder="e.g. Apple, Pear, Plum" />

            {/* Tree spacing calculator */}
            {info.defaultSpacingM !== null && (
              <div className={p.mb12}>
                <label className={p.formLabel}>Tree Spacing: {treeSpacing}m</label>
                <input
                  type="range" min={1} max={15} step={0.5} value={treeSpacing}
                  onChange={(e) => setTreeSpacing(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: info.color }}
                />
                <div className={p.text11} style={{ color: info.color, marginTop: 4 }}>
                  ~{treeCount} trees at {treeSpacing}m spacing over {areaHa.toFixed(2)} ha
                </div>
              </div>
            )}

            <div className={p.flexGap12}>
              <div className={p.flex1}>
                <label className={p.formLabel}>Water Demand</label>
                <div style={{ padding: '8px 10px', background: 'var(--color-panel-subtle)', borderRadius: 6, fontSize: 12, color: 'var(--color-panel-text)' }}>
                  {info.waterDemand.charAt(0).toUpperCase() + info.waterDemand.slice(1)}
                </div>
              </div>
              <div className={p.flex1}>
                <label className={p.formLabel}>Phase</label>
                <select value={phase} onChange={(e) => setPhase(e.target.value)} className={p.formInput}>
                  <option value="Phase 1">Phase 1</option>
                  <option value="Phase 2">Phase 2</option>
                  <option value="Phase 3">Phase 3</option>
                  <option value="Phase 4">Phase 4</option>
                </select>
              </div>
            </div>

            <label className={p.formLabel}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${p.formInput} ${p.formTextarea}`} placeholder="Planting notes, irrigation plans..." />

            <div className={p.btnRow}>
              <button onClick={() => { setShowModal(false); draw?.deleteAll(); }} className={p.cancelBtn}>Cancel</button>
              <button onClick={handleSave} disabled={!name.trim()} className={`${p.saveBtn} ${name.trim() ? p.saveBtnEnabled : p.saveBtnDisabled}`} style={name.trim() ? { background: `${info.color}30`, color: info.color } : undefined}>
                Save {info.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function renderCropOnMap(map: maplibregl.Map, crop: CropArea) {
  const sourceId = `crop-${crop.id}`;
  if (map.getSource(sourceId)) return;

  const ct = CROP_TYPES[crop.type];
  const color = ct?.color ?? zone.food_production;

  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: crop.name }, geometry: crop.geometry }] },
  });
  map.addLayer({ id: `crop-fill-${crop.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.2 } });
  map.addLayer({ id: `crop-line-${crop.id}`, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': 1.5 } });
  map.addLayer({
    id: `crop-label-${crop.id}`, type: 'symbol', source: sourceId,
    layout: { 'text-field': crop.name, 'text-size': 10, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
    paint: { 'text-color': earth[100], 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
  });
}
