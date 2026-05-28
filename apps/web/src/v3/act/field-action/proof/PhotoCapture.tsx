/**
 * PhotoCapture — `<input type="file" accept="image/*" capture="environment">`
 * routed through the IDB blob store (proofPhotoStore) so the photo lands
 * locally first. The proof item records `fileUri: idb://...` and
 * `fileSyncStatus: 'idb-local'`. An entry is enqueued on the sync queue
 * with `storeType: 'proof_photo_upload'`; syncService swaps the local
 * URI for a canonical `storage://...` URI on successful upload.
 *
 * Device geotag is best-effort: if the user has location permissions
 * denied the photo still saves, just without coordinates.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImageIcon, RotateCcw } from 'lucide-react';
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
import { baseProofItem, tryGetGeotag } from './proofItemBuilder.js';
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

export default function PhotoCapture({
  projectId,
  actionId,
  slot,
  existing,
}: Props) {
  const attach = useFieldActionStore((s) => s.attachProofItem);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve thumbnail from IDB when an existing proof item is local-only.
  useEffect(() => {
    let revoked: string | null = null;
    setThumbUrl(null);
    if (!existing) return;
    if (existing.fileUri && existing.fileSyncStatus === 'uploaded') {
      // Already uploaded to backend storage — show as text-only meta;
      // backend retrieval beyond this slice is out of scope.
      return;
    }
    void (async () => {
      const url = await proofPhotoStore.getBlobUrl(actionId, slot.id);
      if (url) {
        revoked = url;
        setThumbUrl(url);
      }
    })();
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [actionId, slot.id, existing?.id, existing?.fileUri, existing?.fileSyncStatus]);

  const handleFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        await proofPhotoStore.putBlob(actionId, slot.id, file);
        const uri = blobUri(actionId, slot.id);
        const geotag = await tryGetGeotag();
        const item: FieldActionProofItem = {
          ...baseProofItem({
            proofType: 'photo',
            slotId: slot.id,
            id: existing?.id,
            captureGeotag: geotag,
          }),
          fileUri: uri,
          fileMime: file.type || 'image/jpeg',
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
            fileName: file.name || `${slot.id}.jpg`,
            fileMime: file.type || 'image/jpeg',
            fileSizeBytes: file.size,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save photo.');
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
        accept="image/*"
        capture="environment"
        className={css.fileHidden}
        onChange={handleChange}
        data-testid={`proof-photo-input-${slot.id}`}
      />
      <div className={css.captureRow}>
        <button
          type="button"
          className={css.captureBtn}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          data-testid={`proof-photo-capture-${slot.id}`}
        >
          {existing ? (
            <>
              <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
              Retake photo
            </>
          ) : (
            <>
              <Camera size={14} strokeWidth={2} aria-hidden="true" />
              {busy ? 'Saving...' : 'Take photo'}
            </>
          )}
        </button>
      </div>
      {existing && (
        <div className={css.thumb}>
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={slot.label}
              className={css.thumbImage}
              data-testid={`proof-photo-thumb-${slot.id}`}
            />
          ) : (
            <span className={css.thumbImage} aria-hidden="true">
              <ImageIcon size={20} strokeWidth={1.5} aria-hidden="true" />
            </span>
          )}
          <div className={css.thumbMeta}>
            <span className={css.thumbName}>
              {existing.fileMime ?? 'image'}
            </span>
            <span className={css.thumbDetail}>
              {formatBytes(existing.fileSizeBytes)}
              {existing.captureGeotag &&
                ` | ${existing.captureGeotag.latitude.toFixed(4)}, ${existing.captureGeotag.longitude.toFixed(4)}`}
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
