/**
 * PlanScheduledMovesOverlay — cross-stage surfacing of ACT-stage plans on the
 * Plan-stage map.
 *
 * The steward designs paddocks and structures in Plan, and schedules livestock
 * moves against them in Act (`RotationScheduleCard`, Structure-moves tail).
 * Until this overlay shipped, those plans were invisible from the Plan-stage
 * map — the operator had to switch stages to remember "this paddock has a
 * planned move next week."
 *
 * Surface: one badge per destination (paddock or structure) that has at least
 * one *unfulfilled* `ScheduledLivestockMove`. Badge text:
 *   "📅 N · <soonest YYYY-MM-DD>"
 * positioned at the destination's centroid. Read-only — editing still happens
 * on the Act-stage card.
 *
 * Visibility gated on `useMatrixTogglesStore.scheduledMoves`. Default off so
 * existing stewards don't inherit an unfamiliar layer.
 */

import { useEffect, useMemo } from 'react';
import * as turf from '@turf/turf';
import { maplibregl } from '../../../lib/maplibre.js';
import { useMatrixTogglesStore } from '../../../store/matrixTogglesStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import {
  useAllStructures,
  getAllStructures,
} from '../../../store/builtEnvironmentSelectors.js';
import {
  useScheduledLivestockMoveStore,
  plansByPaddock,
  plansByStructure,
  type ScheduledLivestockMove,
} from '../../../store/scheduledLivestockMoveStore.js';
import {
  DIRECTION_OPTIONS,
  SPECIES_OPTIONS,
  type LivestockMoveDirection,
} from '../../../store/livestockMoveLogStore.js';
import type { LivestockSpecies } from '../../../store/livestockStore.js';
import { useInlineFormStore } from '../draw/inlineFormStore.js';
import {
  originDisclosureField,
  parseOriginValue,
  encodeOriginValue,
} from '../../act/originPicker.js';

const PLAN_DIRECTION_OPTIONS = DIRECTION_OPTIONS.filter(
  (o) => o.value !== 'rotate_through',
);
const DIRECTION_VALUES = PLAN_DIRECTION_OPTIONS.map((o) => o.value);
const SPECIES_VALUES = SPECIES_OPTIONS.map((o) => o.value);

function isDirection(s: string): s is LivestockMoveDirection {
  return (DIRECTION_VALUES as string[]).includes(s);
}
function isSpecies(s: string): s is LivestockSpecies {
  return (SPECIES_VALUES as string[]).includes(s);
}

function planOptionLabel(p: ScheduledLivestockMove): string {
  const dir = PLAN_DIRECTION_OPTIONS.find((o) => o.value === p.direction)?.label ?? p.direction;
  const sp = SPECIES_OPTIONS.find((o) => o.value === p.species)?.label ?? p.species;
  return `${p.plannedDate} · ${dir} · ${sp}`;
}

const SOURCE_ID = 'plan-scheduled-moves-source';
const BG_LAYER = 'plan-scheduled-moves-bg';
const TEXT_LAYER = 'plan-scheduled-moves-text';

interface Props {
  map: maplibregl.Map;
  projectId: string;
}

