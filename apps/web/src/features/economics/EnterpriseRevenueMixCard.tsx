/**
 * §22 EnterpriseRevenueMixCard — five-stream annual-gross placeholder
 * card for stewards. Sits on the Economics panel's Revenue tab, above
 * the auto-detected stream list. Distinct from the engine's revenue
 * detection: this card is for the steward's own gross-revenue
 * placeholders (orchard / livestock / retreat / education /
 * agritourism), independent of the auto-derived streams.
 *
 * Each stream has:
 *   - A suggested default derived from existing placed entities (e.g.,
 *     paddock count x $/paddock, retreat-type structure count x
 *     $/unit)
 *   - A numeric input the steward can override, persisted to
 *     localStorage keyed by project id
 *   - A computed "% of total" share visible in the row + stacked bar
 *
 * Closes manifest §22 `enterprise-revenue-placeholders` (P3) planned
 * -> done.
 */

import { useEffect, useMemo, useState } from 'react';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import css from './EnterpriseRevenueMixCard.module.css';

interface Props {
  projectId: string;
}

type StreamId = 'orchard' | 'livestock' | 'retreat' | 'education' | 'agritourism';

interface Stream {
  id: StreamId;
  label: string;
  hint: string;
  defaultGross: number;
}

const STORAGE_PREFIX = 'ogden-enterprise-revenue-mix-';

const RETREAT_TYPES = new Set([
  'cabin',
  'yurt',
  'tent_glamping',
  'earthship',
  'pavilion',
]);

const EDUCATION_TYPES = new Set(['classroom']);

const STREAM_ORDER: StreamId[] = [
  'orchard',
  'livestock',
  'retreat',
  'education',
  'agritourism',
];

const STREAM_HINT: Record<StreamId, string> = {
  orchard: 'Tree-crop / fruit / nut sales. Default scaled by orchard / food-forest area count.',
  livestock: 'Meat, dairy, fibre, breeding stock. Default scaled by paddock count.',
  retreat: 'Lodging, retreats, workshops. Default scaled by retreat-type structure count.',
  education: 'Tuition, school programs, residencies. Default scaled by classroom structure count.',
  agritourism: 'Tours, farm stays, events. Default flat when any retreat-type structure exists.',
};

const STREAM_LABEL: Record<StreamId, string> = {
  orchard: 'Orchard / food forest',
  livestock: 'Livestock',
  retreat: 'Retreat / lodging',
  education: 'Education',
  agritourism: 'Agritourism',
};

function loadOverrides(projectId: string): Partial<Record<StreamId, number>> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + projectId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as Partial<Record<StreamId, number>>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function saveOverrides(
  projectId: string,
  overrides: Partial<Record<StreamId, number>>,
): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(overrides));
  } catch {
    /* ignore */
  }
}

