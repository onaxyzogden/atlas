/**
 * AccessPanel — draw paths and roads with type classification.
 * Uses MapboxDraw in line mode for path drawing.
 */

import { useState, useCallback, useMemo } from 'react';
import { usePathStore, PATH_TYPE_CONFIG, type PathType, type DesignPath } from '../../store/pathStore.js';

interface AccessPanelProps {
  projectId: string;
  draw: MapboxDraw | null;
  map: mapboxgl.Map | null;
}

export default function AccessPanel({ projectId, draw, map }: AccessPanelProps) {
  const allPaths = usePathStore((s) => s.paths);
  const paths = useMemo(() => allPaths.filter((p) => p.projectId === projectId), [allPaths, projectId]);
  const addPath = usePathStore((s) => s.addPath);
  const deletePath = usePathStore((s) => s.deletePath);

  const [selectedType, setSelectedType] = useState<PathType>('main_road');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.LineString | null>(null);
  const [pendingLength, setPendingLength] = useState(0);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('Phase 1');
  const [notes, setNotes] = useState('');

  const startDraw = useCallback(() => {
    if (!draw || !map) return;
    setIsDrawing(true);
    draw.changeMode('draw_line_string');

    const handleCreate = () => {
      const all = draw.getAll();
      const last = all.features[all.features.length - 1];
      if (last?.geometry.type === 'LineString') {
        setPendingGeometry(last.geometry as GeoJSON.LineString);
        // Approximate length
        const coords = (last.geometry as GeoJSON.LineString).coordinates;
        let len = 0;
        for (let i = 1; i < coords.length; i++) {
          const [x1, y1] = coords[i - 1]!;
          const [x2, y2] = coords[i]!;
          const dx = (x2! - x1!) * 111320 * Math.cos(((y1! + y2!) / 2) * Math.PI / 180);
          const dy = (y2! - y1!) * 111320;
          len += Math.sqrt(dx * dx + dy * dy);
        }
        setPendingLength(len);
        const cfg = PATH_TYPE_CONFIG[selectedType];
        setName(cfg.label);
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
    const cfg = PATH_TYPE_CONFIG[selectedType];
    const path: DesignPath = {
      id: crypto.randomUUID(),
      projectId,
      name: name.trim(),
      type: selectedType,
      color: cfg.color,
      geometry: pendingGeometry,
      lengthM: pendingLength,
      phase,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addPath(path);
    if (map) renderPathOnMap(map, path);
    draw?.deleteAll();
    setShowModal(false);
    setPendingGeometry(null);
  }, [pendingGeometry, name, selectedType, pendingLength, phase, notes, projectId, addPath, map, draw]);

  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 8 }}>Select Path Type</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        {(Object.entries(PATH_TYPE_CONFIG) as [PathType, typeof PATH_TYPE_CONFIG[PathType]][]).map(([key, cfg]) => {
          const isSelected = selectedType === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedType(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px',
                background: isSelected ? `${cfg.color}15` : 'transparent',
                border: isSelected ? `1px solid ${cfg.color}40` : '1px solid var(--color-panel-subtle)',
                borderRadius: 6, cursor: 'pointer',
                color: isSelected ? cfg.color : 'var(--color-panel-muted)',
                fontSize: 11, textAlign: 'left',
              }}
            >
              <span style={{ width: 20, height: 2, background: cfg.color, borderRadius: 1, flexShrink: 0, ...(cfg.dashArray.length > 0 ? { backgroundImage: `repeating-linear-gradient(90deg, ${cfg.color} 0px, ${cfg.color} ${cfg.dashArray[0]}px, transparent ${cfg.dashArray[0]}px, transparent ${(cfg.dashArray[0] ?? 0) + (cfg.dashArray[1] ?? 0)}px)`, background: 'none', height: cfg.width } : {}) }} />
              <span style={{ fontWeight: isSelected ? 500 : 400 }}>{cfg.label}</span>
              {isSelected && <span style={{ marginLeft: 'auto', fontSize: 10, color: cfg.color }}>{'\u2713'}</span>}
            </button>
          );
        })}
      </div>

      <button
        onClick={startDraw}
        disabled={isDrawing || !draw}
        style={{
          width: '100%', padding: '12px 16px', fontSize: 13, fontWeight: 600,
          border: 'none', borderRadius: 8,
          background: isDrawing ? 'var(--color-panel-subtle)' : 'rgba(196,162,101,0.15)',
          color: isDrawing ? 'var(--color-panel-muted)' : '#c4a265',
          cursor: isDrawing ? 'wait' : 'pointer',
          marginBottom: 16, letterSpacing: '0.02em',
        }}
      >
        {isDrawing ? 'Drawing... double-click to finish' : `Draw ${PATH_TYPE_CONFIG[selectedType].label}`}
      </button>

      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
        Paths ({paths.length})
      </div>
      {paths.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 16 }}>No paths drawn yet</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {paths.map((p) => {
            const cfg = PATH_TYPE_CONFIG[p.type];
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--color-panel-card-border)', borderRadius: 8 }}>
                <span style={{ width: 14, height: 3, background: p.color ?? cfg?.color, borderRadius: 1, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{p.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>
                    {cfg?.label} {'\u2014'} {p.lengthM > 1000 ? `${(p.lengthM / 1000).toFixed(1)} km` : `${Math.round(p.lengthM)} m`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    deletePath(p.id);
                    if (map) {
                      if (map.getLayer(`path-line-${p.id}`)) map.removeLayer(`path-line-${p.id}`);
                      if (map.getLayer(`path-label-${p.id}`)) map.removeLayer(`path-label-${p.id}`);
                      if (map.getSource(`path-${p.id}`)) map.removeSource(`path-${p.id}`);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 14 }}
                >{'\u00D7'}</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Path naming modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setShowModal(false); draw?.deleteAll(); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 400, background: 'var(--color-panel-bg)', border: '1px solid rgba(196,162,101,0.15)', borderRadius: 14, padding: '28px 32px', color: 'var(--color-panel-text)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Name This Path</h2>
            <p style={{ fontSize: 12, color: 'var(--color-panel-muted)', marginBottom: 16 }}>
              {pendingLength > 1000 ? `${(pendingLength / 1000).toFixed(1)} km` : `${Math.round(pendingLength)} m`} {'\u2014'} {PATH_TYPE_CONFIG[selectedType].label}
            </p>
            <label style={labelStyle}>Path Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={inputStyle} />
            <label style={labelStyle}>Phase</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value)} style={inputStyle}>
              <option value="Phase 1">Phase 1</option><option value="Phase 2">Phase 2</option><option value="Phase 3">Phase 3</option><option value="Phase 4">Phase 4</option>
            </select>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 16 }} placeholder="Surface type, width, access notes..." />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setShowModal(false); draw?.deleteAll(); }} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleSave} disabled={!name.trim()} style={{ ...saveBtnStyle, background: name.trim() ? 'rgba(196,162,101,0.2)' : 'var(--color-panel-subtle)', color: name.trim() ? '#c4a265' : 'var(--color-panel-muted)', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>Save Path</button>
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

function renderPathOnMap(map: mapboxgl.Map, path: DesignPath) {
  const sourceId = `path-${path.id}`;
  if (map.getSource(sourceId)) return;
  const cfg = PATH_TYPE_CONFIG[path.type];
  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: path.name }, geometry: path.geometry }] },
  });
  const paintProps: Record<string, unknown> = {
    'line-color': path.color ?? cfg.color,
    'line-width': cfg.width,
  };
  if (cfg.dashArray.length > 0) {
    paintProps['line-dasharray'] = cfg.dashArray;
  }
  map.addLayer({ id: `path-line-${path.id}`, type: 'line', source: sourceId, paint: paintProps as mapboxgl.LinePaint });
  map.addLayer({
    id: `path-label-${path.id}`, type: 'symbol', source: sourceId,
    layout: { 'text-field': path.name, 'text-size': 10, 'symbol-placement': 'line', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'] },
    paint: { 'text-color': '#f2ede3', 'text-halo-color': 'rgba(26,22,17,0.8)', 'text-halo-width': 1.5 },
  });
}
