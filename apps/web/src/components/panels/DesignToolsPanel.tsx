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

  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);
  const addZone = useZoneStore((s) => s.addZone);
  const deleteZone = useZoneStore((s) => s.deleteZone);

  // Structure state
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(() => allStructures.filter((s) => s.projectId === projectId), [allStructures, projectId]);
  const addStructure = useStructureStore((s) => s.addStructure);
  const deleteStructure = useStructureStore((s) => s.deleteStructure);
  const placementMode = useStructureStore((s) => s.placementMode);
  const setPlacementMode = useStructureStore((s) => s.setPlacementMode);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [pendingStructureCenter, setPendingStructureCenter] = useState<[number, number] | null>(null);
  const [editingStructure, setEditingStructure] = useState<Structure | null>(null);
  const updateStructure = useStructureStore((s) => s.updateStructure);

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
      <div style={{ padding: 20 }}>
        <PanelTitle>Design Tools</PanelTitle>

        {/* Tab switcher */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 20 }}>
          {(['zones', 'structures', 'livestock', 'crops', 'paths', 'utilities'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 12px',
                fontSize: 11,
                fontWeight: activeTab === tab ? 600 : 400,
                background: activeTab === tab ? 'rgba(196, 162, 101, 0.12)' : 'transparent',
                border: activeTab === tab ? '1px solid rgba(196, 162, 101, 0.3)' : '1px solid rgba(196, 162, 101, 0.15)',
                borderRadius: 6,
                color: activeTab === tab ? '#c4a265' : 'var(--color-panel-muted)',
                cursor: 'pointer',
                textTransform: 'capitalize',
                letterSpacing: '0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'zones' && (
          <>
            {/* Zone type selector */}
            <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 10 }}>Select Zone Type</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              {(Object.entries(ZONE_CATEGORY_CONFIG) as [ZoneCategory, typeof ZONE_CATEGORY_CONFIG[ZoneCategory]][]).map(
                ([key, config]) => {
                  const isSelected = selectedCategory === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 10px',
                        background: isSelected ? `${config.color}15` : 'transparent',
                        border: isSelected ? `1px solid ${config.color}40` : '1px solid var(--color-panel-subtle)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        color: isSelected ? config.color : 'var(--color-panel-text)',
                        fontSize: 11,
                        textAlign: 'left',
                        transition: 'all 150ms ease',
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: config.color,
                          flexShrink: 0,
                          border: isSelected ? `2px solid ${config.color}` : '1px solid rgba(255,255,255,0.15)',
                          boxShadow: isSelected ? `0 0 6px ${config.color}40` : 'none',
                        }}
                      />
                      <span style={{ lineHeight: 1.2, fontWeight: isSelected ? 500 : 400 }}>{config.label}</span>
                      {isSelected && <span style={{ marginLeft: 'auto', fontSize: 10, color: config.color }}>✓</span>}
                    </button>
                  );
                },
              )}
            </div>

            {/* Draw button */}
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
                background: isDrawing ? 'var(--color-panel-subtle)' : 'rgba(196, 162, 101, 0.15)',
                color: isDrawing ? 'var(--color-panel-muted)' : '#c4a265',
                cursor: isDrawing ? 'wait' : 'pointer',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ fontSize: 16 }}>▢</span>
              {isDrawing ? 'Drawing... double-click to finish' : 'Draw Zone on Map'}
            </button>

            {/* Defined zones */}
            <SectionLabel>Defined Zones ({zones.length})</SectionLabel>
            {zones.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 16 }}>
                No zones drawn yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {zones.map((z) => (
                  <div
                    key={z.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      border: '1px solid var(--color-panel-card-border)',
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: z.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{z.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>
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
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-panel-muted)',
                        cursor: 'pointer',
                        fontSize: 14,
                        padding: '0 2px',
                      }}
                    >
                      ×
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
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 6 }}>
                    {catLabel}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
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
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '7px 8px',
                            background: isActive ? 'rgba(196, 162, 101, 0.12)' : 'transparent',
                            border: isActive ? '1px solid rgba(196, 162, 101, 0.3)' : '1px solid var(--color-panel-subtle)',
                            borderRadius: 6,
                            cursor: 'pointer',
                            color: isActive ? '#c4a265' : 'var(--color-panel-text)',
                            fontSize: 11,
                            textAlign: 'left',
                          }}
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
              <div
                style={{
                  padding: '10px 12px',
                  marginBottom: 14,
                  background: 'rgba(196, 162, 101, 0.08)',
                  border: '1px solid rgba(196, 162, 101, 0.2)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#c4a265',
                  textAlign: 'center',
                }}
              >
                Click on the map to place {STRUCTURE_TEMPLATES[placementMode].label}
              </div>
            )}

            {/* Placed structures list */}
            <SectionLabel>Placed Structures ({structures.length})</SectionLabel>
            {structures.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 16 }}>
                No structures placed yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {structures.map((s) => {
                  const tmpl = STRUCTURE_TEMPLATES[s.type];
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        border: '1px solid var(--color-panel-card-border)',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{tmpl?.icon ?? '\u{1F3E0}'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>
                          {tmpl?.label ?? s.type} {'\u2014'} {s.phase}
                          {s.costEstimate && ` \u2014 $${s.costEstimate.toLocaleString()}`}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStructure(s.id);
                          if (map) {
                            ['fill', 'line', 'label'].forEach((t) => {
                              const id = `structure-${t}-${s.id}`;
                              if (map.getLayer(id)) map.removeLayer(id);
                            });
                            if (map.getSource(`structure-${s.id}`)) map.removeSource(`structure-${s.id}`);
                          }
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-panel-muted)',
                          cursor: 'pointer',
                          fontSize: 14,
                          padding: '0 2px',
                        }}
                        title="Delete structure"
                      >
                        {'\u00D7'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStructure(s);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-panel-muted)',
                          cursor: 'pointer',
                          fontSize: 12,
                          padding: '0 2px',
                        }}
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
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={handleCancelModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 460, maxWidth: '90vw',
              background: 'var(--color-panel-bg)',
              border: '1px solid rgba(196, 162, 101, 0.15)',
              borderRadius: 14,
              padding: '28px 32px',
              color: 'var(--color-panel-text)',
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4, color: 'var(--color-panel-text)' }}>
              Name This Zone
            </h2>
            <p style={{ fontSize: 12, color: 'var(--color-panel-muted)', marginBottom: 20 }}>
              Define the type and purpose of this area
            </p>

            {/* Zone Name */}
            <label style={{ fontSize: 11, color: 'var(--color-panel-muted)', display: 'block', marginBottom: 4 }}>Zone Name *</label>
            <input
              type="text"
              value={modalName}
              onChange={(e) => setModalName(e.target.value)}
              placeholder="e.g. Pond one"
              autoFocus
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                background: 'var(--color-panel-subtle)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: 'var(--color-panel-text)',
                outline: 'none',
                fontFamily: 'inherit',
                marginBottom: 16,
              }}
            />

            {/* Zone Type */}
            <label style={{ fontSize: 11, color: 'var(--color-panel-muted)', display: 'block', marginBottom: 6 }}>Zone Type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 16 }}>
              {(Object.entries(ZONE_CATEGORY_CONFIG) as [ZoneCategory, typeof ZONE_CATEGORY_CONFIG[ZoneCategory]][]).map(
                ([key, config]) => {
                  const isSelected = modalCategory === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setModalCategory(key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 10px',
                        background: isSelected ? `${config.color}18` : 'transparent',
                        border: isSelected ? `1px solid ${config.color}40` : '1px solid var(--color-panel-subtle)',
                        borderRadius: 6,
                        cursor: 'pointer',
                        color: isSelected ? config.color : 'var(--color-panel-muted)',
                        fontSize: 11,
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, flexShrink: 0 }} />
                      <span>{config.label}</span>
                      {isSelected && <span style={{ marginLeft: 'auto', fontSize: 10, color: config.color }}>✓</span>}
                    </button>
                  );
                },
              )}
            </div>

            {/* Build Phase + Phase Color */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--color-panel-muted)', display: 'block', marginBottom: 4 }}>Build Phase</label>
                <select
                  value={modalPhase}
                  onChange={(e) => setModalPhase(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: 12,
                    background: 'var(--color-panel-subtle)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color: 'var(--color-panel-text)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <option value="Phase 1">Phase 1</option>
                  <option value="Phase 2">Phase 2</option>
                  <option value="Phase 3">Phase 3</option>
                  <option value="Phase 4">Phase 4</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--color-panel-muted)', display: 'block', marginBottom: 4 }}>Phase Color</label>
                <div
                  style={{
                    padding: '8px 10px',
                    fontSize: 12,
                    background: 'var(--color-panel-subtle)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: ZONE_CATEGORY_CONFIG[modalCategory].color,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: ZONE_CATEGORY_CONFIG[modalCategory].color,
                    }}
                  />
                  {ZONE_CATEGORY_CONFIG[modalCategory].label}
                </div>
              </div>
            </div>

            {/* Description */}
            <label style={{ fontSize: 11, color: 'var(--color-panel-muted)', display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              value={modalDescription}
              onChange={(e) => setModalDescription(e.target.value)}
              placeholder="Purpose and design notes..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 12,
                background: 'var(--color-panel-subtle)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 6,
                color: 'var(--color-panel-text)',
                outline: 'none',
                fontFamily: 'inherit',
                resize: 'vertical',
                marginBottom: 20,
              }}
            />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleCancelModal}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--color-panel-muted)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveZone}
                disabled={!modalName.trim()}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 8,
                  background: modalName.trim() ? 'rgba(196, 162, 101, 0.2)' : 'var(--color-panel-subtle)',
                  color: modalName.trim() ? '#c4a265' : 'var(--color-panel-muted)',
                  cursor: modalName.trim() ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.02em',
                }}
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

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 16 }}>
      {children}
    </h2>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
      {children}
    </h3>
  );
}

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
