/**
 * MachineryAccessFitCard — cross-checks each inventory item's required width
 * and turn radius against the access-related design elements drawn on the
 * Vision-Layout canvas.
 *
 * Heuristics:
 *   - For paths / roads / gates / bridges: flag if the largest declared
 *     equipment width exceeds an assumed default (paths 1.2 m, roads 3.5 m,
 *     gates 3.5 m, bridges 3.5 m). The catalog does not store widths today
 *     so the check is a steward-facing nudge, not a measurement.
 *   - For turnarounds: flag if any item's required turn radius exceeds the
 *     largest drawn turnaround's bounding-circle radius (sqrt(area/π) used
 *     as a coarse proxy when available).
 */

import { useMemo } from 'react';
import { useMachineryInventoryStore } from '../../../../store/machineryInventoryStore.js';
import { useDesignElementsForProject } from '../../../../store/builtEnvironmentSelectors.js';
import css from './MachineryAccessFitCard.module.css';

const EMPTY_ITEMS: ReturnType<typeof useMachineryInventoryStore.getState>['byProject'][string] = [];

const ASSUMED_KIND_WIDTH_M: Record<string, number> = {
  path: 1.2,
  road: 3.5,
  gate: 3.5,
  bridge: 3.5,
};

interface Props {
  projectId: string;
}

interface Verdict {
  level: 'ok' | 'warn' | 'flag';
  text: string;
}

export default function MachineryAccessFitCard({ projectId }: Props) {
  const items = useMachineryInventoryStore(
    (s) => s.byProject[projectId] ?? EMPTY_ITEMS,
  );
  const elements = useDesignElementsForProject(projectId);

  const widestM = useMemo(
    () =>
      items.reduce(
        (max, it) =>
          it.requiredWidthM !== undefined && it.requiredWidthM > max
            ? it.requiredWidthM
            : max,
        0,
      ),
    [items],
  );

  const largestTurnRadiusM = useMemo(
    () =>
      items.reduce(
        (max, it) =>
          it.requiredTurnRadiusM !== undefined && it.requiredTurnRadiusM > max
            ? it.requiredTurnRadiusM
            : max,
        0,
      ),
    [items],
  );

  // Turnaround radius proxy — sqrt(acreage_to_m2 / π).
  const turnaroundRadiusM = useMemo(() => {
    let best = 0;
    for (const el of elements) {
      if (el.kind !== 'turnaround') continue;
      const acres = el.acreage;
      if (acres === undefined) continue;
      const m2 = acres * 4046.86;
      const r = Math.sqrt(m2 / Math.PI);
      if (r > best) best = r;
    }
    return best;
  }, [elements]);

  const accessElements = useMemo(
    () => elements.filter((e) => e.category === 'access'),
    [elements],
  );

  const verdicts = useMemo<Verdict[]>(() => {
    const out: Verdict[] = [];
    if (items.length === 0) {
      out.push({
        level: 'warn',
        text: 'No machinery declared yet — add inventory before stress-testing access.',
      });
      return out;
    }
    if (widestM === 0) {
      out.push({
        level: 'warn',
        text: 'No widths declared on inventory items. Width drives the access checks.',
      });
    }
    if (accessElements.length === 0) {
      out.push({
        level: 'warn',
        text: 'No access elements (paths, roads, gates, bridges) drawn yet.',
      });
    }
    for (const el of accessElements) {
      const assumed = ASSUMED_KIND_WIDTH_M[el.kind];
      if (assumed === undefined || widestM === 0) continue;
      if (widestM > assumed) {
        out.push({
          level: 'flag',
          text: `${el.label ?? el.kind}: widest item is ${widestM.toFixed(
            1,
          )} m, default ${el.kind} clearance is ~${assumed} m.`,
        });
      } else {
        out.push({
          level: 'ok',
          text: `${el.label ?? el.kind}: ${widestM.toFixed(
            1,
          )} m fits typical ${el.kind} clearance (~${assumed} m).`,
        });
      }
    }
    if (largestTurnRadiusM > 0) {
      if (turnaroundRadiusM === 0) {
        out.push({
          level: 'warn',
          text: `Largest turn radius is ${largestTurnRadiusM.toFixed(
            1,
          )} m but no turnaround polygon drawn yet.`,
        });
      } else if (largestTurnRadiusM > turnaroundRadiusM) {
        out.push({
          level: 'flag',
          text: `Turn radius ${largestTurnRadiusM.toFixed(
            1,
          )} m exceeds the largest turnaround (~${turnaroundRadiusM.toFixed(
            1,
          )} m equivalent radius).`,
        });
      } else {
        out.push({
          level: 'ok',
          text: `Largest turn radius ${largestTurnRadiusM.toFixed(
            1,
          )} m fits turnaround (~${turnaroundRadiusM.toFixed(1)} m).`,
        });
      }
    }
    return out;
  }, [
    items.length,
    widestM,
    largestTurnRadiusM,
    turnaroundRadiusM,
    accessElements,
  ]);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Access fit</h2>
        <span className={css.cardHint}>
          {items.length} item{items.length === 1 ? '' : 's'} ·{' '}
          {accessElements.length} access element
          {accessElements.length === 1 ? '' : 's'}
        </span>
      </div>

      <p className={css.intro}>
        Stress-tests inventory widths and turn radii against the access
        elements (paths, roads, gates, bridges, turnarounds) you&apos;ve drawn
        on the Vision-Layout canvas. Default clearances are heuristic;
        verify on the ground.
      </p>

      {verdicts.length === 0 ? (
        <div className={css.empty}>No checks to run yet.</div>
      ) : (
        <ul className={css.verdicts}>
          {verdicts.map((v, i) => (
            <li key={i} className={`${css.verdict} ${css[v.level]}`}>
              <span className={css.dot} aria-hidden />
              <span>{v.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
