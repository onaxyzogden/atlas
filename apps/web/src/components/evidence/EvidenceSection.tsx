/**
 * EvidenceSection — Tier-2 evidence disclosure UI (Phase E.3).
 *
 * Renders the EvidenceItem produced by `selectEvidenceFor(...)` as a
 * collapsible Summary / Evidence / Details disclosure block. The summary
 * row stays visible on the host card; the Evidence grid expands inline on
 * click. A "View details →" affordance opens the optional <DetailsDrawer>
 * when raw layer / summary refs are available.
 *
 * Mobile constraint (per [[feedback-mobile-overview-stack]]):
 *   `compactMode={true}` causes the section to render nothing. Mobile
 *   Overview keeps its flat <30s glance; Evidence chrome stays desktop-only.
 *
 * A11y:
 *   - `aria-expanded` on the toggle button
 *   - ESC collapses + restores focus to the toggle (focus-visible ring)
 *   - `prefers-reduced-motion` honoured in the CSS module
 */

import {
  useState,
  useRef,
  useId,
  useCallback,
  type KeyboardEvent,
} from 'react';
import type { EvidenceItem, EvidenceFragment, EvidenceSource } from '../../lib/evidence/types.js';
import DetailsDrawer from './DetailsDrawer.js';
import s from './EvidenceSection.module.css';

interface EvidenceSectionProps {
  /** Evidence payload from `selectEvidenceFor(...)`. Null → render nothing. */
  item: EvidenceItem | null;
  /**
   * When true, the section renders nothing. Mobile Overview surfaces pass
   * `compactMode = true` to preserve the <30s flat glance.
   */
  compactMode?: boolean;
  /** Optional override for the toggle button text. */
  toggleLabel?: string;
  /** Optional project id for DetailsDrawer raw-layer fetches. */
  projectId?: string;
}

const SOURCE_CLASS: Record<EvidenceSource['kind'], string> = {
  layer: s.sourceLayer ?? '',
  rule: s.sourceRule ?? '',
  computed: s.sourceComputed ?? '',
  fixture: s.sourceFixture ?? '',
};

const CONFIDENCE_DOT_COUNT: Record<NonNullable<EvidenceSource['confidence']>, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

export default function EvidenceSection({
  item,
  compactMode = false,
  toggleLabel,
  projectId,
}: EvidenceSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bodyId = useId();

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && expanded) {
      event.stopPropagation();
      setExpanded(false);
      buttonRef.current?.focus();
    }
  }, [expanded]);

  if (compactMode || !item) {
    return null;
  }

  const fragments = item.evidence;
  const hasDetails =
    Boolean(item.details?.rawGeoJsonRef) || Boolean(item.details?.rawSummaryRef);

  const label = toggleLabel ?? 'Show evidence';

  return (
    <div className={s.root} onKeyDown={handleKeyDown} data-testid="evidence-section">
      <button
        ref={buttonRef}
        type="button"
        className={s.toggleBtn}
        aria-expanded={expanded}
        aria-controls={expanded ? bodyId : undefined}
        onClick={() => setExpanded((v) => !v)}
        data-testid="evidence-toggle"
      >
        <span className={`${s.chevron} ${expanded ? s.chevronOpen : ''}`} aria-hidden="true">
          ▸
        </span>
        <span>
          {label} <span className={s.count}>({fragments.length})</span>
        </span>
      </button>

      {expanded && (
        <div
          id={bodyId}
          className={s.body}
          role="region"
          aria-label={`${item.summary.label} — evidence`}
          data-testid="evidence-body"
        >
          {fragments.map((fragment, idx) => (
            <FragmentRow key={`${fragment.label}-${idx}`} fragment={fragment} />
          ))}

          {hasDetails && (
            <button
              type="button"
              className={s.detailsLink}
              onClick={() => setDrawerOpen(true)}
              data-testid="evidence-details-link"
            >
              View details →
            </button>
          )}
        </div>
      )}

      {drawerOpen && item.details && (
        <DetailsDrawer
          title={`${item.summary.label} — details`}
          details={item.details}
          projectId={projectId}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </div>
  );
}

interface FragmentRowProps {
  fragment: EvidenceFragment;
}

function FragmentRow({ fragment }: FragmentRowProps) {
  const sourceClass = SOURCE_CLASS[fragment.source.kind] ?? '';
  const confidence = fragment.source.confidence;
  const dotCount = confidence ? CONFIDENCE_DOT_COUNT[confidence] : 0;

  return (
    <div className={s.fragment} data-testid="evidence-fragment">
      <div>
        <div className={s.label}>{fragment.label}</div>
        <div className={s.value}>
          {fragment.value}
          {fragment.unit && <span className={s.unit}>{fragment.unit}</span>}
        </div>
      </div>
      <div>
        <span className={`${s.sourcePill} ${sourceClass}`} data-testid="evidence-source-pill">
          {fragment.source.kind}
          {confidence && (
            <span
              className={s.confidenceDots}
              aria-label={`confidence: ${confidence}`}
              data-testid="evidence-confidence"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`${s.dot} ${i < dotCount ? s.dotFilled : ''}`}
                  aria-hidden="true"
                />
              ))}
            </span>
          )}
        </span>
      </div>
      {fragment.methodologyHint && (
        <div className={s.hint} data-testid="evidence-hint">
          {fragment.methodologyHint}
        </div>
      )}
    </div>
  );
}
