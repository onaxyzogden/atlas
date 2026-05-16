/**
 * §11 WelfareAccessAuditCard — per-paddock shade / shelter / water access audit.
 *
 * For every paddock the card computes the polygon centroid and measures
 * great-circle distance to the nearest:
 *   - **shade-providing structure** (animal_shelter / barn / pavilion /
 *     cabin / greenhouse / workshop / lookout)
 *   - **shelter-providing structure** (animal_shelter / barn — the two
 *     types that meaningfully house livestock through weather events)
 *   - **water source** (water utility: water_tank / well_pump /
 *     rain_catchment, or water-relevant structure: water_tank / well /
 *     water_pump_house)
 *
 * Each axis is banded:
 *   - ≤100 m = good (within easy walking distance for most species)
 *   - ≤200 m = fair (reachable but suboptimal — long noon walks)
 *   - >200 m = poor (welfare risk under heat/storm)
 *   - none placed = missing (steward needs to add it)
 *
 * Per-paddock worst-of-three sets the row tone. Summary tally + remediation
 * notes (e.g., "Add an animal_shelter within 100 m of paddock X").
 *
 * Pure presentation-layer derivation — no shared math, no new entities,
 * no map overlays. Closes §11 manifest item `water-shelter-shade-access`
 * (P2 partial → done). Companion to LivestockWelfarePhasingCard (which
 * audits welfare *infrastructure phasing*, not welfare *access*).
 */

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useAllStructures } from '../../store/builtEnvironmentSelectors.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import { useMapToolStore } from '../../v3/observe/components/measure/useMapToolStore.js';
import {
  WATER_SOURCE_ENTITY_LABEL,
  WATER_BAND_RULE_COPY,
  WATER_TANK_PLAN_TOOL_ID,
} from './waterSource.js';
import {
  evaluatePaddockWelfare,
  type AxisFinding,
  type PaddockWelfareEval,
  type WelfareBand as Band,
} from './welfarePass.js';
import s from './WelfareAccessAuditCard.module.css';

interface Props {
  projectId: string;
}

type PaddockEval = PaddockWelfareEval;

/** Display-order rank used to sort worst-first for the in-card table. */
const BAND_RANK: Record<Band, number> = { good: 0, fair: 1, poor: 2, missing: 3 };

const BAND_LABEL: Record<Band, string> = {
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  missing: 'Missing',
};

