// PlanSpinePrototype.tsx
//
// Root of the OLOS Plan Spine prototype surface — the olos_plan_spine.jsx App()
// shell reproduced VERBATIM (3 columns: stratum spine 220 / objective list 292
// / detail flex), with one addition: a Design ▸ Protocol mode toggle in the
// Plan header (left-spine header region) that swaps the RIGHT pane between the
// Design-Mode DesignDetailPanel and the Protocol-Mode ProtocolModePanel.
//
// This realises vertical slice 1 of the Protocol Layer: the toggle + shared
// visual system + seeded, enterprise-filtered Protocol library. Everything
// behind it (evaluation engine, custom authoring, Act/Observe wiring, mode
// persistence) is deferred. Mounted in the /v3/components debug gallery for
// map-free, screenshot-safe verification.

import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { templatesForEnterprises, type EnterpriseId } from '@ogden/shared';
import { C, F, CA } from './tokens.js';
import './spine-theme.css';
import { OBJECTIVES, STRATA, APPROVED_TIER_OUTPUTS } from './mockData.js';
import type { SpineObjective, SpineObjectiveSource, ProposalDecision } from './types.js';
import { useProtocolStore } from '../../../store/protocolStore.js';
import StratumCircle from './StratumCircle.js';
import SpineObjectiveCard from './SpineObjectiveCard.js';
import DesignDetailPanel from './DesignDetailPanel.js';
import ProtocolModePanel from './ProtocolModePanel.js';
import ProtocolConfirmationFlow from './ProtocolConfirmationFlow.js';
import ModeToggle, { type SpinePlanMode } from './ModeToggle.js';

type SourceFilter = 'all' | SpineObjectiveSource;

const SOURCE_FILTERS: SourceFilter[] = ['all', 'universal', 'primary', 'secondary'];

// The slice's active enterprises (spec §4.3) — Homestead + Silvopasture:
// livestock, no poultry, so Pest Diversion stays hidden. Shared by the Protocol
// library and the confirmation flow so both show the same 9 templates.
const ENTERPRISES: readonly EnterpriseId[] = ['sheep_beef'];

// The Stratum-6 ("Integration", formerly Tier 5) objective whose approval is the
// §10.1 trigger for protocol auto-instantiation.
const INTEGRATION_STRATUM = 6;

