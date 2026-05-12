/**
 * CanopySuccessionCard — Plan Module 4, fresh build per Permaculture
 * Scholar verdict (2026-05-07).
 *
 * Replaces Atlas's continuous-year SVG scrubber with the Scholar's
 * preferred discrete-scenario model: Year 1 / 5 / 10 / 20 / 30+. A
 * six-layer cross-section (Tall canopy, Sub-canopy, Shrub, Herbaceous,
 * Groundcover, Root zone — added per OGDEN) shows growth and a per-
 * layer light-availability bar. Each year-button also surfaces the
 * succession phase (Establishment / Transition / Maturity) so the
 * steward sees *where they are in the 50-year arc*, not just an
 * instantaneous canopy.
 *
 * Shannon-diversity readouts and bloom calendars are deliberately
 * omitted (Scholar called them "ecological theatre" for working
 * stewards). Light-by-layer is computed; everything else stays
 * grounded in the existing PLANT_DATABASE record.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import { findSpecies, type CanopyLayer } from '../../../../data/plantDatabase.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SCENARIOS: Array<{ year: number; label: string; phase: SuccessionPhase }> = [
  { year: 1,  label: 'Year 1',   phase: 'establishment' },
  { year: 5,  label: 'Year 5',   phase: 'establishment' },
  { year: 10, label: 'Year 10',  phase: 'transition' },
  { year: 20, label: 'Year 20',  phase: 'transition' },
  { year: 30, label: 'Year 30+', phase: 'maturity' },
];

type SuccessionPhase = 'establishment' | 'transition' | 'maturity';

const PHASE_LABEL: Record<SuccessionPhase, string> = {
  establishment: 'Establishment (0–7 yr)',
  transition:    'Transition (7–20 yr)',
  maturity:      'Maturity (20+ yr)',
};

const PHASE_NOTE: Record<SuccessionPhase, string> = {
  establishment: 'Pioneer + nurse species dominate. Heavy mulch, wind protection, irrigation.',
  transition:    'Anchor species close canopy; pioneers thin. Active pruning, chop-and-drop.',
  maturity:      'Stable polyculture. Edge management, replacement planting.',
};

/** Six layers per Scholar ask (adds Root zone vs. OGDEN's surface-only set). */
const LAYER_ROWS: Array<{
  layer: CanopyLayer | 'root_zone';
  label: string;
  heightLabel: string;
  /** Vertical band start/end on a 0..100 cross-section (top = sky). */
  yStart: number;
  yEnd: number;
}> = [
  { layer: 'canopy',       label: 'Tall canopy', heightLabel: '12–25 m', yStart: 0,  yEnd: 25 },
  { layer: 'sub_canopy',   label: 'Sub-canopy',  heightLabel: '6–12 m',  yStart: 25, yEnd: 45 },
  { layer: 'shrub',        label: 'Shrub',       heightLabel: '1–6 m',   yStart: 45, yEnd: 65 },
  { layer: 'herbaceous',   label: 'Herbaceous',  heightLabel: '0.3–1 m', yStart: 65, yEnd: 78 },
  { layer: 'ground_cover', label: 'Groundcover', heightLabel: '0–0.3 m', yStart: 78, yEnd: 85 },
  { layer: 'root_zone',    label: 'Root zone',   heightLabel: '0–2 m below', yStart: 85, yEnd: 100 },
];

/** Linear maturity factor over 25 years. */
function maturityFactor(year: number): number {
  return Math.min(1, year / 25);
}

/** Light reaching each layer: starts at 100% above canopy and is
 *  attenuated by the cumulative cover fraction of every layer above it.
 *  Cover fraction per layer = clamp01(speciesCount × maturityFactor / 4). */
function lightByLayer(
  layerCounts: Record<string, number>,
  year: number,
): Record<string, number> {
  const m = maturityFactor(year);
  let remaining = 1;
  const out: Record<string, number> = {};
  for (const row of LAYER_ROWS) {
    out[row.layer] = remaining;
    const count = layerCounts[row.layer] ?? 0;
    const cover = Math.min(1, (count * m) / 4);
    remaining = Math.max(0, remaining * (1 - cover));
  }
  return out;
}

