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

import { type KeyboardEvent, useMemo, useRef, useState } from 'react';
import {
  type ProjectTypeId,
  type StandardProtocolTemplate,
} from '@ogden/shared';
import { C, F, CA } from '../spine/tokens.js';
import { useProtocolStore } from '../../../store/protocolStore.js';
import { toast } from '../../../components/Toast.js';
import ProtocolBulkConfirmOverlay, {
  type BulkAction,
} from './ProtocolBulkConfirmOverlay.js';
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

/** Verb-selector buttons for the bulk toolbar. The active verb's accent tints
 *  its toggle (and is echoed by the confirm overlay). `CA` has no `red` triplet,
 *  so deactivate uses the flat `C.red` accent. */
const BULK_VERBS: readonly { key: BulkAction; label: string; accent: string }[] =
  [
    { key: 'activate', label: 'Activate', accent: C.green },
    { key: 'suspend', label: 'Suspend', accent: C.amber },
    { key: 'deactivate', label: 'Deactivate', accent: C.red },
  ];

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

  // ── Bulk actions (Act-only, opt-in) ───────────────────────────────────────
  const activateProtocols = useProtocolStore((s) => s.activateProtocols);
  const suspendProtocols = useProtocolStore((s) => s.suspendProtocols);
  const deactivateProtocols = useProtocolStore((s) => s.deactivateProtocols);
  const restoreProtocolRecords = useProtocolStore((s) => s.restoreProtocolRecords);
  const [selectMode, setSelectMode] = useState(false);
  const [bulkAction, setBulkAction] = useState<BulkAction>('activate');
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<readonly StandardProtocolTemplate[]>([]);
  // Eligible set depends on the chosen verb (all over the visible, stratum-scoped
  // templates):
  //  • activate   — not already active (undefined/suspended/triggered). Activate
  //                 is idempotent and resumes suspended/triggered.
  //  • suspend    — an existing record that is active or triggered (suspending a
  //                 suspended one, or an unactivated one, is a no-op).
  //  • deactivate — any existing record (removing an unactivated one is a no-op).
  const eligibleTemplates = useMemo(
    () =>
      visibleTemplates.filter((t) => {
        const status = statusByTemplate[t.id];
        if (bulkAction === 'activate') return status !== 'active';
        if (bulkAction === 'suspend')
          return status === 'active' || status === 'triggered';
        return status !== undefined; // deactivate
      }),
    [visibleTemplates, statusByTemplate, bulkAction],
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

  // ── Verb selector keyboard nav (radiogroup, mirrors components/ui/Tabs) ────
  // Arrow keys move focus across the verb radios (wrapping) and, per WAI-ARIA
  // single-select semantics, check the focused verb as they go. Home/End jump to
  // the ends; Escape (while focus is inside the group) leaves select-mode.
  const verbGroupRef = useRef<HTMLDivElement>(null);
  const onVerbKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      exitSelectMode();
      return;
    }
    const group = verbGroupRef.current;
    if (!group) return;
    const radios = Array.from(
      group.querySelectorAll<HTMLButtonElement>('button[role="radio"]'),
    );
    const idx = radios.indexOf(document.activeElement as HTMLButtonElement);
    if (idx === -1) return;
    const n = radios.length;
    let next: HTMLButtonElement | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = radios[(idx + 1) % n];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp')
      next = radios[(idx - 1 + n) % n];
    else if (e.key === 'Home') next = radios[0];
    else if (e.key === 'End') next = radios[n - 1];
    if (next) {
      e.preventDefault();
      next.focus();
      const key = next.dataset.verb as BulkAction | undefined;
      if (key) setBulkAction(key);
    }
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
                {/* Verb selector — picks the bulk action; "Apply" buttons
                    below compute their counts against this verb's eligibility. */}
                <div
                  ref={verbGroupRef}
                  data-testid="protocol-bulk-verb-group"
                  role="radiogroup"
                  aria-label="Bulk action"
                  onKeyDown={onVerbKeyDown}
                  style={{ display: 'inline-flex', gap: 4 }}
                >
                  {BULK_VERBS.map(({ key, label, accent }) => {
                    const active = bulkAction === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        role="radio"
                        data-testid={`protocol-bulk-verb-${key}`}
                        data-verb={key}
                        aria-checked={active}
                        tabIndex={active ? 0 : -1}
                        onClick={() => setBulkAction(key)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 7,
                          border: `1px solid ${active ? accent : C.border}`,
                          background: active ? CA('border', 0.4) : 'transparent',
                          color: active ? accent : C.textSecondary,
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: F.sans,
                          cursor: 'pointer',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  data-testid="protocol-bulk-apply-all"
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
                  Apply to all ({eligibleTemplates.length})
                </button>
                <button
                  type="button"
                  data-testid="protocol-bulk-apply-selected"
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
                  Apply to selected ({selectedEligibleCount})
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
          action={bulkAction}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            const ids = pending.map((t) => t.id);
            // Snapshot the affected templates' prior records BEFORE mutating so
            // the Undo toast can faithfully reverse this action. `ids` is the
            // full applied set; `priorRecords` is the subset that already had a
            // record (point-in-time closure — last-write-wins if the steward
            // mutates again before clicking Undo).
            const priorRecords = useProtocolStore
              .getState()
              .records.filter(
                (r) => r.projectId === projectId && ids.includes(r.templateId),
              );
            if (bulkAction === 'activate') activateProtocols(projectId, ids);
            else if (bulkAction === 'suspend')
              suspendProtocols(projectId, ids);
            else deactivateProtocols(projectId, ids);
            setConfirmOpen(false);
            exitSelectMode();
            const verbPast =
              bulkAction === 'activate'
                ? 'Activated'
                : bulkAction === 'suspend'
                  ? 'Suspended'
                  : 'Deactivated';
            toast.action(
              'success',
              `${verbPast} ${ids.length} protocol${ids.length !== 1 ? 's' : ''}`,
              {
                label: 'Undo',
                onClick: () =>
                  restoreProtocolRecords(projectId, ids, priorRecords),
              },
              8000,
            );
          }}
        />
      )}
    </div>
  );
}
