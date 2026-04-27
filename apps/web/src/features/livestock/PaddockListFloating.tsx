/**
 * PaddockListFloating — headless paddock-draw controller.
 *
 * Originally rendered a floating list next to the right sidebar, but the list
 * is now covered by `PaddockDesignDashboard` in the right rail. This component
 * is reduced to its essential side-effects: the `ogden:paddock:start` +
 * `draw.create` intent controller and the properties modal that opens once a
 * polygon is drawn. No visible surface until the modal fires.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useLivestockStore,
  type Paddock,
  type LivestockSpecies,
  type FenceType,
} from '../../store/livestockStore.js';
import { LIVESTOCK_SPECIES } from './speciesData.js';
import { computeRotationSchedule } from './livestockAnalysis.js';
import { zone, map as mapTokens } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';

interface PaddockListFloatingProps {
  projectId: string;
  draw: MapboxDraw | null;
  map: maplibregl.Map | null;
}

const FENCE_OPTIONS: { value: FenceType; label: string }[] = [
  { value: 'electric', label: 'Electric' },
  { value: 'post_wire', label: 'Post & Wire' },
  { value: 'post_rail', label: 'Post & Rail' },
  { value: 'woven_wire', label: 'Woven Wire' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'none', label: 'None' },
];

export default function PaddockListFloating({ projectId, draw, map }: PaddockListFloatingProps) {
  const addPaddock = useLivestockStore((s) => s.addPaddock);

  const [, setIsDrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [pendingArea, setPendingArea] = useState(0);

  // a11y: Escape key dismisses the paddock-naming modal when open
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowModal(false); draw?.deleteAll(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal, draw]);

  // Form state
  const [name, setName] = useState('');
  const [selectedSpecies, setSelectedSpecies] = useState<LivestockSpecies[]>([]);
  const [fencing, setFencing] = useState<FenceType>('electric');
  const [phase, setPhase] = useState('Phase 1');
  const [guestSafe, setGuestSafe] = useState(false);
  const [notes, setNotes] = useState('');

  // Paddock-draw intent is driven by the DomainFloatingToolbar's Paddock tool.
  // When the toolbar fires `ogden:paddock:start`, we flip the intent flag so
  // the next `draw.create` is interpreted as a paddock (and the properties
  // modal opens). Intent clears on create (consumed or not) so stale flags
  // can't leak into a subsequent non-paddock draw.
  const paddockIntentRef = useRef(false);

  useEffect(() => {
    if (!map || !draw) return;
    const handleStart = () => {
      paddockIntentRef.current = true;
      setIsDrawing(true);
    };
    const handleCreate = () => {
      if (!paddockIntentRef.current) return;
      paddockIntentRef.current = false;
      setIsDrawing(false);
      const all = draw.getAll();
      const last = all.features[all.features.length - 1];
      if (last?.geometry.type === 'Polygon') {
        setPendingGeometry(last.geometry as GeoJSON.Polygon);
        try {
          import('@turf/turf').then((turf) => {
            setPendingArea(turf.area(last as GeoJSON.Feature<GeoJSON.Polygon>));
          }).catch((err) => { console.warn('[OGDEN] Turf area calculation failed:', err); });
        } catch (err) { console.warn('[OGDEN] Turf import failed:', err); }
        setName('');
        setSelectedSpecies([]);
        setFencing('electric');
        setGuestSafe(false);
        setNotes('');
        setShowModal(true);
      }
    };
    // Rotation-advance intent from the DomainFloatingToolbar's Initiate
    // Rotation tool. Finds the next paddock whose recovery status says
    // "move_in" (ready or overdue) and bumps its updatedAt — the Herd
    // Rotation dashboard re-derives the schedule from paddock state, so
    // touching updatedAt is enough to reflect the move.
    const handleRotate = () => {
      const state = useLivestockStore.getState();
      const paddocks = state.paddocks.filter((pk) => pk.projectId === projectId);
      if (paddocks.length === 0) {
        console.info('[OGDEN] Rotation: no paddocks in project');
        return;
      }
      const schedule = computeRotationSchedule(paddocks);
      const next = schedule.find((e) => e.suggestedAction === 'move_in');
      if (!next) {
        console.info('[OGDEN] Rotation: no paddock ready to move into');
        return;
      }
      state.updatePaddock(next.paddockId, { updatedAt: new Date().toISOString() });
      console.info(`[OGDEN] Rotated herd \u2192 ${next.paddockName}`);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on('ogden:paddock:start' as any, handleStart);
    map.on('draw.create', handleCreate);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.on('ogden:herd:rotate' as any, handleRotate);
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.off('ogden:paddock:start' as any, handleStart);
      map.off('draw.create', handleCreate);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.off('ogden:herd:rotate' as any, handleRotate);
    };
  }, [map, draw, projectId]);

  const handleSave = useCallback(() => {
    if (!pendingGeometry || !name.trim()) return;

    let stockingDensity: number | null = null;
    if (selectedSpecies.length > 0) {
      stockingDensity = Math.round(
        selectedSpecies.reduce((sum, sp) => sum + LIVESTOCK_SPECIES[sp].typicalStocking, 0) / selectedSpecies.length,
      );
    }

    const paddock: Paddock = {
      id: crypto.randomUUID(),
      projectId,
      name: name.trim(),
      color: zone.livestock,
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
      {/* ── Paddock Properties Modal ── */}
      {showModal && (
        /* a11y: backdrop click dismiss; Escape key handled in useEffect above */
        <div
          className={p.modalOverlay}
          role="presentation"
          onClick={() => { setShowModal(false); draw?.deleteAll(); }}
        >
          <div onClick={(e) => e.stopPropagation()} className={p.modalContent} role="dialog" aria-modal="true">
            <h2 className={p.modalTitle}>Name This Paddock</h2>
            <p className={p.modalSubtitle}>
              {areaHa.toFixed(2)} ha ({(pendingArea / 4046.86).toFixed(2)} acres)
            </p>

            <label className={p.formLabel}>Paddock Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className={p.formInput}
              placeholder="e.g. North Pasture"
            />

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

            {selectedSpecies.length > 0 && (
              <div className={p.hintBox}>
                {selectedSpecies.map((sp) => {
                  const info = LIVESTOCK_SPECIES[sp];
                  const capacity = Math.floor(areaHa * info.typicalStocking);
                  return (
                    <div key={sp} style={{ marginBottom: 4 }}>
                      {info.icon} <strong>{info.label}:</strong> ~{capacity} {info.stockingUnit} at typical stocking ({info.typicalStocking}/ha)
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
                <select
                  value={fencing}
                  onChange={(e) => setFencing(e.target.value as FenceType)}
                  className={p.formInput}
                >
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
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={`${p.formInput} ${p.formTextarea}`}
              placeholder="Grazing notes, water access..."
            />

            <div className={p.btnRow}>
              <button
                onClick={() => { setShowModal(false); draw?.deleteAll(); }}
                className={p.cancelBtn}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className={`${p.saveBtn} ${name.trim() ? p.saveBtnEnabled : p.saveBtnDisabled}`}
              >
                Save Paddock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function renderPaddockOnMap(map: maplibregl.Map, paddock: Paddock) {
  const sourceId = `paddock-${paddock.id}`;
  if (map.getSource(sourceId)) return;

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { name: paddock.name }, geometry: paddock.geometry }],
    },
  });
  map.addLayer({
    id: `paddock-fill-${paddock.id}`,
    type: 'fill',
    source: sourceId,
    paint: { 'fill-color': zone.livestock, 'fill-opacity': 0.2 },
  });
  map.addLayer({
    id: `paddock-line-${paddock.id}`,
    type: 'line',
    source: sourceId,
    paint: { 'line-color': zone.livestock, 'line-width': 2, 'line-dasharray': [4, 2] },
  });
  map.addLayer({
    id: `paddock-label-${paddock.id}`,
    type: 'symbol',
    source: sourceId,
    layout: {
      'text-field': paddock.name,
      'text-size': 10,
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'],
      'text-anchor': 'center',
    },
    paint: {
      'text-color': mapTokens.label,
      'text-halo-color': mapTokens.labelHalo,
      'text-halo-width': 1.5,
    },
  });
}
