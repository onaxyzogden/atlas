/**
 * usePhaseFieldSpec — shared helper for the inline draw-tool popovers.
 *
 * Returns a ready-to-spread `FieldSpec` for the build-phase select plus a
 * default value to seed `initial.phase`. Sourced from `phaseStore` so all
 * 11 PLAN draw tools render the same dynamic phase list and respect the
 * active phase filter as the default.
 *
 * Default rule (in order): the active filter when it's a real phase id of
 * the current project; otherwise the project's lowest-order phase id;
 * otherwise the empty string ("Unassigned").
 */

import { useMemo } from 'react';
import { usePhaseStore } from '../../../store/phaseStore.js';
import type { FieldSpec } from './inlineFormStore.js';

export function usePhaseFieldSpec(projectId: string): {
  field: FieldSpec;
  defaultValue: string;
} {
  const allPhases = usePhaseStore((s) => s.phases);
  const activeFilter = usePhaseStore((s) => s.activeFilter);

  return useMemo(() => {
    const phases = allPhases
      .filter((p) => p.projectId === projectId)
      .sort((a, b) => a.order - b.order);

    const options: NonNullable<FieldSpec['options']> = [
      { value: '', label: '— Unassigned —' },
      ...phases.map((p) => ({
        value: p.id,
        label: `${p.name} · ${p.timeframe}`,
      })),
    ];

    const isRealActive =
      activeFilter !== 'all' && phases.some((p) => p.id === activeFilter);
    const defaultValue = isRealActive
      ? activeFilter
      : (phases[0]?.id ?? '');

    return {
      field: {
        key: 'phase',
        label: 'Phase',
        kind: 'select',
        required: false,
        options,
      },
      defaultValue,
    };
  }, [allPhases, activeFilter, projectId]);
}
