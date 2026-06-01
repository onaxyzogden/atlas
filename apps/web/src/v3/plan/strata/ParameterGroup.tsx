// ParameterGroup.tsx
//
// Renders the steward-editable operating-threshold parameter group for a Plan
// objective (§10.1 Integration). Today only the S6 Integration objective
// (`s6-yield-flows`) carries a parameterGroup; the component is designed for
// any future objective that gains one.
//
// Mounted by ObjectiveDetailPanel after <DecisionChecklist> when:
//   1. objective.parameterGroup exists, AND
//   2. the project has eligible animal enterprises (livestock-implying project
//      type) — values are protocol token sources; no point showing them for
//      non-livestock projects that have no matching templates.
//
// Values persist on every keystroke via setParameterValue → Zustand →
// localStorage (version 5 partialize). NO FABRICATION: the stored value is
// EXACTLY what the steward typed; buildProtocolOutputs (downstream) trims +
// omits blanks, ensuring no fabricated threshold ever reaches a protocol.
//
// Zustand v5 note: selectParameterValues returns either the stored object
// reference (stable as long as the project+objective slice doesn't change) or
// the frozen EMPTY_VALUES constant — so it is safe as an inline selector.

import { useMemo } from 'react';
import type { PlanStratumObjective } from '@ogden/shared';
import { enterprisesForProjectTypes } from '@ogden/shared';
import { useProjectStore } from '../../../store/projectStore.js';
import {
  usePlanStratumProgressStore,
  selectParameterValues,
} from '../../../store/planStratumStore.js';
import { C, F, CA } from '../spine/tokens.js';

interface Props {
  projectId: string;
  objective: PlanStratumObjective;
}

export default function ParameterGroup({ projectId, objective }: Props) {
  const { parameterGroup } = objective;

  // Derive enterprise eligibility from the project's type record — the same
  // read that PlanStratumShell and ProtocolLayerPanel already do.
  const typeRecord = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord,
  );
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = typeRecord?.secondaryTypeIds ?? [];

  const hasEligibleEnterprises = useMemo(() => {
    if (!primaryTypeId) return false;
    return enterprisesForProjectTypes(primaryTypeId, secondaryTypeIds).length > 0;
  }, [primaryTypeId, secondaryTypeIds]);

  // Subscribe to this objective's stored parameter values (stable selector —
  // returns frozen {} constant when empty, so the identity stays stable).
  const values = usePlanStratumProgressStore((s) =>
    selectParameterValues(s, projectId, objective.id),
  );
  const setParameterValue = usePlanStratumProgressStore(
    (s) => s.setParameterValue,
  );

  // Guard: hide when no parameterGroup defined or project has no eligible
  // enterprises.
  if (!parameterGroup || !hasEligibleEnterprises) return null;

  return (
    <section
      aria-label={`Parameter group: ${parameterGroup.label}`}
      data-testid="plan-parameter-group"
      style={{
        margin: '0 0 2px',
        background: C.bg2,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 20px 20px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          marginBottom: 14,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontFamily: F.mono,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: C.gold,
          }}
        >
          Plan decides
        </span>
        <span
          style={{
            fontSize: 13,
            fontFamily: F.sans,
            fontWeight: 600,
            color: C.textPrimary,
          }}
        >
          {parameterGroup.label}
        </span>
      </div>

      {/* Parameter items */}
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        data-testid="plan-parameter-group-items"
      >
        {parameterGroup.items.map((item) => {
          const currentValue = values[item.id] ?? '';
          return (
            <div
              key={item.id}
              data-testid={`plan-parameter-item-${item.id}`}
              style={{ display: 'flex', flexDirection: 'column', gap: 5 }}
            >
              <label
                htmlFor={`param-${item.id}`}
                style={{
                  fontSize: 12,
                  fontFamily: F.sans,
                  color: C.textSecondary,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {item.label}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  id={`param-${item.id}`}
                  type="text"
                  inputMode="decimal"
                  placeholder={item.placeholder ?? ''}
                  value={currentValue}
                  onChange={(e) =>
                    setParameterValue(
                      projectId,
                      objective.id,
                      item.id,
                      e.target.value,
                    )
                  }
                  aria-label={item.label}
                  data-testid={`plan-parameter-input-${item.id}`}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 34,
                    padding: '0 10px',
                    fontSize: 13,
                    fontFamily: F.mono,
                    color: currentValue ? C.textPrimary : C.textTertiary,
                    background: C.bg3,
                    border: `1px solid ${currentValue ? CA('gold', 0.45) : C.border}`,
                    borderRadius: 5,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                />
                {item.unit && (
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: F.mono,
                      color: C.textTertiary,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {item.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <p
        style={{
          marginTop: 14,
          fontSize: 11,
          fontFamily: F.sans,
          color: C.textTertiary,
          lineHeight: 1.5,
        }}
      >
        Values entered here are used as the thresholds in your activated
        protocols. Leave a field blank to keep its protocol condition
        un-filled.
      </p>
    </section>
  );
}
