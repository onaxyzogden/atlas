/**
 * DivergenceCaptureForm — bottom-sheet / side-panel per OLOS Act Command
 * Center Spec v1 §6.2. Captures a DivergenceFlag with the §6.4 required
 * minimum (type + photo + note) and an optional GPS point.
 *
 * On submit: builds a DivergenceFlag and dispatches `markDiverged`, which
 * (1) routes the action to `diverged`, (2) appends a divergence observation
 * to the Observe feed via the fieldActionStore wiring, and (3) raises the
 * Plan revision flag for the parent objective via cyclicalReviewStore.
 *
 * The photo follows the same IDB-first contract as PhotoCapture (Slice 3.4):
 * blob in IndexedDB → `fileUri: idb://...` → sync queue enqueues upload.
 */

import { useRef, useState } from 'react';
import { Camera, Crosshair, ImageIcon, Save, X } from 'lucide-react';
import type {
  DivergenceFlag,
  DivergenceType,
  FieldAction,
  FieldActionProofItem,
} from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import { blobUri, proofPhotoStore } from '../../../../lib/proofPhotoStore.js';
import { syncQueue } from '../../../../lib/syncQueue.js';
import {
  baseProofItem,
  tryGetGeotag,
} from '../proof/proofItemBuilder.js';
import DivergenceTypeSelector from './DivergenceTypeSelector.js';
import css from './Divergence.module.css';

interface Props {
  projectId: string;
  action: FieldAction;
  onDone: () => void;
  onCancel: () => void;
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `flag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DIVERGENCE_SLOT_ID = 'divergence-evidence';

export default function DivergenceCaptureForm({
  projectId,
  action,
  onDone,
  onCancel,
}: Props) {
  const markDiverged = useFieldActionStore((s) => s.markDiverged);
  const [type, setType] = useState<DivergenceType | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<FieldActionProofItem | null>(null);
  const [gpsPoint, setGpsPoint] = useState<FieldActionProofItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const canSubmit =
    type !== null && note.trim().length > 0 && photo !== null && !busy;

  const handlePhoto = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      // Keep divergence photos in IDB just like proof photos. We use a
      // synthesised slot id so they don't collide with the action's own
      // proof items in the IDB key namespace.
      await proofPhotoStore.putBlob(action.id, DIVERGENCE_SLOT_ID, file);
      const geotag = await tryGetGeotag();
      const item: FieldActionProofItem = {
        ...baseProofItem({
          proofType: 'photo',
          slotId: DIVERGENCE_SLOT_ID,
          captureGeotag: geotag,
        }),
        fileUri: blobUri(action.id, DIVERGENCE_SLOT_ID),
        fileMime: file.type || 'image/jpeg',
        fileSizeBytes: file.size,
        fileSyncStatus: 'idb-local',
      };
      setPhoto(item);

      await syncQueue.enqueue({
        storeType: 'proof_photo_upload',
        action: 'create',
        localId: `${action.id}:${DIVERGENCE_SLOT_ID}`,
        payload: {
          projectId,
          actionId: action.id,
          slotId: DIVERGENCE_SLOT_ID,
          proofItemId: item.id,
          fileName: file.name || 'divergence.jpg',
          fileMime: file.type || 'image/jpeg',
          fileSizeBytes: file.size,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save photo.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleGps = async () => {
    setError(null);
    const geotag = await tryGetGeotag();
    if (!geotag) {
      setError('Location not available.');
      return;
    }
    setGpsPoint({
      ...baseProofItem({
        proofType: 'gps_point',
        slotId: 'divergence-gps',
        captureGeotag: geotag,
      }),
    });
  };

  const handleSubmit = () => {
    if (!canSubmit || !type || !photo) return;
    const proofItems: FieldActionProofItem[] = [photo];
    if (gpsPoint) proofItems.push(gpsPoint);
    const flag: DivergenceFlag = {
      id: newId(),
      type,
      noteText: note.trim(),
      proofItems,
      capturedAt: new Date().toISOString(),
      parentObjectiveId: action.planObjectiveId,
      resolutionStatus: 'open',
    };
    markDiverged(projectId, action.id, flag);
    onDone();
  };

  return (
    <div className={css.form} data-testid="divergence-capture-form">
      <div className={css.formHeader}>
        <h3 className={css.formTitle}>Reality diverges from the plan</h3>
        <button
          type="button"
          className={css.cancelBtn}
          onClick={onCancel}
          aria-label="Close divergence capture"
        >
          <X size={12} strokeWidth={2} aria-hidden="true" />
          Close
        </button>
      </div>
      <p className={css.formIntro}>
        Divergence is field-truth, not failure. Capture what you saw so it
        flows to Observe and the parent objective can be reviewed.
      </p>

      <div>
        <span className={css.fieldLabel}>What changed?</span>
        <DivergenceTypeSelector value={type} onChange={setType} disabled={busy} />
      </div>

      <div>
        <span className={css.fieldLabel}>Note (required)</span>
        <textarea
          className={css.notesArea}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Briefly describe the divergence so a reviewer can act on it."
          data-testid="divergence-note"
        />
      </div>

      <div>
        <span className={css.fieldLabel}>Photo (required)</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={css.photoInput}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handlePhoto(file);
          }}
          data-testid="divergence-photo-input"
        />
        <div className={css.row}>
          <button
            type="button"
            className={css.attachBtn}
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            data-testid="divergence-photo-capture"
          >
            {photo ? (
              <>
                <ImageIcon size={14} strokeWidth={2} aria-hidden="true" />
                Replace photo
              </>
            ) : (
              <>
                <Camera size={14} strokeWidth={2} aria-hidden="true" />
                {busy ? 'Saving...' : 'Take photo'}
              </>
            )}
          </button>
          {photo && (
            <span className={css.attachedBadge} data-testid="divergence-photo-attached">
              <ImageIcon size={12} strokeWidth={2} aria-hidden="true" />
              Photo attached
            </span>
          )}
        </div>
      </div>

      <div>
        <span className={css.fieldLabel}>Location (recommended)</span>
        <div className={css.row}>
          <button
            type="button"
            className={css.attachBtn}
            onClick={handleGps}
            disabled={busy}
            data-testid="divergence-gps-capture"
          >
            <Crosshair size={14} strokeWidth={2} aria-hidden="true" />
            {gpsPoint ? 'Update location' : 'Capture location'}
          </button>
          {gpsPoint?.captureGeotag && (
            <span className={css.attachedBadge}>
              <Crosshair size={12} strokeWidth={2} aria-hidden="true" />
              {gpsPoint.captureGeotag.latitude.toFixed(4)},{' '}
              {gpsPoint.captureGeotag.longitude.toFixed(4)}
            </span>
          )}
        </div>
      </div>

      {error && <span className={css.errorRow}>{error}</span>}

      <div className={css.actions}>
        <button
          type="button"
          className={css.submitBtn}
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="divergence-submit"
        >
          <Save size={12} strokeWidth={2} aria-hidden="true" />
          Submit divergence
        </button>
        <button
          type="button"
          className={css.cancelBtn}
          onClick={onCancel}
          data-testid="divergence-cancel"
        >
          Cancel
        </button>
        {!canSubmit && type !== null && (
          <span className={css.hint}>Type, note, and a photo are required.</span>
        )}
      </div>
    </div>
  );
}
