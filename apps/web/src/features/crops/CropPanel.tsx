/**
 * CropPanel — orchard, garden, food forest, agroforestry placement.
 *
 * Reuses the MapboxDraw polygon flow. Includes tree spacing calculator.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import { CROP_TYPES } from '../livestock/speciesData.js';
import {
  MARKET_GARDEN_BUNDLES,
  MARKET_GARDEN_BUNDLES_BY_ID,
  computeMarketGardenGeometry,
} from './marketGardenBundles.js';
import {
  computeWaterGalYr,
  computeWaterLitersYr,
  formatGalYr,
  formatLitersYr,
} from './waterDemand.js';
import { earth, zone, map as mapTokens } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';

/** Per-crop-type label for the spacing-slider count read-out. */
const SPACING_NOUN: Record<CropAreaType, string> = {
  orchard: 'trees',
  food_forest: 'trees',
  silvopasture: 'trees',
  windbreak: 'trees',
  shelterbelt: 'trees',
  nursery: 'seedlings',
  row_crop: 'plants',
  garden_bed: 'plants',
  market_garden: 'plants',
  pollinator_strip: 'plants',
};

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
  const [showPicker, setShowPicker] = useState(false);

  // Toolbar's "Plant Crop" action triggers the type-picker overlay.
  useEffect(() => {
    if (!map) return;
    const onOpen = () => setShowPicker(true);
    map.on('ogden:crops:open-picker' as keyof maplibregl.MapEventType, onOpen);
    return () => {
      map.off('ogden:crops:open-picker' as keyof maplibregl.MapEventType, onOpen);
    };
  }, [map]);

  // a11y: Escape closes the crop picker
  useEffect(() => {
    if (!showPicker) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowPicker(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showPicker]);

  // a11y: Escape key dismisses the crop-naming modal when open
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowModal(false); draw?.deleteAll(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal, draw]);

  // Form
  const [name, setName] = useState('');
  const [speciesText, setSpeciesText] = useState('');
  const [treeSpacing, setTreeSpacing] = useState(5);
  const [phase, setPhase] = useState('Phase 2');
  const [notes, setNotes] = useState('');
  const [marketGardenBundleId, setMarketGardenBundleId] = useState<string>('mixed');

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
        setMarketGardenBundleId('mixed');
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
    const isMarketGarden = selectedType === 'market_garden';
    const bundle = isMarketGarden ? MARKET_GARDEN_BUNDLES_BY_ID[marketGardenBundleId] : undefined;

    const resolvedWaterDemand = bundle?.waterDemand ?? info.waterDemand;
    const resolvedSpacingM = isMarketGarden
      ? (bundle?.spacingM ?? info.defaultSpacingM)
      : (info.defaultSpacingM !== null ? treeSpacing : null);

    const area: CropArea = {
      id: crypto.randomUUID(),
      projectId,
      name: name.trim(),
      color: info.color,
      type: selectedType,
      geometry: pendingGeometry,
      areaM2: pendingArea,
      species: speciesText ? speciesText.split(',').map((s) => s.trim()).filter(Boolean) : [],
      treeSpacingM: resolvedSpacingM,
      rowSpacingM: null,
      waterDemand: resolvedWaterDemand,
      irrigationType: 'rain_fed',
      phase,
      notes,
      waterGalYr: computeWaterGalYr(pendingArea, { areaType: selectedType, waterDemandClass: resolvedWaterDemand }),
      ...(isMarketGarden && bundle ? { marketGardenBundle: bundle.id } : {}),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addCropArea(area);
    if (map) renderCropOnMap(map, area);
    draw?.deleteAll();
    setShowModal(false);
    setPendingGeometry(null);
  }, [pendingGeometry, name, selectedType, speciesText, treeSpacing, phase, notes, pendingArea, projectId, addCropArea, map, draw, marketGardenBundleId]);

  const areaHa = pendingArea / 10000;
  const info = CROP_TYPES[selectedType];
  const treeCount = treeSpacing > 0 ? Math.floor(areaHa * 10000 / (treeSpacing * treeSpacing)) : 0;
  const isMarketGarden = selectedType === 'market_garden';
  const activeBundle = useMemo(
    () => (isMarketGarden ? MARKET_GARDEN_BUNDLES_BY_ID[marketGardenBundleId] : undefined),
    [isMarketGarden, marketGardenBundleId],
  );
  const mgGeom = useMemo(
    () => (activeBundle ? computeMarketGardenGeometry(pendingArea, activeBundle) : null),
    [activeBundle, pendingArea],
  );
  const waterDemandClass = activeBundle?.waterDemand ?? info.waterDemand;
  const waterGalYr = useMemo(
    () => computeWaterGalYr(pendingArea, { areaType: selectedType, waterDemandClass }),
    [pendingArea, selectedType, waterDemandClass],
  );
  const waterLitersYr = useMemo(
    () => computeWaterLitersYr(pendingArea, { areaType: selectedType, waterDemandClass }),
    [pendingArea, selectedType, waterDemandClass],
  );
  const spacingNoun = SPACING_NOUN[selectedType] ?? 'plants';

  return (
    <>
      {isDrawing && (
        <div className={p.empty} style={{ marginBottom: 10 }}>
          Drawing — double-click on the map to finish the polygon.
        </div>
      )}

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

      {/* ── Crop Type Picker (opened by toolbar action) ── */}
      {showPicker && (
        <div
          className={p.modalOverlay}
          role="presentation"
          onClick={() => setShowPicker(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className={p.modalContent} role="dialog" aria-modal="true">
            <h2 className={p.modalTitle}>Choose Crop Type</h2>
            <p className={p.modalSubtitle}>Select a type, then draw a polygon on the map.</p>
            <div className={p.selectorGrid2}>
              {(Object.entries(CROP_TYPES) as [CropAreaType, typeof CROP_TYPES[CropAreaType]][]).map(([key, ct]) => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedType(key);
                    setShowPicker(false);
                    setTimeout(() => startDraw(), 0);
                  }}
                  className={p.selectorBtn}
                  style={{ background: 'transparent' }}
                >
                  <span className={p.selectorIcon}>{ct.icon}</span>
                  <span style={{ lineHeight: 1.2 }}>{ct.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Crop Properties Modal ── */}
      {showModal && (
        /* a11y: backdrop click dismiss; Escape key handled in useEffect above */
        <div
          className={p.modalOverlay}
          role="presentation"
          onClick={() => { setShowModal(false); draw?.deleteAll(); }}
        >
          <div onClick={(e) => e.stopPropagation()} className={p.modalContent} role="dialog" aria-modal="true">
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

            {/* Market-garden bundle picker — bed-based geometry */}
            {isMarketGarden && activeBundle && mgGeom && (
              <div className={p.mb12}>
                <label className={p.formLabel}>Bundle</label>
                <select
                  value={marketGardenBundleId}
                  onChange={(e) => setMarketGardenBundleId(e.target.value)}
                  className={p.formInput}
                >
                  {MARKET_GARDEN_BUNDLES.map((b) => (
                    <option key={b.id} value={b.id}>{b.icon} {b.label}</option>
                  ))}
                </select>
                <div className={p.text11} style={{ color: info.color, marginTop: 4 }}>
                  ~{mgGeom.plantCount.toLocaleString()} plants in ~{mgGeom.bedCount} beds — bed {activeBundle.bedWidthM}m, path {activeBundle.pathWidthM}m, {activeBundle.spacingM}m spacing
                </div>
                <div className={p.text11} style={{ opacity: 0.7, marginTop: 2 }}>
                  {activeBundle.description}
                </div>
              </div>
            )}

            {/* Tree/plant spacing slider — non-market-garden types with a default spacing */}
            {!isMarketGarden && info.defaultSpacingM !== null && (
              <div className={p.mb12}>
                <label className={p.formLabel}>Spacing: {treeSpacing}m</label>
                <input
                  type="range" min={1} max={15} step={0.5} value={treeSpacing}
                  onChange={(e) => setTreeSpacing(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: info.color }}
                />
                <div className={p.text11} style={{ color: info.color, marginTop: 4 }}>
                  ~{treeCount} {spacingNoun} at {treeSpacing}m spacing over {areaHa.toFixed(2)} ha
                </div>
              </div>
            )}

            <div className={p.flexGap12}>
              <div className={p.flex1}>
                <label className={p.formLabel}>Water Demand</label>
                <div style={{ padding: '8px 10px', background: 'var(--color-panel-subtle)', borderRadius: 6, fontSize: 12, color: 'var(--color-panel-text)' }}>
                  <div>{waterDemandClass.charAt(0).toUpperCase() + waterDemandClass.slice(1)}</div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                    ~{formatGalYr(waterGalYr)} ({formatLitersYr(waterLitersYr)})
                  </div>
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
