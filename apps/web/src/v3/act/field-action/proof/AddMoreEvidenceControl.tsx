/**
 * AddMoreEvidenceControl — spec §3.4 "Add more evidence" affordance.
 *
 * A drawer that lets the steward attach extra proof items (any proof
 * type) *beyond* the required slot minimum. These items persist without
 * a `slotId` and never block the Submit Task gate. Existing extras are
 * listed read-only here so the steward can confirm they are saved.
 */

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { FieldAction, FieldActionProofType } from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import NoteCapture from './NoteCapture.js';
import MeasurementCapture from './MeasurementCapture.js';
import PhotoCapture from './PhotoCapture.js';
import DocumentCapture from './DocumentCapture.js';
import GpsPointCapture from './GpsPointCapture.js';
import GpsTraceCapture from './GpsTraceCapture.js';
import LoggedResultCapture from './LoggedResultCapture.js';
import css from './ProofCapture.module.css';

interface Props {
  projectId: string;
  action: FieldAction;
}

const TYPES: ReadonlyArray<{ type: FieldActionProofType; label: string }> = [
  { type: 'photo', label: 'Photo' },
  { type: 'note', label: 'Note' },
  { type: 'gps_point', label: 'GPS pin' },
  { type: 'gps_trace', label: 'GPS walk' },
  { type: 'measurement', label: 'Measurement' },
  { type: 'document', label: 'Document' },
];

export default function AddMoreEvidenceControl({ projectId, action }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<FieldActionProofType | null>(null);
  const removeProofItem = useFieldActionStore((s) => s.removeProofItem);

  // Above-minimum items: proof items with no slotId (the schema's slots
  // each have an id and capture proof items that carry that slotId).
  const extras = action.proofItems.filter((p) => !p.slotId);

  // Synthetic "above-minimum" slot — the capture components key off
  // `slot.id`, so we generate a fresh extra-slot id per capture pass so
  // attachProofItem appends a new record rather than replacing an
  // existing one. (Filed extras have a slotId after attach because we
  // stamp one in the synthetic slot — so we strip it post-attach.)
  const captureForType = (type: FieldActionProofType) => {
    if (!pending) return null;
    const syntheticSlot = {
      id: `extra:${type}:${Date.now()}`,
      proofType: type,
      label: 'Extra evidence',
      instruction: 'Above the minimum required by this task category.',
      required: false,
    };
    const common = {
      projectId,
      actionId: action.id,
      slot: syntheticSlot,
      existing: undefined,
    } as const;
    switch (type) {
      case 'photo':
        return <PhotoCapture {...common} />;
      case 'document':
        return <DocumentCapture {...common} />;
      case 'gps_point':
        return <GpsPointCapture {...common} />;
      case 'gps_trace':
        return <GpsTraceCapture {...common} />;
      case 'measurement':
        return <MeasurementCapture {...common} />;
      case 'logged_result':
        return <LoggedResultCapture {...common} />;
      case 'note':
        return <NoteCapture {...common} />;
      default:
        return null;
    }
  };

  return (
    <div>
      {extras.length > 0 && (
        <div className={css.addMoreDrawer} data-testid="extra-evidence-list">
          <span className={css.loggedLabel}>Above-minimum evidence</span>
          {extras.map((item) => (
            <div key={item.id} className={css.thumb}>
              <div className={css.thumbMeta}>
                <span className={css.thumbName}>{item.proofType}</span>
                <span className={css.thumbDetail}>
                  {item.noteText
                    ? item.noteText.slice(0, 60)
                    : item.measurementValue !== undefined
                      ? `${item.measurementValue} ${item.measurementUnit ?? ''}`
                      : item.fileMime ?? '—'}
                </span>
              </div>
              <button
                type="button"
                className={`${css.captureBtn} ${css.captureBtnGhost}`}
                onClick={() => removeProofItem(projectId, action.id, item.id)}
                aria-label={`Remove ${item.proofType}`}
              >
                <X size={12} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
      {!open ? (
        <button
          type="button"
          className={css.addMoreToggle}
          onClick={() => setOpen(true)}
          data-testid="extra-evidence-toggle"
        >
          <Plus size={12} strokeWidth={2} aria-hidden="true" />
          Add more evidence
        </button>
      ) : (
        <div className={css.addMoreDrawer}>
          <div className={css.captureRow}>
            {TYPES.map((opt) => (
              <button
                key={opt.type}
                type="button"
                className={`${css.captureBtn} ${
                  pending === opt.type ? '' : css.captureBtnGhost
                }`}
                onClick={() => setPending(opt.type)}
                data-testid={`extra-evidence-pick-${opt.type}`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              className={`${css.captureBtn} ${css.captureBtnGhost}`}
              onClick={() => {
                setOpen(false);
                setPending(null);
              }}
            >
              <X size={12} strokeWidth={2} aria-hidden="true" />
              Close
            </button>
          </div>
          {pending && captureForType(pending)}
        </div>
      )}
    </div>
  );
}
