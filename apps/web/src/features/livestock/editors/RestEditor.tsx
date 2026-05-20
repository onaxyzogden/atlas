/**
 * RestEditor — patches a rotation cell's targetRestDays.
 * Shared by under-rested-reentry and short-rest recommendations.
 */
import { useState } from 'react';
import { useRotationPlanStore } from '../../../store/rotationPlanStore.js';

interface Props {
  projectId: string;
  paddockId: string;
  onClose: () => void;
}

export function RestEditor({ projectId, paddockId, onClose }: Props) {
  const cell = useRotationPlanStore(
    (s) =>
      s.byProject[projectId]?.cells.find((c) => c.paddockId === paddockId) ??
      null,
  );
  const upsertCell = useRotationPlanStore((s) => s.upsertCell);
  const [draft, setDraft] = useState<number>(cell?.targetRestDays ?? 0);

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
    upsertCell(projectId, { ...cell!, targetRestDays: draft });
    onClose();
  }

  return (
    <div>
      <label>
        Target rest days
        <input
          type="number"
          min={0}
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

export default RestEditor;
