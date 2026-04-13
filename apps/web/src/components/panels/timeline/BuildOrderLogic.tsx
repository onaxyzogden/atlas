import { useMemo } from 'react';
import type { Utility } from '../../../store/utilityStore.js';
import { UTILITY_TYPE_CONFIG } from '../../../store/utilityStore.js';
import { checkBuildOrder } from './timelineHelpers.js';
import p from '../../../styles/panel.module.css';
import { confidence, error as errorToken } from '../../../lib/tokens.js';

interface Props { utilities: Utility[]; }

export default function BuildOrderLogic({ utilities }: Props) {
  const violations = useMemo(() => checkBuildOrder(utilities), [utilities]);

  return (
    <div>
      <div className={p.sectionLabel}>Build Order</div>
      {violations.length === 0 ? (
        <div className={p.fitItem} style={{ borderLeft: `3px solid ${confidence.high}` }}>
          <div className={p.cardTitle} style={{ color: confidence.high }}>No dependency violations</div>
          <div className={p.cardDesc}>All infrastructure dependencies are satisfied in their assigned phases</div>
        </div>
      ) : (
        violations.map((v, i) => (
          <div key={i} className={`${p.fitItem} ${p.fitItemBad}`} style={{ marginBottom: 6 }}>
            <div className={p.cardTitle} style={{ color: errorToken.DEFAULT }}>
              Missing: {UTILITY_TYPE_CONFIG[v.missingType as keyof typeof UTILITY_TYPE_CONFIG]?.label ?? v.missingType}
            </div>
            <div className={p.cardDesc}>
              {v.reason} &mdash; needed before &ldquo;{v.utilityName}&rdquo; in {v.utilityPhase}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
