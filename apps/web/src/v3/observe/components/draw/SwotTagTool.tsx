import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationFormStore } from '../../../../store/annotationFormStore.js';
import { type SwotBucket } from '../../../../store/swotStore.js';
import { useMapboxDrawTool } from './useMapboxDrawTool.js';
import { FIELD_SCHEMAS, createWithDefaults } from './annotationFieldSchemas.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  bucket: SwotBucket;
}

const BUCKET_TITLES: Record<SwotBucket, string> = {
  S: 'Strength',
  W: 'Weakness',
  O: 'Opportunity',
  T: 'Threat',
};

export default function SwotTagTool({ map, projectId, bucket }: Props) {
  const open = useAnnotationFormStore((s) => s.open);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      // Bucket is forwarded explicitly here for the auto-create defaults
      // record; the form host re-infers it at save time from the active
      // tool id (`useMapToolStore.activeTool` tail) for the edit patch.
      const id = createWithDefaults(FIELD_SCHEMAS.swotTag, {
        projectId,
        geometry: geom,
        bucket,
      });
      if (id)
        open({
          kind: 'swotTag',
          geometry: geom,
          mode: 'edit',
          existingId: id,
          projectId,
          discardOnCancel: true,
        });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label={BUCKET_TITLES[bucket]}>
      <span className={css.title}>
        {BUCKET_TITLES[bucket]} ({bucket}) tag
      </span>
      <span className={css.hint}>
        Click the map to drop the tag — a form opens to label it.
      </span>
    </div>
  );
}
