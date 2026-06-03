/**
 * ActFlowConnectorPopover - Act-stage affordance for authoring a closed-loop
 * material flow (source -> sink + material kind, default `greywater`) WITHOUT
 * leaving for the Plan canvas. Armed from the Act tools rail via the
 * `flow-connector` catalogue tool (`arm.kind === 'flow'`); the rail's
 * `handleActivateTool` opens this popover through `useActFlowPopoverStore`.
 *
 * It mirrors `WasteVectorListView.commit()` (the Plan-stage list authoring tool):
 * a `MaterialFlow` with `origin: 'list'` is appended to `closedLoopStore` via
 * `addMaterialFlow`, reusing the SAME structured endpoint set
 * (`useFlowEndpointOptions`) so an Act-authored flow can pin to the same
 * zones / structures / crops / fertility / paddocks / water systems / guilds.
 *
 * Endpoints accept either a structured feature OR free text (the "Other..."
 * option). Free text lands in `sourceLabel` / `sinkLabel` with the id left null.
 * NOTE: closed-loop CREDIT (the Act rail's `sourceId && sinkId` count) requires
 * BOTH endpoints pinned to structured features; a free-text-only flow still
 * counts toward "Material flows: N" but not toward "M closed-loop".
 *
 * Because the tool is rail-activated (no spatial anchor), it renders through the
 * reusable `Modal` (focus-trap + Esc + click-outside + portal-to-body) rather
 * than anchoring to a map point like `ActAsBuiltPopover`.
 */

import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal.js';
import { useFlowEndpointOptions } from '../../../features/plan/useFlowEndpointOptions.js';
import {
  useClosedLoopStore,
  MATERIAL_KIND_CONFIG,
  type MaterialFlow,
  type MaterialKind,
} from '../../../store/closedLoopStore.js';
import { useActFlowPopoverStore } from './actFlowPopoverStore.js';
import css from './ActFlowConnectorPopover.module.css';

interface Props {
  projectId: string | null;
}

/** Sentinel select value that reveals the free-text endpoint input. */
const FREE = '__free__';

const MATERIAL_KINDS = Object.entries(MATERIAL_KIND_CONFIG).map(
  ([value, cfg]) => ({ value: value as MaterialKind, label: cfg.label }),
);

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Deterministic-enough fallback for non-secure contexts / older runtimes.
  return `flow-${Date.now().toString(36)}`;
}

export default function ActFlowConnectorPopover({ projectId }: Props) {
  const open = useActFlowPopoverStore((s) => s.open);
  const close = useActFlowPopoverStore((s) => s.close);
  const addMaterialFlow = useClosedLoopStore((s) => s.addMaterialFlow);
  const options = useFlowEndpointOptions(projectId ?? '');

  const [label, setLabel] = useState('');
  const [materialKind, setMaterialKind] = useState<MaterialKind>('greywater');
  const [sourceSel, setSourceSel] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [sinkSel, setSinkSel] = useState('');
  const [sinkText, setSinkText] = useState('');
  const [notes, setNotes] = useState('');

  // Reset the form on each open transition (capture is per-open-session).
  useEffect(() => {
    if (open) {
      setLabel('');
      setMaterialKind('greywater');
      setSourceSel('');
      setSourceText('');
      setSinkSel('');
      setSinkText('');
      setNotes('');
    }
  }, [open]);

  const sourceFilled =
    sourceSel === FREE ? sourceText.trim() !== '' : sourceSel !== '';
  const sinkFilled = sinkSel === FREE ? sinkText.trim() !== '' : sinkSel !== '';
  // Disallow the same structured feature as both endpoints (free text is exempt -
  // a steward may legitimately route between two unpinned descriptions).
  const sameStructured =
    sourceSel !== FREE &&
    sinkSel !== FREE &&
    sourceSel !== '' &&
    sourceSel === sinkSel;
  const canSave =
    Boolean(projectId) &&
    label.trim() !== '' &&
    sourceFilled &&
    sinkFilled &&
    !sameStructured;

  const onSave = () => {
    if (!projectId || !canSave) return;
    const flow: MaterialFlow = {
      id: newId(),
      projectId,
      label: label.trim(),
      materialKind,
      sourceId: sourceSel === FREE ? null : sourceSel || null,
      sinkId: sinkSel === FREE ? null : sinkSel || null,
      sourceLabel:
        sourceSel === FREE ? sourceText.trim() || undefined : undefined,
      sinkLabel: sinkSel === FREE ? sinkText.trim() || undefined : undefined,
      origin: 'list',
      color: MATERIAL_KIND_CONFIG[materialKind].color,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    addMaterialFlow(flow);
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Record material flow"
      description="Capture a source -> sink material loop (e.g. greywater reuse) for this project."
      size="sm"
      footer={
        <div className={css.btnRow}>
          <button
            type="button"
            className={css.secondaryBtn}
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="button"
            className={css.primaryBtn}
            disabled={!canSave}
            onClick={onSave}
          >
            Add flow
          </button>
        </div>
      }
    >
      <div className={css.body}>
        <label className={css.field}>
          <span className={css.fieldLabel}>Label</span>
          <input
            className={css.input}
            type="text"
            value={label}
            placeholder="e.g. Kitchen greywater to orchard"
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>Material</span>
          <select
            className={css.select}
            value={materialKind}
            onChange={(e) => setMaterialKind(e.target.value as MaterialKind)}
          >
            {MATERIAL_KINDS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>From (source)</span>
          <select
            className={css.select}
            value={sourceSel}
            onChange={(e) => setSourceSel(e.target.value)}
          >
            <option value="">Select a feature...</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
            <option value={FREE}>Other (type a name)...</option>
          </select>
          {sourceSel === FREE ? (
            <input
              className={css.input}
              type="text"
              value={sourceText}
              placeholder="Source description"
              onChange={(e) => setSourceText(e.target.value)}
            />
          ) : null}
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>To (sink)</span>
          <select
            className={css.select}
            value={sinkSel}
            onChange={(e) => setSinkSel(e.target.value)}
          >
            <option value="">Select a feature...</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
            <option value={FREE}>Other (type a name)...</option>
          </select>
          {sinkSel === FREE ? (
            <input
              className={css.input}
              type="text"
              value={sinkText}
              placeholder="Sink description"
              onChange={(e) => setSinkText(e.target.value)}
            />
          ) : null}
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>Notes (optional)</span>
          <textarea
            className={css.textarea}
            value={notes}
            placeholder="e.g. routed through a reed-bed filter"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <p className={css.note}>
          Pin BOTH endpoints to mapped features to earn closed-loop credit;
          free-text flows still count toward the material-flow total.
        </p>
      </div>
    </Modal>
  );
}
