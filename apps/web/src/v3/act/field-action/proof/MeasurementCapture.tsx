/**
 * MeasurementCapture — number input + unit from the slot definition.
 * Examples: count of plants, head of livestock, harvested kg, built height.
 */

import { useEffect, useState } from 'react';
import type {
  FieldActionProofItem,
  ProofSchemaSlot,
} from '@ogden/shared';
import { useFieldActionStore } from '../../../../store/fieldActionStore.js';
import { baseProofItem } from './proofItemBuilder.js';
import css from './ProofCapture.module.css';

interface Props {
  projectId: string;
  actionId: string;
  slot: ProofSchemaSlot;
  existing: FieldActionProofItem | undefined;
}

export default function MeasurementCapture({
  projectId,
  actionId,
  slot,
  existing,
}: Props) {
  const attach = useFieldActionStore((s) => s.attachProofItem);
  const unit = slot.measurementUnit ?? 'value';
  const [draft, setDraft] = useState<string>(
    existing?.measurementValue !== undefined
      ? String(existing.measurementValue)
      : '',
  );

  useEffect(() => {
    setDraft(
      existing?.measurementValue !== undefined
        ? String(existing.measurementValue)
        : '',
    );
  }, [existing?.id, existing?.measurementValue]);

  const commit = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) return;
    if (
      existing &&
      existing.measurementValue === parsed &&
      existing.measurementUnit === unit
    ) {
      return;
    }
    const item: FieldActionProofItem = {
      ...baseProofItem({
        proofType: 'measurement',
        slotId: slot.id,
        id: existing?.id,
      }),
      measurementValue: parsed,
      measurementUnit: unit,
    };
    attach(projectId, actionId, item);
  };

  return (
    <div className={css.captureRow}>
      <input
        type="number"
        inputMode="decimal"
        className={`${css.captureInput} ${css.numberInput}`}
        placeholder={slot.instruction ?? `Enter ${unit}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        data-testid={`proof-measurement-${slot.id}`}
      />
      <span className={css.unitBadge}>{unit}</span>
    </div>
  );
}
