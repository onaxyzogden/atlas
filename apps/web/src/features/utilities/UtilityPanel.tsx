/**
 * UtilityPanel — click-to-place utility points (solar, wells, tanks, etc.)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useUtilityStore, UTILITY_TYPE_CONFIG, type UtilityType, type Utility } from '../../store/utilityStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import type maplibregl from 'maplibre-gl';
import SolarPlacement from './SolarPlacement.js';
import WaterSystemPlanning from './WaterSystemPlanning.js';
import OffGridReadiness from './OffGridReadiness.js';
import InfrastructurePhasing from './InfrastructurePhasing.js';
import p from '../../styles/panel.module.css';
import s from './UtilityPanel.module.css';
import { earth, semantic, map as mapTokens } from '../../lib/tokens.js';

interface UtilityPanelProps {
  projectId: string;
  map: maplibregl.Map | null;
}

export default function UtilityPanel({ projectId, map }: UtilityPanelProps) {
  const allUtilities = useUtilityStore((st) => st.utilities);
  const utilities = useMemo(() => allUtilities.filter((u) => u.projectId === projectId), [allUtilities, projectId]);
  const addUtility = useUtilityStore((st) => st.addUtility);
  const deleteUtility = useUtilityStore((st) => st.deleteUtility);
  const placementMode = useUtilityStore((st) => st.placementMode);
  const setPlacementMode = useUtilityStore((st) => st.setPlacementMode);

  const [activeTab, setActiveTab] = useState<'place' | 'systems' | 'phasing'>('place');
  const [showModal, setShowModal] = useState(false);
  const [pendingCenter, setPendingCenter] = useState<[number, number] | null>(null);
  const [name, setName] = useState('');
  const [phase, setPhase] = useState('Phase 1');
  const [notes, setNotes] = useState('');

  // Site intelligence data for systems tab
  const siteData = useSiteData(projectId);
  const microclimate = useMemo(() => siteData ? getLayerSummary<{ sunTraps?: { areaPct?: number } }>(siteData, 'microclimate') : null, [siteData]);
  const watershed = useMemo(() => siteData ? getLayerSummary<{ detention_pct?: number }>(siteData, 'watershed_derived') : null, [siteData]);
  const soilRegen = useMemo(() => siteData ? getLayerSummary<{ interventions?: { count?: number } }>(siteData, 'soil_regeneration') : null, [siteData]);
  const sunTrapPct = microclimate?.sunTraps?.areaPct ?? null;
  const detentionPct = watershed?.detention_pct ?? null;
  const swaleCount = soilRegen?.interventions?.count ?? null;

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
      <div className={p.tabBar}>
        <button className={`${p.tabBtn} ${activeTab === 'place' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('place')}>Place</button>
        <button className={`${p.tabBtn} ${activeTab === 'systems' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('systems')}>Systems</button>
        <button className={`${p.tabBtn} ${activeTab === 'phasing' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('phasing')}>Phasing</button>
      </div>

      {activeTab === 'place' && (
        <>
          {categories.map((cat) => {
            const types = (Object.entries(UTILITY_TYPE_CONFIG) as [UtilityType, typeof UTILITY_TYPE_CONFIG[UtilityType]][])
              .filter(([, cfg]) => cfg.category === cat);
            return (
              <div key={cat} className={p.mb16}>
                <div className={`${p.text10} ${p.mb8}`} style={{ fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)' }}>
                  {cat}
                </div>
                <div className={p.selectorGrid2}>
                  {types.map(([key, cfg]) => {
                    const isActive = placementMode === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setPlacementMode(isActive ? null : key)}
                        className={p.selectorBtn}
                        style={{
                          background: isActive ? `${cfg.color}18` : undefined,
                          border: isActive ? `1px solid ${cfg.color}40` : undefined,
                          color: isActive ? cfg.color : 'var(--color-panel-text)',
                        }}
                      >
                        <span className={p.selectorIcon}>{cfg.icon}</span>
                        <span style={{ lineHeight: 1.2, fontWeight: isActive ? 500 : 400 }}>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {placementMode && (
            <div className={p.placementBanner}>
              Click on the map to place {UTILITY_TYPE_CONFIG[placementMode].label}
            </div>
          )}

          <div className={p.sectionLabel} style={{ marginBottom: 8 }}>
            Placed Utilities ({utilities.length})
          </div>
          {utilities.length === 0 ? (
            <div className={p.empty}>No utilities placed yet</div>
          ) : (
            <div className={p.section}>
              {utilities.map((u) => {
                const cfg = UTILITY_TYPE_CONFIG[u.type];
                return (
                  <div key={u.id} className={p.itemRow}>
                    <span className={p.text14}>{cfg?.icon}</span>
                    <div className={p.itemContent}>
                      <div className={p.itemTitle}>{u.name}</div>
                      <div className={p.itemMeta}>{cfg?.label} {'\u2014'} {u.phase}</div>
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
                      className={p.deleteBtn}
                    >{'\u00D7'}</button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'systems' && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SolarPlacement utilities={utilities} sunTrapAreaPct={sunTrapPct} />
          <WaterSystemPlanning utilities={utilities} detentionAreaPct={detentionPct} swaleCount={swaleCount} />
          <OffGridReadiness utilities={utilities} sunTrapAreaPct={sunTrapPct} detentionAreaPct={detentionPct} />
        </div>
      )}

      {activeTab === 'phasing' && (
        <div style={{ marginTop: 8 }}>
          <InfrastructurePhasing utilities={utilities} />
        </div>
      )}

      {/* Utility naming modal — stays outside tabs */}
      {showModal && placementMode && (
        <div className={p.modalOverlay}
          onClick={() => { setShowModal(false); setPlacementMode(null); }}>
          <div onClick={(e) => e.stopPropagation()} className={`${p.modalContent} ${p.modalContentSm}`}>
            <h2 className={p.modalTitle}>
              {UTILITY_TYPE_CONFIG[placementMode].icon} Place Utility
            </h2>
            <p className={p.modalSubtitle}>{UTILITY_TYPE_CONFIG[placementMode].label}</p>
            <label className={p.formLabel}>Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus className={p.formInput} />
            <label className={p.formLabel}>Phase</label>
            <select value={phase} onChange={(e) => setPhase(e.target.value)} className={p.formInput}>
              <option value="Phase 1">Phase 1</option><option value="Phase 2">Phase 2</option><option value="Phase 3">Phase 3</option><option value="Phase 4">Phase 4</option>
            </select>
            <label className={p.formLabel}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${p.formInput} ${p.formTextarea}`} />
            <div className={p.btnRow}>
              <button onClick={() => { setShowModal(false); setPlacementMode(null); }} className={p.cancelBtn}>Cancel</button>
              <button onClick={handleSave} disabled={!name.trim()} className={`${p.saveBtn} ${name.trim() ? p.saveBtnEnabled : p.saveBtnDisabled}`}>Place Utility</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function renderUtilityOnMap(map: maplibregl.Map, utility: Utility) {
  const sourceId = `utility-${utility.id}`;
  if (map.getSource(sourceId)) return;
  const cfg = UTILITY_TYPE_CONFIG[utility.type];
  map.addSource(sourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { name: utility.name }, geometry: { type: 'Point', coordinates: utility.center } }] },
  });
  map.addLayer({
    id: `utility-circle-${utility.id}`, type: 'circle', source: sourceId,
    paint: { 'circle-radius': 6, 'circle-color': cfg?.color ?? semantic.sidebarActive, 'circle-stroke-width': 2, 'circle-stroke-color': earth[100] },
  });
  map.addLayer({
    id: `utility-label-${utility.id}`, type: 'symbol', source: sourceId,
    layout: { 'text-field': utility.name, 'text-size': 10, 'text-offset': [0, 1.5], 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'top' },
    paint: { 'text-color': earth[100], 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
  });
}
