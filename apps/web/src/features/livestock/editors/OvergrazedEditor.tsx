/**
 * OvergrazedEditor — patches a rotation cell's targetGrazeDays.
 * Save/Cancel state machine; writes only to rotationPlanStore.
 */
import { useState } from 'react';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';

interface Props {
  projectId: string;
  paddockId: string;
  onClose: () => void;
}

export function OvergrazedEditor({ projectId, paddockId, onClose }: Props) {
  const cell = useRotationPlanStore(
    (s) =>
      s.byProject[projectId]?.cells.find((c) => c.paddockId === paddockId) ??
      null,
  );
  const upsertCell = useRotationPlanStore((s) => s.upsertCell);
  const [draft, setDraft] = useState<number>(cell?.targetGrazeDays ?? 1);

  if (!cell) {
    return (
      <div role="alert">
        No plan cell found for paddock {paddockId}.
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  function save() {
    if (!cell) return;
    upsertCell(projectId, { ...cell, targetGrazeDays: draft });
    onClose();
  }

  return (
    <div>
      <label>
        Target graze days
        <input
          type="number"
          min={1}
          value={draft}
          onChange={(e) => setDraft(Number(e.target.value))}
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

export default OvergrazedEditor;
