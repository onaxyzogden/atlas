// ProtocolWiringPane — the WIRING & STATE summary for the Plan Protocols mode
// right rail. The counterpart to the center MEANING pane: where MEANING answers
// "why does this protocol exist", this answers "where does it sit and what is
// its current state":
//   • stratum (S{ordinal} · {title}) it was authored under,
//   • objective it monitors (when anchored),
//   • feeds-into domains (the Observe channels it reads/writes),
//   • lifecycle status (active / triggered / suspended / standard template),
//   • expected firing rate, when the steward has set one.
//
// `.olos-spine-root` activates the shared `--spine-*` custom properties (same as
// PlanProtocolDetailPane). The editor's mechanics-variant card omits feeds +
// status, so this pane is their single home in Protocols mode (no duplication).

import { useMemo, type ReactNode } from 'react';
import {
  PLAN_STRATA,
  findPlanStratumObjective,
  type ProjectTypeId,
} from '@ogden/shared';
import { C, F, CA } from '../spine/tokens.js';
import '../spine/spine-theme.css';
import { statusMeta } from './ProtocolLibraryCard.js';
import { useProtocolLibrary } from './useProtocolLibrary.js';
import { useExpectation } from '../../../store/protocolStore.js';

interface Props {
  projectId: string;
  primaryTypeId: ProjectTypeId | null;
  secondaryTypeIds: readonly ProjectTypeId[];
  templateId: string;
}

/** stratumId → `S{ordinal} · {title}` (same derivation as useProtocolLibrary). */
const STRATUM_LABEL = new Map(
  PLAN_STRATA.map((s) => [s.id, `S${s.ordinal} · ${s.title}`] as const),
);

/** One labelled field: an uppercase micro-label above its value node. */
function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: C.textTertiary,
          fontFamily: F.sans,
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

const valueTextStyle = {
  fontSize: 13,
  color: C.textPrimary,
  fontFamily: F.sans,
  lineHeight: 1.5,
} as const;

export default function ProtocolWiringPane({
  projectId,
  primaryTypeId,
  secondaryTypeIds,
  templateId,
}: Props) {
  const { templates, statusByTemplate } = useProtocolLibrary(
    projectId,
    primaryTypeId,
    secondaryTypeIds,
  );
  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  const status = statusByTemplate[templateId];
  const expectedRate = useExpectation(projectId, templateId);

  if (!template) {
    return (
      <div
        data-testid="protocol-wiring-empty"
        style={{
          padding: '24px 22px',
          fontSize: 12,
          color: C.textTertiary,
          fontFamily: F.sans,
          fontStyle: 'italic',
        }}
      >
        Select a protocol to see its wiring.
      </div>
    );
  }

  const stratumLabel =
    (template.stratumId && STRATUM_LABEL.get(template.stratumId)) ?? null;
  const objectiveTitle = template.objectiveId
    ? (findPlanStratumObjective(template.objectiveId)?.title ?? null)
    : null;
  const meta = statusMeta(status);

  return (
    <div
      data-testid="protocol-wiring-pane"
      data-template-id={template.id}
      data-protocol-status={status ?? 'none'}
      className="olos-spine-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: C.bg,
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          padding: '16px 22px 8px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: C.textTertiary,
            fontFamily: F.sans,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Wiring &amp; state
        </span>
      </div>

      <div
        style={{
          padding: '16px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {stratumLabel && (
          <Field label="Stratum">
            <span style={valueTextStyle}>{stratumLabel}</span>
          </Field>
        )}

        {objectiveTitle && (
          <Field label="Monitors">
            <span style={valueTextStyle}>{objectiveTitle}</span>
          </Field>
        )}

        {template.feeds.length > 0 && (
          <Field label="Feeds into">
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {template.feeds.map((f) => (
                <span
                  key={f}
                  style={{
                    background: C.tealDim,
                    border: `1px solid ${CA('teal', 0.33)}`,
                    borderRadius: 10,
                    padding: '2px 9px',
                    fontSize: 12,
                    color: C.teal,
                    fontFamily: F.sans,
                    fontWeight: 500,
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </Field>
        )}

        <Field label="Status">
          <span
            data-testid="protocol-wiring-status"
            style={{
              fontSize: 13,
              color: meta.color,
              fontFamily: F.sans,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {meta.dot && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: meta.color,
                  display: 'inline-block',
                }}
              />
            )}
            {meta.label}
          </span>
        </Field>

        {expectedRate && (
          <Field label="Expected rate">
            <span data-testid="protocol-wiring-rate" style={valueTextStyle}>
              {`${expectedRate.count} per ${expectedRate.per}`}
            </span>
          </Field>
        )}
      </div>
    </div>
  );
}
