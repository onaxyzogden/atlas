import { useMemo } from 'react';
import type { Utility } from '../../store/utilityStore.js';
import { UTILITY_TYPE_CONFIG } from '../../store/utilityStore.js';
import { groupByPhase, checkDependencyViolations } from './utilityAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './UtilityPanel.module.css';

interface Props { utilities: Utility[]; }

export default function InfrastructurePhasing({ utilities }: Props) {
  const phaseGroups = useMemo(() => groupByPhase(utilities), [utilities]);
  const violations = useMemo(() => checkDependencyViolations(utilities), [utilities]);

  if (utilities.length === 0) {
    return (
      <div>
        <div className={p.sectionLabel}>Infrastructure Phasing</div>
        <div className={p.empty}>Place utilities to see phased infrastructure plan</div>
      </div>
    );
  }

  const phases = Array.from(phaseGroups.entries()).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <div className={p.sectionLabel}>Infrastructure Phasing</div>
      {violations.length > 0 && (
        <div className={p.mb8}>
          {violations.map((v, i) => (
            <div key={i} className={s.violationCard}>
              <div className={s.violationTitle}>Missing dependency: {UTILITY_TYPE_CONFIG[v.missingType]?.label ?? v.missingType}</div>
              <div className={s.violationDetail}>{v.reason} {'\u2014'} needed before {v.utility.name} ({v.utility.phase})</div>
            </div>
          ))}
        </div>
      )}
      {violations.length === 0 && utilities.length > 0 && (
        <div className={`${s.successCard} ${p.mb8}`}>All dependency requirements satisfied</div>
      )}
      {phases.map(([phaseName, items]) => (
        <div key={phaseName} className={s.phaseGroup}>
          <div className={s.phaseGroupHeader}>{phaseName} ({items.length})</div>
          {items.map((u) => {
            const cfg = UTILITY_TYPE_CONFIG[u.type];
            return (
              <div key={u.id} className={s.phaseItem}>
                <span className={s.phaseIcon}>{cfg?.icon}</span>
                <span>{u.name}</span>
                <span style={{ color: 'var(--color-panel-muted)', marginLeft: 'auto', fontSize: 10 }}>{cfg?.label}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
