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
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 6 }}>
        Design Templates
      </h2>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(196,162,101,0.2)' }}>
        {(['library', 'marketplace'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '9px 0', fontSize: 11, fontWeight: tab === t ? 600 : 400,
            background: tab === t ? 'rgba(196,162,101,0.12)' : 'transparent',
            border: 'none', color: tab === t ? '#c4a265' : 'var(--color-panel-muted)',
            cursor: 'pointer', textTransform: 'capitalize',
          }}>{t === 'library' ? 'Library' : 'Marketplace'}</button>
        ))}
      </div>

      {tab === 'marketplace' && <TemplateMarketplace />}

      {tab === 'library' && (
      <>
      <p style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 16, lineHeight: 1.5 }}>
        Start from proven frameworks. Templates provide pre-configured zones, structures, and phasing plans.
      </p>

      {/* Template list */}
      {!selected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {allTemplates.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => setSelectedId(tmpl.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px', borderRadius: 8, textAlign: 'left',
                background: 'var(--color-panel-card)',
                border: '1px solid var(--color-panel-card-border)',
                cursor: 'pointer', color: 'var(--color-panel-text)',
                width: '100%',
              }}
            >
              <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{tmpl.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                  {tmpl.name}
                  {tmpl.category === 'moontrance' && (
                    <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(196,162,101,0.15)', color: '#c4a265', marginLeft: 6 }}>OGDEN</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', lineHeight: 1.4 }}>{tmpl.description}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 10, color: 'var(--color-panel-muted)' }}>
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
            style={{ background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 11, padding: 0, marginBottom: 12 }}
          >
            {'<'} Back to templates
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>{selected.icon}</span>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-panel-text)', margin: 0 }}>{selected.name}</h3>
              <p style={{ fontSize: 11, color: 'var(--color-panel-muted)', margin: 0, lineHeight: 1.4 }}>{selected.description}</p>
            </div>
          </div>

          {/* Cost estimate */}
          <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(196,162,101,0.2)', background: 'var(--color-panel-card)', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>Estimated Investment</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#c4a265' }}>${selected.costEstimateRange[0]}K–${selected.costEstimateRange[1]}K</div>
          </div>

          {/* Zones */}
          <SectionLabel>Zone Layout ({selected.zones.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
            {selected.zones.map((z, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)', fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: z.color, flexShrink: 0 }} />
                <span style={{ flex: 1, color: 'var(--color-panel-text)', fontWeight: 500 }}>{z.name}</span>
                <span style={{ color: 'var(--color-panel-muted)', fontSize: 10 }}>{z.areaPercent}%</span>
              </div>
            ))}
          </div>

          {/* Phases */}
          <SectionLabel>Phasing Plan</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {selected.phases.map((phase, i) => (
              <div key={i} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{phase.name}</span>
                  <span style={{ fontSize: 10, color: '#c4a265' }}>Year {phase.yearRange}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', fontStyle: 'italic', marginBottom: 6, lineHeight: 1.4 }}>
                  "{phase.description}"
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {phase.features.map((f, fi) => (
                    <div key={fi} style={{ fontSize: 10, color: 'var(--color-panel-muted)', paddingLeft: 8 }}>
                      <span style={{ color: '#c4a265', marginRight: 4 }}>{'\u25CF'}</span> {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Apply button */}
          <button
            style={{
              width: '100%', padding: '12px', fontSize: 13, fontWeight: 600,
              border: 'none', borderRadius: 8,
              background: 'rgba(196,162,101,0.15)', color: '#c4a265',
              cursor: 'pointer',
            }}
            onClick={() => {
              const count = applyTemplate(selected, project);
              alert(`Template "${selected.name}" applied: ${count.zones} zones and ${count.structures} structures created.`);
            }}
          >
            Apply Template to {project.name}
          </button>

          <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', textAlign: 'center', marginTop: 8, lineHeight: 1.4 }}>
            Applying a template will suggest zone placements based on your property boundary. You can adjust everything afterward.
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
      {children}
    </h3>
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
