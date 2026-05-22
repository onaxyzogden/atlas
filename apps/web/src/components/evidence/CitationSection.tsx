/**
 * CitationSection — provenance disclosure for stewardship-program costs.
 *
 * Surfaces the normalized `Citation[]` behind a card's cost figures as a
 * collapsible "Sources (N)" disclosure. Each citation renders as a kind pill
 * (NRCS practice vs extension org) plus its full reference string.
 *
 * Modeled on EvidenceSection: same toggle/chevron/ESC/focus + a11y idiom.
 *
 * Guards (return nothing):
 *   - `compactMode` — mobile surfaces keep their flat glance, per
 *     [[feedback-mobile-overview-stack]].
 *   - empty `citations` — nothing to disclose.
 *
 * A11y:
 *   - `aria-expanded` on the toggle button
 *   - ESC collapses + restores focus to the toggle
 *   - `prefers-reduced-motion` honoured in the CSS module
 */

import { useState, useRef, useId, useCallback, type KeyboardEvent } from 'react';
import type { Citation } from '../../features/economics/stewardshipCitations.js';
import s from './CitationSection.module.css';

interface CitationSectionProps {
  /** Normalized citations from `collectStewardshipCitations(...)`. */
  citations: Citation[];
  /** Mobile surfaces pass `true` to render nothing. */
  compactMode?: boolean;
  /** Optional override for the toggle button text. */
  toggleLabel?: string;
}

export default function CitationSection({
  citations,
  compactMode = false,
  toggleLabel,
}: CitationSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const bodyId = useId();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && expanded) {
        event.stopPropagation();
        setExpanded(false);
        buttonRef.current?.focus();
      }
    },
    [expanded],
  );

  if (compactMode || citations.length === 0) {
    return null;
  }

  const label = toggleLabel ?? 'Sources';

  return (
    <div className={s.root} onKeyDown={handleKeyDown} data-testid="citation-section">
      <button
        ref={buttonRef}
        type="button"
        className={s.toggleBtn}
        aria-expanded={expanded}
        aria-controls={expanded ? bodyId : undefined}
        onClick={() => setExpanded((v) => !v)}
        data-testid="citation-toggle"
      >
        <span className={`${s.chevron} ${expanded ? s.chevronOpen : ''}`} aria-hidden="true">
          ▸
        </span>
        <span>
          {label} <span className={s.count}>({citations.length})</span>
        </span>
      </button>

      {expanded && (
        <div
          id={bodyId}
          className={s.body}
          role="region"
          aria-label="Stewardship-program cost sources"
          data-testid="citation-body"
        >
          {citations.map((c, idx) => (
            <div className={s.citation} key={`${c.kind}-${c.ref}-${idx}`} data-testid="citation-row">
              <span
                className={`${s.pill} ${c.kind === 'nrcs-practice' ? s.pillNrcs : s.pillExtension}`}
              >
                {c.label}
              </span>
              <span className={s.ref}>{c.ref}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
