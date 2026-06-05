/**
 * DocumentCapture — file input + IDB blob + sync op for non-photo documents
 * (PDF receipts, lab reports, etc). Same blob/sync path as PhotoCapture but
 * without `capture="environment"` so it triggers the system file picker.
 */

import { useCallback, useRef, useState } from 'react';
import { FileText, RotateCcw, Upload } from 'lucide-react';
import type {
  FieldActionProofItem,
  ProofSchemaSlot,
} from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import {
  blobUri,
  proofPhotoStore,
} from '../../../../lib/proofPhotoStore.js';
import { syncQueue } from '../../../../lib/syncQueue.js';
import { baseProofItem } from './proofItemBuilder.js';
import css from './ProofCapture.module.css';

interface Props {
  projectId: string;
  actionId: string;
  slot: ProofSchemaSlot;
  existing: FieldActionProofItem | undefined;
}

function formatBytes(bytes: number | undefined): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentCapture({
  projectId,
  actionId,
  slot,
  existing,
}: Props) {
  const attach = useFieldActionStore((s) => s.attachProofItem);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        await proofPhotoStore.putBlob(actionId, slot.id, file);
        const uri = blobUri(actionId, slot.id);
        const item: FieldActionProofItem = {
          ...baseProofItem({
            proofType: 'document',
            slotId: slot.id,
            id: existing?.id,
          }),
          fileUri: uri,
          fileMime: file.type || 'application/octet-stream',
          fileSizeBytes: file.size,
          fileSyncStatus: 'idb-local',
        };
        attach(projectId, actionId, item);

        await syncQueue.enqueue({
          storeType: 'proof_photo_upload',
          action: 'create',
          localId: `${actionId}:${slot.id}`,
          payload: {
            projectId,
            actionId,
            slotId: slot.id,
            proofItemId: item.id,
            fileName: file.name || `${slot.id}.bin`,
            fileMime: file.type || 'application/octet-stream',
            fileSizeBytes: file.size,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save document.');
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [actionId, attach, existing?.id, projectId, slot.id],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  };

  return (
    <div className={css.captureBody}>
      <input
        ref={inputRef}
        type="file"
        className={css.fileHidden}
        onChange={handleChange}
        data-testid={`proof-document-input-${slot.id}`}
      />
      <div className={css.captureRow}>
        <button
          type="button"
          className={css.captureBtn}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          data-testid={`proof-document-capture-${slot.id}`}
        >
          {existing ? (
            <>
              <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
              Replace file
            </>
          ) : (
            <>
              <Upload size={14} strokeWidth={2} aria-hidden="true" />
              {busy ? 'Saving...' : 'Upload document'}
            </>
          )}
        </button>
      </div>
      {existing && (
        <div className={css.thumb}>
          <span className={css.thumbImage} aria-hidden="true">
            <FileText size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className={css.thumbMeta}>
            <span className={css.thumbName}>
              {existing.fileMime ?? 'document'}
            </span>
            <span className={css.thumbDetail}>
              {formatBytes(existing.fileSizeBytes)}
            </span>
          </div>
          <span
            className={css.syncBadge}
            data-status={existing.fileSyncStatus ?? 'idb-local'}
          >
            {existing.fileSyncStatus === 'uploaded'
              ? 'Synced'
              : existing.fileSyncStatus === 'uploading'
                ? 'Uploading'
                : 'On device'}
          </span>
        </div>
      )}
      {error && <span className={css.errorRow}>{error}</span>}
    </div>
  );
}
