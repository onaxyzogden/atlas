// SpineObjectiveCard.tsx — the prototype's ObjectiveCard, transcribed VERBATIM
// from olos_plan_spine.jsx. Renamed from "ObjectiveCard" to avoid clashing with
// the live strata/ObjectiveCard.tsx; styling is unchanged.

import { C, F, CA } from './tokens.js';
import SourcePill from './SourcePill.js';
import StatusPill from './StatusPill.js';
import type { SpineObjective } from './types.js';

export default function SpineObjectiveCard({
  obj,
  isSelected,
  onClick,
}: {
  obj: SpineObjective;
  isSelected: boolean;
  onClick: (obj: SpineObjective) => void;
}) {
  const locked = obj.status === 'locked';
  return (
    <div
      onClick={() => !locked && onClick(obj)}
      style={{
        padding: '14px 16px',
        margin: '0 8px 6px',
        borderRadius: 10,
        cursor: locked ? 'default' : 'pointer',
        // Unified gold "selected" treatment — shares the active stratum's
        // gold border + faint warm wash so the current pair reads as linked.
        background: isSelected ? CA('amber', 0.07) : 'transparent',
        border: `1px solid ${isSelected ? C.gold : 'transparent'}`,
        transition: 'all 0.15s',
        opacity: locked ? 0.5 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <SourcePill type={obj.source} />
        <StatusPill status={obj.status} />
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: C.textPrimary,
          fontFamily: F.serif,
          lineHeight: 1.35,
          marginBottom: 4,
        }}
      >
        {obj.title}
      </div>
      {obj.status !== 'locked' && (
        <div style={{ fontSize: 10, color: C.textSecondary, fontFamily: F.sans }}>
          {obj.actDone}/{obj.actTotal} decisions · {obj.overlays.length} overlays
        </div>
      )}
    </div>
  );
}
