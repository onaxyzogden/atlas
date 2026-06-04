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

import { useMemo, useState } from 'react';
import {
  type ProjectTypeId,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import { C, F, CA } from '../spine/tokens.js';
import { useProtocolStore } from '../../../store/protocolStore.js';
import ProtocolBulkConfirmOverlay from './ProtocolBulkConfirmOverlay.js';
// Critical: pull the spine theme in with the component so the `--spine-*` tokens
// the cards rely on resolve even when this panel mounts in an Act-only page that
// never loads PlanStratumShell. CSS imports are bundler-deduped, so Plan is
// unaffected. The Act mount still adds the `.olos-spine-root` scope that
// activates these vars.
import '../spine/spine-theme.css';
import ProtocolLibraryCard from './ProtocolLibraryCard.js';
import { useProtocolLibrary, filterProtocolGroups } from './useProtocolLibrary.js';

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
  /** When set (Act), narrow the rendered groups to just this stratum via
   *  `filterProtocolGroups`. Omitted/null (Plan rail) renders all S1→S7 groups. */
  activeStratumId?: string | null;
  /** When set, cards become clickable and fire this with the template id (Act detail). */
  onSelectProtocol?: (templateId: string) => void;
  /** The currently-selected template id — drives the card's selected treatment. */
  selectedProtocolId?: string | null;
  /** Act-only: enable the multi-select + "Activate all/selected" bulk toolbar.
   *  Omitted/false (Plan rail + default Act rail) → byte-identical, no toolbar. */
  bulkActivation?: boolean;
}

export default function ProtocolLayerPanel({
  projectId,
  primaryTypeId,
  secondaryTypeIds,
  variant = 'plan',
  triggeredIds = EMPTY_IDS,
  framed = false,
  activeStratumId = null,
  onSelectProtocol,
  selectedProtocolId = null,
  bulkActivation = false,
}: Props) {
  const { templates, groups, statusByTemplate, outputs } =
    useProtocolLibrary(projectId, primaryTypeId, secondaryTypeIds);

  const isAct = variant === 'act';
  const bulkEnabled = isAct && bulkActivation;
  // Stratum scope (Act): narrow to the open stratum's group. Null (Plan) → all
  // groups, byte-identical to before. Counts below derive from the VISIBLE set so
  // the header total matches what renders.
  const visibleGroups = useMemo(
    () => filterProtocolGroups(groups, activeStratumId),
    [groups, activeStratumId],
  );
  const visibleTemplates = useMemo(
    () => visibleGroups.flatMap((g) => g.items),
    [visibleGroups],
  );
  // Presentational only: the panel never calls useTriggeredProtocols, so mounting
  // it in Plan never starts the Act evaluation engine. Triggered state is pushed
  // in via `triggeredIds` (plus any store status already resolved to 'triggered').
  const triggeredSet = useMemo(() => new Set(triggeredIds), [triggeredIds]);
  const isTriggered = (id: string) =>
    triggeredSet.has(id) || statusByTemplate[id] === 'triggered';
  const triggeredCount = isAct
    ? visibleTemplates.filter((t) => isTriggered(t.id)).length
    : 0;
  const activeCount = useMemo(
    () => visibleTemplates.filter((t) => statusByTemplate[t.id] === 'active').length,
    [visibleTemplates, statusByTemplate],
  );

  // ── Bulk activation (Act-only, opt-in) ────────────────────────────────────
  const activateProtocols = useProtocolStore((s) => s.activateProtocols);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<readonly StandardProtocolTemplate[]>([]);
  // Eligible = visible (stratum-scoped) templates not already active. Activating
  // is idempotent and resumes suspended/triggered, so those are eligible too.
  const eligibleTemplates = useMemo(
    () => visibleTemplates.filter((t) => statusByTemplate[t.id] !== 'active'),
    [visibleTemplates, statusByTemplate],
  );
  const eligibleIds = useMemo(
    () => new Set(eligibleTemplates.map((t) => t.id)),
    [eligibleTemplates],
  );
  const selectedEligibleCount = useMemo(
    () => selectedIds.filter((id) => eligibleIds.has(id)).length,
    [selectedIds, eligibleIds],
  );
  const toggleSelected = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const beginBulk = (ids: readonly string[]) => {
    const want = new Set(ids);
    // Only eligible ids are activated; the overlay shows exactly that set.
    setPending(eligibleTemplates.filter((t) => want.has(t.id)));
    setConfirmOpen(true);
  };
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
  };

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
            {visibleTemplates.length} template{visibleTemplates.length !== 1 ? 's' : ''}
            {isAct
              ? triggeredCount > 0
                ? ` · ${triggeredCount} triggered`
                : ''
              : activeCount > 0
                ? ` · ${activeCount} active`
                : ''}
          </span>
        </div>
        {bulkEnabled && (
          <div
            data-testid="protocol-bulk-toolbar"
            style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}
          >
            <button
              type="button"
              data-testid="protocol-bulk-select-toggle"
              aria-pressed={selectMode}
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              style={{
                padding: '5px 12px',
                borderRadius: 7,
                border: `1px solid ${selectMode ? C.gold : C.border}`,
                background: selectMode ? CA('gold', 0.12) : 'transparent',
                color: selectMode ? C.gold : C.textSecondary,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: F.sans,
                cursor: 'pointer',
              }}
            >
              {selectMode ? 'Done' : 'Select'}
            </button>
            {selectMode && (
              <>
                <button
                  type="button"
                  data-testid="protocol-bulk-activate-all"
                  disabled={eligibleTemplates.length === 0}
                  onClick={() => beginBulk(eligibleTemplates.map((t) => t.id))}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: `1px solid ${C.border}`,
                    background: 'transparent',
                    color:
                      eligibleTemplates.length === 0
                        ? C.textTertiary
                        : C.textPrimary,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: F.sans,
                    cursor:
                      eligibleTemplates.length === 0 ? 'default' : 'pointer',
                  }}
                >
                  Activate all ({eligibleTemplates.length})
                </button>
                <button
                  type="button"
                  data-testid="protocol-bulk-activate-selected"
                  disabled={selectedEligibleCount === 0}
                  onClick={() => beginBulk(selectedIds)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 7,
                    border: `1px solid ${
                      selectedEligibleCount === 0 ? C.border : C.green
                    }`,
                    background:
                      selectedEligibleCount === 0
                        ? 'transparent'
                        : CA('green', 0.14),
                    color:
                      selectedEligibleCount === 0 ? C.textTertiary : C.green,
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: F.sans,
                    cursor: selectedEligibleCount === 0 ? 'default' : 'pointer',
                  }}
                >
                  Activate selected ({selectedEligibleCount})
                </button>
              </>
            )}
          </div>
        )}
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
          visibleGroups.map((g) => (
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
                    onSelect={
                      bulkEnabled && selectMode
                        ? () => toggleSelected(t.id)
                        : onSelectProtocol
                          ? () => onSelectProtocol(t.id)
                          : undefined
                    }
                    selected={
                      bulkEnabled && selectMode
                        ? selectedIds.includes(t.id)
                        : t.id === selectedProtocolId
                    }
                  />
                );
              })}
            </div>
          ))
        )}
      </div>

      {confirmOpen && (
        <ProtocolBulkConfirmOverlay
          eligible={pending}
          flagged={pending.filter((t) => Boolean(t.scopeNotes))}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            activateProtocols(
              projectId,
              pending.map((t) => t.id),
            );
            setConfirmOpen(false);
            exitSelectMode();
          }}
        />
      )}
    </div>
  );
}
