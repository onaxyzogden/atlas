// ProtocolDetailColumn — the RIGHT column in Plan Protocol mode: the stacked
// detail of every protocol selected in ProtocolColumn. Each selection renders the
// shared ProtocolLibraryCard (same card the Act-rail ProtocolLayerPanel uses), so
// the IF/THEN token substitution, rationale, feeds, and lifecycle footer are
// identical here. Templates arrive already in catalogue/tier order (the shell
// filters the ordered library), so the stack is stable, not click-ordered.

import { type StandardProtocolTemplate } from '@ogden/shared';
import ProtocolLibraryCard, {
  type RecordStatus,
} from './ProtocolLibraryCard.js';
import ProtocolThresholdEditor from './ProtocolThresholdEditor.js';
import { C, F } from '../spine/tokens.js';

interface Props {
  /** Project whose per-protocol threshold overrides the editor reads/writes. */
  projectId: string;
  /** Selected templates, in catalogue/tier order (filtered by the shell). */
  selectedTemplates: readonly StandardProtocolTemplate[];
  /** templateId → lifecycle status, passed straight to each card. */
  statusByTemplate: Record<string, RecordStatus>;
  /**
   * Per-protocol token-substitution outputs: base S6 outputs merged with this
   * project's threshold overrides for ONE template. Each card renders through
   * `outputsFor(t.id)` so its IF/THEN substitutes the steward's bound live as
   * the threshold editor below it is edited.
   */
  outputsFor: (templateId: string) => Record<string, string>;
}

export default function ProtocolDetailColumn({
  projectId,
  selectedTemplates,
  statusByTemplate,
  outputsFor,
}: Props) {
  const count = selectedTemplates.length;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: C.bg,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 22px 16px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
        <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>
          {count} selected
        </span>
      </div>

      {/* Stacked detail / empty state */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 80px' }}>
        {count === 0 ? (
          <div
            data-testid="protocol-detail-empty"
            style={{
              fontSize: 12,
              color: C.textTertiary,
              fontFamily: F.sans,
              fontStyle: 'italic',
              padding: '40px 0',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            Select a protocol to view its detail.
          </div>
        ) : (
          <div data-testid="protocol-detail-column">
            {selectedTemplates.map((t) => (
              <div key={t.id}>
                <ProtocolLibraryCard
                  template={t}
                  status={statusByTemplate[t.id]}
                  outputs={outputsFor(t.id)}
                />
                <ProtocolThresholdEditor projectId={projectId} template={t} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
