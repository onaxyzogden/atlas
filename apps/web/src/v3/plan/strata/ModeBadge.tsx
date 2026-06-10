/**
 * ModeBadge -- a small DISPLAY-ONLY capture-mode chip rendered after a decision
 * label on the Tier-1+ Plan/Act surfaces (mockup `.mb-*`). The label text comes
 * verbatim from the catalogue checklist item's optional `mode` field, which is
 * transcribed from the OLOS prototype badge. Purely decorative metadata -- it
 * does NOT route a working panel.
 *
 * This is the Tier-1+ counterpart to the Tier-0 `DecisionList` `.dModeBadge`
 * (which is driven by a `modeFor` raw-key resolver + MODE_LABELS map and is left
 * unchanged). Here the catalogue already carries the human label, so no map is
 * needed. Co-located with the Plan surface and imported by the Act execution
 * panel so the markup + `data-testid` contract stay identical across surfaces.
 *
 * Inline-styled with the shared `--color-stage-act*` tokens (mirroring the
 * Tier-0 `.dModeBadge` CSS) so it does not couple to any one CSS module.
 */

export interface ModeBadgeProps {
  /** Verbatim badge text from the catalogue item's `mode` field. */
  label: string;
  /** Owning checklist item id -- drives the stable `mode-badge-<id>` testid. */
  itemId: string;
}

export default function ModeBadge({ label, itemId }: ModeBadgeProps): JSX.Element {
  return (
    <span
      data-testid={`mode-badge-${itemId}`}
      style={{
        display: 'inline-block',
        marginLeft: 6,
        padding: '1px 6px',
        borderRadius: 6,
        border:
          '1px solid color-mix(in srgb, var(--color-stage-act, #d9a036) 40%, transparent)',
        background: 'var(--color-stage-act-glow-bg, rgba(217, 160, 54, 0.15))',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: 'var(--color-stage-act, #d9a036)',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