export default function PlanSpinePrototype({
  height = '100vh',
}: {
  /**
   * Root height. Defaults to '100vh' for the standalone full-bleed view
   * (faithful to the prototype); the /v3/components gallery passes '100%' to
   * embed it inside a fixed-height frame.
   */
  height?: string | number;
} = {}) {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const activateProtocol = useProtocolStore((s) => s.activateProtocol);

  const [mode, setMode] = useState<SpinePlanMode>('design');
  const [activeStratum, setActiveStratum] = useState(3);
  const [selectedObj, setSelectedObj] = useState<SpineObjective | null>(OBJECTIVES[1] ?? null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  // §10.1 / §4.1 confirmation-flow state (prototype-local; no persistence).
  const [integrationApproved, setIntegrationApproved] = useState(false);
  const [confirmFlowOpen, setConfirmFlowOpen] = useState(false);
  // Per-template decision, keyed by template id. Missing → 'pending'.
  const [decisions, setDecisions] = useState<Record<string, ProposalDecision>>({});
  // §4.1 Edit-First overrides: per-template { token -> edited value }. Merged over
  // APPROVED_TIER_OUTPUTS wherever the condition renders. Empty = pristine defaults.
  const [editedValues, setEditedValues] = useState<Record<string, Record<string, string>>>({});

  const confirmTemplates = templatesForEnterprises(ENTERPRISES);

  const filteredObjs = OBJECTIVES.filter(
    (o) => (sourceFilter === 'all' || o.source === sourceFilter) && o.stratum === activeStratum,
  );

  const activeStratumData = STRATA.find((s) => s.n === activeStratum);
  const nextUp = OBJECTIVES.find((o) => o.status === 'in_progress' && o.stratum === activeStratum);

  // The Integration objective drives the approval trigger + back-ref navigation.
  const integrationObj = OBJECTIVES.find((o) => o.stratum === INTEGRATION_STRATUM) ?? null;
  const isIntegrationSelected = !!selectedObj && selectedObj.stratum === INTEGRATION_STRATUM;

  const setDecision = (id: string, value: ProposalDecision) =>
    setDecisions((prev) => ({ ...prev, [id]: value }));

  // Save the Edit-First form: record the per-template overrides and activate (§4.1
  // "save activates immediately"). Preserves the protocolStore activation so an
  // edited protocol is instantiated identically to a plain activate.
  const commitEdit = (id: string, values: Record<string, string>) => {
    setEditedValues((prev) => ({ ...prev, [id]: values }));
    setDecision(id, 'activated');
    if (projectId) activateProtocol(projectId, id);
  };

  // Undo also discards any Edit-First override, returning the proposal to its
  // pristine pre-filled defaults.
  const handleUndo = (id: string) => {
    setDecision(id, 'pending');
    setEditedValues((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // A template counts as "edited" only when an override actually diverges from the
  // default approved output (saving the form unchanged does not flag it).
  const isEdited = (id: string) => {
    const e = editedValues[id];
    return !!e && Object.entries(e).some(([k, v]) => v !== APPROVED_TIER_OUTPUTS[k]);
  };

  const handleApprove = () => {
    setIntegrationApproved(true);
    setConfirmFlowOpen(true);
  };

  const handleNavigateToSource = () => {
    setMode('design');
    setActiveStratum(INTEGRATION_STRATUM);
    if (integrationObj) setSelectedObj(integrationObj);
  };

  return (
    <div
      style={{
        height,
        display: 'flex',
        background: C.bg,
        fontFamily: F.sans,
        color: C.textPrimary,
        overflow: 'hidden',
      }}
    >
      <style>{`
        .olos-spine-root * { box-sizing: border-box; margin: 0; padding: 0; }
        .olos-spine-root ::-webkit-scrollbar { width: 3px; }
        .olos-spine-root ::-webkit-scrollbar-track { background: transparent; }
        .olos-spine-root ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        .olos-spine-root button { outline: none; }
      `}</style>

      <div className="olos-spine-root" style={{ display: 'contents' }}>
        {/* ── LEFT: Stratum Spine ── */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            background: C.bg2,
            borderRight: `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Spine header */}
          <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              OLOS · Plan
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Millbrook Farm</div>
            <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 2 }}>Regen Farm + Silvopasture · Cycle 1</div>
            {/* Mode toggle (Plan header) */}
            <div style={{ marginTop: 12 }}>
              <ModeToggle mode={mode} onChange={setMode} />
            </div>
          </div>

          {/* Strata */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {STRATA.map((s) => (
              <StratumCircle key={s.n} stratum={s} isActive={s.n === activeStratum} onClick={setActiveStratum} />
            ))}
          </div>

          {/* Overall progress */}
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, background: C.bg3 }}>
            <div style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans, marginBottom: 6 }}>Overall progress</div>
            <div style={{ height: 3, background: C.bg4, borderRadius: 2 }}>
              <div style={{ height: '100%', width: '32%', background: C.blue, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 5, fontFamily: F.mono }}>15 / 48 objectives</div>
          </div>
        </div>

        {/* ── CENTRE: Objective list ── */}
        <div
          style={{
            width: 292,
            flexShrink: 0,
            background: C.bg,
            borderRight: `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* List header */}
          <div style={{ padding: '16px 16px 10px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 2 }}>
              Stratum {activeStratum}
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 12 }}>{activeStratumData?.name}</div>
            {/* Source filter */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {SOURCE_FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setSourceFilter(f)}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 10,
                    border: `1px solid ${f === sourceFilter ? C.blue : C.border}`,
                    background: f === sourceFilter ? C.blueDim : 'transparent',
                    color: f === sourceFilter ? C.blue : C.textTertiary,
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: F.sans,
                    textTransform: 'capitalize',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Next up */}
          {nextUp && (
            <div
              onClick={() => setSelectedObj(nextUp)}
              style={{
                margin: '10px 10px 0',
                padding: '10px 13px',
                background: C.blueDim,
                borderRadius: 9,
                border: `1px solid ${CA('blue', 0.27)}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 9, color: C.blue, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>
                Next Up
              </div>
              <div style={{ fontSize: 12, color: C.textPrimary, fontWeight: 500, fontFamily: F.sans }}>
                Survey soil conditions & subsurface
              </div>
              <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 3, fontFamily: F.mono }}>2 of 8 complete</div>
            </div>
          )}

          {/* Objective cards */}
          <div style={{ flex: 1, overflowY: 'auto', paddingTop: 8 }}>
            {filteredObjs.map((obj) => (
              <SpineObjectiveCard
                key={obj.id}
                obj={obj}
                isSelected={selectedObj?.id === obj.id}
                onClick={setSelectedObj}
              />
            ))}
          </div>
        </div>

        {/* ── RIGHT: Confirmation flow / Detail / Protocol panel ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
          {confirmFlowOpen ? (
            <ProtocolConfirmationFlow
              templates={confirmTemplates}
              decisions={decisions}
              outputs={APPROVED_TIER_OUTPUTS}
              editedValues={editedValues}
              isEdited={isEdited}
              onActivate={(id) => {
                setDecision(id, 'activated');
                if (projectId) activateProtocol(projectId, id);
              }}
              onSkip={(id) => setDecision(id, 'skipped')}
              onUndo={handleUndo}
              onEditCommit={commitEdit}
              onClose={() => {
                setConfirmFlowOpen(false);
                setMode('protocol');
              }}
            />
          ) : mode === 'protocol' ? (
            <ProtocolModePanel
              enterprises={ENTERPRISES}
              decisions={decisions}
              integrationApproved={integrationApproved}
              outputs={APPROVED_TIER_OUTPUTS}
              editedValues={editedValues}
              onRestore={(id) => {
                setDecision(id, 'activated');
                if (projectId) activateProtocol(projectId, id);
              }}
              onNavigateToSource={handleNavigateToSource}
            />
          ) : selectedObj ? (
            <DesignDetailPanel
              obj={selectedObj}
              onApprove={isIntegrationSelected && !integrationApproved ? handleApprove : undefined}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: C.textTertiary,
                fontFamily: F.sans,
              }}
            >
              Select an objective to view its decision groups
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
