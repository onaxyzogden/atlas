/**
 * §22 OverbuiltForRevenueWarningCard — flags revenue streams whose
 * placeholder gross relies on infrastructure that hasn't been placed
 * on the map yet (e.g., projected retreat revenue with zero retreat
 * structures, projected education income with no classroom).
 *
 * Pairs with EnterpriseRevenueMixCard + RevenueRampProjectionCard.
 * Reads the same `ogden-enterprise-revenue-mix-<projectId>` overrides
 * the mix card writes, plus the actual placed-entity counts. A stream
 * is "overbuilt" when its effective gross > 0 but the supporting
 * surface count is 0.
 *
 * The Lean-MVP toggle persists to
 * `ogden-lean-mvp-toggle-<projectId>` and recomputes the mature total
 * with overbuilt streams zeroed out, surfacing the gap so the steward
 * can decide whether to scope down or commit to the missing build.
 *
 * Closes manifest §22 `overbuilt-for-revenue-lean-mvp` (P3) planned
 * -> done.
 */

import { useEffect, useMemo, useState } from 'react';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import css from './OverbuiltForRevenueWarningCard.module.css';

interface Props {
  projectId: string;
}

type StreamId = 'orchard' | 'livestock' | 'retreat' | 'education' | 'agritourism';

const MIX_PREFIX = 'ogden-enterprise-revenue-mix-';
const LEAN_PREFIX = 'ogden-lean-mvp-toggle-';

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

const STREAM_LABEL: Record<StreamId, string> = {
  orchard: 'Orchard / food forest',
  livestock: 'Livestock',
  retreat: 'Retreat / lodging',
  education: 'Education',
  agritourism: 'Agritourism',
};

const STREAM_REQUIREMENT: Record<StreamId, string> = {
  orchard: 'orchard or food-forest crop area',
  livestock: 'paddock',
  retreat: 'retreat-type structure (cabin, yurt, tent_glamping, earthship, pavilion)',
  education: 'classroom structure',
  agritourism: 'retreat-type structure (any hospitality surface)',
};

