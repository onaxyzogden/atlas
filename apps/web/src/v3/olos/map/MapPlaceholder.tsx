/**
 * MapPlaceholder — Phase 1.3 stand-in for the live map view.
 *
 * Phase 1.4 replaces this with the real MapLibre / Mapbox base layer plus
 * dynamic overlay registration (one layer per active overlay id). Until
 * then, this surface communicates what the map *would* render given the
 * selected Stage × Domain × Objective × active overlay set.
 */

import {
  STAGE_LABELS,
  UNIVERSAL_DOMAIN_LABELS,
  UNIVERSAL_OVERLAY_LABELS,
  type Stage,
  type UniversalDomain,
  type OverlayId,
} from '@ogden/shared';
import css from './MapPlaceholder.module.css';

export interface MapPlaceholderProps {
  stage: Stage;
  domain: UniversalDomain;
  activeOverlayIds: readonly string[];
}

export default function MapPlaceholder({
  stage,
  domain,
  activeOverlayIds,
}: MapPlaceholderProps) {
  return (
    <div className={css.placeholder} role="img" aria-label="Map placeholder">
      <div className={css.frame}>
        <p className={css.eyebrow}>Phase 1.4 mounts the live map here</p>
        <p className={css.context}>
          <span className={css.stage}>{STAGE_LABELS[stage]}</span>
          <span className={css.sep}>·</span>
          <span className={css.domain}>{UNIVERSAL_DOMAIN_LABELS[domain]}</span>
        </p>
        <div className={css.layers}>
          <p className={css.layersTitle}>
            Active overlays ({activeOverlayIds.length})
          </p>
          {activeOverlayIds.length === 0 ? (
            <p className={css.empty}>
              No overlays are currently visible — toggle one above to bring it
              onto the map.
            </p>
          ) : (
            <ul className={css.layerList}>
              {activeOverlayIds.map((id) => (
                <li key={id} className={css.layerItem}>
                  {UNIVERSAL_OVERLAY_LABELS[id as OverlayId] ?? id}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
