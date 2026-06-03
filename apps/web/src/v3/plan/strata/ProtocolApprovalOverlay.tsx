// ProtocolApprovalOverlay.tsx
//
// Full-screen modal overlay that wraps spine/ProtocolConfirmationFlow with real
// store data for the §10.1 "Approve & instantiate protocols" trigger on the S6
// Integration objective.
//
// Mounted by ObjectiveDetailPanel when:
//   - objective.stratumId === 's6-integration-design' AND parameterGroup exists
//   - status === 'complete'
//   - project has eligible animal enterprises
//
// ALL values are derived from real store state — NO mocks, NO FABRICATION:
//   templates = templatesForEnterprises(enterprisesForProjectTypes(...))
//   outputs   = buildProtocolOutputs(parameterGroup, steward-entered values)
//             → unfilled tokens render their [bracket] placeholder verbatim
//   decisions = initialized from protocolStore.records for this project
//             (already-activated templates start as 'activated')
//
// onEditCommit(id, tokenValues): writes each edited value back to the parameter
// store so the ParameterGroup UI and the ProtocolLayerPanel stay in sync —
// the parameter store is the single source of truth.
//
// DO NOT edit spine/ProtocolConfirmationFlow.tsx — import-only.

import { useState, useMemo } from 'react';
import {
  enterprisesForProjectTypes,
  templatesForEnterprises,
  buildProtocolOutputs,
  type PlanStratumObjective,
} from '@ogden/shared';
import type { ProposalDecision } from '../spine/types.js';
import ProtocolConfirmationFlow from '../spine/ProtocolConfirmationFlow.js';
import { useProjectStore } from '../../../store/projectStore.js';
import {
  usePlanStratumProgressStore,
  selectParameterValues,
} from '../../../store/planStratumStore.js';
import { useProtocolStore } from '../../../store/protocolStore.js';
import { C } from '../spine/tokens.js';

interface Props {
  projectId: string;
  objective: PlanStratumObjective;
  onClose: () => void;
}

