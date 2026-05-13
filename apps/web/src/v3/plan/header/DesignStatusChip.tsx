/**
 * DesignStatusChip — top-strip indicator for the project's design
 * status (`draft` | `ready-for-review` | `approved`) plus the
 * `allowOrphanOutputs` escape-hatch warning. Surfaces the
 * 2026-04-28 Needs & Yields ADR's gate decision in the canvas chrome
 * so it remains a deliberate choice rather than a buried flag. Click
 * opens the Needs & Yields audit module.
 */
import {
  getDesignStatus,
  getAllowOrphanOutputs,
  type DesignStatus,
  type LocalProject,
} from '../../../store/projectStore.js';

interface Props {
  project: LocalProject;
  onOpenAudit: () => void;
}

const STATUS_LABEL: Record<DesignStatus, string> = {
  'draft': 'Draft',
  'ready-for-review': 'Ready for review',
  'approved': 'Approved',
};

const STATUS_TINT: Record<DesignStatus, { bg: string; fg: string; bd: string }> = {
  'draft': {
    bg: 'rgba(232,220,200,0.10)',
    fg: 'rgba(232,220,200,0.88)',
    bd: 'rgba(232,220,200,0.28)',
  },
  'ready-for-review': {
    bg: 'rgba(212,182,99,0.20)',
    fg: 'rgba(245,225,170,0.96)',
    bd: 'rgba(212,182,99,0.6)',
  },
  'approved': {
    bg: 'rgba(138,200,172,0.20)',
    fg: 'rgba(170,225,200,0.96)',
    bd: 'rgba(138,200,172,0.6)',
  },
};

export default function DesignStatusChip({ project, onOpenAudit }: Props) {
  const status = getDesignStatus(project);
  const allowOrphans = getAllowOrphanOutputs(project);
  const tint = STATUS_TINT[status];

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 6,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        pointerEvents: 'auto',
      }}
    >
      <button
        type="button"
        onClick={onOpenAudit}
        aria-label={`Design status: ${STATUS_LABEL[status]} — open Needs & Yields audit`}
        title="Open Needs & Yields audit"
        style={{
          padding: '6px 12px',
          borderRadius: 999,
          background: tint.bg,
          border: `1px solid ${tint.bd}`,
          color: tint.fg,
          font: 'inherit',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
        }}
      >
        Status · {STATUS_LABEL[status]}
      </button>
      {allowOrphans ? (
        <span
          aria-label="Orphan outputs are allowed for this project"
          title="Per-project escape hatch is on — orphan outputs do not block ready-for-review"
          style={{
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(138,79,58,0.18)',
            border: '1px solid rgba(138,79,58,0.6)',
            color: 'rgba(232,180,150,0.95)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
          }}
        >
          ⚠ Orphans allowed
        </span>
      ) : null}
    </div>
  );
}
