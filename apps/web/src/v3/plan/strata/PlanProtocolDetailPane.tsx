// PlanProtocolDetailPane — the Plan tier-shell right-rail detail for a single
// standing protocol. The Plan analogue of ActProtocolDetailPane, but the
// FULL-EDIT surface: where Act shows thresholds read-only, Plan is where the
// steward DESIGNS the protocol, so this pane stacks the shared ProtocolLibraryCard
// + an editable ProtocolThresholdEditor + the shared ProtocolActivationControls.
// All three share the same per-project stores the Act stage reads back at
// execution time (threshold overrides via planStratumStore, lifecycle via
// protocolStore), so a value set here renders read-only in the Act detail pane.
//
// `.olos-spine-root` activates the `--spine-*` custom properties the shared card
// is styled with (declared in spine-theme.css, imported alongside the card just
// as ProtocolLayerPanel / ActProtocolDetailPane do); without it the card renders
// "naked".

import { useMemo } from 'react';
import type { ProjectTypeId } from '@ogden/shared';
import { C, F } from '../spine/tokens.js';
import '../spine/spine-theme.css';
import ProtocolLibraryCard from './ProtocolLibraryCard.js';
import ProtocolThresholdEditor from './ProtocolThresholdEditor.js';
import ProtocolActivationControls from './ProtocolActivationControls.js';
import { useProtocolLibrary } from './useProtocolLibrary.js';

interface Props {
  projectId: string;
  primaryTypeId: ProjectTypeId | null;
  secondaryTypeIds: readonly ProjectTypeId[];
  templateId: string;
  /**
   * Card treatment forwarded to ProtocolLibraryCard. Defaults to `full` (the
   * standalone detail pane). The Plan Protocols-workspace passes `mechanics` so
   * the editor pane shows only header + live IF/THEN, with rationale/Amanah in
   * the adjacent MEANING pane and feeds/status in the right-rail WIRING pane.
   */
  cardVariant?: 'full' | 'mechanics';
}

export default function PlanProtocolDetailPane({
  projectId,
  primaryTypeId,
  secondaryTypeIds,
  templateId,
  cardVariant = 'full',
}: Props) {
  const { templates, statusByTemplate, outputsFor } = useProtocolLibrary(
    projectId,
    primaryTypeId,
    secondaryTypeIds,
  );

  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  const status = statusByTemplate[templateId];

  if (!template) {
    return (
      <div
        data-testid="plan-protocol-detail-empty"
        style={{
          padding: '24px 22px',
          fontSize: 12,
          color: C.textTertiary,
          fontFamily: F.sans,
          fontStyle: 'italic',
        }}
      >
        Select a protocol to see its detail.
      </div>
    );
  }

  return (
    <div
      data-testid="plan-protocol-detail"
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
          Protocol detail
        </span>
      </div>

      <div style={{ padding: '16px 22px' }}>
        {/* Shared card — IF/THEN substitutes the steward's threshold values live
            as the editor below is edited (outputsFor merges this project's
            per-protocol overrides). */}
        <ProtocolLibraryCard
          template={template}
          status={status}
          outputs={outputsFor(template.id)}
          emphasis="normal"
          variant={cardVariant}
        />

        {/* Editable thresholds — the Plan-stage affordance. Renders nothing when
            the condition has no `[token]`. */}
        <ProtocolThresholdEditor projectId={projectId} template={template} />

        {/* Lifecycle — shared with the Act detail pane. */}
        <ProtocolActivationControls
          projectId={projectId}
          templateId={template.id}
          status={status}
        />
      </div>
    </div>
  );
}
