/**
 * LivestockPanel — species selector, paddock drawing, stocking calculator.
 *
 * Reuses the MapboxDraw polygon flow from zones — the key difference
 * is the metadata captured (species, stocking density, fencing type).
 */

import { useState, useCallback, useMemo } from 'react';
import {
  useLivestockStore,
  type Paddock,
  type LivestockSpecies,
  type FenceType,
} from '../../store/livestockStore.js';
import { LIVESTOCK_SPECIES } from './speciesData.js';
import p from '../../styles/panel.module.css';

interface LivestockPanelProps {
  projectId: string;
  draw: MapboxDraw | null;
  map: mapboxgl.Map | null;
}

const FENCE_OPTIONS: { value: FenceType; label: string }[] = [
  { value: 'electric', label: 'Electric' },
  { value: 'post_wire', label: 'Post & Wire' },
  { value: 'post_rail', label: 'Post & Rail' },
  { value: 'woven_wire', label: 'Woven Wire' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'none', label: 'None' },
];

export default function LivestockPanel({ projectId, draw, map }: LivestockPanelProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(() => allPaddocks.filter((p) => p.projectId === projectId), [allPaddocks, projectId]);
  const addPaddock = useLivestockStore((s) => s.addPaddock);
  const deletePaddock = useLivestockStore((s) => s.deletePaddock);

  const [isDrawing, setIsDrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [pendingArea, setPendingArea] = useState(0);

  // Form state
  const [name, setName] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<LivestockSpecies[]>([]);
  const [fencing, setFencing] = useState<FenceType>('electric');
  const [phase, setPhase] = useState('Phase 1');
  const [guestSafe, setGuestSafe] = useState(false);
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
        setName('');
        setSelectedSpecies([]);
        setFencing('electric');
        setGuestSafe(false);
        setNotes('');
        setShowModal(true);
      }
      setIsDrawing(false);
      map.off('draw.create', handleCreate);
    };
    map.on('draw.create', handleCreate);
  }, [draw, map]);

  const handleSave = useCallback(() => {
    if (!pendingGeometry || !name.trim()) return;

    // Compute suggested stocking from selected species
    let stockingDensity: number | null = null;
    if (selectedSpecies.length > 0) {
      stockingDensity = Math.round(
        selectedSpecies.reduce((sum, sp) => sum + LIVESTOCK_SPECIES[sp].typicalStocking, 0) / selectedSpecies.length
      );
    }

    const paddock: Paddock = {
      id: crypto.randomUUID(),
      projectId,
      name: name.trim(),
      color: '#7A6B3A',
      geometry: pendingGeometry,
      areaM2: pendingArea,
      grazingCellGroup: null,
      species: selectedSpecies,
      stockingDensity,
      fencing,
      guestSafeBuffer: guestSafe,
      waterPointNote: '',
      shelterNote: '',
      phase,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addPaddock(paddock);
    if (map) renderPaddockOnMap(map, paddock);
    draw?.deleteAll();
    setShowModal(false);
    setPendingGeometry(null);
  }, [pendingGeometry, name, selectedSpecies, fencing, guestSafe, phase, notes, pendingArea, projectId, addPaddock, map, draw]);

  const toggleSpecies = (sp: LivestockSpecies) => {
    setSelectedSpecies((prev) =>
      prev.includes(sp) ? prev.filter((s) => s !== sp) : [...prev, sp],
    );
  };

  const areaHa = pendingArea / 10000;

  return (
    <>
      {/* Species selector */}
      <div className={`${p.label} ${p.mb8}`}>Select Species</div>
      <div className={p.selectorGrid3}>
        {(Object.entries(LIVESTOCK_SPECIES) as [LivestockSpecies, typeof LIVESTOCK_SPECIES[LivestockSpecies]][]).map(([key, info]) => (
          <button
            key={key}
            onClick={() => toggleSpecies(key)}
            className={`${p.selectorBtn} ${p.selectorBtnCol} ${selectedSpecies.includes(key) ? p.selectorBtnActive : ''}`}
            style={selectedSpecies.includes(key) ? undefined : undefined}
          >
            <span className={p.selectorIconLg}>{info.icon}</span>
            <span>{info.label}</span>
          </button>
        ))}
      </div>

      {/* Draw paddock button */}
      <button
        onClick={startDraw}
        disabled={isDrawing || !draw}
        className={`${p.drawBtn} ${isDrawing ? p.drawBtnDisabled : ''}`}
      >
        {isDrawing ? 'Drawing... double-click to finish' : 'Draw Paddock on Map'}
      </button>

      {/* Paddock list */}
      <div className={p.sectionLabel}>
        Paddocks ({paddocks.length})
      </div>
      {paddocks.length === 0 ? (
        <div className={p.empty}>
          No paddocks drawn yet
        </div>
      ) : (
        <div className={p.section}>
          {paddocks.map((pk) => (
            <div key={pk.id} className={p.itemRow}>
              <span className={p.swatchSm} style={{ background: '#7A6B3A' }} />
              <div className={p.itemContent}>
                <div className={p.itemTitle}>{pk.name}</div>
                <div className={p.itemMeta}>
                  {pk.species.map((sp) => LIVESTOCK_SPECIES[sp].icon).join(' ')}
                  {pk.areaM2 > 0 && ` \u2014 ${(pk.areaM2 / 10000).toFixed(2)} ha`}
                </div>
              </div>
              <button
                onClick={() => {
                  deletePaddock(pk.id);
                  if (map) {
                    ['fill', 'line', 'label'].forEach((t) => {
                      const id = `paddock-${t}-${pk.id}`;
                      if (map.getLayer(id)) map.removeLayer(id);
                    });
                    if (map.getSource(`paddock-${pk.id}`)) map.removeSource(`paddock-${pk.id}`);
                  }
                }}
                className={p.deleteBtn}
              >
                {'\u00D7'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Paddock Properties Modal ── */}
      {showModal && (
        <div
          className={p.modalOverlay}
          onClick={() => { setShowModal(false); draw?.deleteAll(); }}
        >
          <div onClick={(e) => e.stopPropagation()} className={p.modalContent}>
            <h2 className={p.modalTitle}>
              Name This Paddock
            </h2>
            <p className={p.modalSubtitle}>
              {areaHa.toFixed(2)} ha ({(pendingArea / 4046.86).toFixed(2)} acres)
            </p>

            <label className={p.formLabel}>Paddock Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus className={p.formInput} placeholder="e.g. North Pasture" />

            <label className={p.formLabel}>Species</label>
            <div className={p.flexWrap}>
              {(Object.entries(LIVESTOCK_SPECIES) as [LivestockSpecies, typeof LIVESTOCK_SPECIES[LivestockSpecies]][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => toggleSpecies(key)}
                  className={`${p.chip} ${selectedSpecies.includes(key) ? p.chipActive : ''}`}
                >
                  {info.icon} {info.label}
                </button>
              ))}
            </div>

            {/* Stocking info */}
            {selectedSpecies.length > 0 && (
              <div className={p.hintBox}>
                {selectedSpecies.map((sp) => {
                  const info = LIVESTOCK_SPECIES[sp];
                  const capacity = Math.floor(areaHa * info.typicalStocking);
                  return (
                    <div key={sp} style={{ marginBottom: 4 }}>
                      {info.icon} <strong>{info.label}:</strong> ~{capacity} head at typical stocking ({info.typicalStocking}/ha)
                      <br />
                      <span className={p.opacity70}>{info.fencingNote}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={p.flexGap12}>
              <div className={p.flex1}>
                <label className={p.formLabel}>Fencing</label>
                <select value={fencing} onChange={(e) => setFencing(e.target.value as FenceType)} className={p.formInput}>
                  {FENCE_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
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

            <label className={`${p.formLabel} ${p.formLabelInline}`}>
              <input type="checkbox" checked={guestSafe} onChange={(e) => setGuestSafe(e.target.checked)} />
              Guest-safe buffer required
            </label>

            <label className={p.formLabel}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${p.formInput} ${p.formTextarea}`} placeholder="Grazing notes, water access..." />

            <div className={p.btnRow}>
              <button onClick={() => { setShowModal(false); draw?.deleteAll(); }} className={p.cancelBtn}>Cancel</button>
              <button onClick={handleSave} disabled={!name.trim()} className={`${p.saveBtn} ${name.trim() ? p.saveBtnEnabled : p.saveBtnDisabled}`}>
                Save Paddock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function renderPaddockOnMap(map: mapboxgl.Map, paddock: Paddock) {
  const sourceId = `paddock-${paddock.id}`;
  if (map.getSource(sourceId)) return;

  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: paddock.name }, geometry: paddock.geometry }] },
  });
  map.addLayer({ id: `paddock-fill-${paddock.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': '#7A6B3A', 'fill-opacity': 0.2 } });
  map.addLayer({
    id: `paddock-line-${paddock.id}`, type: 'line', source: sourceId,
    paint: { 'line-color': '#7A6B3A', 'line-width': 2, 'line-dasharray': [4, 2] },
  });
  map.addLayer({
    id: `paddock-label-${paddock.id}`, type: 'symbol', source: sourceId,
    layout: { 'text-field': paddock.name, 'text-size': 10, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
    paint: { 'text-color': '#f2ede3', 'text-halo-color': 'rgba(26,22,17,0.8)', 'text-halo-width': 1.5 },
  });
}
