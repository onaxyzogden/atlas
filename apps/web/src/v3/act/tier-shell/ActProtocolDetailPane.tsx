// ActProtocolDetailPane — the Act tier-shell right-rail detail for a single
// standing protocol. Mounted when the steward clicks a protocol card in the
// left rail's Protocols mode (mirrors the Objective-detail slot). Renders the
// FULL shared ProtocolLibraryCard (IF/THEN + rationale + verbatim Amanah
// scopeNotes — never collapsed) plus an activation control row wired directly to
// protocolStore, so a steward can activate / suspend / deactivate the protocol
// from the Act surface. The card data (template, lifecycle status, token
// outputs) comes from the same `useProtocolLibrary` derivation the panel uses,
// so this pane can never drift from the list.
//
// `.olos-spine-root` activates the `--spine-*` custom properties the shared card
// is styled with (declared in spine-theme.css, imported alongside the card just
// as ProtocolLayerPanel does); without it the card renders "naked".

import { useMemo } from 'react';
import type { ProjectTypeId } from '@ogden/shared';
import { C, F } from '../../plan/spine/tokens.js';
import '../../plan/spine/spine-theme.css';
import ProtocolLibraryCard from '../../plan/strata/ProtocolLibraryCard.js';
import { useProtocolLibrary } from '../../plan/strata/useProtocolLibrary.js';
import ProtocolActivationControls from '../../plan/strata/ProtocolActivationControls.js';

interface Props {
  projectId: string;
  primaryTypeId: ProjectTypeId | null;
  secondaryTypeIds: readonly ProjectTypeId[];
  templateId: string;
}

export default function ActProtocolDetailPane({
  projectId,
  primaryTypeId,
  secondaryTypeIds,
  templateId,
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
        data-testid="act-protocol-detail-empty"
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
      data-testid="act-protocol-detail"
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
        {/* Card renders the IF/THEN with the steward's Plan-configured threshold
            values substituted in (read-only here — thresholds are edited on the
            Plan protocol detail surface, shared via the per-project override
            slice that `outputsFor` merges). */}
        <ProtocolLibraryCard
          template={template}
          status={status}
          outputs={outputsFor(template.id)}
          emphasis="normal"
        />

        {/* Activation controls — wired straight to protocolStore (mirrors the
            §10.1 ProtocolApprovalOverlay handlers). Extracted to
            ProtocolActivationControls so the Plan detail pane reuses them. */}
        <ProtocolActivationControls
          projectId={projectId}
          templateId={template.id}
          status={status}
        />
      </div>
    </div>
  );
}
