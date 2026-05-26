/**
 * OverlayBundleStrip — chip strip above the map view.
 *
 * Primary chips are the Objective's default OverlayBundle. A secondary
 * `<details>` disclosure surfaces every overlay outside the bundle so
 * the steward can layer an extra signal onto the map without leaving
 * the workspace (per dev-spec §5 — bundles are defaults, not lockdowns).
 *
 * Active state is toggled via `onToggle(overlayId)`. The strip reads
 * the stage-aware overlay registry to surface a small placeholder hint
 * when the active overlay is not yet wired live (Phase 1.4 catalogue;
 * layer wiring follows in a later slice).
 */

import { useMemo } from 'react';
import {
  UNIVERSAL_OVERLAY_IDS,
  UNIVERSAL_OVERLAY_LABELS,
  type OverlayBundle,
  type OverlayId,
  type Stage,
} from '@ogden/shared';
import { getOverlayWiring } from './overlayRegistry.js';
import css from './OverlayBundleStrip.module.css';

export interface OverlayBundleStripProps {
  stage: Stage;
  bundle: OverlayBundle;
  activeOverlayIds: readonly string[];
  onToggle: (overlayId: OverlayId) => void;
}

export default function OverlayBundleStrip({
  stage,
  bundle,
  activeOverlayIds,
  onToggle,
}: OverlayBundleStripProps) {
  const extraIds = useMemo<readonly OverlayId[]>(() => {
    const inBundle = new Set(bundle);
    return UNIVERSAL_OVERLAY_IDS.filter((id) => !inBundle.has(id));
  }, [bundle]);

  const activePlaceholder = useMemo(() => {
    for (const id of activeOverlayIds) {
      const wiring = getOverlayWiring(stage, id as OverlayId);
      if (wiring?.status === 'placeholder' && wiring.legendNote) {
        return wiring.legendNote;
      }
    }
    return undefined;
  }, [stage, activeOverlayIds]);

  if (bundle.length === 0) {
    return (
      <div className={css.strip} role="toolbar" aria-label="Overlay bundle">
        <span className={css.empty}>No overlays bound to this objective.</span>
      </div>
    );
  }

  return (
    <div className={css.strip} role="toolbar" aria-label="Overlay bundle">
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

      {activePlaceholder ? (
        <span className={css.placeholderNote}>{activePlaceholder}</span>
      ) : null}
    </div>
  );
}
