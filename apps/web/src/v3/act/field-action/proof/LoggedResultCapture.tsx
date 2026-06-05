/**
 * LoggedResultCapture — schema-driven structured form. The slot's `kind`
 * selects the field set (jar-test, infiltration-rate, ph). Unknown kinds
 * render a generic key/value pair input so a new kind can be added to the
 * proof catalog without immediately wiring a bespoke form.
 *
 * The captured map is serialised onto `loggedResult: Record<string, unknown>`
 * (free-form per FieldActionProofItem schema).
 */

import { useEffect, useMemo, useState } from 'react';
import type {
  FieldActionProofItem,
  ProofSchemaSlot,
} from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import { baseProofItem } from './proofItemBuilder.js';
import css from './ProofCapture.module.css';

interface FieldDef {
  key: string;
  label: string;
  unit?: string;
  type: 'number' | 'text';
}

const FIELD_SETS: Record<string, readonly FieldDef[]> = {
  'jar-test': [
    { key: 'sandPercent', label: 'Sand %', unit: '%', type: 'number' },
    { key: 'siltPercent', label: 'Silt %', unit: '%', type: 'number' },
    { key: 'clayPercent', label: 'Clay %', unit: '%', type: 'number' },
    { key: 'observedTexture', label: 'Observed texture', type: 'text' },
  ],
  'infiltration-rate': [
    { key: 'startedAt', label: 'Started at', type: 'text' },
    { key: 'ringDiameterCm', label: 'Ring diameter', unit: 'cm', type: 'number' },
    {
      key: 'minutesToInfiltrate',
      label: 'Minutes to infiltrate',
      unit: 'min',
      type: 'number',
    },
    {
      key: 'depthInfiltratedCm',
      label: 'Depth infiltrated',
      unit: 'cm',
      type: 'number',
    },
  ],
  ph: [
    { key: 'phValue', label: 'pH reading', unit: 'pH', type: 'number' },
    { key: 'samplingDepthCm', label: 'Sampling depth', unit: 'cm', type: 'number' },
  ],
};

const GENERIC_FIELDS: readonly FieldDef[] = [
  { key: 'value', label: 'Result value', type: 'number' },
  { key: 'note', label: 'Result note', type: 'text' },
];

interface Props {
  projectId: string;
  actionId: string;
  slot: ProofSchemaSlot;
  existing: FieldActionProofItem | undefined;
}

export default function LoggedResultCapture({
  projectId,
  actionId,
  slot,
  existing,
}: Props) {
  const attach = useFieldActionStore((s) => s.attachProofItem);
  const fields = useMemo<readonly FieldDef[]>(
    () => FIELD_SETS[slot.kind ?? ''] ?? GENERIC_FIELDS,
    [slot.kind],
  );

  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const seed = (existing?.loggedResult ?? {}) as Record<string, unknown>;
    for (const f of fields) {
      const v = seed[f.key];
      initial[f.key] = v === undefined || v === null ? '' : String(v);
    }
    return initial;
  });

  useEffect(() => {
    const initial: Record<string, string> = {};
    const seed = (existing?.loggedResult ?? {}) as Record<string, unknown>;
    for (const f of fields) {
      const v = seed[f.key];
      initial[f.key] = v === undefined || v === null ? '' : String(v);
    }
    setDraft(initial);
  }, [existing?.id, existing?.loggedResult, fields]);

  const commit = () => {
    const payload: Record<string, unknown> = { kind: slot.kind ?? 'generic' };
    let hasAny = false;
    for (const f of fields) {
      const raw = draft[f.key]?.trim();
      if (!raw) continue;
      if (f.type === 'number') {
        const num = Number(raw);
        if (Number.isFinite(num)) {
          payload[f.key] = num;
          hasAny = true;
        }
      } else {
        payload[f.key] = raw;
        hasAny = true;
      }
    }
    if (!hasAny) return;
    const item: FieldActionProofItem = {
      ...baseProofItem({
        proofType: 'logged_result',
        slotId: slot.id,
        id: existing?.id,
      }),
      loggedResult: payload,
    };
    attach(projectId, actionId, item);
  };

  return (
    <div className={css.captureBody}>
      <div className={css.loggedForm}>
        {fields.map((field) => (
          <label key={field.key} className={css.loggedField}>
            <span className={css.loggedLabel}>
              {field.label}
              {field.unit && ` (${field.unit})`}
            </span>
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              inputMode={field.type === 'number' ? 'decimal' : 'text'}
              className={css.captureInput}
              value={draft[field.key] ?? ''}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, [field.key]: e.target.value }))
              }
              onBlur={commit}
              data-testid={`proof-logged-${slot.id}-${field.key}`}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