function loadOverrides(projectId: string): Partial<Record<StreamId, number>> {
  try {
    const raw = localStorage.getItem(MIX_PREFIX + projectId);
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

function loadLeanToggle(projectId: string): boolean {
  try {
    return localStorage.getItem(LEAN_PREFIX + projectId) === '1';
  } catch {
    return false;
  }
}

function saveLeanToggle(projectId: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(LEAN_PREFIX + projectId, '1');
    else localStorage.removeItem(LEAN_PREFIX + projectId);
  } catch {
    /* ignore */
  }
}

export default function OverbuiltForRevenueWarningCard({ projectId }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(
    () => allStructures.filter((st) => st.projectId === projectId),
    [allStructures, projectId],
  );
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const crops = useMemo(
    () => allCropAreas.filter((c) => c.projectId === projectId),
    [allCropAreas, projectId],
  );

  const [overrides, setOverrides] = useState<Partial<Record<StreamId, number>>>(
    () => loadOverrides(projectId),
  );
  const [leanOn, setLeanOn] = useState<boolean>(() => loadLeanToggle(projectId));

  useEffect(() => {
    setOverrides(loadOverrides(projectId));
    setLeanOn(loadLeanToggle(projectId));
  }, [projectId]);

  // Cross-tab sync — pick up mix-card edits live.
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === MIX_PREFIX + projectId) {
        setOverrides(loadOverrides(projectId));
      }
      if (e.key === LEAN_PREFIX + projectId) {
        setLeanOn(loadLeanToggle(projectId));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [projectId]);

  const evaluation = useMemo(() => {
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

    const supports: Record<StreamId, number> = {
      orchard: orchardCount,
      livestock: paddockCount,
      retreat: retreatCount,
      education: eduCount,
      agritourism: hasHospitalitySurface ? 1 : 0,
    };

    const rows = STREAM_ORDER.map((id) => {
      const gross = overrides[id] ?? defaults[id];
      const support = supports[id];
      const overbuilt = gross > 0 && support === 0;
      return {
        id,
        label: STREAM_LABEL[id],
        requirement: STREAM_REQUIREMENT[id],
        gross,
        support,
        overbuilt,
      };
    });

    const matureTotal = rows.reduce((acc, r) => acc + r.gross, 0);
    const leanTotal = rows.reduce(
      (acc, r) => acc + (r.overbuilt ? 0 : r.gross),
      0,
    );
    const overbuiltTotal = matureTotal - leanTotal;
    const overbuiltPct = matureTotal > 0 ? (overbuiltTotal / matureTotal) * 100 : 0;
    const overbuiltRows = rows.filter((r) => r.overbuilt);

    return {
      rows,
      overbuiltRows,
      matureTotal,
      leanTotal,
      overbuiltTotal,
      overbuiltPct,
    };
  }, [crops, paddocks, structures, overrides]);

  const handleToggleLean = (): void => {
    setLeanOn((prev) => {
      const next = !prev;
      saveLeanToggle(projectId, next);
      return next;
    });
  };

  const hasMix = evaluation.matureTotal > 0;
  const overbuiltCount = evaluation.overbuiltRows.length;
  const noOverbuilt = overbuiltCount === 0;

  // Severity: 0 overbuilt = ok, 1-2 = fair, 3+ = poor; or any single
  // stream contributing >50% of mature is poor regardless of count.
  const severityTone = !hasMix
    ? css.tone_muted
    : noOverbuilt
      ? css.tone_good
      : overbuiltCount >= 3 || evaluation.overbuiltPct > 50
        ? css.tone_poor
        : css.tone_fair;

  return (
    <section className={css.card} aria-label="Overbuilt for revenue warning">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Overbuilt for revenue check</h3>
          <p className={css.cardHint}>
            Flags revenue streams in the mix above that depend on
            infrastructure you haven&rsquo;t placed yet. Toggle{' '}
            <em>Lean MVP</em> to recompute the mature total assuming
            only what&rsquo;s actually on the map.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      {!hasMix && (
        <p className={css.empty}>
          No revenue placeholders set. Open the mix card above to begin.
        </p>
      )}

      {hasMix && noOverbuilt && (
        <div className={`${css.statusBlock} ${css.tone_good}`}>
          <div className={css.statusIcon} aria-hidden="true">
            &#10003;
          </div>
          <div>
            <div className={css.statusTitle}>Mix matches placed infrastructure</div>
            <div className={css.statusBody}>
              Every stream with a non-zero gross has at least one
              supporting entity on the map. Lean MVP would equal the
              mature total.
            </div>
          </div>
        </div>
      )}

      {hasMix && !noOverbuilt && (
        <>
          <div className={`${css.summaryRow} ${severityTone}`}>
            <div className={css.summaryBlock}>
              <div className={css.summaryValue}>
                ${formatThousands(evaluation.matureTotal)}
              </div>
              <div className={css.summaryLabel}>Mature mix</div>
            </div>
            <div className={css.summaryArrow} aria-hidden="true">&rarr;</div>
            <div className={css.summaryBlock}>
              <div className={css.summaryValue}>
                ${formatThousands(evaluation.leanTotal)}
              </div>
              <div className={css.summaryLabel}>Lean MVP today</div>
            </div>
            <div className={css.summaryBlock}>
              <div className={`${css.summaryValue} ${css.summaryGap}`}>
                &minus;${formatThousands(evaluation.overbuiltTotal)}
              </div>
              <div className={css.summaryLabel}>
                Overbuilt ({evaluation.overbuiltPct.toFixed(0)}%)
              </div>
            </div>
          </div>

          <ul className={css.streamList}>
            {evaluation.overbuiltRows.map((r) => (
              <li key={r.id} className={css.streamRow}>
                <div className={css.streamMeta}>
                  <span className={css.warningDot} aria-hidden="true" />
                  <div className={css.streamLabelBlock}>
                    <span className={css.streamName}>{r.label}</span>
                    <span className={css.streamHint}>
                      ${formatThousands(r.gross)}/yr projected, but no{' '}
                      {r.requirement} placed yet.
                    </span>
                  </div>
                </div>
                <div className={css.streamFix}>place {r.requirement}</div>
              </li>
            ))}
          </ul>

          <div className={css.toggleRow}>
            <label className={css.toggleLabel}>
              <input
                type="checkbox"
                checked={leanOn}
                onChange={handleToggleLean}
                className={css.toggleInput}
              />
              <span className={css.toggleSwitch} aria-hidden="true" />
              <span>
                Lean MVP recompute (zero out overbuilt streams)
              </span>
            </label>
            <div className={css.toggleHint}>
              {leanOn ? (
                <>
                  Active &mdash; mature totals shown elsewhere on this
                  panel still reflect the steward&rsquo;s mix; only this
                  card&rsquo;s &ldquo;Lean MVP today&rdquo; figure
                  honours the toggle.
                </>
              ) : (
                <>Off &mdash; toggle to preview the lean total above.</>
              )}
            </div>
          </div>
        </>
      )}

      <p className={css.footnote}>
        <em>What counts as supporting infrastructure:</em> orchard needs
        an orchard or food-forest crop area; livestock needs at least
        one paddock; retreat &amp; agritourism need a retreat-type
        structure (cabin, yurt, tent_glamping, earthship, pavilion);
        education needs a classroom structure. Defaults from the mix
        card and steward overrides are both honoured.
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
