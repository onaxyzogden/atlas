/**
 * EcologicalNoteTool — point → EcologicalNote (Plan Tier B / B5).
 *
 * One-click marker for site observations that don't warrant a draw type
 * of their own (asset, hazard, indicator species, rest point, disturbed
 * ground). Lives under `principle-verification` in the PLAN toolbar.
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useEcologicalNoteStore,
  NOTE_KIND_CONFIG,
  type EcologicalNoteKind,
} from '../../../../store/ecologicalNoteStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useMapboxDrawTool } from '../../../observe/components/draw/useMapboxDrawTool.js';
import type { SnapTargets } from '../../../lib/snapPoint.js';
import { useInlineFormStore } from '../inlineFormStore.js';
import { usePhaseFieldSpec } from '../usePhaseFieldSpec.js';
import { useEnterpriseFieldSpec } from '../useEnterpriseFieldSpec.js';
import css from '../../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  /** Snap-target source builder; consulted only when snapping is armed. */
  getSnapTargets?: () => SnapTargets;
}

const KIND_OPTIONS: { value: EcologicalNoteKind; label: string }[] = (
  Object.keys(NOTE_KIND_CONFIG) as EcologicalNoteKind[]
).map((k) => ({ value: k, label: NOTE_KIND_CONFIG[k].label }));

export default function EcologicalNoteTool({ map, projectId, getSnapTargets }: Props) {
  const addNote = useEcologicalNoteStore((s) => s.addNote);
  const updateNote = useEcologicalNoteStore((s) => s.updateNote);
  const deleteNote = useEcologicalNoteStore((s) => s.deleteNote);
  const openForm = useInlineFormStore((s) => s.open);
  const { field: phaseField, defaultValue: phaseDefault } = usePhaseFieldSpec(projectId);
  const { field: enterpriseField, defaultValue: enterpriseDefault } = useEnterpriseFieldSpec(projectId);

  useMapboxDrawTool<GeoJSON.Point>({
    map,
    mode: 'draw_point',
    snap: true,
    getSnapTargets,
    onComplete: (geom) => {
      const id = newAnnotationId('note');
      const anchor = geom.coordinates as [number, number];
      const now = new Date().toISOString();
      const kind: EcologicalNoteKind = 'asset';

      addNote({
        id,
        projectId,
        name: NOTE_KIND_CONFIG[kind].label,
        kind,
        geometry: geom,
        color: NOTE_KIND_CONFIG[kind].color,
        notes: '',
        phase: phaseDefault || undefined,
        createdAt: now,
        updatedAt: now,
      });

      openForm({
        title: 'Note',
        anchor,
        fields: [
          {
            key: 'name',
            label: 'Name',
            kind: 'text',
            required: true,
            placeholder: 'e.g., Old oak, Eroded bank',
          },
          {
            key: 'kind',
            label: 'Kind',
            kind: 'select',
            required: true,
            options: KIND_OPTIONS,
          },
          phaseField,
          enterpriseField,
        ],
        initial: {
          name: NOTE_KIND_CONFIG[kind].label,
          kind,
          phase: phaseDefault,
          enterprise: enterpriseDefault,
        },
        onSave: (values) => {
          const nextKind = values.kind as EcologicalNoteKind;
          updateNote(id, {
            name: String(values.name ?? NOTE_KIND_CONFIG[nextKind].label),
            kind: nextKind,
            color: NOTE_KIND_CONFIG[nextKind].color,
            phase: String(values.phase ?? '') || undefined,
            enterprise: String(values.enterprise ?? '') || undefined,
          });
        },
        onCancel: () => deleteNote(id),
      });
    },
  });

  return (
    <div className={css.popover} role="dialog" aria-label="Note tool">
      <span className={css.title}>Note</span>
      <span className={css.hint}>
        Drop a marker — pick its kind (asset, hazard, indicator species,
        rest point, disturbed ground).
      </span>
    </div>
  );
}
