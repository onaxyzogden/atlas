/**
 * CanopySimulatorCard — PLAN Module 4.
 *
 * Year 1 → 50 scrubber. Renders mature-canopy circles for each picked
 * species at the current age, using linear interp from 0 → matureWidthM
 * over a fixed 25-year curve (clamped). Static SVG only — no map
 * integration in v1.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { findSpecies } from '../../data/plantDatabase.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const MATURITY_YEARS = 25; // linear interp 0 → matureWidth across this many years

interface PlacedCircle {
  speciesId: string;
  commonName: string;
  layer: string;
  matureWidthM: number;
  cx: number;
  cy: number;
}

export default function CanopySimulatorCard({ project }: Props) {
  const allPicks = usePolycultureStore((s) => s.species);
  const projectPicks = useMemo(() => allPicks.filter((p) => p.projectId === project.id), [allPicks, project.id]);

  const [year, setYear] = useState<number>(5);

  // Stable layout: spread picks on a square grid (deterministic by id).
  const circles: PlacedCircle[] = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(Math.max(1, projectPicks.length)));
    const out: PlacedCircle[] = [];
    projectPicks.forEach((pick, i) => {
      const sp = findSpecies(pick.speciesId);
      if (!sp) return;
      const col = i % cols;
      const row = Math.floor(i / cols);
      out.push({
        speciesId: sp.id,
        commonName: sp.commonName,
        layer: sp.layer,
        matureWidthM: sp.matureWidthM,
        cx: 50 + col * 80,
        cy: 50 + row * 80,
      });
    });
    return out;
  }, [projectPicks]);

  const ageFactor = Math.min(1, year / MATURITY_YEARS);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Canopy simulator</h1>
        <p className={styles.lede}>
          Linear age-to-width interpolation over {MATURITY_YEARS} years, clamped at maturity.
          Drag the year scrubber to see picked species&rsquo; canopies grow.
          Real growth follows a sigmoid; this is a v1 visualisation.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Year {year}</h2>
        <input
          type="range"
          min={1}
          max={50}
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div className={styles.statRow}><span>Age factor (clamped)</span><span>{(ageFactor * 100).toFixed(0)}%</span></div>
        <div className={styles.statRow}><span>Picked species</span><span>{circles.length}</span></div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Canopy projection</h2>
        {circles.length === 0 ? (
          <p className={styles.empty}>Add picks in the Plant Database to populate this preview.</p>
        ) : (
          <svg
            viewBox="0 0 600 400"
            style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.25)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {circles.map((c) => {
              // 1 m of canopy ≈ 4 SVG units (so a 5 m canopy ≈ 20 px radius).
              const r = (c.matureWidthM / 2) * 4 * ageFactor;
              return (
                <g key={c.speciesId}>
                  <circle cx={c.cx} cy={c.cy} r={r}
                    fill="rgba(140,180,120,0.25)"
                    stroke="rgba(180,210,150,0.6)"
                    strokeWidth={1}
                  />
                  <text x={c.cx} y={c.cy + 3} textAnchor="middle" fontSize={9}
                    fill="rgba(232,220,200,0.7)"
                  >
                    {c.commonName}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </section>
    </div>
  );
}
