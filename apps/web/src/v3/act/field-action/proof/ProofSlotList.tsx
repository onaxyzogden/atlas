/**
 * ProofSlotList — top of the expanded ActTaskDetail per spec §5.3
 * (Active task detail). Renders the proof schema's slots in order, each
 * row showing slot meta + the matching capture component for the slot's
 * proofType. Filled slots flip to a solid green border.
 *
 * "Add more evidence" lives in `AddMoreEvidenceControl` (below the
 * required list).
 */

import {
  Camera,
  ClipboardList,
  FileText,
  MapPin,
  Route,
  Ruler,
  StickyNote,
} from 'lucide-react';
import type {
  FieldAction,
  FieldActionProofType,
  ProofSchemaSlot,
} from '@ogden/shared';
import { getProofSchema } from '@ogden/shared';
import ProofSlotCapture from './ProofSlotCapture.js';
import AddMoreEvidenceControl from './AddMoreEvidenceControl.js';
import css from './ProofCapture.module.css';

interface Props {
  projectId: string;
  action: FieldAction;
}

const ICON: Record<FieldActionProofType, typeof Camera> = {
  photo: Camera,
  gps_point: MapPin,
  gps_trace: Route,
  measurement: Ruler,
  logged_result: ClipboardList,
  note: StickyNote,
  document: FileText,
};

export default function ProofSlotList({ projectId, action }: Props) {
  const schema = getProofSchema(action.proofSchemaId);
  if (!schema) {
    return (
      <div className={css.note} data-testid="proof-list-missing-schema">
        Proof schema <code>{action.proofSchemaId}</code> is not in the seeded
        catalog. The Submit button stays disabled until a valid schema is
        attached.
      </div>
    );
  }

  return (
    <div className={css.captureBody} data-testid="proof-slot-list">
      {schema.slots.map((slot: ProofSchemaSlot) => {
        const existing = action.proofItems.find((p) => p.slotId === slot.id);
        const filled = Boolean(existing);
        const Icon = ICON[slot.proofType] ?? Camera;
        return (
          <div
            key={slot.id}
            className={css.slot}
            data-filled={filled ? 'true' : 'false'}
            data-slot-id={slot.id}
          >
            <div className={css.slotHeader}>
              <span className={css.slotIcon}>
                <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div className={css.slotMeta}>
                <span className={css.slotLabel}>
                  {slot.label}
                  {!slot.required && <> (optional)</>}
                </span>
                {slot.instruction && (
                  <span className={css.slotInstruction}>{slot.instruction}</span>
                )}
              </div>
              <span
                className={css.slotState}
                data-filled={filled ? 'true' : 'false'}
              >
                {filled ? 'Captured' : 'Pending'}
              </span>
            </div>
            <ProofSlotCapture
              projectId={projectId}
              actionId={action.id}
              slot={slot}
              existing={existing}
            />
          </div>
        );
      })}
      <AddMoreEvidenceControl projectId={projectId} action={action} />
    </div>
  );
}
