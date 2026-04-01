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
import p from '../../styles/panel.module.css';

interface DecisionSupportPanelProps {
  project: LocalProject;
}

export default function DecisionSupportPanel({ project }: DecisionSupportPanelProps) {
  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === project.id);
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === project.id);
  const paddocks = useLivestockStore((s) => s.paddocks).filter((pk) => pk.projectId === project.id);
  const crops = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === project.id);
  const paths = usePathStore((s) => s.paths).filter((pa) => pa.projectId === project.id);
  const utilities = useUtilityStore((s) => s.utilities).filter((u) => u.projectId === project.id);

  // Compute total estimated cost
  const totalCost = useMemo(() => {
    return structures.reduce((sum, s) => sum + (s.costEstimate ?? 0), 0);
  }, [structures]);

  // Feasibility checklist
  const checklist = useMemo(() => {
    const items: { label: string; status: 'pass' | 'warn' | 'fail' | 'unknown'; note: string }[] = [];

    items.push({
      label: 'Property boundary defined',
      status: project.hasParcelBoundary ? 'pass' : 'fail',
      note: project.hasParcelBoundary ? 'Boundary set' : 'Draw or import a boundary first',
    });

    const hasWell = utilities.some((u) => u.type === 'well_pump');
    const hasWaterTank = utilities.some((u) => u.type === 'water_tank');
    items.push({
      label: 'Water source planned',
      status: hasWell ? 'pass' : hasWaterTank ? 'warn' : 'fail',
      note: hasWell ? 'Well/pump placed' : hasWaterTank ? 'Tank only \u2014 needs source' : 'No water infrastructure placed',
    });

    const hasSolar = utilities.some((u) => u.type === 'solar_panel');
    const hasGenerator = utilities.some((u) => u.type === 'generator');
    items.push({
      label: 'Energy source planned',
      status: hasSolar ? 'pass' : hasGenerator ? 'warn' : 'unknown',
      note: hasSolar ? 'Solar array placed' : hasGenerator ? 'Generator only \u2014 consider renewables' : 'No energy infrastructure',
    });

    const hasMainRoad = paths.some((pa) => pa.type === 'main_road');
    items.push({
      label: 'Site access planned',
      status: hasMainRoad ? 'pass' : paths.length > 0 ? 'warn' : 'fail',
      note: hasMainRoad ? 'Main road drawn' : paths.length > 0 ? 'Paths exist but no main road' : 'No access paths drawn',
    });

    const hasSeptic = utilities.some((u) => u.type === 'septic');
    const hasDwelling = structures.some((s) => STRUCTURE_TEMPLATES[s.type]?.category === 'dwelling');
    if (hasDwelling) {
      items.push({
        label: 'Septic/waste system planned',
        status: hasSeptic ? 'pass' : 'warn',
        note: hasSeptic ? 'Septic system placed' : 'Dwelling planned without septic \u2014 required for habitation',
      });
    }

    items.push({
      label: 'Land zones defined',
      status: zones.length >= 3 ? 'pass' : zones.length > 0 ? 'warn' : 'unknown',
      note: `${zones.length} zones defined`,
    });

    items.push({
      label: 'Zoning notes recorded',
      status: project.zoningNotes ? 'pass' : 'unknown',
      note: project.zoningNotes ? 'Zoning notes present' : 'Add zoning research notes',
    });

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
    <div className={p.container}>
      <h2 className={p.title}>
        Decision Support
      </h2>

      {/* Feasibility score */}
      <div className={`${p.card} ${p.row} ${p.mb20}`} style={{ gap: 16, padding: 16, borderRadius: 10 }}>
        <div className={`${p.scoreCircle} ${score >= 70 ? p.scoreCircleHigh : score >= 40 ? p.scoreCircleMed : p.scoreCircleLow}`}>
          <span className={p.scoreValue}>{score}</span>
        </div>
        <div>
          <div className={`${p.text14} ${p.fontSemibold}`} style={{ color: 'var(--color-panel-text)' }}>Feasibility Score</div>
          <div className={`${p.text11} ${p.muted}`}>{passCount} of {checklist.length} items resolved</div>
        </div>
      </div>

      {/* Investment summary */}
      {totalCost > 0 && (
        <div className={`${p.highlightBox} ${p.highlightBoxGold} ${p.mb20}`} style={{ padding: '12px 14px' }}>
          <div className={`${p.text11} ${p.muted}`} style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Estimated Investment</div>
          <div className={`${p.textXl} ${p.fontBold}`} style={{ color: '#c4a265' }}>${totalCost.toLocaleString()}</div>
          <div className={`${p.text10} ${p.muted}`}>{structures.length} structures placed</div>
        </div>
      )}

      {/* Checklist */}
      <h3 className={p.sectionLabel}>Feasibility Checklist</h3>
      <div className={`${p.section} ${p.mb20}`}>
        {checklist.map((item, i) => (
          <div key={i} className={p.card} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 6 }}>
            <span className={p.text14} style={{ flexShrink: 0, marginTop: 1 }}>
              {item.status === 'pass' ? '\u2705' : item.status === 'warn' ? '\u26A0\uFE0F' : item.status === 'fail' ? '\u274C' : '\u2753'}
            </span>
            <div>
              <div className={`${p.text12} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)' }}>{item.label}</div>
              <div className={`${p.text10} ${p.muted}`}>{item.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Design Rule Violations */}
      <h3 className={p.sectionLabel}>Design Rules</h3>
      <RulesPanel project={project} />

      <h3 className={p.sectionLabel}>Good Fit For</h3>
      <div className={`${p.flexCol} ${p.mb20}`} style={{ gap: 4 }}>
        {goodFits.map((f, i) => (
          <div key={i} className={`${p.fitItem} ${p.fitItemGood}`}>
            {f}
          </div>
        ))}
      </div>

      {/* Poor fit / warnings */}
      {poorFits.length > 0 && (
        <>
          <h3 className={p.sectionLabel}>Needs Attention</h3>
          <div className={p.flexCol} style={{ gap: 4 }}>
            {poorFits.map((f, i) => (
              <div key={i} className={`${p.fitItem} ${p.fitItemBad}`}>
                {f}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
