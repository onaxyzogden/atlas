/**
 * PlacementConflictDialog — Plan-stage soft-veto modal for placements that
 * trip warn-severity catalog rules (block-severity rules reject with a
 * toast before this dialog is reached). Required acknowledgment text
 * gates the Confirm button, exactly like the buried-utility veto.
 *
 * Copies `UtilityConflictDialog`'s anchored-to-map positioning (per
 * `InlineFeaturePopover`) but renders in advisory amber rather than veto
 * red — a warn is a steward decision to record, not a hazard to clear.
 *
 * Per the 2026-06-11 placement plan, Phase 3.3.
 */

import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { AlertTriangle } from 'lucide-react';
import { usePlacementConflictStore } from './placementConflictStore.js';
import css from './InlineFeaturePopover.module.css';

interface Props {
  map: MaplibreMap;
}

const MIN_ACK_CHARS = 3;
const ACK_PLACEHOLDER = 'e.g. intentional — splitting this paddock';
const AMBER = '#c4a265';

export default function PlacementConflictDialog({ map }: Props) {
  const active = usePlacementConflictStore((s) => s.active);
  const violations = usePlacementConflictStore((s) => s.violations);
  const anchor = usePlacementConflictStore((s) => s.anchor);
  const onConfirm = usePlacementConflictStore((s) => s.onConfirm);
  const onCancel = usePlacementConflictStore((s) => s.onCancel);
  const close = usePlacementConflictStore((s) => s.close);

  const [ack, setAck] = useState('');
  const [screen, setScreen] = useState<{ x: number; y: number; flipped: boolean } | null>(null);
  const popoverRef = useRef<HTMLFormElement | null>(null);

  // Reset draft when the dialog opens for a fresh placement.
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
      style={{ left: screen.x, top: screen.y, borderColor: AMBER, minWidth: 280, maxWidth: 320 }}
      onSubmit={handleConfirm}
      role="alertdialog"
      aria-label="Placement advisory"
    >
      <span className={css.title} style={{ color: '#e6c987', display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertTriangle size={12} aria-hidden />
        {violations.length === 1 ? 'Placement advisory' : `${violations.length} placement advisories`}
      </span>

      <div style={{ fontSize: 11, lineHeight: 1.4, opacity: 0.92 }}>
        <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
          {violations.map((v) => (
            <li key={v.ruleId} style={{ marginBottom: 4 }}>
              <strong>{v.message}</strong>
              {v.whyItMatters ? (
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 1 }}>{v.whyItMatters}</div>
              ) : null}
              {v.amanahNote ? (
                <div style={{ fontSize: 10, opacity: 0.75, marginTop: 1, fontStyle: 'italic' }}>
                  {v.amanahNote}
                </div>
              ) : null}
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
          Say why this placement is right despite the advisory — it is kept on the record.
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
          style={!canConfirm ? undefined : { background: AMBER, color: '#1a1a14', borderColor: AMBER }}
        >
          Confirm &amp; place
        </button>
      </div>
    </form>
  );
}
