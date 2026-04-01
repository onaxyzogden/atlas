/**
 * UtilityPanel — click-to-place utility points (solar, wells, tanks, etc.)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUtilityStore, UTILITY_TYPE_CONFIG, type UtilityType, type Utility } from '../../store/utilityStore.js';
import { mapboxgl } from '../../lib/mapbox.js';

interface UtilityPanelProps {
  projectId: string;
  map: mapboxgl.Map | null;
}

export default function UtilityPanel({ projectId, map }: UtilityPanelProps) {
  const allUtilities = useUtilityStore((s) => s.utilities);
  const utilities = useMemo(() => allUtilities.filter((u) => u.projectId === projectId), [allUtilities, projectId]);
  const addUtility = useUtilityStore((s) => s.addUtility);
  const deleteUtility = useUtilityStore((s) => s.deleteUtility);
  const placementMode = useUtilityStore((s) => s.placementMode);
  const setPlacementMode = useUtilityStore((s) => s.setPlacementMode);

  const [showModal, setShowModal] = useState(false);
  const [pendingCenter, setPendingCenter] = useState<[number, number] | null>(null);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('Phase 1');
  const [notes, setNotes] = useState('');

  // Click-to-place handler
  const handleMapClick = useCallback((e: { lngLat: { lng: number; lat: number } }) => {
    if (!placementMode) return;
    const cfg = UTILITY_TYPE_CONFIG[placementMode];
    setPendingCenter([e.lngLat.lng, e.lngLat.lat]);
    setName(cfg.label);
    setNotes('');
    setShowModal(true);
  }, [placementMode]);

  useEffect(() => {
    if (!map) return;
    map.off('click', handleMapClick);
    if (placementMode) {
      map.on('click', handleMapClick);
      map.getCanvas().style.cursor = 'crosshair';
    } else {
      map.getCanvas().style.cursor = '';
    }
    return () => {
      map.off('click', handleMapClick);
      map.getCanvas().style.cursor = '';
    };
  }, [map, placementMode, handleMapClick]);

  const handleSave = useCallback(() => {
    if (!pendingCenter || !placementMode || !name.trim()) return;
    const utility: Utility = {
      id: crypto.randomUUID(),
      projectId,
      name: name.trim(),
      type: placementMode,
      center: pendingCenter,
      phase,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addUtility(utility);
    if (map) renderUtilityOnMap(map, utility);
    setShowModal(false);
    setPendingCenter(null);
    setPlacementMode(null);
  }, [pendingCenter, placementMode, name, phase, notes, projectId, addUtility, map, setPlacementMode]);

  // Group by category
  const categories = ['Energy', 'Water', 'Infrastructure'] as const;

  return (
    <>
      {categories.map((cat) => {
        const types = (Object.entries(UTILITY_TYPE_CONFIG) as [UtilityType, typeof UTILITY_TYPE_CONFIG[UtilityType]][])
          .filter(([, cfg]) => cfg.category === cat);
        return (
          <div key={cat} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 6 }}>
              {cat}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
              {types.map(([key, cfg]) => {
                const isActive = placementMode === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPlacementMode(isActive ? null : key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 8px',
                      background: isActive ? `${cfg.color}18` : 'transparent',
                      border: isActive ? `1px solid ${cfg.color}40` : '1px solid var(--color-panel-subtle)',
                      borderRadius: 6, cursor: 'pointer',
                      color: isActive ? cfg.color : 'var(--color-panel-text)',
                      fontSize: 11, textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                    <span style={{ lineHeight: 1.2, fontWeight: isActive ? 500 : 400 }}>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {placementMode && (
        <div style={{ padding: '10px 12px', marginBottom: 14, background: 'rgba(196,162,101,0.08)', border: '1px solid rgba(196,162,101,0.2)', borderRadius: 8, fontSize: 12, color: '#c4a265', textAlign: 'center' }}>
          Click on the map to place {UTILITY_TYPE_CONFIG[placementMode].label}
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
        Placed Utilities ({utilities.length})
      </div>
      {utilities.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 16 }}>No utilities placed yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {utilities.map((u) => {
            const cfg = UTILITY_TYPE_CONFIG[u.type];
            return (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--color-panel-card-border)', borderRadius: 8 }}>
                <span style={{ fontSize: 14 }}>{cfg?.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>{cfg?.label} {'\u2014'} {u.phase}</div>
                </div>
                <button
                  onClick={() => {
                    deleteUtility(u.id);
                    if (map) {
                      if (map.getLayer(`utility-circle-${u.id}`)) map.removeLayer(`utility-circle-${u.id}`);
                      if (map.getLayer(`utility-label-${u.id}`)) map.removeLayer(`utility-label-${u.id}`);
                      if (map.getSource(`utility-${u.id}`)) map.removeSource(`utility-${u.id}`);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 14 }}
                >{'\u00D7'}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Utility naming modal */}
      {showModal && placementMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowModal(false); setPlacementMode(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 380, background: 'var(--color-panel-bg)', border: '1px solid rgba(196,162,101,0.15)', borderRadius: 14, padding: '28px 32px', color: 'var(--color-panel-text)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              {UTILITY_TYPE_CONFIG[placementMode].icon} Place Utility
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-panel-muted)', marginBottom: 16 }}>{UTILITY_TYPE_CONFIG[placementMode].label}</p>
            <label style={labelStyle}>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={inputStyle} />
            <label style={labelStyle}>Phase</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value)} style={inputStyle}>
              <option value="Phase 1">Phase 1</option><option value="Phase 2">Phase 2</option><option value="Phase 3">Phase 3</option><option value="Phase 4">Phase 4</option>
            </select>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowModal(false); setPlacementMode(null); }} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSave} disabled={!name.trim()} style={{ ...saveBtnStyle, background: name.trim() ? 'rgba(196,162,101,0.2)' : 'var(--color-panel-subtle)', color: name.trim() ? '#c4a265' : 'var(--color-panel-muted)', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>Place Utility</button>
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

function renderUtilityOnMap(map: mapboxgl.Map, utility: Utility) {
  const sourceId = `utility-${utility.id}`;
  if (map.getSource(sourceId)) return;
  const cfg = UTILITY_TYPE_CONFIG[utility.type];
  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: utility.name }, geometry: { type: 'Point', coordinates: utility.center } }] },
  });
  map.addLayer({
    id: `utility-circle-${utility.id}`, type: 'circle', source: sourceId,
    paint: { 'circle-radius': 6, 'circle-color': cfg?.color ?? '#c4a265', 'circle-stroke-width': 2, 'circle-stroke-color': '#f2ede3' },
  });
  map.addLayer({
    id: `utility-label-${utility.id}`, type: 'symbol', source: sourceId,
    layout: { 'text-field': utility.name, 'text-size': 10, 'text-offset': [0, 1.5], 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'top' },
    paint: { 'text-color': '#f2ede3', 'text-halo-color': 'rgba(26,22,17,0.8)', 'text-halo-width': 1.5 },
  });
}
