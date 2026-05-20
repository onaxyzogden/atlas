/**
 * UnplannedPaddockEditor — folds an unplanned paddock into the
 * rotation plan via upsertCell with a brand-new RotationCell.
 */
import { useState } from 'react';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';

interface Props {
  projectId: string;
  paddockId: string;
  onClose: () => void;
}

export function UnplannedPaddockEditor({
  projectId,
  paddockId,
  onClose,
}: Props) {
  const upsertCell = useRotationPlanStore((s) => s.upsertCell);
  const [cellGroup, setCellGroup] = useState('');
  const [sequenceOrder, setSequenceOrder] = useState(0);
  const [targetGrazeDays, setTargetGrazeDays] = useState(3);
  const [targetRestDays, setTargetRestDays] = useState(30);

  function save() {
    upsertCell(projectId, {
      paddockId,
      cellGroup,
      sequenceOrder,
      targetGrazeDays,
      targetRestDays,
    });
    onClose();
  }

  return (
    <div>
      <label>
        Cell group
        <input
          type="text"
          value={cellGroup}
          onChange={(e) => setCellGroup(e.target.value)}
        />
      </label>
      <label>
        Sequence order
        <input
          type="number"
          min={0}
          value={sequenceOrder}
          onChange={(e) => setSequenceOrder(Number(e.target.value))}
        />
      </label>
      <label>
        Target graze days
        <input
          type="number"
          min={1}
          value={targetGrazeDays}
          onChange={(e) => setTargetGrazeDays(Number(e.target.value))}
        />
      </label>
      <label>
        Target rest days
        <input
          type="number"
          min={0}
          value={targetRestDays}
          onChange={(e) => setTargetRestDays(Number(e.target.value))}
        />
      </label>
      <button type="button" onClick={save}>
        Save
      </button>
      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}

export default UnplannedPaddockEditor;
