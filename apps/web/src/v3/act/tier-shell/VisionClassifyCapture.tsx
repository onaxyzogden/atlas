/**
 * VisionClassifyCapture -- a CONTROLLED renderer over the vision-classify value
 * shape `{ committed: string[]; aspirational: string[] }` (the SAME shape the
 * existing vision-classify form tool persists, so persistence is unchanged).
 * Implements the mockup's two-column committed/aspirational sort with a
 * transient Unclassified staging zone, suggestion chips, and a write-your-own
 * input. The Unclassified list is component-local UI state and is NOT persisted.
 *
 * Token note: aspirational hue maps to --color-info (closest project token);
 * committed hue maps to --color-success/--color-accent.
 */
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Plus, X } from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './VisionClassifyCapture.module.css';

export interface ClassifyValue {
  committed: string[];
  aspirational: string[];
}

export interface VisionClassifyCaptureProps {
  value: ClassifyValue;
  onChange: (next: ClassifyValue) => void;
  suggestions: readonly string[];
}

const ALWAYS_VISIBLE = 3;

export function decodeClassify(value: FormValue): ClassifyValue {
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return { committed: arr(value.committed), aspirational: arr(value.aspirational) };
}

export function isVisionClassifyValid(v: ClassifyValue): boolean {
  return v.committed.length + v.aspirational.length >= 1;
}

export function summariseVisionClassify(v: ClassifyValue): string {
  return `${v.committed.length} committed, ${v.aspirational.length} aspirational`;
}

