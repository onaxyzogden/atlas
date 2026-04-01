/**
 * DecisionSupportPanel — feasibility summary, constraint checklist,
 * missing info checklist, good fit / poor fit summaries.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import RulesPanel from '../rules/RulesPanel.js';

interface DecisionSupportPanelProps {
  project: LocalProject;
}

export default function DecisionSupportPanel({ project }: DecisionSupportPanelProps) {
  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === project.id);
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === project.id);
  const paddocks = useLivestockStore((s) => s.paddocks).filter((p) => p.projectId === project.id);
  const crops = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === project.id);
  const paths = usePathStore((s) => s.paths).filter((p) => p.projectId === project.id);
  const utilities = useUtilityStore((s) => s.utilities).filter((u) => u.projectId === project.id);

  // Compute total estimated cost
  const totalCost = useMemo(() => {
    return structures.reduce((sum, s) => sum + (s.costEstimate ?? 0), 0);
  }, [structures]);

  // Feasibility checklist
  const checklist = useMemo(() => {
    const items: { label: string; status: 'pass' | 'warn' | 'fail' | 'unknown'; note: string }[] = [];

    // Boundary
    items.push({
      label: 'Property boundary defined',
      status: project.hasParcelBoundary ? 'pass' : 'fail',
      note: project.hasParcelBoundary ? 'Boundary set' : 'Draw or import a boundary first',
    });

    // Water
    const hasWell = utilities.some((u) => u.type === 'well_pump');
    const hasWaterTank = utilities.some((u) => u.type === 'water_tank');
    items.push({
      label: 'Water source planned',
      status: hasWell ? 'pass' : hasWaterTank ? 'warn' : 'fail',
      note: hasWell ? 'Well/pump placed' : hasWaterTank ? 'Tank only \u2014 needs source' : 'No water infrastructure placed',
    });

    // Power
    const hasSolar = utilities.some((u) => u.type === 'solar_panel');
    const hasGenerator = utilities.some((u) => u.type === 'generator');
    items.push({
      label: 'Energy source planned',
      status: hasSolar ? 'pass' : hasGenerator ? 'warn' : 'unknown',
      note: hasSolar ? 'Solar array placed' : hasGenerator ? 'Generator only \u2014 consider renewables' : 'No energy infrastructure',
    });

    // Access
    const hasMainRoad = paths.some((p) => p.type === 'main_road');
    items.push({
      label: 'Site access planned',
      status: hasMainRoad ? 'pass' : paths.length > 0 ? 'warn' : 'fail',
      note: hasMainRoad ? 'Main road drawn' : paths.length > 0 ? 'Paths exist but no main road' : 'No access paths drawn',
    });

    // Septic
    const hasSeptic = utilities.some((u) => u.type === 'septic');
    const hasDwelling = structures.some((s) => STRUCTURE_TEMPLATES[s.type]?.category === 'dwelling');
    if (hasDwelling) {
      items.push({
        label: 'Septic/waste system planned',
        status: hasSeptic ? 'pass' : 'warn',
        note: hasSeptic ? 'Septic system placed' : 'Dwelling planned without septic \u2014 required for habitation',
      });
    }

    // Zones defined
    items.push({
      label: 'Land zones defined',
      status: zones.length >= 3 ? 'pass' : zones.length > 0 ? 'warn' : 'unknown',
      note: `${zones.length} zones defined`,
    });

    // Regulatory notes
    items.push({
      label: 'Zoning notes recorded',
      status: project.zoningNotes ? 'pass' : 'unknown',
      note: project.zoningNotes ? 'Zoning notes present' : 'Add zoning research notes',
    });

    // Water rights
    items.push({
      label: 'Water rights noted',
      status: project.waterRightsNotes ? 'pass' : 'unknown',
      note: project.waterRightsNotes ? 'Water rights documented' : 'Research water rights for this property',
    });

    return items;
  }, [project, structures, zones, paddocks, crops, paths, utilities]);

  const passCount = checklist.filter((c) => c.status === 'pass').length;
  const score = Math.round((passCount / checklist.length) * 100);

  // Good fit / poor fit
  const goodFits: string[] = [];
  const poorFits: string[] = [];

  if (paddocks.length > 0 && crops.length > 0) goodFits.push('Mixed farming \u2014 livestock and crop integration');
  if (zones.some((z) => z.category === 'spiritual')) goodFits.push('Contemplative retreat with spiritual zones');
  if (zones.some((z) => z.category === 'education')) goodFits.push('Educational programming and learning spaces');
  if (structures.some((s) => s.type === 'greenhouse')) goodFits.push('Season extension with protected growing');
  if (crops.some((c) => c.type === 'food_forest')) goodFits.push('Perennial food systems and agroforestry');
  if (zones.some((z) => z.category === 'retreat')) goodFits.push('Guest hospitality and retreat hosting');
  if (goodFits.length === 0) goodFits.push('Add design elements to see fit analysis');

  if (!project.hasParcelBoundary) poorFits.push('No boundary defined \u2014 cannot assess site constraints');
  if (totalCost > 500000 && structures.length < 5) poorFits.push('High cost with few structures \u2014 check estimates');
  if (structures.length > 10 && paths.length === 0) poorFits.push('Many structures but no access paths planned');

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 16 }}>
        Decision Support
      </h2>

      {/* Feasibility score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, padding: '16px', background: 'var(--color-panel-card)', borderRadius: 10, border: '1px solid var(--color-panel-card-border)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', border: `3px solid ${score >= 70 ? '#2d7a4f' : score >= 40 ? '#c4a265' : '#c44e3f'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-panel-text)' }}>{score}</span>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-panel-text)' }}>Feasibility Score</div>
          <div style={{ fontSize: 11, color: 'var(--color-panel-muted)' }}>{passCount} of {checklist.length} items resolved</div>
        </div>
      </div>

      {/* Investment summary */}
      {totalCost > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 14px', background: 'rgba(196,162,101,0.06)', borderRadius: 8, border: '1px solid rgba(196,162,101,0.1)' }}>
          <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Estimated Investment</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#c4a265' }}>${totalCost.toLocaleString()}</div>
          <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>{structures.length} structures placed</div>
        </div>
      )}

      {/* Checklist */}
      <SectionLabel>Feasibility Checklist</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
        {checklist.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
              {item.status === 'pass' ? '\u2705' : item.status === 'warn' ? '\u26A0\uFE0F' : item.status === 'fail' ? '\u274C' : '\u2753'}
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{item.label}</div>
              <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>{item.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Good fit */}
      {/* Design Rule Violations */}
      <SectionLabel>Design Rules</SectionLabel>
      <RulesPanel project={project} />

      <SectionLabel>Good Fit For</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
        {goodFits.map((f, i) => (
          <div key={i} style={{ fontSize: 12, color: 'var(--color-panel-text)', padding: '6px 10px', background: 'rgba(45,122,79,0.06)', borderRadius: 6, borderLeft: '3px solid rgba(45,122,79,0.3)' }}>
            {f}
          </div>
        ))}
      </div>

      {/* Poor fit / warnings */}
      {poorFits.length > 0 && (
        <>
          <SectionLabel>Needs Attention</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {poorFits.map((f, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--color-panel-text)', padding: '6px 10px', background: 'rgba(196,78,63,0.06)', borderRadius: 6, borderLeft: '3px solid rgba(196,78,63,0.3)' }}>
                {f}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
      {children}
    </h3>
  );
}
