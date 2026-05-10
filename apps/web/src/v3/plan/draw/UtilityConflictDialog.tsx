/**
 * UtilityConflictDialog — Plan-stage soft-veto modal for earthworks that
 * intersect a recorded buried utility. Required acknowledgment text
 * gates the Confirm button.
 *
 * Per ADR 2026-05-10-plan-earthwork-utility-veto.md.
 *
 * Mirrors `InlineFeaturePopover`'s anchored-to-map positioning so the
 * dialog appears at the conflict location rather than centered.
 */

import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { AlertTriangle } from 'lucide-react';
import { useUtilityConflictStore } from './utilityConflictStore.js';
import {
  UTILITY_CONFLICT_BUFFER_M,
  type UtilityConflict,
} from '../utils/utilityConflicts.js';
import css from './InlineFeaturePopover.module.css';

interface Props {
  map: MaplibreMap;
}

const KIND_LABEL: Record<UtilityConflict['kind'], string> = {
  water_main: 'Water main',
  gas: 'Gas line',
  fibre: 'Fibre / comms',
  sewer: 'Sewer',
  other: 'Buried utility',
};

const MIN_ACK_CHARS = 3;
const ACK_PLACEHOLDER = 'e.g. located + marked by utility locate';

export default function UtilityConflictDialog({ map }: Props) {
  const active = useUtilityConflictStore((s) => s.active);
  const conflicts = useUtilityConflictStore((s) => s.conflicts);
  const anchor = useUtilityConflictStore((s) => s.anchor);
  const onConfirm = useUtilityConflictStore((s) => s.onConfirm);
  const onCancel = useUtilityConflictStore((s) => s.onCancel);
  const close = useUtilityConflictStore((s) => s.close);

  const [ack, setAck] = useState('');
  const [screen, setScreen] = useState<{ x: number; y: number; flipped: boolean } | null>(null);
  const popoverRef = useRef<HTMLFormElement | null>(null);

  // Reset draft when the dialog opens for a fresh conflict.
  useEffect(() => {
    if (active) setAck('');
  }, [active]);

  useEffect(() => {
    if (!active || !anchor) {
      setScreen(null);
      return;
    }
    const POPOVER_WIDTH = 300;
    const recalc = () => {
      const p = map.project(anchor);
      const canvasW = map.getCanvas().clientWidth;
      const flipped = p.x + POPOVER_WIDTH + 24 > canvasW;
      setScreen({ x: p.x, y: p.y, flipped });
    };
    recalc();
    map.on('move', recalc);
    map.on('zoom', recalc);
    map.on('resize', recalc);
    return () => {
      map.off('move', recalc);
      map.off('zoom', recalc);
      map.off('resize', recalc);
    };
  }, [active, anchor, map]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onCancel, close]);

  if (!active || !screen) return null;

  const canConfirm = ack.trim().length >= MIN_ACK_CHARS;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    onConfirm?.(ack.trim());
    close();
  };

  const handleCancel = () => {
    onCancel?.();
    close();
  };

  return (
    <form
      ref={popoverRef}
      className={css.popover}
      data-flipped={screen.flipped ? 'true' : 'false'}
      style={{ left: screen.x, top: screen.y, borderColor: '#c4422a', minWidth: 280, maxWidth: 320 }}
      onSubmit={handleConfirm}
      role="alertdialog"
      aria-label="Buried utility conflict"
    >
      <span className={css.title} style={{ color: '#e8a892', display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertTriangle size={12} aria-hidden /> Buried utility within {UTILITY_CONFLICT_BUFFER_M} m
      </span>

      <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.92 }}>
        This earthwork crosses or runs close to:
        <ul style={{ margin: '6px 0 0', padding: '0 0 0 16px' }}>
          {conflicts.map((c) => (
            <li key={c.id}>
              <strong>{KIND_LABEL[c.kind]}</strong>
              {c.label ? ` · ${c.label}` : ''}
            </li>
          ))}
        </ul>
      </div>

      <label className={css.field}>
        <span className={css.fieldLabel}>Acknowledgment *</span>
        <span className={css.inputRow}>
          <input
            type="text"
            className={css.input}
            value={ack}
            onChange={(e) => setAck(e.target.value)}
            placeholder={ACK_PLACEHOLDER}
            autoFocus
          />
        </span>
        <span style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>
          Confirm you have located and verified depth on the ground before digging.
        </span>
      </label>

      <div className={css.btnRow}>
        <button
          type="button"
          className={css.secondaryBtn}
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={css.primaryBtn}
          disabled={!canConfirm}
          style={!canConfirm ? undefined : { background: '#c4422a', color: '#f2ede3', borderColor: '#c4422a' }}
        >
          Confirm & place
        </button>
      </div>
    </form>
  );
}
