/**
 * KeyDocumentCard -- the clickable card for one of the three Act-Mandate key
 * documents (Planning Direction Statement, Coherence Record, Resolved Integrated
 * Design). Shared by BOTH the Plan-side Act Mandate surface (ActMandateSurface)
 * and the read-only Act-side briefing (ActMandateBriefingCard) so the two stay
 * in parity. Each surface passes its OWN CSS module so the card keeps that
 * surface's register.
 *
 * The whole card is a button: clicking it (or Enter/Space, for free) opens a
 * brief popup with the document's full content. Pending cards are clickable too
 * -- the popup explains the current state. The inner content is phrasing-level
 * (<span>s) so it is valid inside a <button>.
 *
 * ASCII-only; carries no authored copy of its own (all strings come from the
 * KeyDocument model, which is banned-term-scanned in test).
 */

import { CheckCircle2, Circle } from 'lucide-react';
import type { KeyDocument } from './actMandateModel.js';

/**
 * The CSS-module classes the card and its presence badge consume. A surface
 * passes its own `*.module.css` import here, which Vite types as a generic
 * read-only class map -- so this mirrors that shape rather than naming each key.
 * Keys actually read: docCard, docTrigger, docHead, docTitleWrap, docName,
 * docDesc, docState, presence.
 */
export type KeyDocumentCardStyles = Readonly<Record<string, string>>;

/** Presence pill -- "In hand" when the document is present, else "Pending". */
export function PresenceBadge({
  present,
  className,
}: {
  present: boolean;
  className?: string;
}) {
  return (
    <span className={className} data-present={present || undefined}>
      {present ? (
        <CheckCircle2 size={12} aria-hidden="true" />
      ) : (
        <Circle size={12} aria-hidden="true" />
      )}
      {present ? 'In hand' : 'Pending'}
    </span>
  );
}

export default function KeyDocumentCard({
  doc,
  onOpen,
  styles,
}: {
  doc: KeyDocument;
  onOpen: () => void;
  styles: KeyDocumentCardStyles;
}) {
  return (
    <li className={styles.docCard} data-present={doc.present || undefined}>
      <button
        type="button"
        className={styles.docTrigger}
        onClick={onOpen}
        aria-haspopup="dialog"
      >
        <span className={styles.docHead}>
          <PresenceBadge present={doc.present} className={styles.presence} />
          <span className={styles.docTitleWrap}>
            <span className={styles.docName}>{doc.name}</span>
          </span>
        </span>
        <span className={styles.docDesc}>{doc.desc}</span>
        <span className={styles.docState}>{doc.stateLine}</span>
      </button>
    </li>
  );
}
