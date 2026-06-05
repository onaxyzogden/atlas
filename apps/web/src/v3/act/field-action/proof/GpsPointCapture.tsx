/**
 * GpsPointCapture — `getCurrentPosition` writes a `pointGeometry` proof
 * item. Mobile-first: works fully offline using the device GPS. Includes
 * captureGeotag mirror so the location is available even if a future
 * migration drops `pointGeometry`.
 */

import { useState } from 'react';
import { MapPin, RotateCcw } from 'lucide-react';
import type {
  FieldActionProofItem,
  ProofSchemaSlot,
} from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import { baseProofItem } from './proofItemBuilder.js';
import css from './ProofCapture.module.css';

interface Props {
  projectId: string;
  actionId: string;
  slot: ProofSchemaSlot;
  existing: FieldActionProofItem | undefined;
}

export default function GpsPointCapture({
  projectId,
  actionId,
  slot,
  existing,
}: Props) {
  const attach = useFieldActionStore((s) => s.attachProofItem);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capture = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not available on this device.');
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const item: FieldActionProofItem = {
          ...baseProofItem({
            proofType: 'gps_point',
            slotId: slot.id,
            id: existing?.id,
            captureGeotag: {
              latitude: lat,
              longitude: lng,
              accuracyMeters: pos.coords.accuracy,
            },
          }),
          pointGeometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
        };
        attach(projectId, actionId, item);
        setBusy(false);
      },
      (err) => {
        setError(err.message || 'Could not read location.');
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className={css.captureBody}>
      <div className={css.captureRow}>
        <button
          type="button"
          className={css.captureBtn}
          onClick={capture}
          disabled={busy}
          data-testid={`proof-gps-point-${slot.id}`}
        >
          {existing ? (
            <>
              <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
              Re-capture pin
            </>
          ) : (
            <>
              <MapPin size={14} strokeWidth={2} aria-hidden="true" />
              {busy ? 'Reading GPS...' : 'Drop pin here'}
            </>
          )}
        </button>
        {existing?.pointGeometry && (
          <span className={css.geotag}>
            {existing.pointGeometry.coordinates[1].toFixed(5)},{' '}
            {existing.pointGeometry.coordinates[0].toFixed(5)}
            {existing.captureGeotag?.accuracyMeters !== undefined && (
              <> | accuracy {existing.captureGeotag.accuracyMeters.toFixed(0)}m</>
            )}
          </span>
        )}
      </div>
      {error && <span className={css.errorRow}>{error}</span>}
    </div>
  );
}