export default function EnterpriseRevenueMixCard({ projectId }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allCrops = useCropStore((s) => s.cropAreas);

  const structures = useMemo(
    () => allStructures.filter((st) => st.projectId === projectId),
    [allStructures, projectId],
  );
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const crops = useMemo(
    () => allCrops.filter((c) => c.projectId === projectId),
    [allCrops, projectId],
  );

  const [overrides, setOverrides] = useState<Partial<Record<StreamId, number>>>(
    () => loadOverrides(projectId),
  );

  useEffect(() => {
    setOverrides(loadOverrides(projectId));
  }, [projectId]);

  const streams = useMemo<Stream[]>(() => {
    const orchardCount = crops.filter(
      (c) => c.type === 'orchard' || c.type === 'food_forest',
    ).length;
    const paddockCount = paddocks.length;
    const retreatCount = structures.filter((s) => RETREAT_TYPES.has(s.type)).length;
    const eduCount = structures.filter((s) => EDUCATION_TYPES.has(s.type)).length;
    const hasHospitalitySurface = retreatCount > 0;

    const defaults: Record<StreamId, number> = {
      orchard: orchardCount * 20_000,
      livestock: paddockCount * 5_000,
      retreat: retreatCount * 25_000,
      education: eduCount * 15_000,
      agritourism: hasHospitalitySurface ? 10_000 : 0,
    };

    return STREAM_ORDER.map((id) => ({
      id,
      label: STREAM_LABEL[id],
      hint: STREAM_HINT[id],
      defaultGross: defaults[id],
    }));
  }, [crops, paddocks, structures]);

  const effective = useMemo(
    () =>
      streams.map((s) => ({
        ...s,
        gross: overrides[s.id] ?? s.defaultGross,
        isOverridden: Object.prototype.hasOwnProperty.call(overrides, s.id),
      })),
    [streams, overrides],
  );

  const total = effective.reduce((acc, s) => acc + s.gross, 0);

  const handleChange = (id: StreamId, raw: string): void => {
    setOverrides((prev) => {
      const next = { ...prev };
      const trimmed = raw.trim();
      if (trimmed === '') {
        delete next[id];
      } else {
        const parsed = Number(trimmed.replace(/[^0-9.]/g, ''));
        if (Number.isFinite(parsed) && parsed >= 0) {
          next[id] = Math.round(parsed);
        }
      }
      saveOverrides(projectId, next);
      return next;
    });
  };

  const handleReset = (id: StreamId): void => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      saveOverrides(projectId, next);
      return next;
    });
  };

  const handleResetAll = (): void => {
    setOverrides({});
    saveOverrides(projectId, {});
  };

  const overrideCount = Object.keys(overrides).length;

  return (
    <section className={css.card} aria-label="Enterprise revenue mix">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Enterprise revenue mix</h3>
          <p className={css.cardHint}>
            Steward-entered annual gross by enterprise. Defaults are
            scaled from your placed entities &mdash; override any value
            below with your own number, and the mix re-balances. Saves
            to this device.
          </p>
        </div>
        <span className={css.heuristicBadge}>UI PRESET</span>
      </header>

      <div className={css.totalRow}>
        <div className={css.totalBlock}>
          <div className={css.totalValue}>${formatThousands(total)}</div>
          <div className={css.totalLabel}>Total annual gross</div>
        </div>
        {overrideCount > 0 && (
          <button
            type="button"
            onClick={handleResetAll}
            className={css.resetAllBtn}
            aria-label="Reset all overrides"
          >
            Reset all ({overrideCount})
          </button>
        )}
      </div>

      {/* Stacked bar */}
      <div className={css.stackedBar} role="img" aria-label="Revenue share by stream">
        {effective.map((s) => {
          if (total === 0 || s.gross === 0) return null;
          const pct = (s.gross / total) * 100;
          return (
            <div
              key={s.id}
              className={`${css.stackedSegment} ${css[`seg_${s.id}`]}`}
              style={{ width: `${pct}%` }}
              title={`${s.label}: ${pct.toFixed(0)}%`}
            />
          );
        })}
        {total === 0 && (
          <div className={css.stackedEmpty}>
            No revenue placeholders set yet
          </div>
        )}
      </div>

      <ul className={css.streamList}>
        {effective.map((s) => {
          const pct = total === 0 ? 0 : (s.gross / total) * 100;
          return (
            <li key={s.id} className={css.streamRow}>
              <div className={css.streamMeta}>
                <span
                  className={`${css.streamSwatch} ${css[`seg_${s.id}`]}`}
                  aria-hidden="true"
                />
                <div className={css.streamLabelBlock}>
                  <span className={css.streamName}>{s.label}</span>
                  <span className={css.streamHint}>{s.hint}</span>
                </div>
              </div>
              <div className={css.streamControls}>
                <div className={css.streamShare}>
                  {pct.toFixed(0)}<span className={css.streamShareUnit}>%</span>
                </div>
                <div className={css.inputWrap}>
                  <span className={css.inputPrefix}>$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={s.gross === 0 ? '' : String(s.gross)}
                    onChange={(e) => handleChange(s.id, e.target.value)}
                    className={css.input}
                    placeholder={String(s.defaultGross)}
                    aria-label={`${s.label} annual gross USD`}
                  />
                  <span className={css.inputSuffix}>/yr</span>
                </div>
                {s.isOverridden ? (
                  <button
                    type="button"
                    onClick={() => handleReset(s.id)}
                    className={css.resetBtn}
                    title={`Reset to default ($${formatThousands(s.defaultGross)})`}
                  >
                    Reset
                  </button>
                ) : (
                  <span className={css.defaultBadge} title="Default from placed entities">
                    DEFAULT
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <p className={css.footnote}>
        <em>How defaults are scaled:</em> orchard / food-forest crop areas
        &times; $20k/yr; paddocks &times; $5k/yr; retreat-type structures
        (cabin, yurt, tent_glamping, earthship, pavilion) &times; $25k/yr;
        classroom structures &times; $15k/yr; flat $10k/yr agritourism when
        any retreat-type surface exists. These are stewarding placeholders
        &mdash; not market projections, not engine output.
      </p>
    </section>
  );
}

function formatThousands(n: number): string {
  if (n === 0) return '0';
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1_000)}k`;
  }
  return String(n);
}
