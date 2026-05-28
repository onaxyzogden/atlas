/**
 * DomainOverlayStrip — chip strip above the Domain Detail map (OLOS
 * Observe Dashboard Spec §4). Primary chips are the domain's
 * `defaultOverlayBundle` from OBSERVE_DOMAIN_CATALOG. A secondary
 * `<details>` disclosure surfaces every other universal overlay so the
 * steward can layer an additional signal onto the map without leaving
 * the surface.
 *
 * Reuses the OverlayBundleStrip pattern (`apps/web/src/v3/olos/map/
 * OverlayBundleStrip.tsx`) but skips the stage-aware overlay-wiring
 * lookup — the Domain Detail map mounts overlays straight from the
 * universal catalog via DomainMapHost. Toggle state is owned by the
 * parent (DomainDetailLayout) so the strip and the map stay in sync.
 */

import { useMemo } from 'react';
import {
  UNIVERSAL_OVERLAY_IDS,
  UNIVERSAL_OVERLAY_LABELS,
  type OverlayId,
} from '@ogden/shared';
import css from './DomainOverlayStrip.module.css';

interface Props {
  bundle: readonly OverlayId[];
  activeOverlayIds: readonly OverlayId[];
  onToggle: (overlayId: OverlayId) => void;
}

export default function DomainOverlayStrip({
  bundle,
  activeOverlayIds,
  onToggle,
}: Props) {
  const extraIds = useMemo<readonly OverlayId[]>(() => {
    const inBundle = new Set(bundle);
    return UNIVERSAL_OVERLAY_IDS.filter((id) => !inBundle.has(id));
  }, [bundle]);

  if (bundle.length === 0) {
    return (
      <div className={css.strip} role="toolbar" aria-label="Domain overlays">
        <span className={css.empty}>No overlays bound to this domain.</span>
      </div>
    );
  }

  return (
    <div className={css.strip} role="toolbar" aria-label="Domain overlays">
      <span className={css.lead}>Bundle:</span>
      {bundle.map((overlayId) => {
        const active = activeOverlayIds.includes(overlayId);
        return (
          <button
            key={overlayId}
            type="button"
            className={active ? css.chipActive : css.chip}
            aria-pressed={active}
            onClick={() => onToggle(overlayId)}
          >
            {UNIVERSAL_OVERLAY_LABELS[overlayId]}
          </button>
        );
      })}
      {extraIds.length > 0 ? (
        <details className={css.disclosure}>
          <summary className={css.disclosureToggle}>+ Add layer</summary>
          <div className={css.disclosurePanel}>
            {extraIds.map((overlayId) => {
              const active = activeOverlayIds.includes(overlayId);
              return (
                <button
                  key={overlayId}
                  type="button"
                  className={active ? css.chipActive : css.chipSecondary}
                  aria-pressed={active}
                  onClick={() => onToggle(overlayId)}
                >
                  {UNIVERSAL_OVERLAY_LABELS[overlayId]}
                </button>
              );
            })}
          </div>
        </details>
      ) : null}
    </div>
  );
}
