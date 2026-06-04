**
 * CompostWorkspacePage — the `/compost` route component.
 *
 * A distinct lightweight vertical: it reuses the OLOS Plan / Act / Observe
 * language but renders bespoke compost screens, NOT the land-use project shell.
 * Stage switching is internal state (mirrors the prototype's self-contained
 * App), so the global AppShell header stays the only chrome above it.
 */

import { useState } from 'react';
import { C, F } from './model.js';
import { useCompostHydration } from './useCompostHydration.js';
import PlanStage from './PlanStage.js';
import ActStage from './ActStage.js';
import ObserveStage from './ObserveStage.js';
import styles from './CompostWorkspace.module.css';

type Stage = 'plan' | 'act' | 'observe';

function StagePills({
  active,
  onChange,
}: {
  active: Stage;
  onChange: (s: Stage) => void;
}) {
  const stages: { id: Stage; label: string; color: string }[] = [
    { id: 'plan', label: 'Plan', color: C.amber },
    { id: 'act', label: 'Act', color: C.green },
    { id: 'observe', label: 'Observe', color: C.blue },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {stages.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              border: `1px solid ${isActive ? s.color : C.border}`,
              background: isActive ? `${s.color}22` : 'transparent',
              color: isActive ? s.color : C.textTertiary,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: F.sans,
              letterSpacing: '0.04em',
              transition: 'all 0.15s',
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

function TopBar({
  stage,
  onStageChange,
}: {
  stage: Stage;
  onStageChange: (s: Stage) => void;
}) {
  return (
    <div
      style={{
        height: 52,
        background: C.bg2,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: 8 }}>
        <span
          style={{
            fontSize: 12,
            color: C.textTertiary,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          OLOS
        </span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.textPrimary,
            marginTop: -1,
          }}
        >
          Millbrook Farm
        </span>
      </div>
      <div style={{ width: 1, height: 24, background: C.border }} />
      <StagePills active={stage} onChange={onStageChange} />
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>
        Thermophilic Compost · Cycle 1
      </span>
    </div>
  );
}

export default function CompostWorkspacePage() {
  const [stage, setStage] = useState<Stage>('plan');
  // Wire the slice to the server: resolve-or-create the org's site/pile, seed
  // the textbook readings on first load, and register the reconnect reflush.
  // (Also subscribes the component to the store via the auth selector.)
  useCompostHydration();

  return (
    <div className={styles.workspace}>
      <TopBar stage={stage} onStageChange={setStage} />
      <div className={styles.body}>
        {stage === 'plan' && <PlanStage />}
        {stage === 'act' && <ActStage />}
        {stage === 'observe' && <ObserveStage />}
      </div>
    </div>
  );
}
