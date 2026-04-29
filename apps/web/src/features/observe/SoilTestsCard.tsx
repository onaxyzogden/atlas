/**
 * SoilTestsCard — Phase 4d OBSERVE surface (Module 4: Earth/Water diagnostics).
 *
 * Combines three field-test forms in one page:
 *   1. Jar test — sand/silt/clay percentages with auto-normalisation
 *   2. Percolation rate (in/hr)
 *   3. Roof catchment estimator — harvest gallons/yr from roof area + precip
 *
 * Tests attach to a soil sample (the existing `SoilSample` type now carries
 * optional jarTest / percolationInPerHr / depthToBedrockM / roofCatchment).
 * If the project has no samples yet, the form prompts the steward to create
 * one first via the existing ManualLabTestsCard (linked from EcologicalDashboard).
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSoilSampleStore, type SoilSample } from '../../store/soilSampleStore.js';
import styles from './StewardSurveyCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const M2_PER_FT2 = 0.092903;
const GAL_PER_L = 0.264172;

/** Roof catchment formula: runoffL = area_m² × precip_mm × runoffCoeff,
 *  since 1 mm of rain on 1 m² = 1 litre. */
function roofYieldLitresPerYear(areaM2: number, precipMm: number, coeff: number): number {
  return areaM2 * precipMm * coeff;
}

export default function SoilTestsCard({ project }: Props) {
  const samples = useSoilSampleStore((s) => s.samples);
  const updateSample = useSoilSampleStore((s) => s.updateSample);

  const projectSamples = useMemo(
    () => samples.filter((x) => x.projectId === project.id),
    [samples, project.id],
  );

  const [activeId, setActiveId] = useState<string>(projectSamples[0]?.id ?? '');
  const sample: SoilSample | undefined = useMemo(
    () => projectSamples.find((s) => s.id === activeId) ?? projectSamples[0],
    [projectSamples, activeId],
  );

  function setJar(field: 'sandPct' | 'siltPct' | 'clayPct', valueRaw: string) {
    if (!sample) return;
    const value = valueRaw === '' ? 0 : Number(valueRaw);
    const prev = sample.jarTest ?? { sandPct: 0, siltPct: 0, clayPct: 0 };
    updateSample(sample.id, { jarTest: { ...prev, [field]: value } });
  }

  function setNum(
    field: 'percolationInPerHr' | 'depthToBedrockM',
    valueRaw: string,
  ) {
    if (!sample) return;
    updateSample(sample.id, {
      [field]: valueRaw === '' ? undefined : Number(valueRaw),
    } as Partial<SoilSample>);
  }

  function setRoof(field: 'roofAreaM2' | 'runoffCoeff' | 'annualPrecipMm', valueRaw: string) {
    if (!sample) return;
    const value = valueRaw === '' ? 0 : Number(valueRaw);
    const prev = sample.roofCatchment ?? { roofAreaM2: 0 };
    updateSample(sample.id, { roofCatchment: { ...prev, [field]: value } });
  }

  if (projectSamples.length === 0) {
    return (
      <div className={styles.page}>
        <header className={styles.hero}>
          <span className={styles.heroTag}>Module 4 · Diagnostics</span>
          <h1 className={styles.title}>Jar / Percolation / Roof Catchment</h1>
          <p className={styles.lede}>
            These tests attach to a soil sample. Create your first sample via the
            <strong> Manual Lab Tests</strong> card on the Ecological dashboard,
            then return here to capture jar / percolation / roof-catchment data.
          </p>
        </header>
      </div>
    );
  }

  if (!sample) return null;

  // Auto-normalise jar test sum for display.
  const jar = sample.jarTest;
  const jarSum = jar ? jar.sandPct + jar.siltPct + jar.clayPct : 0;
  const jarOk = jar ? Math.abs(jarSum - 100) <= 2 : true;

  // Roof catchment estimate.
  const roof = sample.roofCatchment;
  const roofLYr =
    roof && roof.roofAreaM2 > 0 && roof.annualPrecipMm
      ? roofYieldLitresPerYear(roof.roofAreaM2, roof.annualPrecipMm, roof.runoffCoeff ?? 0.85)
      : null;
  const roofGalYr = roofLYr !== null ? roofLYr * GAL_PER_L : null;

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Module 4 · Diagnostics</span>
        <h1 className={styles.title}>Jar Test, Percolation & Roof Catchment</h1>
        <p className={styles.lede}>
          Field-test data attached to a soil sample. Pick a sample, fill what you have,
          changes auto-save.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.field}>
          <label htmlFor="sample-select">Soil sample</label>
          <select
            id="sample-select"
            value={sample.id}
            onChange={(e) => setActiveId(e.target.value)}
          >
            {projectSamples.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sampleDate} — {s.label || '(unlabelled)'}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Jar Test</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="jar-sand">Sand %</label>
            <input
              id="jar-sand" type="number" min={0} max={100}
              value={jar?.sandPct ?? ''}
              onChange={(e) => setJar('sandPct', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="jar-silt">Silt %</label>
            <input
              id="jar-silt" type="number" min={0} max={100}
              value={jar?.siltPct ?? ''}
              onChange={(e) => setJar('siltPct', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="jar-clay">Clay %</label>
            <input
              id="jar-clay" type="number" min={0} max={100}
              value={jar?.clayPct ?? ''}
              onChange={(e) => setJar('clayPct', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Sum</label>
            <input readOnly value={jar ? `${jarSum}%${jarOk ? '' : ' ⚠ should ≈ 100'}` : '—'} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Percolation & Bedrock</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="perc">Percolation rate (in/hr)</label>
            <input
              id="perc" type="number" step="0.1" min={0}
              value={sample.percolationInPerHr ?? ''}
              onChange={(e) => setNum('percolationInPerHr', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="bedrock">Depth to bedrock (m)</label>
            <input
              id="bedrock" type="number" step="0.1" min={0}
              value={sample.depthToBedrockM ?? ''}
              onChange={(e) => setNum('depthToBedrockM', e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Roof Catchment</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label htmlFor="roof-area">Roof area (m²)</label>
            <input
              id="roof-area" type="number" step="1" min={0}
              value={roof?.roofAreaM2 ?? ''}
              onChange={(e) => setRoof('roofAreaM2', e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'rgba(232,220,200,0.45)', marginTop: 2 }}>
              {roof?.roofAreaM2 ? `≈ ${Math.round(roof.roofAreaM2 / M2_PER_FT2)} ft²` : ''}
            </span>
          </div>
          <div className={styles.field}>
            <label htmlFor="roof-coeff">Runoff coefficient</label>
            <input
              id="roof-coeff" type="number" step="0.05" min={0} max={1}
              placeholder="0.85 (default)"
              value={roof?.runoffCoeff ?? ''}
              onChange={(e) => setRoof('runoffCoeff', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="roof-precip">Annual precip (mm)</label>
            <input
              id="roof-precip" type="number" step="10" min={0}
              value={roof?.annualPrecipMm ?? ''}
              onChange={(e) => setRoof('annualPrecipMm', e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label>Estimated harvest</label>
            <input
              readOnly
              value={
                roofGalYr !== null && roofLYr !== null
                  ? `${Math.round(roofGalYr).toLocaleString()} gal/yr (${Math.round(
                      roofLYr,
                    ).toLocaleString()} L/yr)`
                  : '—'
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}
