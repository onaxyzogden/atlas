/**
 * TemplatePanel — browse and apply project templates.
 * Built-in templates for common property types + custom user templates.
 */

import { useState } from 'react';
import { BUILT_IN_TEMPLATES, useTemplateStore, type ProjectTemplate, type ZoneTemplate, type StructureTemplate } from '../../store/templateStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore, type ZoneCategory } from '../../store/zoneStore.js';
import { useStructureStore, type Structure } from '../../store/structureStore.js';
import TemplateMarketplace from './TemplateMarketplace.js';
import p from '../../styles/panel.module.css';

interface TemplatePanelProps {
  project: LocalProject;
}

export default function TemplatePanel({ project }: TemplatePanelProps) {
  const customTemplates = useTemplateStore((s) => s.customTemplates);
  const allTemplates = [...BUILT_IN_TEMPLATES, ...customTemplates];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'library' | 'marketplace'>('library');
  const selected = allTemplates.find((t) => t.id === selectedId);

  return (
    <div className={p.container}>
      <h2 className={p.title} style={{ marginBottom: 6 }}>
        Design Templates
      </h2>
      {/* Tab switcher */}
      <div className={p.tabBar}>
        {(['library', 'marketplace'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`${p.tabBtn} ${tab === t ? p.tabBtnActive : ''}`}>
            {t === 'library' ? 'Library' : 'Marketplace'}
          </button>
        ))}
      </div>

      {tab === 'marketplace' && <TemplateMarketplace />}

      {tab === 'library' && (
      <>
      <p className={p.subtitle}>
        Start from proven frameworks. Templates provide pre-configured zones, structures, and phasing plans.
      </p>

      {/* Template list */}
      {!selected && (
        <div className={`${p.section} ${p.sectionGapLg}`}>
          {allTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => setSelectedId(tmpl.id)}
              className={p.card}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', cursor: 'pointer', width: '100%', color: 'var(--color-panel-text)' }}
            >
              <span className={p.text22} style={{ flexShrink: 0, lineHeight: 1 }}>{tmpl.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={`${p.text13} ${p.fontMedium} ${p.mb4}`}>
                  {tmpl.name}
                  {tmpl.category === 'moontrance' && (
                    <span className={p.badge} style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(196,162,101,0.15)', color: '#c4a265', marginLeft: 6 }}>OGDEN</span>
                  )}
                </div>
                <div className={`${p.text10} ${p.muted} ${p.leading14}`}>{tmpl.description}</div>
                <div className={`${p.row} ${p.text10} ${p.muted}`} style={{ gap: 8, marginTop: 6 }}>
                  <span>{tmpl.zones.length} zones</span>
                  <span>{tmpl.structures.length} structures</span>
                  <span>${tmpl.costEstimateRange[0]}K–${tmpl.costEstimateRange[1]}K</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Template detail */}
      {selected && (
        <div>
          <button
            onClick={() => setSelectedId(null)}
            className={`${p.textBtn} ${p.mb12}`}
          >
            {'<'} Back to templates
          </button>

          <div className={`${p.row} ${p.mb12}`} style={{ gap: 10 }}>
            <span className={p.text28}>{selected.icon}</span>
            <div>
              <h3 className={`${p.textLg} ${p.fontSemibold}`} style={{ color: 'var(--color-panel-text)', margin: 0 }}>{selected.name}</h3>
              <p className={`${p.text11} ${p.muted} ${p.leading14}`} style={{ margin: 0 }}>{selected.description}</p>
            </div>
          </div>

          {/* Cost estimate */}
          <div className={`${p.card} ${p.mb16}`} style={{ border: '1px solid rgba(196,162,101,0.2)' }}>
            <div className={`${p.text10} ${p.muted}`}>Estimated Investment</div>
            <div className={`${p.textXl} ${p.fontBold}`} style={{ color: '#c4a265' }}>${selected.costEstimateRange[0]}K–${selected.costEstimateRange[1]}K</div>
          </div>

          {/* Zones */}
          <h3 className={p.sectionLabel}>Zone Layout ({selected.zones.length})</h3>
          <div className={`${p.section} ${p.sectionGapSm} ${p.mb16}`}>
            {selected.zones.map((z, i) => (
              <div key={i} className={`${p.cardCompact} ${p.cardRow}`} style={{ background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)', fontSize: 11 }}>
                <span className={p.colorSwatch} style={{ background: z.color }} />
                <span style={{ flex: 1, color: 'var(--color-panel-text)', fontWeight: 500 }}>{z.name}</span>
                <span className={`${p.text10} ${p.muted}`}>{z.areaPercent}%</span>
              </div>
            ))}
          </div>

          {/* Phases */}
          <h3 className={p.sectionLabel}>Phasing Plan</h3>
          <div className={`${p.section} ${p.sectionGapLg} ${p.mb16}`}>
            {selected.phases.map((phase, i) => (
              <div key={i} className={p.card}>
                <div className={`${p.rowBetween} ${p.mb4}`}>
                  <span className={`${p.text12} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)' }}>{phase.name}</span>
                  <span className={p.text10} style={{ color: '#c4a265' }}>Year {phase.yearRange}</span>
                </div>
                <div className={`${p.text10} ${p.muted} ${p.mutedItalic} ${p.leading14} ${p.mb8}`}>
                  "{phase.description}"
                </div>
                <div className={p.flexCol} style={{ gap: 2 }}>
                  {phase.features.map((f, fi) => (
                    <div key={fi} className={`${p.text10} ${p.muted}`} style={{ paddingLeft: 8 }}>
                      <span style={{ color: '#c4a265', marginRight: 4 }}>{'\u25CF'}</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Apply button */}
          <button
            className={`${p.drawBtn}`}
            style={{ background: 'rgba(196,162,101,0.15)', color: '#c4a265' }}
            onClick={() => {
              const count = applyTemplate(selected, project);
              alert(`Template "${selected.name}" applied: ${count.zones} zones and ${count.structures} structures created.`);
            }}
          >
            Apply Template to {project.name}
          </button>

          <div className={`${p.text10} ${p.muted} ${p.textCenter} ${p.leading14} ${p.mt8}`}>
            Applying a template will suggest zone placements based on your property boundary. You can adjust everything afterward.
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

// ── Template Application Logic ────────────────────────────────────────────

const CATEGORY_MAP: Record<string, ZoneCategory> = {
  habitation: 'habitation',
  food_forest: 'food_production',
  food_production: 'food_production',
  livestock: 'livestock',
  commons: 'commons',
  prayer: 'spiritual',
  spiritual: 'spiritual',
  guest: 'retreat',
  retreat: 'retreat',
  education: 'education',
  forest_regen: 'conservation',
  conservation: 'conservation',
  water_retention: 'water_retention',
  service: 'infrastructure',
  infrastructure: 'infrastructure',
  access: 'access',
  buffer: 'buffer',
};

function mapCategory(templateCat: string): ZoneCategory {
  return CATEGORY_MAP[templateCat] ?? 'commons';
}

function computeBoundaryCenter(project: LocalProject): { center: [number, number]; spanLng: number; spanLat: number } | null {
  if (!project.parcelBoundaryGeojson?.features?.[0]?.geometry) return null;
  try {
    const coords = (project.parcelBoundaryGeojson.features[0].geometry as GeoJSON.Polygon).coordinates[0];
    if (!coords || coords.length < 3) return null;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (const pos of coords) {
      const lng = pos[0]!, lat = pos[1]!;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    return {
      center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
      spanLng: maxLng - minLng,
      spanLat: maxLat - minLat,
    };
  } catch { return null; }
}

function makeRect(cx: number, cy: number, w: number, h: number): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [[[cx - w / 2, cy + h / 2], [cx + w / 2, cy + h / 2], [cx + w / 2, cy - h / 2], [cx - w / 2, cy - h / 2], [cx - w / 2, cy + h / 2]]],
  };
}

function applyTemplate(template: ProjectTemplate, project: LocalProject): { zones: number; structures: number } {
  const addZone = useZoneStore.getState().addZone;
  const addStructure = useStructureStore.getState().addStructure;
  const now = new Date().toISOString();

  const bounds = computeBoundaryCenter(project);
  const cx = bounds?.center[0] ?? -79.8;
  const cy = bounds?.center[1] ?? 43.5;
  const spanLng = bounds?.spanLng ?? 0.01;
  const spanLat = bounds?.spanLat ?? 0.008;

  // Layout zones in a grid within the property bounds
  const cols = Math.ceil(Math.sqrt(template.zones.length));
  const rows = Math.ceil(template.zones.length / cols);
  const cellW = spanLng * 0.85 / cols;
  const cellH = spanLat * 0.85 / rows;
  const startX = cx - (spanLng * 0.85) / 2 + cellW / 2;
  const startY = cy + (spanLat * 0.85) / 2 - cellH / 2;

  let zonesCreated = 0;
  template.zones.forEach((zt, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const zCx = startX + col * cellW;
    const zCy = startY - row * cellH;
    const category = mapCategory(zt.category);
    const acreage = project.acreage ?? 40;
    const areaM2 = (acreage * 4046.86) * (zt.areaPercent / 100);

    addZone({
      id: crypto.randomUUID(),
      projectId: project.id,
      name: zt.name,
      category,
      color: zt.color,
      primaryUse: zt.primaryUse,
      secondaryUse: '',
      notes: `From template: ${template.name}`,
      geometry: makeRect(zCx, zCy, cellW * 0.9, cellH * 0.9),
      areaM2,
      createdAt: now,
      updatedAt: now,
    });
    zonesCreated++;
  });

  // Place structures near center
  let structsCreated = 0;
  template.structures.forEach((st, i) => {
    const angle = (i / template.structures.length) * Math.PI * 2;
    const radius = spanLng * 0.15;
    const sCx = cx + Math.cos(angle) * radius;
    const sCy = cy + Math.sin(angle) * radius * (spanLat / spanLng);

    addStructure({
      id: crypto.randomUUID(),
      projectId: project.id,
      name: st.name,
      type: st.type as Structure['type'],
      center: [sCx, sCy],
      widthM: 8,
      depthM: 6,
      rotationDeg: 0,
      phase: st.phase,
      costEstimate: null,
      infrastructureReqs: [],
      notes: `From template: ${template.name}`,
      geometry: makeRect(sCx, sCy, 0.00008, 0.00006),
      createdAt: now,
      updatedAt: now,
    });
    structsCreated++;
  });

  return { zones: zonesCreated, structures: structsCreated };
}
