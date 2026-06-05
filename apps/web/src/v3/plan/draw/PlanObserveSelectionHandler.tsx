/**
 * PlanObserveSelectionHandler — listens for clicks on Observe-stage
 * annotation layers rendered on the Plan Current-Land map and opens the
 * `<ObserveLinkPopover>` with the right Observe module preselected.
 *
 * Phase 1: Current-Land view only. Vision-Layout / phase / 3D views
 * don't mount this. Per the Phase 1 plan, edits in those views go
 * through inline-edit popovers (Phase 2 work) — Current Land is link-
 * only since Observe is the source of truth for these features.
 *
 * Implementation: a single `mousedown` handler on the map queries
 * `map.queryRenderedFeatures()` for the topmost Observe layer under
 * the cursor and routes the layer-id prefix to an `ObserveModule`. No
 * per-layer registration: more robust against layer reorders, and
 * Plan layers naturally win at overlap because they paint above
 * `observe-anno-*`.
 */

import { useEffect } from 'react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import type { BuiltEnvironmentEntity } from '@ogden/shared';
import { useObserveLinkPopoverStore } from './observeLinkPopoverStore.js';
import type { ObserveLinkKind } from './observeLinkPopoverStore.js';
import type { AnnotationKind } from '../../observe/components/draw/annotationFieldSchemas.js';
import { useInlineFormStore } from './inlineFormStore.js';
import type { InlineFormPayload } from './inlineFormStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import {
  buildBuildingEditSchema,
  buildWellEditSchema,
  buildSepticEditSchema,
  buildPowerLineEditSchema,
  buildBuriedUtilityEditSchema,
  buildFenceEditSchema,
  buildGateEditSchema,
  buildDrivewayEditSchema,
} from '../layers/inlineEditSchemas.js';

/**
 * Per-kind dispatch table for BE inline-edit popovers. Each entry pairs
 * a layer-id prefix with the V2 entity kind it represents and the schema
 * builder from `inlineEditSchemas`. Replaces eight near-identical if-
 * blocks (Phase 4.3 dedup).
 */
interface BeInlineEditDispatch {
  prefix: string;
  kind: BuiltEnvironmentEntity['kind'];
  build: (entity: BuiltEnvironmentEntity) => Omit<InlineFormPayload, 'anchor'>;
}

const BE_INLINE_EDIT_DISPATCH: readonly BeInlineEditDispatch[] = [
  { prefix: 'observe-anno-be-buildings', kind: 'building', build: buildBuildingEditSchema },
  { prefix: 'observe-anno-be-wells', kind: 'well', build: buildWellEditSchema },
  { prefix: 'observe-anno-be-septics', kind: 'septic', build: buildSepticEditSchema },
  { prefix: 'observe-anno-be-power-lines', kind: 'power-line', build: buildPowerLineEditSchema },
  { prefix: 'observe-anno-be-buried-utilities', kind: 'buried-utility', build: buildBuriedUtilityEditSchema },
  { prefix: 'observe-anno-be-fences', kind: 'fence', build: buildFenceEditSchema },
  { prefix: 'observe-anno-be-gates', kind: 'gate', build: buildGateEditSchema },
  { prefix: 'observe-anno-be-driveways', kind: 'driveway', build: buildDrivewayEditSchema },
];

interface Props {
  map: MaplibreMap;
}

/**
 * Layer-id prefix → Observe module. Order matters when prefixes overlap
 * (none currently do, but keep this reverse-sorted by length to be safe).
 */
interface LayerPrefixEntry {
  prefix: string;
  module: ObserveLinkKind;
  label: string;
}

const LAYER_PREFIX_TO_MODULE: LayerPrefixEntry[] = ([
  { prefix: 'observe-anno-be-buildings', module: 'built-infrastructure', label: 'Building' },
  { prefix: 'observe-anno-be-wells', module: 'built-infrastructure', label: 'Well' },
  { prefix: 'observe-anno-be-septics', module: 'built-infrastructure', label: 'Septic / leach field' },
  { prefix: 'observe-anno-be-power-lines', module: 'built-infrastructure', label: 'Power line' },
  { prefix: 'observe-anno-be-buried-utilities', module: 'built-infrastructure', label: 'Buried utility' },
  { prefix: 'observe-anno-be-fences', module: 'built-infrastructure', label: 'Fence' },
  { prefix: 'observe-anno-be-gates', module: 'built-infrastructure', label: 'Gate' },
  { prefix: 'observe-anno-be-driveways', module: 'built-infrastructure', label: 'Driveway' },
  { prefix: 'observe-anno-human-points', module: 'people-governance', label: 'Human-context pin' },
  { prefix: 'observe-anno-human-roads', module: 'people-governance', label: 'Access road' },
  { prefix: 'observe-anno-human-zones', module: 'people-governance', label: 'Permaculture zone' },
  { prefix: 'observe-anno-hazards', module: 'climate', label: 'Hazard zone' },
  { prefix: 'observe-anno-topography-contours', module: 'topography', label: 'Contour line' },
  { prefix: 'observe-anno-topography-drainage', module: 'topography', label: 'Drainage line' },
  { prefix: 'observe-anno-topography-points', module: 'topography', label: 'High point' },
  { prefix: 'observe-anno-water', module: 'hydrology', label: 'Watercourse' },
  { prefix: 'observe-anno-soil', module: 'hydrology', label: 'Soil sample' },
  { prefix: 'observe-anno-ecology', module: 'hydrology', label: 'Ecology zone' },
  { prefix: 'observe-anno-sectors', module: 'access-circulation', label: 'Sector' },
  { prefix: 'observe-anno-swot', module: 'monitoring-records', label: 'SWOT marker' },
] satisfies LayerPrefixEntry[]).slice().sort((a, b) => b.prefix.length - a.prefix.length);

