/**
 * DesignToolsPanel — zones and structures design tools.
 * After drawing a zone, a modal appears for naming, type selection,
 * build phase, and description. Zone type grid highlights in each
 * category's own color.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type ZoneCategory,
  type LandZone,
} from '../../store/zoneStore.js';
import {
  useStructureStore,
  type StructureType,
  type Structure,
} from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES, createFootprintPolygon } from '../../features/structures/footprints.js';
import StructurePropertiesModal from '../../features/structures/StructurePropertiesModal.js';
import LivestockPanel from '../../features/livestock/LivestockPanel.js';
import CropPanel from '../../features/crops/CropPanel.js';
import AccessPanel from '../../features/access/AccessPanel.js';
import UtilityPanel from '../../features/utilities/UtilityPanel.js';
import p from '../../styles/panel.module.css';
import s from './DesignToolsPanel.module.css';

interface DesignToolsPanelProps {
  projectId: string;
  draw: MapboxDraw | null;
  map: mapboxgl.Map | null;
}

type Tab = 'zones' | 'structures' | 'livestock' | 'crops' | 'paths' | 'utilities';

export default function DesignToolsPanel({ projectId, draw, map }: DesignToolsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('zones');
  const [selectedCategory, setSelectedCategory] = useState<ZoneCategory>('habitation');
  const [isDrawing, setIsDrawing] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [pendingArea, setPendingArea] = useState(0);
  const [modalName, setModalName] = useState('');
  const [modalCategory, setModalCategory] = useState<ZoneCategory>('habitation');
  const [modalPhase, setModalPhase] = useState('Phase 1');
  const [modalDescription, setModalDescription] = useState('');

  const allZones = useZoneStore((zs) => zs.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);
  const addZone = useZoneStore((zs) => zs.addZone);
  const deleteZone = useZoneStore((zs) => zs.deleteZone);

  // Structure state
  const allStructures = useStructureStore((ss) => ss.structures);
  const structures = useMemo(() => allStructures.filter((st) => st.projectId === projectId), [allStructures, projectId]);
  const addStructure = useStructureStore((ss) => ss.addStructure);
  const deleteStructure = useStructureStore((ss) => ss.deleteStructure);
  const placementMode = useStructureStore((ss) => ss.placementMode);
  const setPlacementMode = useStructureStore((ss) => ss.setPlacementMode);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [pendingStructureCenter, setPendingStructureCenter] = useState<[number, number] | null>(null);
  const [editingStructure, setEditingStructure] = useState<Structure | null>(null);
  const updateStructure = useStructureStore((ss) => ss.updateStructure);

  // Click-to-place handler for structures
  const handleMapClick = useCallback((e: { lngLat: { lng: number; lat: number } }) => {
    if (!placementMode) return;
    setPendingStructureCenter([e.lngLat.lng, e.lngLat.lat]);
    setShowStructureModal(true);
  }, [placementMode]);

  // Attach/detach map click handler when placement mode changes
  useMemo(() => {
    if (!map) return;
    // Remove previous handler
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

  const startDraw = useCallback(() => {
    if (!draw || !map) return;
    setIsDrawing(true);
    draw.changeMode('draw_polygon');

    const handleCreate = () => {
      const all = draw.getAll();
      const lastFeature = all.features[all.features.length - 1];
      if (lastFeature?.geometry.type === 'Polygon') {
        setPendingGeometry(lastFeature.geometry as GeoJSON.Polygon);
        // Compute area
        try {
          import('@turf/turf').then((turf) => {
            setPendingArea(turf.area(lastFeature as GeoJSON.Feature<GeoJSON.Polygon>));
          }).catch(() => {});
        } catch { /* */ }
        setModalCategory(selectedCategory);
        setModalName('');
        setModalPhase('Phase 1');
        setModalDescription('');
        setShowModal(true);
      }
      setIsDrawing(false);
      map.off('draw.create', handleCreate);
    };

    map.on('draw.create', handleCreate);
  }, [draw, map, selectedCategory]);

  const handleSaveZone = useCallback(() => {
    if (!pendingGeometry || !modalName.trim()) return;

    const config = ZONE_CATEGORY_CONFIG[modalCategory];
    const zone: LandZone = {
      id: crypto.randomUUID(),
      projectId,
      name: modalName.trim(),
      category: modalCategory,
      color: config.color,
      primaryUse: modalPhase,
      secondaryUse: '',
      notes: modalDescription,
      geometry: pendingGeometry,
      areaM2: pendingArea,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addZone(zone);
    if (map) renderZoneOnMap(map, zone);
    draw?.deleteAll();

    setShowModal(false);
    setPendingGeometry(null);
  }, [pendingGeometry, modalName, modalCategory, modalPhase, modalDescription, pendingArea, projectId, addZone, map, draw]);

  const handleCancelModal = useCallback(() => {
    setShowModal(false);
    setPendingGeometry(null);
    draw?.deleteAll();
  }, [draw]);

  return (
    <>
      <div className={p.container}>
        <h2 className={p.title}>Design Tools</h2>

        {/* Tab switcher */}
        <div className={s.tabRow}>
          {(['zones', 'structures', 'livestock', 'crops', 'paths', 'utilities'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${s.tabBtn} ${activeTab === tab ? s.tabBtnActive : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'zones' && (
          <>
            {/* Zone type selector */}
            <div className={p.label} style={{ marginBottom: 10 }}>Select Zone Type</div>
            <div className={s.zoneGrid}>
              {(Object.entries(ZONE_CATEGORY_CONFIG) as [ZoneCategory, typeof ZONE_CATEGORY_CONFIG[ZoneCategory]][]).map(
                ([key, config]) => {
                  const isSelected = selectedCategory === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={s.zoneTypeBtn}
                      style={{
                        background: isSelected ? `${config.color}15` : undefined,
                        borderColor: isSelected ? `${config.color}40` : undefined,
                        color: isSelected ? config.color : undefined,
                      }}
                    >
                      <span
                        className={`${s.zoneTypeDot} ${isSelected ? s.zoneTypeDotActive : ''}`}
                        style={{
                          background: config.color,
                          borderColor: isSelected ? config.color : undefined,
                          boxShadow: isSelected ? `0 0 6px ${config.color}40` : 'none',
                        }}
                      />
                      <span style={{ lineHeight: 1.2, fontWeight: isSelected ? 500 : 400 }}>{config.label}</span>
                      {isSelected && <span className={s.zoneTypeCheck} style={{ color: config.color }}>{'\u2713'}</span>}
                    </button>
                  );
                },
              )}
            </div>

            {/* Draw button */}
            <button
              onClick={startDraw}
              disabled={isDrawing || !draw}
              className={`${s.drawBtn} ${isDrawing ? s.drawBtnDisabled : ''}`}
            >
              <span style={{ fontSize: 16 }}>{'\u25A2'}</span>
              {isDrawing ? 'Drawing... double-click to finish' : 'Draw Zone on Map'}
            </button>

            {/* Defined zones */}
            <h3 className={p.sectionLabel}>Defined Zones ({zones.length})</h3>
            {zones.length === 0 ? (
              <div className={p.empty}>
                No zones drawn yet
              </div>
            ) : (
              <div className={p.section}>
                {zones.map((z) => (
                  <div key={z.id} className={s.itemCard}>
                    <span className={p.colorSwatch} style={{ background: z.color }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={s.itemName}>{z.name}</div>
                      <div className={s.itemMeta}>
                        {ZONE_CATEGORY_CONFIG[z.category].label}
                        {z.areaM2 > 0 && ` \u2014 ${formatArea(z.areaM2)}`}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        deleteZone(z.id);
                        if (map) {
                          ['fill', 'line', 'label'].forEach((t) => {
                            const id = `zone-${t}-${z.id}`;
                            if (map.getLayer(id)) map.removeLayer(id);
                          });
                          if (map.getSource(`zone-${z.id}`)) map.removeSource(`zone-${z.id}`);
                        }
                      }}
                      className={s.deleteBtn}
                    >
                      {'\u00D7'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'structures' && (
          <>
            {/* Structure type categories */}
            {(['dwelling', 'agricultural', 'spiritual', 'gathering', 'utility', 'infrastructure'] as const).map((cat) => {
              const types = (Object.entries(STRUCTURE_TEMPLATES) as [StructureType, typeof STRUCTURE_TEMPLATES[StructureType]][])
                .filter(([, t]) => t.category === cat);
              if (types.length === 0) return null;
              const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
              return (
                <div key={cat} style={{ marginBottom: 14 }}>
                  <div className={s.structCatLabel}>
                    {catLabel}
                  </div>
                  <div className={s.structGrid}>
                    {types.map(([key, tmpl]) => {
                      const isActive = placementMode === key;
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            if (isActive) {
                              setPlacementMode(null);
                            } else {
                              setPlacementMode(key);
                            }
                          }}
                          className={`${s.structBtn} ${isActive ? s.structBtnActive : ''}`}
                        >
                          <span style={{ fontSize: 13 }}>{tmpl.icon}</span>
                          <span style={{ lineHeight: 1.2, fontWeight: isActive ? 500 : 400 }}>{tmpl.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Placement mode indicator */}
            {placementMode && (
              <div className={s.placementIndicator}>
                Click on the map to place {STRUCTURE_TEMPLATES[placementMode].label}
              </div>
            )}

            {/* Placed structures list */}
            <h3 className={p.sectionLabel}>Placed Structures ({structures.length})</h3>
            {structures.length === 0 ? (
              <div className={p.empty}>
                No structures placed yet
              </div>
            ) : (
              <div className={p.section}>
                {structures.map((st) => {
                  const tmpl = STRUCTURE_TEMPLATES[st.type];
                  return (
                    <div key={st.id} className={s.itemCard}>
                      <span style={{ fontSize: 14 }}>{tmpl?.icon ?? '\u{1F3E0}'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={s.itemName}>{st.name}</div>
                        <div className={s.itemMeta}>
                          {tmpl?.label ?? st.type} {'\u2014'} {st.phase}
                          {st.costEstimate && ` \u2014 $${st.costEstimate.toLocaleString()}`}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStructure(st.id);
                          if (map) {
                            ['fill', 'line', 'label'].forEach((t) => {
                              const id = `structure-${t}-${st.id}`;
                              if (map.getLayer(id)) map.removeLayer(id);
                            });
                            if (map.getSource(`structure-${st.id}`)) map.removeSource(`structure-${st.id}`);
                          }
                        }}
                        className={s.deleteBtn}
                        title="Delete structure"
                      >
                        {'\u00D7'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStructure(st);
                        }}
                        className={s.editBtn}
                        title="Edit structure"
                      >
                        {'\u270E'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'livestock' && (
          <LivestockPanel projectId={projectId} draw={draw} map={map} />
        )}

        {activeTab === 'crops' && (
          <CropPanel projectId={projectId} draw={draw} map={map} />
        )}

        {activeTab === 'paths' && (
          <AccessPanel projectId={projectId} draw={draw} map={map} />
        )}

        {activeTab === 'utilities' && (
          <UtilityPanel projectId={projectId} map={map} />
        )}
      </div>

      {/* ── Structure Properties Modal (new placement) ──────────── */}
      {showStructureModal && placementMode && pendingStructureCenter && (
        <StructurePropertiesModal
          mode="new"
          structureType={placementMode}
          onSave={({ name, phase, notes: n, widthM, depthM, rotationDeg }) => {
            const tmpl = STRUCTURE_TEMPLATES[placementMode];
            const geometry = createFootprintPolygon(pendingStructureCenter, widthM, depthM, rotationDeg);
            const structure: Structure = {
              id: crypto.randomUUID(),
              projectId,
              name,
              type: placementMode,
              center: pendingStructureCenter,
              geometry,
              rotationDeg,
              widthM,
              depthM,
              phase,
              costEstimate: Math.round((tmpl.costRange[0] + tmpl.costRange[1]) / 2),
              infrastructureReqs: tmpl.infrastructureReqs,
              notes: n,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            addStructure(structure);
            if (map) renderStructureOnMap(map, structure);
            setShowStructureModal(false);
            setPendingStructureCenter(null);
            setPlacementMode(null);
          }}
          onCancel={() => {
            setShowStructureModal(false);
            setPendingStructureCenter(null);
          }}
        />
      )}

      {/* ── Structure Edit Modal ──────────────────────────────────── */}
      {editingStructure && (
        <StructurePropertiesModal
          mode="edit"
          structure={editingStructure}
          onSave={({ name, phase, notes: n, widthM, depthM, rotationDeg }) => {
            const newGeometry = createFootprintPolygon(editingStructure.center, widthM, depthM, rotationDeg);
            updateStructure(editingStructure.id, { name, phase, notes: n, widthM, depthM, rotationDeg, geometry: newGeometry });

            // Update map layer
            if (map) {
              const sourceId = `structure-${editingStructure.id}`;
              const src = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
              if (src) {
                src.setData({
                  type: 'FeatureCollection',
                  features: [{ type: 'Feature', properties: { name }, geometry: newGeometry }],
                });
              }
            }
            setEditingStructure(null);
          }}
          onCancel={() => setEditingStructure(null)}
        />
      )}

      {/* ── Zone Naming Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className={s.modalOverlay} onClick={handleCancelModal}>
          <div onClick={(e) => e.stopPropagation()} className={s.modalBox}>
            <h2 className={s.modalTitle}>
              Name This Zone
            </h2>
            <p className={s.modalSubtitle}>
              Define the type and purpose of this area
            </p>

            {/* Zone Name */}
            <label className={s.modalLabel}>Zone Name *</label>
            <input
              type="text"
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              placeholder="e.g. Pond one"
              autoFocus
              className={s.modalInput}
            />

            {/* Zone Type */}
            <label className={s.modalLabel} style={{ marginBottom: 6 }}>Zone Type</label>
            <div className={s.zoneGrid} style={{ marginBottom: 16 }}>
              {(Object.entries(ZONE_CATEGORY_CONFIG) as [ZoneCategory, typeof ZONE_CATEGORY_CONFIG[ZoneCategory]][]).map(
                ([key, config]) => {
                  const isSelected = modalCategory === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setModalCategory(key)}
                      className={s.zoneTypeBtn}
                      style={{
                        background: isSelected ? `${config.color}18` : undefined,
                        borderColor: isSelected ? `${config.color}40` : undefined,
                        color: isSelected ? config.color : 'var(--color-panel-muted)',
                      }}
                    >
                      <span className={s.zoneTypeDot} style={{ background: config.color }} />
                      <span>{config.label}</span>
                      {isSelected && <span className={s.zoneTypeCheck} style={{ color: config.color }}>{'\u2713'}</span>}
                    </button>
                  );
                },
              )}
            </div>

            {/* Build Phase + Phase Color */}
            <div className={s.modalPhaseRow}>
              <div style={{ flex: 1 }}>
                <label className={s.modalLabel}>Build Phase</label>
                <select
                  value={modalPhase}
                  onChange={(e) => setModalPhase(e.target.value)}
                  className={s.modalSelect}
                >
                  <option value="Phase 1">Phase 1</option>
                  <option value="Phase 2">Phase 2</option>
                  <option value="Phase 3">Phase 3</option>
                  <option value="Phase 4">Phase 4</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className={s.modalLabel}>Phase Color</label>
                <div
                  className={s.modalPhaseColor}
                  style={{ color: ZONE_CATEGORY_CONFIG[modalCategory].color }}
                >
                  <span
                    className={s.modalPhaseColorDot}
                    style={{ background: ZONE_CATEGORY_CONFIG[modalCategory].color }}
                  />
                  {ZONE_CATEGORY_CONFIG[modalCategory].label}
                </div>
              </div>
            </div>

            {/* Description */}
            <label className={s.modalLabel}>Description</label>
            <textarea
              value={modalDescription}
              onChange={(e) => setModalDescription(e.target.value)}
              placeholder="Purpose and design notes..."
              rows={3}
              className={s.modalTextarea}
            />

            {/* Buttons */}
            <div className={s.modalBtnRow}>
              <button onClick={handleCancelModal} className={s.modalCancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleSaveZone}
                disabled={!modalName.trim()}
                className={`${s.modalSaveBtn} ${!modalName.trim() ? s.modalSaveBtnDisabled : ''}`}
              >
                Save Zone
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatArea(m2: number): string {
  if (m2 > 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${m2.toFixed(0)} m\u00B2`;
}

function renderStructureOnMap(map: mapboxgl.Map, structure: Structure) {
  const sourceId = `structure-${structure.id}`;
  if (map.getSource(sourceId)) return;

  const tmpl = STRUCTURE_TEMPLATES[structure.type];
  const color = tmpl?.category === 'spiritual' ? '#6B5B8A'
    : tmpl?.category === 'dwelling' ? '#8B6E4E'
    : tmpl?.category === 'agricultural' ? '#4A7C3F'
    : tmpl?.category === 'gathering' ? '#c4a265'
    : tmpl?.category === 'utility' ? '#4A6B8A'
    : '#6B6B6B';

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { name: structure.name, type: structure.type },
        geometry: structure.geometry,
      }],
    },
  });

  map.addLayer({ id: `structure-fill-${structure.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.45 } });
  map.addLayer({ id: `structure-line-${structure.id}`, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': 2 } });
  map.addLayer({
    id: `structure-label-${structure.id}`,
    type: 'symbol',
    source: sourceId,
    layout: { 'text-field': structure.name, 'text-size': 10, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
    paint: { 'text-color': '#f2ede3', 'text-halo-color': 'rgba(26,22,17,0.8)', 'text-halo-width': 1.5 },
  });
}

function renderZoneOnMap(map: mapboxgl.Map, zone: LandZone) {
  const sourceId = `zone-${zone.id}`;
  if (map.getSource(sourceId)) return;

  map.addSource(sourceId, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { name: zone.name, category: zone.category },
        geometry: zone.geometry,
      }],
    },
  });

  map.addLayer({ id: `zone-fill-${zone.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': zone.color, 'fill-opacity': 0.25 } });
  map.addLayer({ id: `zone-line-${zone.id}`, type: 'line', source: sourceId, paint: { 'line-color': zone.color, 'line-width': 2 } });
  map.addLayer({
    id: `zone-label-${zone.id}`,
    type: 'symbol',
    source: sourceId,
    layout: { 'text-field': zone.name, 'text-size': 11, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
    paint: { 'text-color': '#f2ede3', 'text-halo-color': 'rgba(26,22,17,0.8)', 'text-halo-width': 1.5 },
  });
}
