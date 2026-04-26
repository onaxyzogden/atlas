/**
 * §18 PublicMaskingPreviewCard — leakage-pattern audit on the fields that
 * survive the public-portal redaction filter.
 *
 * Distinct from §20 InternalVsPublicViewCard (which lists *which* fields the
 * filter strips). This card asks the next question: of the fields that *do*
 * pass through to the public view (project name, vision, description), are
 * there free-text leaks that bypass field-level redaction?
 *
 * It scans the publicly-exposed text fields for five concrete patterns —
 * email addresses, phone numbers, dollar amounts, raw URLs, and decimal
 * lat/lng pairs — and shows a per-pattern hit count plus the first sample
 * snippet so the steward can edit the source field before publishing.
 *
 * Closes manifest §18 `public-safe-data-masking` (P4) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import css from './PublicMaskingPreviewCard.module.css';

interface Props {
  project: LocalProject;
}

interface PatternDef {
  key: string;
  label: string;
  regex: RegExp;
  severity: 'high' | 'medium';
  recommendation: string;
}

const PATTERNS: PatternDef[] = [
  {
    key: 'email',
    label: 'Email addresses',
    regex: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
    severity: 'high',
    recommendation:
      'Replace with the portal Inquiry email field (rendered through a contact form, not exposed inline).',
  },
  {
    key: 'phone',
    label: 'Phone numbers',
    regex: /\b(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
    severity: 'high',
    recommendation: 'Strip from prose — direct phone numbers in public copy invite cold contact.',
  },
  {
    key: 'coords',
    label: 'Decimal lat/lng pairs',
    regex: /-?\d{1,3}\.\d{4,}\s*,\s*-?\d{1,3}\.\d{4,}/g,
    severity: 'high',
    recommendation: 'Remove — exact coordinates defeat the region-only location masking.',
  },
  {
    key: 'money',
    label: 'Dollar amounts',
    regex: /\$\s?\d[\d,]*(?:\.\d+)?(?:\s?[kKmM])?\b/g,
    severity: 'medium',
    recommendation:
      'Consider rounding or qualifying ("multi-acre investment") — explicit budgets shift stakeholder framing.',
  },
  {
    key: 'url',
    label: 'Raw URLs',
    regex: /https?:\/\/\S+/g,
    severity: 'medium',
    recommendation:
      'Move to the portal Donation URL or Inquiry email fields where outbound links are intentional.',
  },
];

interface FieldDef {
  key: string;
  label: string;
  text: string;
}

interface Hit {
  pattern: PatternDef;
  matches: string[];
  fields: string[];
}

function clip(s: string, max = 60): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}\u2026`;
}

export default function PublicMaskingPreviewCard({ project }: Props) {
  const fields: FieldDef[] = useMemo(
    () => [
      { key: 'name', label: 'Project name', text: project.name ?? '' },
      { key: 'vision', label: 'Vision', text: project.visionStatement ?? '' },
      { key: 'description', label: 'Description', text: project.description ?? '' },
    ],
    [project.name, project.visionStatement, project.description],
  );

  const exposedChars = fields.reduce((sum, f) => sum + f.text.length, 0);

  const hits: Hit[] = useMemo(() => {
    const out: Hit[] = [];
    for (const pattern of PATTERNS) {
      const matches: string[] = [];
      const hitFields = new Set<string>();
      for (const f of fields) {
        if (!f.text) continue;
        const found = f.text.match(pattern.regex);
        if (found && found.length > 0) {
          matches.push(...found);
          hitFields.add(f.label);
        }
      }
      if (matches.length > 0) {
        out.push({ pattern, matches, fields: Array.from(hitFields) });
      }
    }
    return out;
  }, [fields]);

  const totalHits = hits.reduce((sum, h) => sum + h.matches.length, 0);
  const highHits = hits
    .filter((h) => h.pattern.severity === 'high')
    .reduce((sum, h) => sum + h.matches.length, 0);

  let band: 'clean' | 'low' | 'high';
  let bandLabel: string;
  if (highHits > 0 || totalHits >= 3) {
    band = 'high';
    bandLabel = 'Leaks present';
  } else if (totalHits > 0) {
    band = 'low';
    bandLabel = 'Minor exposure';
  } else {
    band = 'clean';
    bandLabel = 'Clean';
  }

  const bandClass =
    band === 'clean' ? css.bandClean : band === 'low' ? css.bandLow : css.bandHigh;

  const allFieldsEmpty = exposedChars === 0;

  return (
    <section className={css.card} aria-label="Public masking leakage preview">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Public-safe masking preview <span className={css.badge}>HEURISTIC</span>
          </h3>
          <p className={css.cardHint}>
            Scans the free-text fields that <em>survive</em> the public-portal
            redaction filter (project name, vision, description) for patterns
            that field-level redaction can&apos;t catch: emails, phone
            numbers, exact coordinates, dollar amounts, and raw URLs. Edit
            the source field before publishing if anything surfaces here.
          </p>
        </div>
        <div className={`${css.bandPill} ${bandClass}`}>
          <span className={css.bandLabel}>{bandLabel}</span>
          <span className={css.bandCount}>{totalHits} hit{totalHits === 1 ? '' : 's'}</span>
        </div>
      </header>

      <div className={css.scopeRow}>
        <span className={css.scopeLabel}>Scope of scan</span>
        <span className={css.scopeValue}>
          {fields.length} exposed field{fields.length === 1 ? '' : 's'} &middot;{' '}
          {exposedChars} char{exposedChars === 1 ? '' : 's'} of free text
        </span>
      </div>

      {allFieldsEmpty ? (
        <p className={css.empty}>
          No public-facing free text yet. Add a vision statement and
          description on the project intake page; this card will then audit
          them for leakage patterns.
        </p>
      ) : hits.length === 0 ? (
        <div className={css.cleanNote}>
          <span className={css.cleanIcon}>{'\u2713'}</span>
          <span>
            No leakage patterns detected across the {fields.length}{' '}
            publicly-exposed text field{fields.length === 1 ? '' : 's'}. The
            redaction filter and the source copy are aligned.
          </span>
        </div>
      ) : (
        <ul className={css.hitList}>
          {hits.map((h) => (
            <li key={h.pattern.key} className={css.hitItem}>
              <div className={css.hitHead}>
                <span className={css.hitLabel}>{h.pattern.label}</span>
                <span
                  className={
                    h.pattern.severity === 'high' ? css.sevHigh : css.sevMed
                  }
                >
                  {h.pattern.severity === 'high' ? 'High risk' : 'Medium risk'}
                </span>
                <span className={css.hitCount}>
                  {h.matches.length} hit{h.matches.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className={css.hitMeta}>
                <span className={css.hitFields}>
                  In: {h.fields.join(', ')}
                </span>
                <span className={css.hitSample}>
                  e.g. <code>{clip(h.matches[0] ?? '')}</code>
                </span>
              </div>
              <p className={css.hitRec}>{h.pattern.recommendation}</p>
            </li>
          ))}
        </ul>
      )}

      <p className={css.footnote}>
        <em>What this is and isn&apos;t:</em> a regex sweep over the three
        fields the public portal renders verbatim. It does not score
        sentiment, judge naming, or read entity-level free text (which the
        portal already aggregates into anonymous counts). Patterns are
        intentionally narrow to keep false positives low.
      </p>
    </section>
  );
}
