/**
 * RulesPanel — displays rule violations, warnings, and suggestions.
 * Integrated into the Decision Support panel.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { evaluateRules } from './RulesEngine.js';
import type { RuleViolation, RuleSeverity } from './SitingRules.js';
import { error as errorToken, group, water } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';

interface RulesPanelProps {
  project: LocalProject;
}

const SEVERITY_CONFIG: Record<RuleSeverity, { icon: string; color: string; bg: string; border: string }> = {
  error:   { icon: '\u274C', color: errorToken.DEFAULT, bg: 'rgba(196,78,63,0.06)', border: 'rgba(196,78,63,0.15)' },
  warning: { icon: '\u26A0\uFE0F', color: group.livestock, bg: 'rgba(196,162,101,0.06)', border: 'rgba(196,162,101,0.15)' },
  info:    { icon: '\u{1F4A1}', color: water[400], bg: 'rgba(91,157,184,0.06)', border: 'rgba(91,157,184,0.15)' },
};

export default function RulesPanel({ project }: RulesPanelProps) {
  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === project.id);
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === project.id);
  const paddocks = useLivestockStore((s) => s.paddocks).filter((pk) => pk.projectId === project.id);
  const crops = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === project.id);
  const paths = usePathStore((s) => s.paths).filter((pa) => pa.projectId === project.id);
  const utilities = useUtilityStore((s) => s.utilities).filter((u) => u.projectId === project.id);

  const violations = useMemo(() => evaluateRules({
    hasBoundary: project.hasParcelBoundary,
    structures,
    zones,
    paddocks,
    crops,
    paths,
    utilities,
    siteData: null,
    projectCenter: null,
    projectType: project.projectType,
  }), [project.hasParcelBoundary, project.projectType, structures, zones, paddocks, crops, paths, utilities]);

  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warning');
  const infos = violations.filter((v) => v.severity === 'info');

  if (violations.length === 0) {
    return (
      <div style={{ padding: '12px 0' }}>
        <div className={p.card} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'rgba(45,122,79,0.06)', border: '1px solid rgba(45,122,79,0.12)' }}>
          <span style={{ fontSize: 16 }}>{'\u2705'}</span>
          <div>
            <div className={`${p.text12} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)' }}>No rule violations</div>
            <div className={`${p.text10} ${p.muted}`}>Design passes all current checks</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 0' }}>
      {/* Summary bar */}
      <div className={`${p.flexGap8} ${p.mb12}`}>
        {errors.length > 0 && <RuleBadge count={errors.length} severity="error" />}
        {warnings.length > 0 && <RuleBadge count={warnings.length} severity="warning" />}
        {infos.length > 0 && <RuleBadge count={infos.length} severity="info" />}
      </div>

      {/* Violation cards */}
      <div className={p.section}>
        {violations.map((v) => (
          <ViolationCard key={`${v.ruleId}-${v.affectedElementId}`} violation={v} />
        ))}
      </div>
    </div>
  );
}

function RuleBadge({ count, severity }: { count: number; severity: RuleSeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={p.badge} style={{
      padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {count} {severity === 'error' ? 'Error' : severity === 'warning' ? 'Warning' : 'Info'}{count !== 1 ? 's' : ''}
    </span>
  );
}

function ViolationCard({ violation: v }: { violation: RuleViolation }) {
  const cfg = SEVERITY_CONFIG[v.severity];
  return (
    <div className={p.card} style={{
      padding: '10px 12px', background: cfg.bg, border: `1px solid ${cfg.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span className={p.text13} style={{ flexShrink: 0, marginTop: 1 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div className={`${p.text12} ${p.fontMedium} ${p.mb4}`} style={{ color: 'var(--color-panel-text)' }}>
            {v.title}
            {v.needsSiteVisit && (
              <span className={p.badge} style={{ marginLeft: 6, fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(196,162,101,0.1)', color: group.livestock }}>
                Site Visit
              </span>
            )}
          </div>
          <div className={`${p.text11} ${p.muted} ${p.leading15} ${p.mb4}`}>
            {v.description}
          </div>
          <div className={p.text10} style={{ color: cfg.color, fontStyle: 'italic' }}>
            {'\u2192'} {v.suggestion}
          </div>
        </div>
      </div>
    </div>
  );
}
