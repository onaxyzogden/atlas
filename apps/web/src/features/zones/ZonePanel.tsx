/**
 * ZonePanel — draw, name, and manage custom land-use zones + analysis intelligence.
 *
 * Tab 1 "Zones": draw polygons, name/categorize, list zones
 * Tab 2 "Analysis": sizing calculator, conflict detection, allocation, auto-suggest
 */

import type maplibregl from 'maplibre-gl';
import { useState, useCallback, useMemo } from 'react';
import * as turf from '@turf/turf';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  INVASIVE_PRESSURE_LABELS,
  INVASIVE_PRESSURE_COLORS,
  SUCCESSION_STAGE_LABELS,
  SUCCESSION_STAGE_COLORS,
  SEASONALITY_LABELS,
  SEASONALITY_COLORS,
  type ZoneCategory,
  type LandZone,
  type InvasivePressure,
  type SuccessionStage,
  type Seasonality,
} from '../../store/zoneStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import { computeAssessmentScores } from '../../lib/computeScores.js';
import { PanelLoader } from '../../components/ui/PanelLoader.js';
import ZoneSizingCalculator from './ZoneSizingCalculator.js';
import ZoneConflictDetector from './ZoneConflictDetector.js';
import ZoneSiteSuitabilityCard from './ZoneSiteSuitabilityCard.js';
import ZoneAllocationSummary from './ZoneAllocationSummary.js';
import ProgramCoverageCard from './ProgramCoverageCard.js';
import ZoneAllocationSummaryReportCard from './ZoneAllocationSummaryReportCard.js';
import ZoneAllocationBalanceCard from './ZoneAllocationBalanceCard.js';
import ServiceExpansionPreservationCard from './ServiceExpansionPreservationCard.js';
import ZoneAutoSuggest from './ZoneAutoSuggest.js';
import ZoneSuggestionAuditCard from './ZoneSuggestionAuditCard.js';
import { earth, map as mapTokens } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';
import s from './ZonePanel.module.css';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';

interface ZonePanelProps {
  projectId: string;
  draw?: MapboxDraw | null;
  map?: maplibregl.Map | null;
  isMapReady?: boolean;
  canEdit?: boolean;
}

type ZoneTab = 'zones' | 'analysis';

