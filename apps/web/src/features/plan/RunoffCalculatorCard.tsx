/**
 * RunoffCalculatorCard — PLAN Module 2.
 *
 * Rational-method runoff: V = C × P × A.
 *  - C: dimensionless runoff coefficient (0.85 for impermeable roof, 0.30
 *    for vegetated grass, 0.95 for asphalt — steward picks).
 *  - P: precipitation in mm/year.
 *  - A: catchment area in m².
 * Output is litres/year and US gallons/year; useful as a sizing input for
 * cisterns and swales.
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SURFACE_PRESETS: Array<{ label: string; coeff: number }> = [
  { label: 'Metal / tile roof', coeff: 0.95 },
  { label: 'Asphalt shingle roof', coeff: 0.85 },
  { label: 'Compacted gravel', coeff: 0.6 },
  { label: 'Pasture / lawn', coeff: 0.3 },
  { label: 'Forested', coeff: 0.15 },
];

const L_PER_M3 = 1000;
const GAL_PER_L = 0.264172;

export default function RunoffCalculatorCard({ project: _project }: Props) {
  const [areaM2, setAreaM2] = useState<number>(100);
  const [precipMm, setPrecipMm] = useState<number>(900);
  const [coeff, setCoeff] = useState<number>(0.85);

  const result = useMemo(() => {
    // V (m³/yr) = A (m²) × P (m) × C
    const m3 = areaM2 * (precipMm / 1000) * coeff;
    const litres = m3 * L_PER_M3;
    const gallons = litres * GAL_PER_L;
    return { m3, litres, gallons };
  }, [areaM2, precipMm, coeff]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 2 · Water</span>
        <h1 className={styles.title}>Runoff calculator</h1>
        <p className={styles.lede}>
          Rough volume of rainfall captured per year from a single roof or
          surface. Use to size cisterns and to check whether your swales
          have storage to match their inflow.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Inputs</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Catchment area (m²)</span>
            <input type="number" min={0} step={1} value={areaM2}
              onChange={(e) => setAreaM2(Number(e.target.value) || 0)} />
          </label>
          <label className={styles.field}>
            <span>Annual precip (mm)</span>
            <input type="number" min={0} step={10} value={precipMm}
              onChange={(e) => setPrecipMm(Number(e.target.value) || 0)} />
          </label>
          <label className={`${styles.field} ${styles.full}`}>
            <span>Surface type / coefficient</span>
            <select value={coeff} onChange={(e) => setCoeff(Number(e.target.value))}>
              {SURFACE_PRESETS.map((p) => (
                <option key={p.label} value={p.coeff}>
                  {p.label} (C = {p.coeff})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Estimated runoff</h2>
        <div className={styles.statRow}><span>Volume</span><span>{result.m3.toFixed(1)} m³/yr</span></div>
        <div className={styles.statRow}><span>Litres</span><span>{Math.round(result.litres).toLocaleString()} L/yr</span></div>
        <div className={styles.statRow}><span>US gallons</span><span>{Math.round(result.gallons).toLocaleString()} gal/yr</span></div>
        <p className={styles.sectionBody} style={{ marginTop: 12 }}>
          Rule of thumb: 1&nbsp;m² of roof × 1&nbsp;mm of rain ≈ 1&nbsp;litre of yield (assuming C ≈ 1). Real systems lose 5–25% to first-flush, evap, and overflow.
        </p>
      </section>
    </div>
  );
}
