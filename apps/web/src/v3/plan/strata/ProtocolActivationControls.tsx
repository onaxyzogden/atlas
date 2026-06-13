// ProtocolActivationControls — the activate / suspend / deactivate button row
// for ONE standing protocol, wired straight to protocolStore. Extracted from
// ActProtocolDetailPane so the Plan tier-shell detail pane
// (PlanProtocolDetailPane) reuses the exact same lifecycle controls instead of
// duplicating the store wiring. Behaviour and data-testids are byte-identical to
// the original Act inline row, so the Act detail pane is unchanged.
//
// State machine: active/triggered (live) -> Deactivate + Suspend;
// suspended -> Resume (activate) + Deactivate; none -> Activate.

import { type RecordStatus } from './ProtocolLibraryCard.js';
import { useProtocolStore } from '../../../store/protocolStore.js';
import { F, C } from '../spine/tokens.js';

interface Props {
  projectId: string;
  templateId: string;
  status: RecordStatus | undefined;
}

/** Shared control-button style — colour passed per action. */
function ctrlStyle(color: string): React.CSSProperties {
  return {
    flex: 1,
    background: 'transparent',
    border: `1px solid ${color}`,
    borderRadius: 8,
    color,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: F.sans,
    padding: '8px 12px',
    cursor: 'pointer',
  };
}

export default function ProtocolActivationControls({
  projectId,
  templateId,
  status,
}: Props) {
  const activateProtocol = useProtocolStore((s) => s.activateProtocol);
  const deactivateProtocol = useProtocolStore((s) => s.deactivateProtocol);
  const suspendProtocol = useProtocolStore((s) => s.suspendProtocol);

  // active / triggered → live: offer Deactivate (+ Suspend). suspended → offer
  // Activate (resume) + Deactivate (remove). none → Activate.
  const isLive = status === 'active' || status === 'triggered';

  return (
    <div
      data-testid="act-protocol-activation-controls"
      style={{ display: 'flex', gap: 8, marginTop: 4 }}
    >
      {isLive ? (
        <>
          <button
            type="button"
            data-testid="act-protocol-deactivate"
            style={ctrlStyle(C.red)}
            onClick={() => deactivateProtocol(projectId, templateId)}
          >
            Deactivate
          </button>
          <button
            type="button"
            data-testid="act-protocol-suspend"
            style={ctrlStyle(C.amber)}
            onClick={() => suspendProtocol(projectId, templateId)}
          >
            Suspend
          </button>
        </>
      ) : status === 'suspended' ? (
        <>
          <button
            type="button"
            data-testid="act-protocol-activate"
            style={ctrlStyle(C.green)}
            onClick={() => activateProtocol(projectId, templateId)}
          >
            Resume
          </button>
          <button
            type="button"
            data-testid="act-protocol-deactivate"
            style={ctrlStyle(C.red)}
            onClick={() => deactivateProtocol(projectId, templateId)}
          >
            Deactivate
          </button>
        </>
      ) : (
        <button
          type="button"
          data-testid="act-protocol-activate"
          style={ctrlStyle(C.green)}
          onClick={() => activateProtocol(projectId, templateId)}
        >
          Activate
        </button>
      )}
    </div>
  );
}
