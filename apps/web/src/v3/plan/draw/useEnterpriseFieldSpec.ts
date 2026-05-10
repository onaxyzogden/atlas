/**
 * useEnterpriseFieldSpec — shared helper for the inline draw-tool popovers.
 *
 * Returns a ready-to-spread `FieldSpec` for the enterprise select plus a
 * default value to seed `initial.enterprise`. Sourced from
 * `enterpriseStore` so all 11 PLAN draw tools render the same project-
 * scoped enterprise list.
 *
 * Default rule: empty string ("None") — enterprise tagging is opt-in,
 * not auto-assigned. Rendered to an empty list when no enterprises exist
 * (steward sees only the "— None —" option until they create one in the
 * Multi-Enterprise card).
 */

import { useMemo } from 'react';
import { useEnterpriseStore } from '../../../store/enterpriseStore.js';
import type { FieldSpec } from './inlineFormStore.js';

export function useEnterpriseFieldSpec(projectId: string): {
  field: FieldSpec;
  defaultValue: string;
} {
  const allEnterprises = useEnterpriseStore((s) => s.enterprises);

  return useMemo(() => {
    const enterprises = allEnterprises.filter((e) => e.projectId === projectId);

    const options: NonNullable<FieldSpec['options']> = [
      { value: '', label: '— None —' },
      ...enterprises.map((e) => ({ value: e.id, label: e.name })),
    ];

    return {
      field: {
        key: 'enterprise',
        label: 'Enterprise',
        kind: 'select',
        required: false,
        options,
      },
      defaultValue: '',
    };
  }, [allEnterprises, projectId]);
}