export default function VisionClassifyCapture({
  value,
  onChange,
  suggestions,
}: VisionClassifyCaptureProps): JSX.Element {
  const [unclassified, setUnclassified] = useState<string[]>([]);
  const [showMore, setShowMore] = useState(false);
  const [ownText, setOwnText] = useState('');
  const [ownRole, setOwnRole] = useState<'committed' | 'aspirational'>('committed');

  const inUse = (text: string) =>
    value.committed.includes(text) ||
    value.aspirational.includes(text) ||
    unclassified.includes(text);

  const visibleChips = showMore ? suggestions : suggestions.slice(0, ALWAYS_VISIBLE);
  const hiddenCount = suggestions.length - ALWAYS_VISIBLE;
  const hasToggle = suggestions.length > ALWAYS_VISIBLE;

  const stage = (text: string) => {
    if (inUse(text)) return;
    setUnclassified((u) => [...u, text]);
  };

  const moveTo = (text: string, col: 'committed' | 'aspirational') => {
    setUnclassified((u) => u.filter((t) => t !== text));
    onChange({ ...value, [col]: [...value[col], text] });
  };

  const dropUnclassified = (text: string) =>
    setUnclassified((u) => u.filter((t) => t !== text));

  const removeClassified = (text: string, col: 'committed' | 'aspirational') =>
    onChange({ ...value, [col]: value[col].filter((t) => t !== text) });

  const switchColumn = (text: string, from: 'committed' | 'aspirational') => {
    const to = from === 'committed' ? 'aspirational' : 'committed';
    onChange({
      ...value,
      [from]: value[from].filter((t) => t !== text),
      [to]: [...value[to], text],
    });
  };

  const addOwn = () => {
    const text = ownText.trim();
    if (text === '' || inUse(text)) return;
    onChange({ ...value, [ownRole]: [...value[ownRole], text] });
    setOwnText('');
  };

  const column = (col: 'committed' | 'aspirational', title: string) => (
    <div className={css.col} data-col={col}>
      <div className={css.colHead}>
        <span className={css.colTitle}>{title}</span>
        <span className={css.colCount}>{value[col].length}</span>
      </div>
      <div className={css.colList}>
        {/* key by text -- inUse() enforces text is unique across all three lists. */}
        {value[col].map((text) => (
          <div key={text} className={css.card} data-col={col}>
            <span className={css.cardText}>{text}</span>
            <div className={css.cardActions}>
              <button
                type="button"
                className={css.cardMove}
                data-testid={`switch-${col}-${text}`}
                aria-label={`Move ${text} to other column`}
                onClick={() => switchColumn(text, col)}
              >
                {col === 'committed' ? <ArrowRight size={13} /> : <ArrowLeft size={13} />}
              </button>
              <button
                type="button"
                className={css.cardDel}
                data-testid={`delete-${col}-${text}`}
                aria-label={`Delete ${text}`}
                onClick={() => removeClassified(text, col)}
              >
                <X size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={css.root}>
      <div className={css.sugBlock}>
        <div className={css.sugHead}>
          <span className={css.sugLabel}>Suggested vision elements</span>
          <span className={css.sugSub}>Add to staging, then sort</span>
        </div>
        <div className={css.sugGrid}>
          {visibleChips.map((text) => {
            const used = inUse(text);
            return (
              <button
                key={text}
                type="button"
                className={css.chip}
                data-used={used ? 'true' : 'false'}
                disabled={used}
                aria-disabled={used}
                onClick={() => stage(text)}
              >
                <span className={css.chipIcon}>
                  {used ? <Check size={13} /> : <Plus size={13} />}
                </span>
                <span>{text}</span>
              </button>
            );
          })}
        </div>
        {hasToggle ? (
          <button
            type="button"
            className={css.sugToggle}
            data-open={showMore ? 'true' : 'false'}
            onClick={() => setShowMore((s) => !s)}
          >
            <ChevronDown size={13} className={css.sugArrow} />
            <span>{showMore ? 'Show fewer suggestions' : `Show ${hiddenCount} more suggestions`}</span>
          </button>
        ) : null}
      </div>

      {unclassified.length > 0 ? (
        <div className={css.stage}>
          <div className={css.stageLbl}>Unclassified -- sort each one</div>
          <div className={css.stageList}>
            {unclassified.map((text) => (
              <div
                key={text}
                className={css.stageCard}
                data-testid={`unclassified-card-${text}`}
              >
                <span className={css.cardText}>{text}</span>
                <div className={css.cardActions}>
                  <button
                    type="button"
                    className={css.stageBtn}
                    data-col="committed"
                    data-testid={`to-committed-${text}`}
                    onClick={() => moveTo(text, 'committed')}
                  >
                    Committed
                  </button>
                  <button
                    type="button"
                    className={css.stageBtn}
                    data-col="aspirational"
                    data-testid={`to-aspirational-${text}`}
                    onClick={() => moveTo(text, 'aspirational')}
                  >
                    Aspirational
                  </button>
                  <button
                    type="button"
                    className={css.cardDel}
                    aria-label={`Remove "${text}" from staging`}
                    onClick={() => dropUnclassified(text)}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={css.cols}>
        {column('committed', 'Committed')}
        {column('aspirational', 'Aspirational')}
      </div>

      <div className={css.own}>
        <div className={css.ownRoles}>
          <button
            type="button"
            className={css.ownRole}
            data-active={ownRole === 'committed' ? 'true' : 'false'}
            aria-pressed={ownRole === 'committed'}
            data-testid="own-role-committed"
            onClick={() => setOwnRole('committed')}
          >
            Committed
          </button>
          <button
            type="button"
            className={css.ownRole}
            data-active={ownRole === 'aspirational' ? 'true' : 'false'}
            aria-pressed={ownRole === 'aspirational'}
            data-testid="own-role-aspirational"
            onClick={() => setOwnRole('aspirational')}
          >
            Aspirational
          </button>
        </div>
        <input
          className={css.ownInput}
          value={ownText}
          placeholder="Add your own vision element"
          onChange={(e) => setOwnText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOwn();
            }
          }}
        />
        <button type="button" className={css.ownAdd} data-testid="own-add" onClick={addOwn}>
          <Plus size={14} />
          Add
        </button>
      </div>
    </div>
  );
}
