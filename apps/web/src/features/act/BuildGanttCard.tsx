/**
 * BuildGanttCard — ACT-stage Module 1 (Phased Implementation & Budgeting).
 *
 * Reads `phaseStore.phases` raw and renders a 5-year × 4-quarter SVG Gantt.
 * Each phase bar spans its `timeframe`, and `tasks?` (PLAN-stage seasonal
 * tasks) are placed as dotted markers in their `season` column.
 *
 * Read-only here. Edits live in PLAN (`plan-seasonal-tasks`,
 * `plan-phasing-matrix`); clicking a task switches to the seasonal tasks
 * card so the steward can edit it in context.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useUIStore } from '../../store/uiStore.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const YEARS = [0, 1, 2, 3, 4]; // Year 0 .. Year 4 (inclusive — 5 years)
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const SEASON_TO_QUARTER: Record<'winter'|'spring'|'summer'|'fall', number> = {
  winter: 0, spring: 1, summer: 2, fall: 3,
};

/**
 * Heuristic timeframe → [startYear, endYear] map. The PLAN-stage default
 * phases use strings like "Year 0-1", "Year 1-3", "Year 3-5", "Year 5+".
 * We parse on a best-effort basis; an unparseable timeframe falls back to
 * the phase's `order` index (0-based) as a single-year span.
 */
function parseTimeframe(timeframe: string, fallbackOrder: number): [number, number] {
  const m = /(\d+)\s*[-–]\s*(\d+)/.exec(timeframe);
  if (m && m[1] !== undefined && m[2] !== undefined) {
    return [Math.min(+m[1], 4), Math.min(+m[2], 4)];
  }
  const single = /(\d+)/.exec(timeframe);
  if (single && single[1] !== undefined) {
    return [Math.min(+single[1], 4), Math.min(+single[1], 4)];
  }
  return [Math.max(0, fallbackOrder - 1), Math.max(0, fallbackOrder - 1)];
}

export default function BuildGanttCard({ project }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const setSection = useUIStore((s) => s.setActiveDashboardSection);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === project.id).slice().sort((a, b) => a.order - b.order),
    [allPhases, project.id],
  );

  // SVG geometry
  const TOTAL_COLS = YEARS.length * QUARTERS.length; // 20 columns
  const COL_W = 38;
  const ROW_H = 38;
  const HEADER_H = 44;
  const LABEL_W = 180;
  const width = LABEL_W + TOTAL_COLS * COL_W + 16;
  const height = HEADER_H + Math.max(phases.length, 1) * ROW_H + 16;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 1 — Phased Implementation</span>
        <h1 className={styles.title}>5-Year Build Gantt</h1>
        <p className={styles.lede}>
          Read-only timeline of every phase + seasonal task. Click a task
          marker to jump into the seasonal-task editor in PLAN.
        </p>
      </header>

      <section className={styles.section}>
        {phases.length === 0 ? (
          <p className={styles.empty}>No phases defined yet — set them up in PLAN → Phasing Matrix.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <svg width={width} height={height} role="img" aria-label="Build Gantt">
              {/* Year + quarter header */}
              {YEARS.map((y, yi) => (
                <g key={y}>
                  <text
                    x={LABEL_W + yi * 4 * COL_W + 2 * COL_W}
                    y={16}
                    textAnchor="middle"
                    fontSize={11}
                    fill="rgba(232,220,200,0.6)"
                    fontWeight={600}
                  >
                    Year {y}
                  </text>
                  {QUARTERS.map((q, qi) => (
                    <g key={q}>
                      <text
                        x={LABEL_W + (yi * 4 + qi) * COL_W + COL_W / 2}
                        y={32}
                        textAnchor="middle"
                        fontSize={10}
                        fill="rgba(232,220,200,0.4)"
                      >
                        {q}
                      </text>
                      <line
                        x1={LABEL_W + (yi * 4 + qi) * COL_W}
                        y1={HEADER_H}
                        x2={LABEL_W + (yi * 4 + qi) * COL_W}
                        y2={height - 8}
                        stroke="rgba(255,255,255,0.04)"
                      />
                    </g>
                  ))}
                </g>
              ))}
              <line
                x1={LABEL_W}
                y1={HEADER_H - 2}
                x2={width - 8}
                y2={HEADER_H - 2}
                stroke="rgba(255,255,255,0.08)"
              />

              {/* Phase bars + task markers */}
              {phases.map((p, idx) => {
                const [s, e] = parseTimeframe(p.timeframe, p.order);
                // Year y covers cols 4y..4y+3; treat span inclusively.
                const startCol = s * 4;
                const endCol = e * 4 + 3;
                const x = LABEL_W + startCol * COL_W;
                const w = (endCol - startCol + 1) * COL_W;
                const y = HEADER_H + idx * ROW_H + 6;
                const rowY = HEADER_H + idx * ROW_H;

                return (
                  <g key={p.id}>
                    <text
                      x={8}
                      y={y + 18}
                      fontSize={12}
                      fill="rgba(232,220,200,0.9)"
                    >
                      {p.name}
                    </text>
                    <text
                      x={8}
                      y={y + 32}
                      fontSize={10}
                      fill="rgba(232,220,200,0.5)"
                    >
                      {p.timeframe}
                    </text>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={ROW_H - 14}
                      rx={4}
                      fill={p.color || 'rgba(var(--color-gold-rgb),0.25)'}
                      opacity={p.completed ? 0.85 : 0.45}
                      stroke="rgba(255,255,255,0.12)"
                    />
                    {(p.tasks ?? []).map((t) => {
                      // Place the task marker at the season column inside
                      // the phase span (use first year of phase).
                      const qOffset = SEASON_TO_QUARTER[t.season] ?? 0;
                      const taskCol = s * 4 + qOffset;
                      const cx = LABEL_W + taskCol * COL_W + COL_W / 2;
                      const cy = y + (ROW_H - 14) / 2;
                      return (
                        <g
                          key={t.id}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSection('plan-seasonal-tasks')}
                        >
                          <circle
                            cx={cx}
                            cy={cy}
                            r={5}
                            fill="rgba(232,220,200,0.95)"
                            stroke="rgba(0,0,0,0.4)"
                          />
                          <title>
                            {t.title} · {t.season} · {t.laborHrs}h · ${t.costUSD}
                          </title>
                        </g>
                      );
                    })}
                    <line
                      x1={LABEL_W}
                      y1={rowY + ROW_H}
                      x2={width - 8}
                      y2={rowY + ROW_H}
                      stroke="rgba(255,255,255,0.04)"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </section>
    </div>
  );
}