export default function ZonePanel({ projectId, draw, map, isMapReady = true, canEdit = true }: ZonePanelProps) {
  const allZones = useZoneStore((st) => st.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === projectId), [allZones, projectId]);
  const addZone = useZoneStore((st) => st.addZone);
  const updateZone = useZoneStore((st) => st.updateZone);
  const deleteZone = useZoneStore((st) => st.deleteZone);

  const project = useProjectStore((st) => st.projects.find((pr) => pr.id === projectId));
  const siteData = useSiteData(projectId);

  const scores = useMemo(() => {
    if (!siteData || siteData.status !== 'complete') return null;
    return computeAssessmentScores(siteData.layers, project?.acreage ?? null);
  }, [siteData, project?.acreage]);

  const existingCategories = useMemo(
    () => new Set(zones.map((z) => z.category)),
    [zones],
  );

  const [activeTab, setActiveTab] = useState<ZoneTab>('zones');
  const [isDrawing, setIsDrawing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingGeometry, setPendingGeometry] = useState<GeoJSON.Polygon | null>(null);
  const [pendingArea, setPendingArea] = useState(0);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ZoneCategory>('commons');
  const [formPrimaryUse, setFormPrimaryUse] = useState('');
  const [formSecondaryUse, setFormSecondaryUse] = useState('');
  const [formNotes, setFormNotes] = useState('');
  // Ecological-condition tags (§7 invasive-succession-mapping).
  // Blank string = "no opinion yet" — stored as null on the zone so the
  // dashboard rollup can count untagged zones separately.
  const [formInvasivePressure, setFormInvasivePressure] = useState<InvasivePressure | ''>('');
  const [formSuccessionStage, setFormSuccessionStage] = useState<SuccessionStage | ''>('');
  // §8 seasonal-temporary-phased-use-zones — when this zone is in active
  // use during the year. Blank = "not set" (stored as null).
  const [formSeasonality, setFormSeasonality] = useState<Seasonality | ''>('');

  // Inline per-zone ecology-condition editor: which zone id is currently
  // expanded, or null when nothing is open.
  const [editingId, setEditingId] = useState<string | null>(null);

  const startDraw = useCallback(() => {
    if (!draw || !map) return;
    setIsDrawing(true);
    draw.changeMode('draw_polygon');

    const handleCreate = () => {
      const all = draw.getAll();
      const lastFeature = all.features[all.features.length - 1];
      if (lastFeature?.geometry.type === 'Polygon') {
        const areaM2 = turf.area(lastFeature as GeoJSON.Feature<GeoJSON.Polygon>);
        setPendingGeometry(lastFeature.geometry as GeoJSON.Polygon);
        setPendingArea(areaM2);
        setIsDrawing(false);
        setShowForm(true);
      }
      map.off('draw.create', handleCreate);
    };

    map.on('draw.create', handleCreate);
  }, [draw, map]);

  const handleSaveZone = useCallback(() => {
    if (!pendingGeometry || !formName.trim()) return;

    const zone: LandZone = {
      id: crypto.randomUUID(),
      projectId,
      name: formName,
      category: formCategory,
      color: ZONE_CATEGORY_CONFIG[formCategory].color,
      primaryUse: formPrimaryUse,
      secondaryUse: formSecondaryUse,
      notes: formNotes,
      geometry: pendingGeometry,
      areaM2: pendingArea,
      invasivePressure: formInvasivePressure === '' ? null : formInvasivePressure,
      successionStage: formSuccessionStage === '' ? null : formSuccessionStage,
      seasonality: formSeasonality === '' ? null : formSeasonality,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addZone(zone);
    if (map && isMapReady) renderZoneOnMap(map, zone);

    setShowForm(false);
    setPendingGeometry(null);
    setFormName('');
    setFormPrimaryUse('');
    setFormSecondaryUse('');
    setFormNotes('');
    setFormInvasivePressure('');
    setFormSuccessionStage('');
    setFormSeasonality('');
    draw?.deleteAll();
  }, [
    pendingGeometry, pendingArea, formName, formCategory,
    formPrimaryUse, formSecondaryUse, formNotes,
    formInvasivePressure, formSuccessionStage, formSeasonality,
    projectId, addZone, map, isMapReady, draw,
  ]);

  const handleDeleteZone = useCallback(
    (zoneId: string) => {
      deleteZone(zoneId);
      if (map) {
        if (map.getLayer(`zone-fill-${zoneId}`)) map.removeLayer(`zone-fill-${zoneId}`);
        if (map.getLayer(`zone-line-${zoneId}`)) map.removeLayer(`zone-line-${zoneId}`);
        if (map.getLayer(`zone-label-${zoneId}`)) map.removeLayer(`zone-label-${zoneId}`);
        if (map.getSource(`zone-${zoneId}`)) map.removeSource(`zone-${zoneId}`);
      }
    },
    [deleteZone, map],
  );

  if (!isMapReady) return <PanelLoader label="Waiting for map..." />;

  return (
    <div className={p.container}>
      <h2 className={p.title}>Land Use Zoning</h2>

      {/* Tab bar */}
      <div className={p.tabBar}>
        <button
          onClick={() => setActiveTab('zones')}
          className={`${p.tabBtn} ${activeTab === 'zones' ? p.tabBtnActive : ''}`}
        >
          Zones ({zones.length})
        </button>
        <button
          onClick={() => setActiveTab('analysis')}
          className={`${p.tabBtn} ${activeTab === 'analysis' ? p.tabBtnActive : ''}`}
        >
          Analysis
        </button>
      </div>

      {/* ── Tab: Zones (Draw + List) ────────────────────────────── */}
      {activeTab === 'zones' && (
        <div style={{ marginTop: 8 }}>
          {/* Draw button */}
          {!showForm && draw && (
            <DelayedTooltip label="Editing requires Designer or Owner role" disabled={canEdit}>
            <button
              onClick={canEdit ? startDraw : undefined}
              disabled={isDrawing || !canEdit}
              className={s.drawBtn}
              style={!canEdit ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
              {isDrawing ? 'Drawing\u2026 double-click to finish' : '+ Draw New Zone'}
            </button>
            </DelayedTooltip>
          )}

          {/* Zone creation form */}
          {showForm && (
            <div className={s.formCard}>
              <div className={s.formTitle}>
                New Zone \u2014 {formatArea(pendingArea)}
              </div>
              <div className={s.formFields}>
                <input
                  type="text"
                  placeholder="Zone name *"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={p.input}
                  autoFocus
                />
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ZoneCategory)}
                  className={`${p.input} ${s.selectInput}`}
                >
                  {Object.entries(ZONE_CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.icon} {cfg.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Primary use"
                  value={formPrimaryUse}
                  onChange={(e) => setFormPrimaryUse(e.target.value)}
                  className={p.input}
                />
                <input
                  type="text"
                  placeholder="Secondary use"
                  value={formSecondaryUse}
                  onChange={(e) => setFormSecondaryUse(e.target.value)}
                  className={p.input}
                />
                <textarea
                  placeholder="Notes"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={2}
                  className={`${p.input} ${s.textareaInput}`}
                />
                {/* §7 invasive-succession tags — optional, steward can
                    leave blank and tag later via the inline edit row. */}
                <select
                  value={formInvasivePressure}
                  onChange={(e) => setFormInvasivePressure((e.target.value as InvasivePressure | ''))}
                  className={`${p.input} ${s.selectInput}`}
                  aria-label="Invasive pressure"
                >
                  <option value="">Invasive pressure — not set</option>
                  {(Object.keys(INVASIVE_PRESSURE_LABELS) as InvasivePressure[]).map((k) => (
                    <option key={k} value={k}>Invasive pressure: {INVASIVE_PRESSURE_LABELS[k]}</option>
                  ))}
                </select>
                <select
                  value={formSuccessionStage}
                  onChange={(e) => setFormSuccessionStage((e.target.value as SuccessionStage | ''))}
                  className={`${p.input} ${s.selectInput}`}
                  aria-label="Succession stage"
                >
                  <option value="">Succession stage — not set</option>
                  {(Object.keys(SUCCESSION_STAGE_LABELS) as SuccessionStage[]).map((k) => (
                    <option key={k} value={k}>Succession: {SUCCESSION_STAGE_LABELS[k]}</option>
                  ))}
                </select>
                {/* §8 seasonal-temporary-phased-use-zones — when this zone
                    is in active use during the year. */}
                <select
                  value={formSeasonality}
                  onChange={(e) => setFormSeasonality((e.target.value as Seasonality | ''))}
                  className={`${p.input} ${s.selectInput}`}
                  aria-label="Seasonal use"
                >
                  <option value="">Seasonal use — not set</option>
                  {(Object.keys(SEASONALITY_LABELS) as Seasonality[]).map((k) => (
                    <option key={k} value={k}>Use: {SEASONALITY_LABELS[k]}</option>
                  ))}
                </select>
                <div className={s.formActions}>
                  <button
                    onClick={handleSaveZone}
                    disabled={!formName.trim()}
                    className={`${s.saveBtn} ${formName.trim() ? s.saveBtnEnabled : s.saveBtnDisabled}`}
                  >
                    Save Zone
                  </button>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setPendingGeometry(null);
                      draw?.deleteAll();
                    }}
                    className={s.cancelBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Zone list */}
          {zones.length > 0 && (
            <div className={s.zoneList}>
              {zones.map((z) => (
                <div key={z.id} className={s.zoneRow}>
                  <div className={s.zoneItem}>
                    <span className={s.zoneSwatch} style={{ background: z.color }} />
                    <div className={s.zoneInfo}>
                      <div className={s.zoneName}>{z.name}</div>
                      <div className={s.zoneMeta}>
                        {ZONE_CATEGORY_CONFIG[z.category].label} \u2014 {formatArea(z.areaM2)}
                      </div>
                      {(z.invasivePressure || z.successionStage || z.seasonality) && (
                        <div className={s.zoneChips}>
                          {z.invasivePressure && (
                            <span
                              className={s.zoneChip}
                              style={{
                                borderColor: INVASIVE_PRESSURE_COLORS[z.invasivePressure],
                                color: INVASIVE_PRESSURE_COLORS[z.invasivePressure],
                              }}
                              title="Invasive pressure"
                            >
                              Inv: {INVASIVE_PRESSURE_LABELS[z.invasivePressure]}
                            </span>
                          )}
                          {z.successionStage && (
                            <span
                              className={s.zoneChip}
                              style={{
                                borderColor: SUCCESSION_STAGE_COLORS[z.successionStage],
                                color: SUCCESSION_STAGE_COLORS[z.successionStage],
                              }}
                              title="Succession stage"
                            >
                              {SUCCESSION_STAGE_LABELS[z.successionStage]}
                            </span>
                          )}
                          {z.seasonality && (
                            <span
                              className={s.zoneChip}
                              style={{
                                borderColor: SEASONALITY_COLORS[z.seasonality],
                                color: SEASONALITY_COLORS[z.seasonality],
                              }}
                              title="Seasonal / phased use"
                            >
                              {SEASONALITY_LABELS[z.seasonality]}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <DelayedTooltip label={!canEdit ? 'Editing requires Designer or Owner role' : 'Tag ecological condition'}>
                      <button
                        onClick={canEdit ? () => setEditingId(editingId === z.id ? null : z.id) : undefined}
                        disabled={!canEdit}
                        className={s.editBtn}
                        style={!canEdit ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                        aria-label={`Edit ecological condition for ${z.name}`}
                        aria-expanded={editingId === z.id}
                      >
                        Tag
                      </button>
                    </DelayedTooltip>
                    <DelayedTooltip label={!canEdit ? 'Deleting requires Designer or Owner role' : 'Delete zone'}>
                    <button
                      onClick={canEdit ? () => handleDeleteZone(z.id) : undefined}
                      disabled={!canEdit}
                      className={s.deleteBtn}
                      style={!canEdit ? { opacity: 0.3, cursor: 'not-allowed' } : undefined}
                    >
                      \u00D7
                    </button>
                    </DelayedTooltip>
                  </div>

                  {/* Inline edit disclosure: lets stewards tag invasive
                      pressure + succession stage on existing zones without
                      a separate drawer. Scope deliberately narrow — name /
                      category / use fields stay immutable here. */}
                  {editingId === z.id && (
                    <div className={s.editRow}>
                      <label className={s.editLabel}>Invasive pressure</label>
                      <select
                        value={z.invasivePressure ?? ''}
                        onChange={(e) => {
                          const v = e.target.value as InvasivePressure | '';
                          updateZone(z.id, { invasivePressure: v === '' ? null : v });
                        }}
                        className={`${p.input} ${s.selectInput}`}
                      >
                        <option value="">Not set</option>
                        {(Object.keys(INVASIVE_PRESSURE_LABELS) as InvasivePressure[]).map((k) => (
                          <option key={k} value={k}>{INVASIVE_PRESSURE_LABELS[k]}</option>
                        ))}
                      </select>
                      <label className={s.editLabel}>Succession stage</label>
                      <select
                        value={z.successionStage ?? ''}
                        onChange={(e) => {
                          const v = e.target.value as SuccessionStage | '';
                          updateZone(z.id, { successionStage: v === '' ? null : v });
                        }}
                        className={`${p.input} ${s.selectInput}`}
                      >
                        <option value="">Not set</option>
                        {(Object.keys(SUCCESSION_STAGE_LABELS) as SuccessionStage[]).map((k) => (
                          <option key={k} value={k}>{SUCCESSION_STAGE_LABELS[k]}</option>
                        ))}
                      </select>
                      <label className={s.editLabel}>Seasonal use</label>
                      <select
                        value={z.seasonality ?? ''}
                        onChange={(e) => {
                          const v = e.target.value as Seasonality | '';
                          updateZone(z.id, { seasonality: v === '' ? null : v });
                        }}
                        className={`${p.input} ${s.selectInput}`}
                      >
                        <option value="">Not set</option>
                        {(Object.keys(SEASONALITY_LABELS) as Seasonality[]).map((k) => (
                          <option key={k} value={k}>{SEASONALITY_LABELS[k]}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className={s.editDoneBtn}
                      >
                        Done
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {zones.length === 0 && !showForm && (
            <div className={s.emptyState}>
              No zones yet. Draw one to start organizing the land.
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Analysis ───────────────────────────────────────── */}
      {activeTab === 'analysis' && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <ZoneAllocationSummary zones={zones} totalAcreage={project?.acreage ?? null} />
          {/* §8 Habitation/food/livestock/commons four-quadrant coverage */}
          <ProgramCoverageCard projectId={projectId} zones={zones} />
          <ZoneAllocationSummaryReportCard
            zones={zones}
            totalAcreage={project?.acreage ?? null}
            projectName={project?.name ?? null}
          />
          <ZoneAllocationBalanceCard
            zones={zones}
            totalAcreage={project?.acreage ?? null}
            projectType={project?.projectType ?? null}
          />
          <ServiceExpansionPreservationCard
            zones={zones}
            totalAcreage={project?.acreage ?? null}
          />
          <ZoneSizingCalculator zones={zones} totalAcreage={project?.acreage ?? null} />
          <ZoneConflictDetector zones={zones} siteData={siteData} />
          <ZoneSiteSuitabilityCard zones={zones} siteData={siteData} />
          <ZoneAutoSuggest scores={scores} siteData={siteData} existingCategories={existingCategories} />
          <ZoneSuggestionAuditCard projectId={projectId} scores={scores} existingCategories={existingCategories} />
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatArea(m2: number): string {
  if (m2 > 10000) {
    return `${(m2 / 10000).toFixed(2)} ha (${(m2 / 4046.86).toFixed(2)} ac)`;
  }
  return `${m2.toFixed(0)} m\u00B2`;
}

function renderZoneOnMap(map: maplibregl.Map, zone: LandZone) {
  const sourceId = `zone-${zone.id}`;
  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { name: zone.name, category: zone.category },
      geometry: zone.geometry,
    }],
  };
  if (map.getSource(sourceId)) return;
  map.addSource(sourceId, { type: 'geojson', data: geojson });
  map.addLayer({ id: `zone-fill-${zone.id}`, type: 'fill', source: sourceId, paint: { 'fill-color': zone.color, 'fill-opacity': 0.25 } });
  map.addLayer({ id: `zone-line-${zone.id}`, type: 'line', source: sourceId, paint: { 'line-color': zone.color, 'line-width': 2 } });
  map.addLayer({
    id: `zone-label-${zone.id}`,
    type: 'symbol',
    source: sourceId,
    layout: { 'text-field': zone.name, 'text-size': 11, 'text-font': ['DIN Pro Medium', 'Arial Unicode MS Regular'], 'text-anchor': 'center' },
    paint: { 'text-color': earth[100], 'text-halo-color': mapTokens.labelHalo, 'text-halo-width': 1.5 },
  });
}