export default function PlanScheduledMovesOverlay({ map, projectId }: Props) {
  const visible = useMatrixTogglesStore((s) => s.scheduledMoves);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const structures = useAllStructures();
  const plans = useScheduledLivestockMoveStore((s) => s.plans);
  const openForm = useInlineFormStore((s) => s.open);

  const fc = useMemo<GeoJSON.FeatureCollection>(() => {
    // Group unfulfilled plans by destination key (paddock:id | structure:id).
    type Bucket = {
      destKind: 'paddock' | 'structure';
      destId: string;
      count: number;
      soonest: string;
    };
    const buckets = new Map<string, Bucket>();
    for (const p of plans) {
      if (p.projectId !== projectId) continue;
      if (p.fulfilledByEventId) continue;
      const destKind: 'paddock' | 'structure' = p.toPaddockId ? 'paddock' : 'structure';
      const destId = p.toPaddockId ?? p.toStructureId ?? '';
      if (!destId) continue;
      const key = `${destKind}:${destId}`;
      const cur = buckets.get(key);
      if (!cur) {
        buckets.set(key, {
          destKind,
          destId,
          count: 1,
          soonest: p.plannedDate,
        });
      } else {
        cur.count += 1;
        if (p.plannedDate < cur.soonest) cur.soonest = p.plannedDate;
      }
    }

    const today = new Date().toISOString().slice(0, 10);
    const features: GeoJSON.Feature[] = [];
    for (const b of buckets.values()) {
      let anchor: [number, number] | null = null;
      if (b.destKind === 'paddock') {
        const pd = paddocks.find((x) => x.id === b.destId && x.projectId === projectId);
        if (!pd) continue;
        try {
          const c = turf.centroid(pd.geometry).geometry.coordinates as [number, number];
          anchor = c;
        } catch {
          /* skip malformed geom */
        }
      } else {
        const st = structures.find((x) => x.id === b.destId && x.projectId === projectId);
        if (!st) continue;
        anchor = st.center;
      }
      if (!anchor) continue;
      const pastDue = b.soonest < today;
      const label = `\u{1F4C5} ${b.count} · ${b.soonest}`;
      features.push({
        type: 'Feature',
        id: `${b.destKind}-${b.destId}`,
        geometry: { type: 'Point', coordinates: anchor },
        properties: {
          destKind: b.destKind,
          destId: b.destId,
          count: b.count,
          soonest: b.soonest,
          pastDue,
          label,
        },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [plans, paddocks, structures, projectId]);

  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      const src = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (!src) {
        map.addSource(SOURCE_ID, { type: 'geojson', data: fc });
      } else {
        src.setData(fc);
      }
      // Pill background — drawn behind the text via layer ordering.
      if (!map.getLayer(BG_LAYER)) {
        map.addLayer({
          id: BG_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            // Empty text on the bg layer; the visual pill is the text-halo
            //  on the text layer. We keep this layer present so it can act
            //  as a hit target if a click handler is added later.
            'text-field': '',
            'text-allow-overlap': true,
            'icon-allow-overlap': true,
          },
        });
      }
      if (!map.getLayer(TEXT_LAYER)) {
        map.addLayer({
          id: TEXT_LAYER,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'text-field': ['get', 'label'],
            'text-size': 11,
            'text-anchor': 'center',
            'text-allow-overlap': true,
            'text-ignore-placement': true,
            'text-padding': 2,
          },
          paint: {
            'text-color': ['case', ['get', 'pastDue'], '#a3401d', '#2d2a23'],
            'text-halo-color': ['case', ['get', 'pastDue'], '#f5cbb8', '#f7efd8'],
            'text-halo-width': 3,
            'text-halo-blur': 0.5,
          },
        });
      }
      [BG_LAYER, TEXT_LAYER].forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
        }
      });
    };

    const ready = () => (map.getStyle()?.layers?.length ?? 0) > 0;
    if (ready()) ensure();
    const onStyle = () => {
      if (!ready()) return;
      ensure();
    };
    map.on('styledata', onStyle);
    return () => {
      map.off('styledata', onStyle);
    };
  }, [map, fc, visible]);

  // Click + cursor wiring on the badge text layer (the bg layer has empty
  //  text so it can't be hit-tested; the text layer is the visible pill).
  useEffect(() => {
    if (!map) return;
    if (!visible) return;

    const loadPlanIntoValues = (
      p: ScheduledLivestockMove,
    ): Record<string, string | number> => {
      const originRef =
        p.fromPaddockId
          ? ({ kind: 'paddock', id: p.fromPaddockId } as const)
          : p.fromStructureId
            ? ({ kind: 'structure', id: p.fromStructureId } as const)
            : null;
      return {
        planId: p.id,
        plannedDate: p.plannedDate,
        direction: p.direction,
        species: p.species,
        headCount: p.headCount == null ? '' : p.headCount,
        who: p.who ?? '',
        notes: p.notes ?? '',
        origin: encodeOriginValue(originRef),
      };
    };

    const openEditForm = (
      anchor: [number, number],
      destKind: 'paddock' | 'structure',
      destId: string,
      destName: string,
      destPlans: ScheduledLivestockMove[],
    ) => {
      if (destPlans.length === 0) return;
      const activePlan = destPlans[0]!;

      const planSelectField =
        destPlans.length > 1
          ? [
              {
                key: 'planId',
                label: 'Plan',
                kind: 'select' as const,
                required: true,
                options: destPlans.map((p) => ({
                  value: p.id,
                  label: planOptionLabel(p),
                })),
              },
            ]
          : [];

      openForm({
        title: `Edit plan — ${destName}`,
        anchor,
        fields: [
          ...planSelectField,
          { key: 'plannedDate', label: 'Planned date', kind: 'text',   required: true, placeholder: 'YYYY-MM-DD' },
          { key: 'direction',   label: 'Direction',    kind: 'select', required: true, options: PLAN_DIRECTION_OPTIONS },
          { key: 'species',     label: 'Species',      kind: 'select', required: true, options: SPECIES_OPTIONS },
          { key: 'headCount',   label: 'Head',         kind: 'number', placeholder: 'e.g. 24' },
          { key: 'who',         label: 'Who',          kind: 'text',   placeholder: 'optional' },
          { key: 'notes',       label: 'Notes',        kind: 'text',   placeholder: 'optional' },
          originDisclosureField(projectId, { kind: destKind, id: destId }),
        ],
        initial: loadPlanIntoValues(activePlan),
        onValuesChange: (next, prev, changed) => {
          if (changed.key !== 'planId') return;
          const switchedId = String(changed.value ?? '');
          const switched = destPlans.find((p) => p.id === switchedId);
          if (!switched) return;
          const reloaded = loadPlanIntoValues(switched);
          // Keep planId from `next` (already updated by base setter); merge
          //  all other fields from the freshly-loaded plan.
          const patch: Partial<Record<string, string | number>> = {};
          for (const [k, v] of Object.entries(reloaded)) {
            if (k === 'planId') continue;
            patch[k] = v;
          }
          return patch;
        },
        onSave: (values) => {
          const planId = String(values.planId ?? activePlan.id);
          const rawDir = String(values.direction ?? '').trim();
          const direction: LivestockMoveDirection = isDirection(rawDir) ? rawDir : 'move_in';
          const rawSpecies = String(values.species ?? '').trim();
          const species: LivestockSpecies = isSpecies(rawSpecies) ? rawSpecies : activePlan.species;
          const rawHead = String(values.headCount ?? '').trim();
          const headCount =
            rawHead !== '' && Number.isFinite(Number(rawHead)) ? Number(rawHead) : null;
          const who = String(values.who ?? '').trim();
          const notes = String(values.notes ?? '').trim();
          const origin = parseOriginValue(values.origin);
          const plannedDate = String(values.plannedDate ?? activePlan.plannedDate);

          useScheduledLivestockMoveStore.getState().updatePlan(planId, {
            plannedDate,
            direction,
            species,
            headCount,
            who: who === '' ? undefined : who,
            notes: notes === '' ? undefined : notes,
            fromPaddockId: origin?.kind === 'paddock' ? origin.id : undefined,
            fromStructureId: origin?.kind === 'structure' ? origin.id : undefined,
          });
        },
        onCancel: () => {
          /* edit-mode: nothing to roll back */
        },
        customActions: [
          {
            label: 'Remove plan',
            variant: 'danger',
            onClick: (values, close) => {
              const planId = String(values.planId ?? activePlan.id);
              useScheduledLivestockMoveStore.getState().removePlan(planId);
              close();
            },
          },
        ],
      });
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [TEXT_LAYER],
      });
      const f = features[0];
      if (!f) return;
      const props = f.properties ?? {};
      const destKind = props.destKind as 'paddock' | 'structure' | undefined;
      const destId = props.destId as string | undefined;
      if (!destKind || !destId) return;

      // Fetch live state (handler closure shouldn't carry a stale snapshot).
      const livePlans = useScheduledLivestockMoveStore.getState().plans;
      const destPlans =
        destKind === 'paddock'
          ? plansByPaddock(livePlans, projectId, destId)
          : plansByStructure(livePlans, projectId, destId);
      if (destPlans.length === 0) return;

      let anchor: [number, number] | null = null;
      let destName = destKind === 'paddock' ? 'paddock' : 'structure';
      if (destKind === 'paddock') {
        const pd = useLivestockStore
          .getState()
          .paddocks.find((x) => x.id === destId && x.projectId === projectId);
        if (!pd) return;
        try {
          anchor = turf.centroid(pd.geometry).geometry.coordinates as [number, number];
        } catch {
          return;
        }
        destName = pd.name || 'paddock';
      } else {
        const st = getAllStructures().find(
          (x) => x.id === destId && x.projectId === projectId,
        );
        if (!st) return;
        anchor = st.center;
        destName = st.name || st.type;
      }
      if (!anchor) return;
      // Prevent the click from also reaching any armed draw tool.
      e.preventDefault?.();
      openEditForm(anchor, destKind, destId, destName, destPlans);
    };

    const onEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', TEXT_LAYER, onClick);
    map.on('mouseenter', TEXT_LAYER, onEnter);
    map.on('mouseleave', TEXT_LAYER, onLeave);
    return () => {
      map.off('click', TEXT_LAYER, onClick);
      map.off('mouseenter', TEXT_LAYER, onEnter);
      map.off('mouseleave', TEXT_LAYER, onLeave);
    };
  }, [map, visible, projectId, openForm]);

  return null;
}
