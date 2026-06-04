// ProtocolLayerPanel — the live, store-backed Protocol Layer right pane for the
// Plan stratum shell (Plan Spine re-skin Phase 2) and the Act tier-shell rail. It
// is the production analogue of the gallery prototype's spine/ProtocolModePanel,
// but every byte of data is REAL — derived by the shared `useProtocolLibrary`
// hook (templates from the catalogue, lifecycle from protocolStore.records, token
// outputs from the steward's S6 values). The detail card is the shared
// `ProtocolLibraryCard`; this panel only owns the header + tier-grouped scroll.
//
// Phase 3 (Plan list+detail): the derivation and the detail card were extracted
// to `useProtocolLibrary` / `ProtocolLibraryCard` so the new Plan Protocol
// columns share one source. This panel's output is byte-identical to before the
// extraction — the Act rail and the ProtocolLayerPanel test prove parity.

import { useMemo } from 'react';
import {
  type ProjectTypeId,
} from '@ogden/shared';
import { C, F } from '../spine/tokens.js';
// Critical: pull the spine theme in with the component so the `--spine-*` tokens
// the cards rely on resolve even when this panel mounts in an Act-only page that
// never loads PlanStratumShell. CSS imports are bundler-deduped, so Plan is
// unaffected. The Act mount still adds the `.olos-spine-root` scope that
// activates these vars.
import '../spine/spine-theme.css';
import ProtocolLibraryCard from './ProtocolLibraryCard.js';
import { useProtocolLibrary } from './useProtocolLibrary.js';

/** Stable empty default for `triggeredIds` so the useMemo(Set) identity is stable
 *  across renders when no triggered ids are supplied (Plan / default Act). */
const EMPTY_IDS: readonly string[] = [];

interface Props {
  projectId: string;
  /** Persisted project-type record primary (null for MTC / null-type projects). */
  primaryTypeId: ProjectTypeId | null;
  /** Persisted secondary type layers (drives enterprise derivation alongside primary). */
  secondaryTypeIds: readonly ProjectTypeId[];
  /** `act` dims non-triggered + amber-frames triggered + collapses; `plan` (default) is unchanged. */
  variant?: 'plan' | 'act';
  /** Template ids currently triggered (from the Act evaluation engine / store). Act-only. */
  triggeredIds?: readonly string[];
  /** Round + clip the panel as a framed bento (used by the Act rail). */
  framed?: boolean;
}

export default function ProtocolLayerPanel({
  projectId,
  primaryTypeId,
  secondaryTypeIds,
  variant = 'plan',
  triggeredIds = EMPTY_IDS,
  framed = false,
}: Props) {
  const { templates, groups, statusByTemplate, outputs, activeCount } =
    useProtocolLibrary(projectId, primaryTypeId, secondaryTypeIds);

  const isAct = variant === 'act';
  // Presentational only: the panel never calls useTriggeredProtocols, so mounting
  // it in Plan never starts the Act evaluation engine. Triggered state is pushed
  // in via `triggeredIds` (plus any store status already resolved to 'triggered').
  const triggeredSet = useMemo(() => new Set(triggeredIds), [triggeredIds]);
  const isTriggered = (id: string) =>
    triggeredSet.has(id) || statusByTemplate[id] === 'triggered';
  const triggeredCount = isAct
    ? templates.filter((t) => isTriggered(t.id)).length
    : 0;

  return (
    <div
      data-testid="protocol-layer-panel"
      data-variant={variant}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: C.bg,
        ...(framed ? { borderRadius: 12, overflow: 'hidden' } : null),
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 22px 16px',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
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
            Protocol Layer
          </span>
          <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>
            {templates.length} template{templates.length !== 1 ? 's' : ''}
            {isAct
              ? triggeredCount > 0
                ? ` · ${triggeredCount} triggered`
                : ''
              : activeCount > 0
                ? ` · ${activeCount} active`
                : ''}
          </span>
        </div>
        <div
          style={{
            fontSize: 19,
            fontFamily: F.sans,
            fontWeight: 400,
            color: C.textPrimary,
            lineHeight: 1.3,
            marginBottom: 8,
          }}
        >
          Standing operational logic
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
          Conditional rules the land responds to — derived from design decisions,
          executed as Act tasks. Read-only preview.
        </div>
      </div>

      {/* Resolved standing-protocol scope note */}
      <div
        style={{
          background: C.bg2,
          borderBottom: `1px solid ${C.border}`,
          padding: '10px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: C.amber,
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: F.sans }}>
          {templates.length > 0
            ? `Standing protocols resolved for this project's types — universal + per-type, grouped by stratum`
            : 'No project type set — no standing protocols to resolve'}
        </span>
      </div>

      {/* Scrollable library */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 80px' }}>
        {templates.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: C.textTertiary,
              fontFamily: F.sans,
              fontStyle: 'italic',
              padding: '24px 0',
              textAlign: 'center',
            }}
          >
            No project type set — choose a primary type to see its standing protocols.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.tier} style={{ marginBottom: 18 }}>
              {/* Tier section header — protocols grouped by stratum (S1→S7). */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span
                  data-testid="protocol-tier-heading"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.textSecondary,
                    fontFamily: F.sans,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {g.tier}
                </span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span
                  style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}
                >
                  {g.items.length}
                </span>
              </div>
              {(isAct
                ? [...g.items].sort(
                    (a, b) =>
                      Number(isTriggered(b.id)) - Number(isTriggered(a.id)),
                  )
                : g.items
              ).map((t) => {
                const triggered = isAct && isTriggered(t.id);
                return (
                  <ProtocolLibraryCard
                    key={t.id}
                    template={t}
                    status={statusByTemplate[t.id]}
                    outputs={outputs}
                    emphasis={
                      !isAct ? 'normal' : triggered ? 'triggered' : 'dimmed'
                    }
                    collapsed={isAct && !triggered}
                  />
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