export default function ProtocolApprovalOverlay({
  projectId,
  objective,
  onClose,
}: Props) {
  // ── Project type → enterprise → templates ────────────────────────────────
  const typeRecord = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord,
  );
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = typeRecord?.secondaryTypeIds ?? [];
  const secondaryKey = secondaryTypeIds.join(',');

  const templates = useMemo(() => {
    if (!primaryTypeId) return [];
    return templatesForEnterprises(
      enterprisesForProjectTypes(primaryTypeId, secondaryTypeIds),
    );
    // secondaryTypeIds captured via secondaryKey (stable primitive).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryTypeId, secondaryKey]);

  // ── Parameter values → outputs ────────────────────────────────────────────
  // selectParameterValues is a stable-identity accessor: returns frozen {} when
  // no values exist, so this selector never creates a new object on each render.
  const values = usePlanStratumProgressStore((s) =>
    selectParameterValues(s, projectId, objective.id),
  );
  const setParameterValue = usePlanStratumProgressStore(
    (s) => s.setParameterValue,
  );

  // NO FABRICATION: outputs contain ONLY what the steward entered. Unfilled tokens
  // render their [bracket] placeholder verbatim inside ProtocolConfirmationFlow.
  const outputs = useMemo(
    () => buildProtocolOutputs(objective.parameterGroup, values),
    // objective.parameterGroup is reference-stable (constant seed object);
    // values changes only when the steward edits a parameter input.
    [objective.parameterGroup, values],
  );

  // ── Protocol store ────────────────────────────────────────────────────────
  const records = useProtocolStore((s) => s.records);
  const activateProtocol = useProtocolStore((s) => s.activateProtocol);
  const deactivateProtocol = useProtocolStore((s) => s.deactivateProtocol);
  const setExpectation = useProtocolStore((s) => s.setExpectation);

  // ── Expected firing rate drafts ───────────────────────────────────────────
  // Read stored expectations once at mount (getState is a snapshot read, not a
  // subscription — re-opening the overlay is a fresh mount so re-opens always
  // reflect the latest persisted value).
  const [rateDrafts, setRateDrafts] = useState<
    Record<string, { count: string; per: 'season' | 'cycle' }>
  >(() => {
    const stored =
      useProtocolStore.getState().expectationsByProject[projectId] ?? {};
    const init: Record<string, { count: string; per: 'season' | 'cycle' }> = {};
    for (const t of templates) {
      const r = stored[t.id];
      init[t.id] = { count: r ? String(r.count) : '', per: r?.per ?? 'season' };
    }
    return init;
  });

  // Decision state: initialized from protocolStore (already-activated templates
  // start as 'activated', everything else as 'pending'). Skipped is UI-only —
  // there is no persist slot for 'skipped' in protocolStore.
  const [decisions, setDecisions] = useState<Record<string, ProposalDecision>>(
    () => {
      const init: Record<string, ProposalDecision> = {};
      for (const t of templates) {
        const rec = records.find(
          (r) => r.projectId === projectId && r.templateId === t.id,
        );
        init[t.id] = rec ? 'activated' : 'pending';
      }
      return init;
    },
  );

  // ── Commit expected rate ──────────────────────────────────────────────────
  // Persists the draft rate for a template IF the steward entered a valid
  // non-empty count. A blank count means "no expectation set" — no-op.
  const commitExpectation = (id: string) => {
    const draft = rateDrafts[id];
    if (!draft) return;
    const trimmed = draft.count.trim();
    if (trimmed === '') return;
    const count = Number(trimmed);
    // Reject count <= 0: a zero/negative rate is not a meaningful expectation.
    // Storing { count: 0 } would mean "never fire", which the deviation engine
    // would treat as a permanent over-deviation on the first activation --
    // indistinguishable from the steward simply leaving the field blank.
    if (!Number.isFinite(count) || count <= 0) return;
    setExpectation(projectId, id, { count, per: draft.per });
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleActivate = (id: string) => {
    activateProtocol(projectId, id);
    commitExpectation(id);
    setDecisions((prev) => ({ ...prev, [id]: 'activated' }));
  };

  const handleSkip = (id: string) => {
    setDecisions((prev) => ({ ...prev, [id]: 'skipped' }));
  };

  const handleUndo = (id: string) => {
    deactivateProtocol(projectId, id);
    setDecisions((prev) => ({ ...prev, [id]: 'pending' }));
  };

  /**
   * Edit-First commit: the user adjusted threshold values inline inside the
   * confirmation card. Write each token→value pair back to the PARAMETER STORE
   * so ParameterGroup.tsx and ProtocolLayerPanel both reflect the new value
   * (single source of truth). Then activate the protocol.
   */
  const handleEditCommit = (id: string, tokenValues: Record<string, string>) => {
    if (objective.parameterGroup) {
      for (const [token, value] of Object.entries(tokenValues)) {
        const item = objective.parameterGroup.items.find(
          (i) => i.token === token,
        );
        if (item) {
          setParameterValue(projectId, objective.id, item.id, value);
        }
      }
    }
    activateProtocol(projectId, id);
    commitExpectation(id);
    setDecisions((prev) => ({ ...prev, [id]: 'activated' }));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    // Fixed full-screen backdrop — traps interaction inside the overlay.
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Approve and instantiate protocols"
      data-testid="protocol-approval-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        // Close on backdrop click (not on content click).
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 640,
          maxHeight: '90vh',
          borderRadius: 14,
          overflow: 'hidden',
          background: C.bg,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* ── Expected firing rate panel ─────────────────────────────────── */}
        <div
          style={{
            maxHeight: '38%',
            overflowY: 'auto',
            borderBottom: `1px solid ${C.border}`,
            padding: '12px 16px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: C.textTertiary,
              marginBottom: 8,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Expected firing rate (optional)
          </div>
          {templates.map((t) => (
            <div
              key={t.id}
              title={t.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}
            >
              {/* Visible protocol name so the steward can tell which rate row
                  maps to which protocol. Truncated with a CSS ellipsis for the
                  compact strip; the full name is also in the row title and the
                  input aria-labels. This same name is rendered on the
                  ProtocolConfirmationFlow card below, so tests matching it use
                  getAllByText (two legitimate occurrences). */}
              <span
                style={{
                  fontSize: 11,
                  color: C.textSecondary,
                  fontFamily: 'var(--font-sans)',
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {t.name}
              </span>
              <input
                data-testid={`expected-rate-count-${t.id}`}
                type="text"
                inputMode="decimal"
                aria-label={`Expected firing rate count for ${t.name}`}
                value={rateDrafts[t.id]?.count ?? ''}
                onChange={(e) =>
                  setRateDrafts((p) => ({
                    ...p,
                    [t.id]: {
                      count: e.target.value,
                      per: p[t.id]?.per ?? 'season',
                    },
                  }))
                }
                placeholder="e.g. 4"
                style={{
                  width: 56,
                  background: C.bg2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.textPrimary,
                  fontSize: 12,
                  padding: '3px 7px',
                  fontFamily: 'var(--font-sans)',
                }}
              />
              <select
                data-testid={`expected-rate-per-${t.id}`}
                aria-label={`Expected firing rate unit for ${t.name}`}
                value={rateDrafts[t.id]?.per ?? 'season'}
                onChange={(e) =>
                  setRateDrafts((p) => ({
                    ...p,
                    [t.id]: {
                      count: p[t.id]?.count ?? '',
                      per: e.target.value as 'season' | 'cycle',
                    },
                  }))
                }
                style={{
                  background: C.bg2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  color: C.textPrimary,
                  fontSize: 12,
                  padding: '3px 7px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <option value="season">per season</option>
                <option value="cycle">per cycle</option>
              </select>
            </div>
          ))}
        </div>

        {/* ── Protocol confirmation flow (scrollable) ───────────────────── */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <ProtocolConfirmationFlow
            templates={templates}
            decisions={decisions}
            outputs={outputs}
            // editedValues and isEdited are the prototype's per-card in-memory
            // draft mechanism. Here the single source of truth is the parameter
            // store (written back in handleEditCommit), so there are no pending
            // divergences to track — the "Edited" badge is correctly hidden.
            editedValues={{}}
            isEdited={() => false}
            onActivate={handleActivate}
            onSkip={handleSkip}
            onUndo={handleUndo}
            onEditCommit={handleEditCommit}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
