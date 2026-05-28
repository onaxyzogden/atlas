/**
 * ActMapView — full-screen map host for the Act stage per spec §5.4.2.
 *
 * Layout:
 *   - Floating top bar (Back to View A + active objective name)
 *   - Map body (DiagnoseMap via ActMapHost) fills the viewport
 *   - Floating bottom sheet with two states:
 *       peek      — title + proof progress only
 *       expanded  — full ActTaskDetail
 *     Tapping the sheet header toggles between the two. Drag handles
 *     land in a polish slice; for Slice 3.3 the tap-to-toggle is the
 *     verifiable affordance.
 *   - Floating left-edge tool stub — Slice 3.4 swaps the placeholder
 *     for the contextual drawing toolbar wired to the active proof
 *     schema (gps_point / photo / measurement / etc).
 */

import { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import type { FieldAction, PlanTierObjective } from '@ogden/shared';
import { getProofSchema } from '@ogden/shared';
import ActMapHost from './ActMapHost.js';
import ActTaskDetail from './ActTaskDetail.js';
import css from './ActMapView.module.css';

interface Props {
  projectId: string;
  objective: PlanTierObjective;
  action: FieldAction | null;
  onClose: () => void;
}

type SheetState = 'peek' | 'expanded';

export default function ActMapView({
  projectId,
  objective,
  action,
  onClose,
}: Props) {
  const [sheetState, setSheetState] = useState<SheetState>('peek');

  const schema = action ? getProofSchema(action.proofSchemaId) : undefined;
  const requiredSlots = schema?.slots.filter((s) => s.required) ?? [];
  const filledSlotIds = new Set(
    (action?.proofItems ?? []).map((p) => p.slotId).filter((id): id is string => Boolean(id)),
  );
  const filledCount = requiredSlots.filter((s) => filledSlotIds.has(s.id)).length;
  const progressLabel =
    requiredSlots.length > 0
      ? `${filledCount} / ${requiredSlots.length} proof`
      : 'No proof required';

  const toggleSheet = () =>
    setSheetState((s) => (s === 'peek' ? 'expanded' : 'peek'));

  return (
    <div className={css.overlay} role="dialog" aria-label="Act map view">
      <div className={css.topBar}>
        <div className={css.topBarLeft}>
          <button type="button" className={css.iconBtn} onClick={onClose}>
            <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>Back</span>
          </button>
          <div className={css.objLabel}>
            <span className={css.eyebrow}>Active objective</span>
            <span className={css.objTitle}>{objective.title}</span>
          </div>
        </div>
      </div>

      <div className={css.mapBody}>
        <ActMapHost projectId={projectId} />
      </div>

      <div className={css.toolStub}>
        Drawing toolbar lands in Slice 3.4
      </div>

      <div
        className={css.sheet}
        data-state={sheetState}
        data-testid="act-map-sheet"
      >
        <button
          type="button"
          className={css.sheetHandleRow}
          onClick={toggleSheet}
          aria-expanded={sheetState === 'expanded'}
        >
          <div className={css.sheetHandle}>
            <span className={css.sheetEyebrow}>Active task</span>
            <span className={css.sheetTitle}>
              {action ? action.title : 'No task selected'}
            </span>
          </div>
          {action && (
            <span className={css.sheetProgress}>{progressLabel}</span>
          )}
          <span className={css.toggleBtn} aria-hidden="true">
            {sheetState === 'peek' ? (
              <ChevronUp size={16} strokeWidth={2} />
            ) : (
              <ChevronDown size={16} strokeWidth={2} />
            )}
          </span>
        </button>
        {sheetState === 'expanded' && action && (
          <div className={css.sheetBody}>
            <ActTaskDetail projectId={projectId} action={action} />
          </div>
        )}
      </div>
    </div>
  );
}
