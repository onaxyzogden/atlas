/**
 * GuildTool — point → Guild (Plan Module 5: Plant Systems & Polyculture).
 *
 * Persist-first: skeleton Guild on draw.create, popover patches name +
 * anchor species, removeGuild on Cancel for ESC rollback.
 *
 * Schema notes — Guild (apps/web/src/store/polycultureStore.ts):
 *   - center: [lng, lat] absolute geographic anchor used by PlanDataLayers
 *     and on-map drag. Set here from the click location.
 *   - centroidUv: [u, v] in 0..1 parcel space — parcel-relative position
 *     consumed by GuildSpatialBuilderCard's 2D ring canvas. Derived here
 *     from current map bounds as a coarse anchor; the slide-up can refine.
 *   - anchorSpeciesId: speciesId of the anchor (typically a canopy /
 *     sub-canopy species). The popover offers canopy + sub-canopy options
 *     since those are the typical anchor layers; the slide-up
 *     `GuildSpatialBuilderCard` remains the home for layer composition.
 *   - members: GuildMember[] — left empty here; populated via the slide-up.
 *
 * Yeomans rank 8 (Vegetation). Holmgren P8 (*Integrate rather than
 * segregate*) — guild composition is the integration unit.
 */

import { useMemo } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import { PLANT_DATABASE } from '../../../../data/plantDatabase.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

export default function GuildTool({ map, projectId }: Props) {
  const addGuild = usePolycultureStore((s) => s.addGuild);
  const updateGuild = usePolycultureStore((s) => s.updateGuild);
  const removeGuild = usePolycultureStore((s) => s.removeGuild);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);

  // Anchor species: canopy + sub-canopy layers only (typical guild anchors).
  const anchorOptions = useMemo(() => {
    return PLANT_DATABASE
      .filter((p) => p.layer === 'canopy' || p.layer === 'sub_canopy')
      .map((p) => ({
        value: p.id,
        label: `${p.commonName} (${p.layer === 'canopy' ? 'Canopy' : 'Sub-canopy'})`,
      }));
  }, []);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    onComplete: (geom) => {
      const id = newAnnotationId('gld');
      const anchor = geom.coordinates as [number, number];
      // Derive `centroidUv` from current map bounds — a coarse anchor that
      // the slide-up's GuildSpatialBuilderCard can refine. Falls back to
      // [0.5, 0.5] if bounds unavailable.
      let centroidUv: [number, number] = [0.5, 0.5];
      try {
        const b = map.getBounds();
        const w = b.getWest(), e = b.getEast();
        const s = b.getSouth(), n = b.getNorth();
        const u = e === w ? 0.5 : (anchor[0] - w) / (e - w);
        const v = n === s ? 0.5 : (n - anchor[1]) / (n - s);
        centroidUv = [
          Math.max(0, Math.min(1, u)),
          Math.max(0, Math.min(1, v)),
        ];
      } catch {
        /* bounds unavailable — accept [0.5, 0.5] fallback */
      }

      addGuild({
        id,
        projectId,
        name: 'New guild',
        anchorSpeciesId: '',
        members: [],
        center: anchor,
        centroidUv,
        phase: phaseDefault || undefined,
        createdAt: new Date().toISOString(),
      });

      openForm({
        title: 'Guild',
        anchor,
        fields: [
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'anchorSpeciesId',
            label: 'Anchor species',
            kind: 'select',
            options: anchorOptions,
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          name: 'New guild',
          anchorSpeciesId: '',
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          updateGuild(id, {
            name: String(values.name ?? 'New guild').trim() || 'New guild',
            anchorSpeciesId: String(values.anchorSpeciesId ?? ''),
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => removeGuild(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Guild tool">
      <span className={css.title}>Guild</span>
      <span className={css.hint}>
        Drop a point at the guild anchor — name it and pick a canopy /
        sub-canopy species. Compose layers in the slide-up.
      </span>
    </div>
  );
}
