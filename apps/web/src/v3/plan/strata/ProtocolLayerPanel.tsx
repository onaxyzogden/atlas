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

import {
  type ProjectTypeId,
} from '@ogden/shared';
import { C, F } from '../spine/tokens.js';
import ProtocolLibraryCard from './ProtocolLibraryCard.js';
import { useProtocolLibrary } from './useProtocolLibrary.js';

interface Props {
  projectId: string;
  /** Persisted project-type record primary (null for MTC / null-type projects). */
  primaryTypeId: ProjectTypeId | null;
  /** Persisted secondary type layers (drives enterprise derivation alongside primary). */
  secondaryTypeIds: readonly ProjectTypeId[];
}

export default function ProtocolLayerPanel({
  projectId,
  primaryTypeId,
  secondaryTypeIds,
}: Props) {
  const { templates, groups, statusByTemplate, outputs, activeCount } =
    useProtocolLibrary(projectId, primaryTypeId, secondaryTypeIds);

  return (
    <div
      data-testid="protocol-layer-panel"
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
            {activeCount > 0 ? ` · ${activeCount} active` : ''}
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

      {/* Enterprise-scope note */}
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
            ? 'Enterprise-filtered for livestock (no poultry — Pest Diversion hidden)'
            : 'No livestock enterprise — no animal protocols apply'}
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
            No animal protocol templates — this project has no livestock enterprise.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.tier} style={{ marginBottom: 18 }}>
              {/* Tier section header — protocols grouped by real `tierAuthored`. */}
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
              {g.items.map((t) => (
                <ProtocolLibraryCard
                  key={t.id}
                  template={t}
                  status={statusByTemplate[t.id]}
                  outputs={outputs}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