const ALL_PREFIXES = LAYER_PREFIX_TO_MODULE.map((m) => m.prefix);

function resolveLayer(layerId: string): { module: ObserveLinkKind; label: string } | null {
  for (const entry of LAYER_PREFIX_TO_MODULE) {
    if (layerId.startsWith(entry.prefix)) {
      return { module: entry.module, label: entry.label };
    }
  }
  return null;
}

export default function PlanObserveSelectionHandler({ map }: Props) {
  const open = useObserveLinkPopoverStore((s) => s.open);
  const openInline = useInlineFormStore((s) => s.open);

  useEffect(() => {
    if (!map) return;

    const onMouseDown = (e: MapMouseEvent) => {
      // Only react to layers currently registered on the map. Layers
      // are added/removed dynamically as Observe data changes; query
      // the live registry rather than a static list to avoid warnings.
      const liveLayers: string[] = [];
      try {
        for (const prefix of ALL_PREFIXES) {
          // queryRenderedFeatures throws if a layer id is unknown.
          if (map.getLayer(prefix)) liveLayers.push(prefix);
          // Some prefixes are layer-id roots only (e.g. `…-zones` is
          // exposed as `…-zones-fill`/`…-zones-line`). Walk the map's
          // style to pick up children. MapLibre offers `getStyle()`.
        }
        const style = map.getStyle();
        if (style && Array.isArray(style.layers)) {
          for (const layer of style.layers) {
            if (
              layer.id.startsWith('observe-anno-') &&
              !liveLayers.includes(layer.id) &&
              ALL_PREFIXES.some((p) => layer.id.startsWith(p))
            ) {
              liveLayers.push(layer.id);
            }
          }
        }
      } catch {
        return;
      }
      if (liveLayers.length === 0) return;

      const features = map.queryRenderedFeatures(e.point, { layers: liveLayers });
      if (!features || features.length === 0) return;

      const top = features[0];
      if (!top || !top.layer) return;
      const resolved = resolveLayer(top.layer.id);
      if (!resolved) return;

      // Anchor the popover at the click's map coordinate so it tracks
      // the feature on pan/zoom — matches `InlineFeaturePopover` behaviour.
      const anchor: [number, number] = [e.lngLat.lng, e.lngLat.lat];

      // Pick up an id off the feature's properties when present so
      // Phase 2 can deep-link to the specific record. Most Observe
      // sources stamp `id` onto their features at build time.
      const props = (top.properties ?? {}) as Record<string, unknown>;
      const featureId =
        typeof props.id === 'string'
          ? props.id
          : typeof props.featureId === 'string'
            ? props.featureId
            : typeof props.annoId === 'string'
              ? props.annoId
              : undefined;
      const annoKind =
        typeof props.annoKind === 'string'
          ? (props.annoKind as AnnotationKind)
          : undefined;
      const annoId = typeof props.annoId === 'string' ? props.annoId : undefined;

      // Stop the click from also reaching Plan-stage layers / map
      // background. We're committing to the Observe selection.
      e.preventDefault();
      e.originalEvent.stopPropagation();

      // Phase 4.3: BE kinds open the inline-edit popover instead of the
      // "Edit in Observe →" link popover. Driven by a per-kind table —
      // each entry pairs a layer-id prefix with the V2 entity kind and
      // its `inlineEditSchemas` builder. Remaining Observe kinds keep
      // going through the link popover until their Phase 2 PRs land.
      if (featureId) {
        for (const dispatch of BE_INLINE_EDIT_DISPATCH) {
          if (!top.layer.id.startsWith(dispatch.prefix)) continue;
          const entity = useBuiltEnvironmentStoreV2
            .getState()
            .entities.find((x) => x.id === featureId && x.kind === dispatch.kind);
          if (entity) {
            const schema = dispatch.build(entity);
            openInline({ ...schema, anchor });
            return;
          }
          break;
        }
      }

      open({
        kind: resolved.module,
        label: resolved.label,
        anchor,
        featureId,
        annoKind,
        annoId,
      });
    };

    map.on('mousedown', onMouseDown);
    return () => {
      map.off('mousedown', onMouseDown);
    };
  }, [map, open]);

  return null;
}