export default function CanopySuccessionCard({ project }: Props) {
  const allPicks = usePolycultureStore((s) => s.species);
  const projectPicks = useMemo(
    () => allPicks.filter((p) => p.projectId === project.id),
    [allPicks, project.id],
  );

  const [year, setYear] = useState<number>(10);
  const scenario = SCENARIOS.find((s) => s.year === year) ?? SCENARIOS[2]!;
  const m = maturityFactor(year);

  const layerCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const pick of projectPicks) {
      const sp = findSpecies(pick.speciesId);
      if (!sp) continue;
      c[sp.layer] = (c[sp.layer] ?? 0) + 1;
    }
    return c;
  }, [projectPicks]);

  const light = useMemo(() => lightByLayer(layerCounts, year), [layerCounts, year]);

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Canopy &amp; succession</h1>
        <p className={styles.lede}>
          Six layers including a root zone. Step through the 30-year
          succession arc to see how light penetrates each layer as the
          anchor species mature. Picks come from the Plant Database; this
          view is a planning aid, not a growth model.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Scenario</h2>
        <div className={styles.btnRow}>
          {SCENARIOS.map((s) => (
            <button
              key={s.year}
              type="button"
              className={styles.btn}
              onClick={() => setYear(s.year)}
              style={{
                flex: 1,
                background: s.year === year
                  ? 'rgba(230,195,74,0.3)'
                  : undefined,
                borderColor: s.year === year
                  ? 'rgba(230,195,74,0.7)'
                  : undefined,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className={styles.statRow}>
          <span>Succession phase</span>
          <span>{PHASE_LABEL[scenario.phase]}</span>
        </div>
        <p className={styles.empty} style={{ textAlign: 'left', padding: '6px 0' }}>
          {PHASE_NOTE[scenario.phase]}
        </p>
        <div className={styles.statRow}>
          <span>Maturity factor</span>
          <span>{(m * 100).toFixed(0)}%</span>
        </div>
        <div className={styles.statRow}>
          <span>Picked species across layers</span>
          <span>{projectPicks.length}</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Light-by-layer</h2>
        {projectPicks.length === 0 ? (
          <p className={styles.empty}>Add picks in the Plant Database to populate this view.</p>
        ) : (
          <ul className={styles.list}>
            {LAYER_ROWS.map((row) => {
              const lit = light[row.layer] ?? 1;
              const pct = Math.round(lit * 100);
              return (
                <li key={row.layer} className={styles.listRow}>
                  <div style={{ flex: 1 }}>
                    <strong>{row.label}</strong>
                    <div className={styles.listMeta}>
                      {row.heightLabel} · {layerCounts[row.layer] ?? 0} picked
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        height: 6,
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background:
                            pct >= 60
                              ? 'rgba(230,195,74,0.85)'
                              : pct >= 25
                                ? 'rgba(180,150,80,0.7)'
                                : 'rgba(110,90,55,0.7)',
                        }}
                      />
                    </div>
                  </div>
                  <span style={{ minWidth: 48, textAlign: 'right', fontSize: 12 }}>{pct}%</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cross-section ({scenario.label})</h2>
        <svg
          viewBox="0 0 600 320"
          style={{
            width: '100%',
            height: 'auto',
            background: 'linear-gradient(to bottom, rgba(60,90,130,0.18), rgba(40,30,20,0.45))',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {LAYER_ROWS.map((row, i) => {
            const y0 = (row.yStart / 100) * 320;
            const y1 = (row.yEnd / 100) * 320;
            const lit = light[row.layer] ?? 1;
            return (
              <g key={row.layer}>
                <rect
                  x={0}
                  y={y0}
                  width={600}
                  height={y1 - y0}
                  fill={
                    row.layer === 'root_zone'
                      ? 'rgba(80,55,35,0.5)'
                      : `rgba(140,180,120,${0.05 + (layerCounts[row.layer] ?? 0) * 0.04})`
                  }
                  stroke="rgba(255,255,255,0.05)"
                />
                <text x={10} y={y0 + 14} fontSize={11} fill="rgba(232,220,200,0.7)">
                  {row.label} · {row.heightLabel}
                </text>
                <text x={580} y={y0 + 14} fontSize={11}
                  fill="rgba(232,220,200,0.6)" textAnchor="end">
                  {Math.round(lit * 100)}% light
                </text>
                {/* Schematic plant marks scaled by maturity factor m */}
                {row.layer !== 'root_zone' &&
                  Array.from({ length: layerCounts[row.layer] ?? 0 }).map((_, j) => {
                    const cx = 80 + j * 60;
                    const cy = (y0 + y1) / 2;
                    const r = Math.max(3, ((y1 - y0) / 2.5) * m);
                    return (
                      <circle
                        key={j}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="rgba(140,180,120,0.45)"
                        stroke="rgba(180,210,150,0.7)"
                      />
                    );
                  })}
                {/* Root zone: vertical taproots */}
                {row.layer === 'root_zone' &&
                  Array.from({ length: Math.min(8, projectPicks.length) }).map((_, j) => {
                    const x = 60 + j * 70;
                    return (
                      <line
                        key={j}
                        x1={x}
                        y1={y0}
                        x2={x}
                        y2={y0 + (y1 - y0) * (0.4 + 0.6 * m)}
                        stroke="rgba(180,140,90,0.65)"
                        strokeWidth={1.5}
                      />
                    );
                  })}
                {i < LAYER_ROWS.length - 1 && (
                  <line x1={0} y1={y1} x2={600} y2={y1}
                    stroke="rgba(255,255,255,0.08)" />
                )}
              </g>
            );
          })}
        </svg>
      </section>
    </div>
  );
}
