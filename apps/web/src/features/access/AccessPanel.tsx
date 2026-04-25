/**
 * AccessPanel — draw paths and roads with type classification.
 * Uses MapboxDraw in line mode for path drawing.
 * Sprint 7.3: Added analysis tab with access status, corridors, conflicts, slopes.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePathStore, PATH_TYPE_CONFIG, type PathType, type DesignPath } from '../../store/pathStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import AccessAnalysisCard from './AccessAnalysisCard.js';
import AccessibleRouteCard from './AccessibleRouteCard.js';
import AnimalCorridors from './AnimalCorridors.js';
import ArrivalSequence from './ArrivalSequence.js';
import RouteConflicts from './RouteConflicts.js';
import SlopeWarnings from './SlopeWarnings.js';
import WayfindingPlanCard from './WayfindingPlanCard.js';
import p from '../../styles/panel.module.css';
import s from './AccessPanel.module.css';
import { earth, map as mapTokens } from '../../lib/tokens.js';

interface AccessPanelProps {
  projectId: string;
  draw: MapboxDraw | null;
  map: maplibregl.Map | null;
}

export default function AccessPanel({ projectId, draw, map }: AccessPanelProps) {
  const allPaths = usePathStore((st) => st.paths);
  const paths = useMemo(() => allPaths.filter((pa) => pa.projectId === projectId), [allPaths, projectId]);
  const addPath = usePathStore((st) => st.addPath);
  const deletePath = usePathStore((st) => st.deletePath);

  // Analysis tab data
  const allZones = useZoneStore((st) => st.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);
  const project = useProjectStore((st) => st.projects.find((pr) => pr.id === projectId));
  const siteData = useSiteData(projectId);
  const terrainSummary = useMemo(
    () => siteData ? getLayerSummary<{ elevation_max?: number; elevation_min?: number; mean_slope_deg?: number }>(siteData, 'terrain_analysis') : null,
    [siteData],
  );
  const corridors = useMemo(() => paths.filter((pa) => pa.type === 'animal_corridor' || pa.type === 'grazing_route'), [paths]);
  const livestockZones = useMemo(() => zones.filter((z) => z.category === 'livestock'), [zones]);
  const waterZones = useMemo(() => zones.filter((z) => z.category === 'water_retention'), [zones]);
  const arrivalPaths = useMemo(() => paths.filter((pa) => pa.type === 'arrival_sequence'), [paths]);

  const [activeTab, setActiveTab] = useState<'draw' | 'analysis'>('draw');
  const [selectedType, setSelectedType] = useState<PathType>('main_road');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.LineString | null>(null);
  const [pendingLength, setPendingLength] = useState(0);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('Phase 1');
  const [notes, setNotes] = useState('');

  // a11y: Escape key dismisses the path-naming modal when open
  useEffect(() => {
    if (!showModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowModal(false); draw?.deleteAll(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showModal, draw]);

  const startDraw = useCallback(() => {
    if (!draw || !map) return;
    setIsDrawing(true);
    draw.changeMode('draw_line_string');

    const handleCreate = () => {
      const all = draw.getAll();
      const last = all.features[all.features.length - 1];
      if (last?.geometry.type === 'LineString') {
        setPendingGeometry(last.geometry as GeoJSON.LineString);
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
      <div className={p.tabBar}>
        <button className={`${p.tabBtn} ${activeTab === 'draw' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('draw')}>Draw</button>
        <button className={`${p.tabBtn} ${activeTab === 'analysis' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('analysis')}>Analysis</button>
      </div>

      {activeTab === 'draw' && (
        <>
          <div className={`${p.label} ${p.mb8}`}>Select Path Type</div>
          <div className={`${p.flexCol} ${p.mb16}`} style={{ gap: 4 }}>
            {(Object.entries(PATH_TYPE_CONFIG) as [PathType, typeof PATH_TYPE_CONFIG[PathType]][]).map(([key, cfg]) => {
              const isSelected = selectedType === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedType(key)}
                  className={p.selectorBtn}
                  style={{
                    padding: '7px 10px',
                    background: isSelected ? `${cfg.color}15` : undefined,
                    border: isSelected ? `1px solid ${cfg.color}40` : undefined,
                    color: isSelected ? cfg.color : undefined,
                  }}
                >
                  <span style={{ width: 20, height: 2, background: cfg.color, borderRadius: 1, flexShrink: 0, ...(cfg.dashArray.length > 0 ? { backgroundImage: `repeating-linear-gradient(90deg, ${cfg.color} 0px, ${cfg.color} ${cfg.dashArray[0]}px, transparent ${cfg.dashArray[0]}px, transparent ${(cfg.dashArray[0] ?? 0) + (cfg.dashArray[1] ?? 0)}px)`, background: 'none', height: cfg.width } : {}) }} />
                  <span style={{ fontWeight: isSelected ? 500 : 400 }}>{cfg.label}</span>
                  {isSelected && <span className={p.selectorCheck} style={{ color: cfg.color }}>{'\u2713'}</span>}
                </button>
              );
            })}
          </div>

          <button
            onClick={startDraw}
            disabled={isDrawing || !draw}
            className={`${p.drawBtn} ${isDrawing ? p.drawBtnDisabled : ''}`}
          >
            {isDrawing ? 'Drawing... double-click to finish' : `Draw ${PATH_TYPE_CONFIG[selectedType].label}`}
          </button>

          <div className={p.sectionLabel}>
            Paths ({paths.length})
          </div>
          {paths.length === 0 ? (
            <div className={p.empty}>No paths drawn yet</div>
          ) : (
            <div className={p.section}>
              {paths.map((pa) => {
                const cfg = PATH_TYPE_CONFIG[pa.type];
                return (
                  <div key={pa.id} className={p.itemRow}>
                    <span className={p.swatchLine} style={{ background: pa.color ?? cfg?.color }} />
                    <div className={p.itemContent}>
                      <div className={p.itemTitle}>{pa.name}</div>
                      <div className={p.itemMeta}>
                        {cfg?.label} {'\u2014'} {pa.lengthM > 1000 ? `${(pa.lengthM / 1000).toFixed(1)} km` : `${Math.round(pa.lengthM)} m`}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        deletePath(pa.id);
                        if (map) {
                          if (map.getLayer(`path-line-${pa.id}`)) map.removeLayer(`path-line-${pa.id}`);
                          if (map.getLayer(`path-label-${pa.id}`)) map.removeLayer(`path-label-${pa.id}`);
                          if (map.getSource(`path-${pa.id}`)) map.removeSource(`path-${pa.id}`);
                        }
                      }}
                      className={p.deleteBtn}
                    >{'\u00D7'}</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'analysis' && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AccessAnalysisCard paths={paths} />
          <AnimalCorridors corridors={corridors} livestockZones={livestockZones} waterZones={waterZones} />
          {project?.projectType && <ArrivalSequence arrivalPaths={arrivalPaths} projectType={project.projectType} />}
          <RouteConflicts paths={paths} zones={zones} />
          <SlopeWarnings paths={paths} terrainSummary={terrainSummary} />
          <AccessibleRouteCard paths={paths} terrainSummary={terrainSummary} />
          <WayfindingPlanCard projectId={projectId} />
        </div>
      )}

      {/* Path naming modal — always rendered when showModal is true */}
      {showModal && (
        /* a11y: backdrop click dismiss; Escape key handled in useEffect above */
        <div className={p.modalOverlay}
          role="presentation"
          onClick={() => { setShowModal(false); draw?.deleteAll(); }}>
          <div onClick={(e) => e.stopPropagation()} className={`${p.modalContent} ${p.modalContentMd}`} role="dialog" aria-modal="true">
            <h2 className={p.modalTitle}>Name This Path</h2>
            <p className={p.modalSubtitle}>
              {pendingLength > 1000 ? `${(pendingLength / 1000).toFixed(1)} km` : `${Math.round(pendingLength)} m`} {'\u2014'} {PATH_TYPE_CONFIG[selectedType].label}
            </p>
            <label className={p.formLabel}>Path Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus className={p.formInput} />
            <label className={p.formLabel}>Phase</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value)} className={p.formInput}>
              <option value="Phase 1">Phase 1</option><option value="Phase 2">Phase 2</option><option value="Phase 3">Phase 3</option><option value="Phase 4">Phase 4</option>
            </select>
            <label className={p.formLabel}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${p.formInput} ${p.formTextarea}`} placeholder="Surface type, width, access notes..." />
            <div className={p.btnRow}>
              <button onClick={() => { setShowModal(false); draw?.deleteAll(); }} className={p.cancelBtn}>Cancel</button>
              <button onClick={handleSave} disabled={!name.trim()} className={`${p.saveBtn} ${name.trim() ? p.saveBtnEnabled : p.saveBtnDisabled}`}>Save Path</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function renderPathOnMap(map: maplibregl.Map, path: DesignPath) {
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
  map.addLayer({ id: `path-line-${path.id}`, type: 'line', source: sourceId, paint: paintProps as maplibregl.LineLayerSpecification['paint'] });
  map.addLayer({
    id: `path-label-${path.id}`, type: 'symbol', source: sourceId,
    layout: { 'text-field': path.name, 'text-size': 10, 'symbol-placement': 'line', 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'] },
    paint: { 'text-color': earth[100], 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
  });
}
