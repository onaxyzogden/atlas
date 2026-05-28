/**
 * Helpers for constructing FieldActionProofItem records consistently
 * across the capture components.
 *
 * Every proof item needs an id, ISO `capturedAt`, and `proofType`. Beyond
 * that, type-specific fields are optional. The capture components each
 * spread their own type-specific fields onto `baseProofItem({...})`.
 */

import type {
  FieldActionProofGeotag,
  FieldActionProofItem,
  FieldActionProofType,
} from '@ogden/shared';

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `proof-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function baseProofItem(opts: {
  proofType: FieldActionProofType;
  slotId?: string;
  capturedBy?: string;
  captureGeotag?: FieldActionProofGeotag | null;
  id?: string;
}): FieldActionProofItem {
  return {
    id: opts.id ?? newId(),
    proofType: opts.proofType,
    slotId: opts.slotId,
    capturedAt: new Date().toISOString(),
    capturedBy: opts.capturedBy,
    captureGeotag: opts.captureGeotag ?? null,
  };
}

/**
 * Best-effort device geotag. Resolves to `null` (not a throw) so a capture
 * component can still persist its proof item if the user has location
 * permissions denied or the device has no GPS.
 */
export function tryGetGeotag(
  options: PositionOptions = { enableHighAccuracy: true, timeout: 6000 },
): Promise<FieldActionProofGeotag | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
      },
      () => resolve(null),
      options,
    );
  });
}
