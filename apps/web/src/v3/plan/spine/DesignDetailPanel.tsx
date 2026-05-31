// DesignDetailPanel.tsx — the prototype's DetailPanel, transcribed VERBATIM
// from olos_plan_spine.jsx. Renamed to "DesignDetailPanel" to signal it is the
// Design-Mode right pane (the sibling Protocol-Mode pane is ProtocolModePanel).

import { useState } from 'react';
import { C, F } from './tokens.js';
import SourcePill from './SourcePill.js';
import DecisionGroupCard from './DecisionGroupCard.js';
import type { SpineObjective } from './types.js';

export default function DesignDetailPanel({
  obj,
  onApprove,
}: {
  obj: SpineObjective;
  /**
   * Supplied only for the Stratum-6 Integration objective (§10.1 "on objective
   * approval"). When present, renders an "Approve & instantiate protocols →"
   * button in the Completion Gate area that triggers the confirmation flow.
   */
  onApprove?: () => void;
}) {
  const [gateOpen, setGateOpen] = useState(false);
  const doneCount = obj.actDone;
  const totalCount = obj.actTotal;
  const pct = totalCount ? (doneCount / totalCount) * 100 : 0;

  const ctaLabel =
    obj.status === 'complete'
      ? '✓  Completed in Act'
      : obj.status === 'locked'
        ? 'Locked'
        : obj.actDone > 0
          ? `Continue in Act  ·  ${obj.actDone}/${obj.actTotal}`
          : 'Work through in Act →';

  const ctaColor = obj.status === 'locked' ? C.textTertiary : 'white';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* Header */}
      <div style={{ padding: '20px 22px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10,
              color: C.textTertiary,
              fontFamily: F.sans,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Active Objective
          </span>
          <SourcePill type={obj.source} />
        </div>
        <div
          style={{
            fontSize: 19,
            fontFamily: F.serif,
            fontWeight: 400,
            color: C.textPrimary,
            lineHeight: 1.3,
            marginBottom: 8,
          }}
        >
          {obj.title}
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.textSecondary,
            fontFamily: F.sans,
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          {obj.question}
        </div>
      </div>

      {/* Map strip */}
      <div
        style={{
          height: 44,
          background: C.bg2,
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 22px',
          gap: 10,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: C.green,
            display: 'inline-block',
            boxShadow: `0 0 8px ${C.green}`,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.sans }}>
          {obj.overlays.length} overlays activate on the map
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
          {obj.overlays.slice(0, 2).map((o) => (
            <span
              key={o}
              style={{
                background: C.bg4,
                border: `1px solid ${C.border}`,
                borderRadius: 5,
                padding: '2px 8px',
                fontSize: 10,
                color: C.textPrimary,
                fontFamily: F.sans,
              }}
            >
              {o}
            </span>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 80px' }}>
        {/* Act progress */}
        <div style={{ padding: '16px 22px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.textTertiary,
                fontFamily: F.sans,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Act Progress
            </span>
            <span
              style={{
                fontSize: 11,
                color: pct === 100 ? C.green : C.textSecondary,
                fontFamily: F.mono,
                fontWeight: 600,
              }}
            >
              {doneCount} / {totalCount}
            </span>
          </div>
          <div style={{ height: 3, background: C.bg4, borderRadius: 2 }}>
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                width: `${pct}%`,
                background: pct === 100 ? C.green : C.blue,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
          {doneCount === 0 && (
            <div
              style={{
                fontSize: 10,
                color: C.textTertiary,
                marginTop: 6,
                fontFamily: F.sans,
                fontStyle: 'italic',
              }}
            >
              Not yet started — work through this objective in Act.
            </div>
          )}
        </div>

        {/* Decision groups */}
        <div style={{ padding: '16px 22px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: C.textTertiary,
                fontFamily: F.sans,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Decision groups
            </span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}>
              {obj.decisionGroups.length + obj.patchDecisionGroups.length} groups
            </span>
          </div>

          {obj.decisionGroups.map((p, i) => (
            <DecisionGroupCard key={p.id} group={p} index={i} isPatched={false} />
          ))}

          {obj.patchDecisionGroups.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 10px' }}>
                <div style={{ height: 1, background: `${C.amber}44`, flex: 1 }} />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: C.amber,
                    fontFamily: F.sans,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Added by {obj.patchDecisionGroups[0]?.secondary}
                </span>
                <div style={{ height: 1, background: `${C.amber}44`, flex: 1 }} />
              </div>
              {obj.patchDecisionGroups.map((p, i) => (
                <DecisionGroupCard key={p.id} group={p} index={i} isPatched={true} />
              ))}
            </>
          )}
        </div>

        {/* Completion gate */}
        <div style={{ margin: '14px 22px 0' }}>
          <button
            onClick={() => setGateOpen((p) => !p)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              background: C.bg3,
              border: `1px solid ${C.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              fontFamily: F.sans,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textSecondary, letterSpacing: '0.04em' }}>
              Completion Gate
            </span>
            <span style={{ fontSize: 10, color: C.textTertiary }}>{gateOpen ? '▲' : '▼'}</span>
          </button>
          {gateOpen && (
            <div
              style={{
                padding: '12px 14px',
                background: C.bg2,
                border: `1px solid ${C.border}`,
                borderTop: 'none',
                borderRadius: '0 0 8px 8px',
              }}
            >
              <div style={{ fontSize: 12, color: C.textPrimary, fontFamily: F.sans, lineHeight: 1.6, marginBottom: 10 }}>
                {obj.gate}
              </div>
              {obj.patchDecisionGroups.length > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: C.amberDim,
                    border: `1px solid ${C.amber}55`,
                    borderRadius: 10,
                    padding: '2px 10px',
                    fontSize: 10,
                    color: C.amber,
                    fontFamily: F.sans,
                    fontWeight: 600,
                  }}
                >
                  Amended by {obj.patchDecisionGroups[0]?.secondary}
                </span>
              )}
            </div>
          )}

          {/* §10.1 — approving the Stratum-6 Integration objective instantiates
              all enterprise-eligible standard protocols. Only rendered when the
              parent supplies onApprove (i.e. this is the Integration objective). */}
          {onApprove && (
            <button
              onClick={onApprove}
              style={{
                width: '100%',
                marginTop: 10,
                padding: '11px 14px',
                borderRadius: 8,
                background: C.blue,
                border: 'none',
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: F.sans,
                letterSpacing: '0.01em',
                boxShadow: `0 2px 16px ${C.blue}44`,
              }}
            >
              Approve &amp; instantiate protocols →
            </button>
          )}
        </div>

        {/* Observe feeds */}
        <div style={{ padding: '14px 22px 0' }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: C.textTertiary,
              fontFamily: F.sans,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 8,
            }}
          >
            Feeds Observe
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {obj.observeFeeds.map((f) => (
              <span
                key={f}
                style={{
                  background: C.tealDim,
                  border: `1px solid ${C.teal}55`,
                  borderRadius: 10,
                  padding: '3px 10px',
                  fontSize: 10,
                  color: C.teal,
                  fontFamily: F.sans,
                  fontWeight: 500,
                }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Handoff */}
        <div
          style={{
            margin: '12px 22px 0',
            padding: '10px 14px',
            background: C.bg2,
            borderRadius: 7,
            border: `1px solid ${C.border}`,
          }}
        >
          <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.sans }}>Act handoff  </span>
          <span style={{ fontSize: 11, color: C.textPrimary, fontFamily: F.sans, fontWeight: 600 }}>{obj.handoff}</span>
        </div>
      </div>

      {/* Footer CTA */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 380,
          height: 64,
          background: C.bg2,
          borderTop: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 22px',
        }}
      >
        <button
          style={{
            flex: 1,
            height: 42,
            border: 'none',
            borderRadius: 9,
            background:
              obj.status === 'locked' ? C.bg3 : obj.status === 'complete' ? C.greenDim : C.blue,
            color: ctaColor,
            fontSize: 13,
            fontWeight: 600,
            cursor: obj.status === 'locked' ? 'default' : 'pointer',
            fontFamily: F.sans,
            letterSpacing: '0.01em',
            boxShadow:
              obj.status !== 'locked' && obj.status !== 'complete' ? `0 2px 16px ${C.blue}44` : 'none',
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
