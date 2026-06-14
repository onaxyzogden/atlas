// PlanProtocolWorkspace — the center canvas for Plan Protocols mode. The
// steward designs a standing protocol here, so the center becomes a two-pane
// workspace rather than the objective workbench / map:
//   • LEFT  (editor)  — PlanProtocolDetailPane in `mechanics` variant: the live
//                       IF/THEN card + editable thresholds + lifecycle controls.
//   • RIGHT (meaning) — ProtocolMeaningPane: severity posture + gloss, rationale,
//                       verbatim Amanah caution.
// Wiring + lifecycle state live in the right-rail ProtocolWiringPane, so the
// three surfaces partition the protocol with no duplication ("split by kind").
//
// Resolution mirrors PlanProtocolDetailPane (useProtocolLibrary + find by id);
// an unknown templateId renders a single italic cue.

import { useMemo } from 'react';
import type { ProjectTypeId } from '@ogden/shared';
import { C, F } from '../spine/tokens.js';
import '../spine/spine-theme.css';
import PlanProtocolDetailPane from './PlanProtocolDetailPane.js';
import ProtocolMeaningPane from './ProtocolMeaningPane.js';
import { useProtocolLibrary } from './useProtocolLibrary.js';

interface Props {
  projectId: string;
  primaryTypeId: ProjectTypeId | null;
  secondaryTypeIds: readonly ProjectTypeId[];
  templateId: string;
}

export default function PlanProtocolWorkspace({
  projectId,
  primaryTypeId,
  secondaryTypeIds,
  templateId,
}: Props) {
  const { templates } = useProtocolLibrary(
    projectId,
    primaryTypeId,
    secondaryTypeIds,
  );
  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );

  if (!template) {
    return (
      <div
        data-testid="plan-protocol-workspace-empty"
        className="olos-spine-root"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '24px 22px',
          fontSize: 12,
          color: C.textTertiary,
          fontFamily: F.sans,
          fontStyle: 'italic',
        }}
      >
        Select a protocol to begin.
      </div>
    );
  }

  return (
    <div
      data-testid="plan-protocol-workspace"
      data-template-id={template.id}
      className="olos-spine-root"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        height: '100%',
        background: C.bg,
      }}
    >
      {/* Editor — live IF/THEN card (mechanics) + thresholds + lifecycle. */}
      <div style={{ flex: '1 1 58%', minWidth: 320, overflow: 'hidden' }}>
        <PlanProtocolDetailPane
          projectId={projectId}
          primaryTypeId={primaryTypeId}
          secondaryTypeIds={secondaryTypeIds}
          templateId={templateId}
          cardVariant="mechanics"
        />
      </div>

      {/* Meaning — why & posture, beside the editor. */}
      <div style={{ flex: '1 1 42%', minWidth: 280, overflow: 'hidden' }}>
        <ProtocolMeaningPane template={template} />
      </div>
    </div>
  );
}
