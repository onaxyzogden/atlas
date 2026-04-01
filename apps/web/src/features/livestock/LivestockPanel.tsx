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
      <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 8 }}>Select Species</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 14 }}>
        {(Object.entries(LIVESTOCK_SPECIES) as [LivestockSpecies, typeof LIVESTOCK_SPECIES[LivestockSpecies]][]).map(([key, info]) => (
          <button
            key={key}
            onClick={() => toggleSpecies(key)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '6px 4px',
              background: selectedSpecies.includes(key) ? 'rgba(122, 107, 58, 0.15)' : 'transparent',
              border: selectedSpecies.includes(key) ? '1px solid rgba(122, 107, 58, 0.3)' : '1px solid var(--color-panel-subtle)',
              borderRadius: 6,
              cursor: 'pointer',
              color: selectedSpecies.includes(key) ? '#c4a265' : 'var(--color-panel-muted)',
              fontSize: 10,
            }}
          >
            <span style={{ fontSize: 16 }}>{info.icon}</span>
            <span>{info.label}</span>
          </button>
        ))}
      </div>

      {/* Draw paddock button */}
      <button
        onClick={startDraw}
        disabled={isDrawing || !draw}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: 13,
          fontWeight: 600,
          border: 'none',
          borderRadius: 8,
          background: isDrawing ? 'var(--color-panel-subtle)' : 'rgba(122, 107, 58, 0.15)',
          color: isDrawing ? 'var(--color-panel-muted)' : '#c4a265',
          cursor: isDrawing ? 'wait' : 'pointer',
          marginBottom: 16,
          letterSpacing: '0.02em',
        }}
      >
        {isDrawing ? 'Drawing... double-click to finish' : 'Draw Paddock on Map'}
      </button>

      {/* Paddock list */}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
        Paddocks ({paddocks.length})
      </div>
      {paddocks.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 16 }}>
          No paddocks drawn yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {paddocks.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                border: '1px solid var(--color-panel-card-border)',
                borderRadius: 8,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#7A6B3A', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>
                  {p.species.map((sp) => LIVESTOCK_SPECIES[sp].icon).join(' ')}
                  {p.areaM2 > 0 && ` \u2014 ${(p.areaM2 / 10000).toFixed(2)} ha`}
                </div>
              </div>
              <button
                onClick={() => {
                  deletePaddock(p.id);
                  if (map) {
                    ['fill', 'line', 'label'].forEach((t) => {
                      const id = `paddock-${t}-${p.id}`;
                      if (map.getLayer(id)) map.removeLayer(id);
                    });
                    if (map.getSource(`paddock-${p.id}`)) map.removeSource(`paddock-${p.id}`);
                  }
                }}
                style={{ background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 14 }}
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
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowModal(false); draw?.deleteAll(); }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '90vw', background: 'var(--color-panel-bg)', border: '1px solid rgba(196,162,101,0.15)', borderRadius: 14, padding: '28px 32px', color: 'var(--color-panel-text)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              Name This Paddock
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-panel-muted)', marginBottom: 16 }}>
              {areaHa.toFixed(2)} ha ({(pendingArea / 4046.86).toFixed(2)} acres)
            </p>

            <label style={labelStyle}>Paddock Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={inputStyle} placeholder="e.g. North Pasture" />

            <label style={labelStyle}>Species</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
              {(Object.entries(LIVESTOCK_SPECIES) as [LivestockSpecies, typeof LIVESTOCK_SPECIES[LivestockSpecies]][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => toggleSpecies(key)}
                  style={{
                    padding: '4px 8px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
                    background: selectedSpecies.includes(key) ? 'rgba(122,107,58,0.15)' : 'transparent',
                    border: selectedSpecies.includes(key) ? '1px solid rgba(122,107,58,0.3)' : '1px solid var(--color-panel-subtle)',
                    color: selectedSpecies.includes(key) ? '#c4a265' : 'var(--color-panel-muted)',
                  }}
                >
                  {info.icon} {info.label}
                </button>
              ))}
            </div>

            {/* Stocking info */}
            {selectedSpecies.length > 0 && (
              <div style={{ padding: '8px 10px', background: 'rgba(122,107,58,0.06)', borderRadius: 6, marginBottom: 12, fontSize: 11, color: 'var(--color-panel-muted)' }}>
                {selectedSpecies.map((sp) => {
                  const info = LIVESTOCK_SPECIES[sp];
                  const capacity = Math.floor(areaHa * info.typicalStocking);
                  return (
                    <div key={sp} style={{ marginBottom: 4 }}>
                      {info.icon} <strong>{info.label}:</strong> ~{capacity} head at typical stocking ({info.typicalStocking}/ha)
                      <br />
                      <span style={{ opacity: 0.7 }}>{info.fencingNote}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Fencing</label>
                <select value={fencing} onChange={(e) => setFencing(e.target.value as FenceType)} style={inputStyle}>
                  {FENCE_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
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

            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 12 }}>
              <input type="checkbox" checked={guestSafe} onChange={(e) => setGuestSafe(e.target.checked)} />
              Guest-safe buffer required
            </label>

            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }} placeholder="Grazing notes, water access..." />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowModal(false); draw?.deleteAll(); }} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSave} disabled={!name.trim()} style={{ ...saveBtnStyle, background: name.trim() ? 'rgba(196,162,101,0.2)' : 'var(--color-panel-subtle)', color: name.trim() ? '#c4a265' : 'var(--color-panel-muted)', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
                Save Paddock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Styles
const labelStyle: React.CSSProperties = { fontSize: 11, color: 'var(--color-panel-muted)', display: 'block', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 12, background: 'var(--color-panel-subtle)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'var(--color-panel-text)', outline: 'none', fontFamily: 'inherit', marginBottom: 12 };
const cancelBtnStyle: React.CSSProperties = { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, background: 'transparent', color: 'var(--color-panel-muted)', cursor: 'pointer' };
const saveBtnStyle: React.CSSProperties = { flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, letterSpacing: '0.02em' };

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