function fmtDistance(m: number | null): string {
  if (m == null) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function axisDetail(f: AxisFinding, axisLabel: string): string {
  if (f.band === 'missing') {
    return `No ${axisLabel.toLowerCase()} placed within the project — add one to complete the welfare loop.`;
  }
  const dist = fmtDistance(f.distanceM);
  const name = f.nearestName ?? axisLabel;
  if (f.band === 'good') return `${dist} to "${name}" — within easy walking distance.`;
  if (f.band === 'fair') return `${dist} to "${name}" — reachable but a long noon walk; consider a closer placement.`;
  return `${dist} to "${name}" — beyond comfortable distance for most species; welfare risk under heat or storm.`;
}

function remediationFor(p: PaddockEval): string | null {
  const gaps: string[] = [];
  if (p.shade.band === 'missing' || p.shade.band === 'poor') gaps.push('shade structure');
  if (p.shelter.band === 'missing' || p.shelter.band === 'poor') gaps.push('weather shelter');
  if (p.water.band === 'missing' || p.water.band === 'poor') gaps.push('water source');
  if (gaps.length === 0) return null;
  return `Add a ${gaps.join(' / ')} within 100 m of "${p.paddock.name || 'this paddock'}".`;
}

export default function WelfareAccessAuditCard({ projectId }: Props) {
  const allPaddocks = useLivestockStore((st) => st.paddocks);
  const allStructures = useAllStructures();
  const allUtilities = useUtilityStore((st) => st.utilities);
  const allWaterNodes = useWaterSystemsStore((st) => st.waterNodes);
  const setActiveTool = useMapToolStore((st) => st.setActiveTool);
  const navigate = useNavigate();

  const handlePlaceWaterSource = () => {
    navigate({ to: '/v3/project/$projectId/plan', params: { projectId } });
    setActiveTool(WATER_TANK_PLAN_TOOL_ID);
  };

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const structures = useMemo(
    () => allStructures.filter((s2) => s2.projectId === projectId),
    [allStructures, projectId],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === projectId),
    [allUtilities, projectId],
  );
  const waterNodes = useMemo(
    () => allWaterNodes.filter((n) => n.projectId === projectId),
    [allWaterNodes, projectId],
  );

  const evals: PaddockEval[] = useMemo(
    () =>
      paddocks.map((paddock) =>
        evaluatePaddockWelfare(paddock, utilities, structures, waterNodes),
      ),
    [paddocks, structures, utilities, waterNodes],
  );

  const summary = useMemo(() => {
    let good = 0;
    let fair = 0;
    let poor = 0;
    let missing = 0;
    for (const e of evals) {
      if (e.worst === 'good') good += 1;
      else if (e.worst === 'fair') fair += 1;
      else if (e.worst === 'poor') poor += 1;
      else missing += 1;
    }
    return { good, fair, poor, missing, total: evals.length };
  }, [evals]);

  if (paddocks.length === 0) {
    return (
      <section className={s.card}>
        <header className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Welfare access audit · shade / shelter / water</h3>
            <p className={s.cardHint}>
              Per-paddock distance check against the three welfare anchors that determine whether a
              herd can comfortably ride out a heat day or a thunderstorm.
            </p>
          </div>
          <span className={s.heuristicBadge}>Heuristic</span>
        </header>
        <p className={s.empty}>
          No paddocks drawn yet — this card activates once you sketch grazing paddocks on the map.
        </p>
      </section>
    );
  }

  const sorted = [...evals].sort((a, b) => BAND_RANK[b.worst] - BAND_RANK[a.worst]);

  return (
    <section className={s.card}>
      <header className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Welfare access audit · shade / shelter / water</h3>
          <p className={s.cardHint}>
            For every paddock the centroid is measured against the nearest <em>shade</em>{' '}
            (animal_shelter / barn / pavilion / cabin / greenhouse / workshop / lookout),{' '}
            <em>shelter</em> (animal_shelter / barn), and <em>water</em> source — a placed{' '}
            {WATER_SOURCE_ENTITY_LABEL}. A note on the paddock alone does not count; the audit
            measures distance to a placed entity. Bands: {WATER_BAND_RULE_COPY}.
          </p>
        </div>
        <span className={s.heuristicBadge}>Heuristic</span>
      </header>

      <div className={s.summaryRow}>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.total}</span>
          <span className={s.summaryLabel}>Paddocks</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.good}</span>
          <span className={s.summaryLabel}>Good</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.fair}</span>
          <span className={s.summaryLabel}>Fair</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.poor + summary.missing}</span>
          <span className={s.summaryLabel}>Poor / missing</span>
        </div>
      </div>

      <h4 className={s.sectionTitle}>Per-paddock findings</h4>
      <ul className={s.list}>
        {sorted.map((e) => {
          const rowClass = s[`row_${e.worst}`] ?? '';
          const tagClass = s[`tag_${e.worst}`] ?? '';
          const remediation = remediationFor(e);
          return (
            <li key={e.paddock.id} className={`${s.row} ${rowClass}`}>
              <div className={s.rowHead}>
                <span className={`${s.tag} ${tagClass}`}>{BAND_LABEL[e.worst]}</span>
                <span className={s.rowTitle}>{e.paddock.name || 'Paddock'}</span>
                {(e.paddock.species?.length ?? 0) > 0 && (
                  <span className={s.kindBadge}>{e.paddock.species!.join(' · ')}</span>
                )}
              </div>
              <ul className={s.axisList}>
                {(['shade', 'shelter', 'water'] as const).map((axis) => {
                  const f =
                    axis === 'shade' ? e.shade : axis === 'shelter' ? e.shelter : e.water;
                  const axisLabel =
                    axis === 'shade' ? 'Shade' : axis === 'shelter' ? 'Shelter' : 'Water';
                  const aTagClass = s[`tag_${f.band}`] ?? '';
                  const chipTitle =
                    axis === 'water'
                      ? `Bands: ${WATER_BAND_RULE_COPY}. Counts as a water source: ${WATER_SOURCE_ENTITY_LABEL}.`
                      : `Bands: ${WATER_BAND_RULE_COPY}.`;
                  const needsWaterCta =
                    axis === 'water' && (f.band === 'missing' || f.band === 'poor');
                  return (
                    <li key={axis} className={s.axisRow}>
                      <span
                        className={`${s.axisTag} ${aTagClass}`}
                        title={chipTitle}
                      >
                        {BAND_LABEL[f.band]}
                      </span>
                      <span className={s.axisLabel}>{axisLabel}:</span>
                      <span className={s.axisDetail}>
                        {axisDetail(f, axisLabel)}
                        {needsWaterCta && (
                          <>
                            {' '}
                            <button
                              type="button"
                              className={s.placeWaterBtn}
                              onClick={handlePlaceWaterSource}
                              title={`Activates the Water tank tool on the Plan stage. Counts as a water source: ${WATER_SOURCE_ENTITY_LABEL}.`}
                            >
                              Place a water source →
                            </button>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {remediation && <p className={s.remediation}>→ {remediation}</p>}
            </li>
          );
        })}
      </ul>

      <p className={s.footnote}>
        <em>Note:</em> Distances are great-circle from polygon centroids — actual walked distance
        will be longer where fencing or terrain blocks a straight line. Bands are working defaults
        based on common heat-tolerance and rotation literature; cattle and sheep tolerate longer
        walks than goats and pigs. Re-tighten the bands per species if you have working knowledge
        of your herd's behavior.
      </p>
    </section>
  );
}
