/**
 * SoilBaselineCard — Plan Module 5 (Soil Fertility), card 4/4 (added card).
 *
 * Per Permaculture Scholar verdict 2026-05-07: a fertility module without
 * a baseline is putting the cart before the horse. OSU PDC mandates jar
 * test (sand/silt/clay %), percolation rate, and pH as the bare-minimum
 * diagnosis before any amendment plan. This card lets the steward enter
 * those three readings and (a) auto-classifies the texture using the
 * USDA soil-texture triangle (12 classes), (b) auto-generates a list of
 * limiting factors (e.g. "drains too fast", "low pH"), (c) suggests
 * permaculture-grounded next moves keyed off the limiting factors.
 *
 * v1: ephemeral form state — no persistence yet (steward re-enters each
 * session). A follow-up will add a `soilTestStore` so readings can be
 * stored alongside zones.
 *
 * Sources: NotebookLM Permaculture Scholar (5aa3dcf3-…) 2026-05-07; OSU
 * PDC "Soil Building Goals & Plan"; USDA NRCS *Soil Texture Triangle*.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import styles from '../../../../features/plan/planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

// USDA 12-class triangle classifier. Pure-form lookup.
function classifyTexture(sand: number, silt: number, clay: number): string {
  // Inputs are 0-100, must sum to 100 (caller normalises).
  if (clay >= 40 && sand <= 45 && silt <= 40) return 'Clay';
  if (clay >= 40 && silt >= 40) return 'Silty clay';
  if (clay >= 35 && sand >= 45) return 'Sandy clay';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'Clay loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'Silty clay loam';
  if (clay >= 20 && clay < 35 && sand >= 45 && silt < 28) return 'Sandy clay loam';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'Loam';
  if (silt >= 50 && (clay >= 12 || (clay < 27 && silt < 80))) return 'Silt loam';
  if (silt >= 80 && clay < 12) return 'Silt';
  if (clay < 20 && sand >= 43 && sand < 70 && silt < 50) return 'Sandy loam';
  if (clay < 15 && sand >= 70 && sand < 85) return 'Loamy sand';
  if (sand >= 85) return 'Sand';
  return 'Loam'; // fallback for boundary cases
}

interface Limit {
  flag: string;
  remedy: string;
}

function deriveLimits(sand: number, silt: number, clay: number, perc: number, pH: number): Limit[] {
  const out: Limit[] = [];
  if (sand >= 70) out.push({ flag: 'Drains too fast (sand-dominant)', remedy: 'Sheet-mulch + biochar to lift water-holding capacity; cover-crop with deep-rooted nitrogen fixers.' });
  if (clay >= 35) out.push({ flag: 'Compaction risk (clay-dominant)', remedy: 'Daikon/tillage radish + Keyline subsoiling; avoid heavy traffic when wet.' });
  if (silt >= 60 && clay < 15) out.push({ flag: 'Crusting / erosion-prone (silt-dominant)', remedy: 'Permanent groundcover; chop-and-drop mulch; reduce bare-soil events.' });
  if (perc > 0 && perc < 0.25) out.push({ flag: 'Drains too slow (< 0.25 in/hr)', remedy: 'Hugelkultur mounding to lift root zone; deep-rooted cover crops to open profile.' });
  if (perc > 4) out.push({ flag: 'Drains very fast (> 4 in/hr)', remedy: 'Compost + biochar at planting; mulch heavily; consider swale-fed irrigation.' });
  if (pH > 0 && pH < 5.5) out.push({ flag: 'Acidic (pH < 5.5)', remedy: 'Wood-ash or lime amendment; acid-loving crops (blueberry, rhododendron) for the most affected blocks.' });
  if (pH > 7.8) out.push({ flag: 'Alkaline (pH > 7.8)', remedy: 'Sulphur amendment; pine-needle / oak-leaf mulch; alkaline-tolerant guilds (fig, pomegranate).' });
  return out;
}

export default function SoilBaselineCard({ project: _project }: Props) {
  const [sandStr, setSandStr] = useState('40');
  const [siltStr, setSiltStr] = useState('40');
  const [clayStr, setClayStr] = useState('20');
  const [percStr, setPercStr] = useState(''); // inches/hr
  const [pHStr, setPHStr] = useState('');     // 0-14

  const sand = Math.max(0, Math.min(100, Number(sandStr) || 0));
  const silt = Math.max(0, Math.min(100, Number(siltStr) || 0));
  const clay = Math.max(0, Math.min(100, Number(clayStr) || 0));
  const perc = Math.max(0, Number(percStr) || 0);
  const pH = Math.max(0, Math.min(14, Number(pHStr) || 0));

  const sum = sand + silt + clay;
  const sumOk = Math.abs(sum - 100) <= 2;

  // Normalise for classifier even if sum drifts a bit.
  const norm = useMemo(() => {
    const t = sum > 0 ? sum : 1;
    return { sand: (sand / t) * 100, silt: (silt / t) * 100, clay: (clay / t) * 100 };
  }, [sand, silt, clay, sum]);

  const texture = useMemo(() => classifyTexture(norm.sand, norm.silt, norm.clay), [norm]);
  const limits = useMemo(() => deriveLimits(norm.sand, norm.silt, norm.clay, perc, pH), [norm, perc, pH]);

  // Simple SVG triangle: render an equilateral triangle with the user's
  // sample point. Barycentric mapping: clay = top, sand = bottom-left,
  // silt = bottom-right.
  const W = 320, H = 280, pad = 18;
  const Ax = pad, Ay = H - pad;                 // sand vertex (bottom-left)
  const Bx = W - pad, By = H - pad;             // silt vertex (bottom-right)
  const Cx = W / 2, Cy = pad;                   // clay vertex (top)
  const px = (norm.sand / 100) * Ax + (norm.silt / 100) * Bx + (norm.clay / 100) * Cx;
  const py = (norm.sand / 100) * Ay + (norm.silt / 100) * By + (norm.clay / 100) * Cy;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={styles.title}>Soil baseline</h1>
        <p className={styles.lede}>
          Jar test, percolation, pH. Three measurements is the OSU PDC
          minimum for a defensible soil-building plan — without them, any
          amendment is a guess.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Jar test (% by volume)</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Sand %</span>
            <input value={sandStr} onChange={(e) => setSandStr(e.target.value)} inputMode="decimal" />
          </label>
          <label className={styles.field}>
            <span>Silt %</span>
            <input value={siltStr} onChange={(e) => setSiltStr(e.target.value)} inputMode="decimal" />
          </label>
          <label className={styles.field}>
            <span>Clay %</span>
            <input value={clayStr} onChange={(e) => setClayStr(e.target.value)} inputMode="decimal" />
          </label>
        </div>
        <div className={styles.statRow}>
          <span>Sum</span>
          <strong style={{ color: sumOk ? undefined : '#e08a4a' }}>
            {sum}% {sumOk ? '✓' : '— should equal 100'}
          </strong>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Percolation & pH</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Percolation (in / hr)</span>
            <input value={percStr} onChange={(e) => setPercStr(e.target.value)} placeholder="e.g. 1.5" inputMode="decimal" />
          </label>
          <label className={styles.field}>
            <span>pH</span>
            <input value={pHStr} onChange={(e) => setPHStr(e.target.value)} placeholder="e.g. 6.5" inputMode="decimal" />
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>USDA texture triangle</h2>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <svg role="img" aria-label="USDA soil texture triangle" viewBox={`0 0 ${W} ${H}`} style={{ width: 320, height: 280, background: 'rgba(0,0,0,0.18)', borderRadius: 8 }}>
            <polygon points={`${Ax},${Ay} ${Bx},${By} ${Cx},${Cy}`} fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.40)" />
            {[0.25, 0.5, 0.75].map((f) => (
              <g key={f} stroke="rgba(255,255,255,0.18)" strokeDasharray="2 3">
                <line x1={Ax + (Cx - Ax) * f} y1={Ay + (Cy - Ay) * f} x2={Bx + (Cx - Bx) * f} y2={By + (Cy - By) * f} />
                <line x1={Ax + (Bx - Ax) * f} y1={Ay} x2={Cx + (Bx - Cx) * f} y2={Cy + (By - Cy) * f} />
                <line x1={Bx - (Bx - Ax) * f} y1={By} x2={Cx - (Cx - Ax) * f} y2={Cy + (Ay - Cy) * f} />
              </g>
            ))}
            <text x={Ax} y={Ay + 14} fontSize={10} fill="rgba(255,255,255,0.70)">Sand</text>
            <text x={Bx} y={By + 14} fontSize={10} fill="rgba(255,255,255,0.70)" textAnchor="end">Silt</text>
            <text x={Cx} y={Cy - 4} fontSize={10} fill="rgba(255,255,255,0.70)" textAnchor="middle">Clay</text>
            {sumOk && (
              <>
                <circle cx={px} cy={py} r={5} fill="#e0a050" stroke="rgba(0,0,0,0.5)" strokeWidth={1.2} />
                <text x={px + 8} y={py + 3} fontSize={10} fill="rgba(255,255,255,0.92)">{texture}</text>
              </>
            )}
          </svg>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div className={styles.statRow}>
              <span>Texture class</span>
              <strong>{sumOk ? texture : '—'}</strong>
            </div>
            <div className={styles.statRow}>
              <span>Sand : Silt : Clay</span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>
                {Math.round(norm.sand)} : {Math.round(norm.silt)} : {Math.round(norm.clay)}
              </strong>
            </div>
            {perc > 0 && (
              <div className={styles.statRow}>
                <span>Drainage band</span>
                <strong>{perc < 0.25 ? 'Slow' : perc < 1 ? 'Slow–moderate' : perc < 4 ? 'Moderate–good' : 'Very fast'}</strong>
              </div>
            )}
            {pH > 0 && (
              <div className={styles.statRow}>
                <span>pH band</span>
                <strong>{pH < 5.5 ? 'Acidic' : pH < 7.0 ? 'Slightly acidic' : pH < 7.8 ? 'Near neutral' : 'Alkaline'}</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Limiting factors & remedies</h2>
        {limits.length === 0 ? (
          <p className={styles.empty}>
            {sumOk ? 'No limiting factors detected at the given inputs.' : 'Enter jar-test, percolation, and pH to see limiting factors.'}
          </p>
        ) : (
          <ul className={styles.list}>
            {limits.map((l, i) => (
              <li key={i} className={styles.listRow}>
                <div>
                  <strong>{l.flag}</strong>
                  <div className={styles.listMeta}>{l.remedy}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
