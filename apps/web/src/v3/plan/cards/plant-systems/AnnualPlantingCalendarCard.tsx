/**
 * AnnualPlantingCalendarCard — Plan Module 8 (Plant Systems).
 *
 * Reads the site's last/first frost normals from `siteProfileStore`
 * (prefilled from the Observe climate layer) and walks every annual
 * crop area on the project against `plantPhenologyData`. Emits:
 *
 *   - one synthetic `BuildPhase` per project / year carrying every
 *     direct-sow / transplant / harvest task
 *   - one `PropagationBatch` per start-indoors entry
 *
 * Regenerate replaces only rows stamped with
 * `generatedFromPlantingCalendar` — user-authored phases, Goal-Compass
 * rows, and manual nursery batches are untouched.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { useSiteProfileStore } from '../../../../store/siteProfileStore.js';
import { usePhaseStore } from '../../../../store/phaseStore.js';
import { useNurseryStore } from '../../../../store/nurseryStore.js';
import {
  schedulePlantingFromAreas,
  type FrostDates,
  type PlantingScheduleOutput,
} from '../../engine/plantSystems/schedulePlantingFromAreas.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SCHEDULABLE_TYPES = new Set(['row_crop', 'garden_bed', 'market_garden']);

export default function AnnualPlantingCalendarCard({ project }: Props) {
  const today = new Date();
  const defaultYear =
    today.getMonth() >= 9 ? today.getFullYear() + 1 : today.getFullYear();
  const [year, setYear] = useState<number>(defaultYear);
  const [note, setNote] = useState<string | null>(null);
  const [lastOutput, setLastOutput] = useState<PlantingScheduleOutput | null>(null);

  const cropAreas = useCropStore((s) => s.cropAreas);
  const profile = useSiteProfileStore(
    (s) => s.profilesByProject[project.id] ?? null,
  );
  const replacePlantingCalendarRows = usePhaseStore((s) => s.replacePlantingCalendarRows);
  const replacePlantingCalendarBatches = useNurseryStore(
    (s) => s.replacePlantingCalendarBatches,
  );

  const projectAreas = useMemo(
    () =>
      cropAreas.filter(
        (a) => a.projectId === project.id && SCHEDULABLE_TYPES.has(a.type),
      ),
    [cropAreas, project.id],
  );

  const lastFrost = profile?.lastFrostDate.value ?? null;
  const firstFrost = profile?.firstFrostDate.value ?? null;
  const frostReady = lastFrost !== null && firstFrost !== null;
  const areaCount = projectAreas.length;
  const speciesCount = useMemo(() => {
    const set = new Set<string>();
    for (const a of projectAreas) for (const s of a.species) set.add(s);
    return set.size;
  }, [projectAreas]);

  const canGenerate = frostReady && areaCount > 0;

  const handleGenerate = () => {
    if (!frostReady || !lastFrost || !firstFrost) {
      setNote('Set last and first frost dates on the Goal Compass · Site profile tab before generating.');
      return;
    }
    const frost: FrostDates = { lastFrost, firstFrost };
    const output = schedulePlantingFromAreas(projectAreas, frost, year, project.id);
    replacePlantingCalendarRows(
      project.id,
      [output.generatedPhase],
      output.phaseTasks,
    );
    replacePlantingCalendarBatches(project.id, output.nurseryBatches);
    setLastOutput(output);
    setNote(
      `Generated ${output.phaseTasks.length} task${output.phaseTasks.length === 1 ? '' : 's'} and ` +
        `${output.nurseryBatches.length} nursery batch${output.nurseryBatches.length === 1 ? '' : 'es'} for ${year}.`,
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plant Systems · Annual schedule</span>
        <h2 className={styles.title}>Annual planting schedule</h2>
        <p className={styles.lede}>
          Generate the year's start-indoors, direct-sow, transplant, and harvest
          dates from every annual crop area on the parcel. Anchored to your
          last/first frost normals from Observe.
        </p>
        <div className={styles.btnRow} style={{ marginTop: 12, gap: 8, alignItems: 'center' }}>
          <label htmlFor="apc-year" className={styles.hint} style={{ fontSize: 12 }}>
            Year:
          </label>
          <input
            id="apc-year"
            type="number"
            value={year}
            min={today.getFullYear()}
            max={today.getFullYear() + 10}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) setYear(n);
            }}
            style={{ width: 90 }}
          />
          <button
            type="button"
            className={styles.btn}
            onClick={handleGenerate}
            disabled={!canGenerate}
            title={
              !frostReady
                ? 'Frost dates missing — set on Goal Compass · Site profile.'
                : areaCount === 0
                  ? 'No annual crop areas drawn — add a row_crop / garden_bed / market_garden.'
                  : 'Generate the planting calendar'
            }
          >
            Generate plan
          </button>
          {note ? (
            <span
              className={styles.hint}
              role="status"
              aria-live="polite"
              style={{ fontSize: 12 }}
            >
              {note}
            </span>
          ) : null}
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Inputs</h3>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Last frost (spring)</label>
            <div style={{ fontSize: 13 }}>{lastFrost ?? <em style={{ opacity: 0.6 }}>not set</em>}</div>
          </div>
          <div className={styles.field}>
            <label>First frost (fall)</label>
            <div style={{ fontSize: 13 }}>{firstFrost ?? <em style={{ opacity: 0.6 }}>not set</em>}</div>
          </div>
          <div className={styles.field}>
            <label>Annual crop areas</label>
            <div style={{ fontSize: 13 }}>
              {areaCount} area{areaCount === 1 ? '' : 's'} · {speciesCount} species
            </div>
          </div>
        </div>
      </section>

      {lastOutput && lastOutput.rows.length > 0 ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Schedule ({lastOutput.rows.length} plantings)</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Crop area</th>
                <th>Species</th>
                <th>Start indoors</th>
                <th>Direct sow</th>
                <th>Transplant</th>
                <th>Harvest opens</th>
                <th>Harvest closes</th>
              </tr>
            </thead>
            <tbody>
              {lastOutput.rows.map((r, idx) => (
                <tr key={`${r.cropAreaId}-${r.speciesId}-${r.plantingIndex}-${idx}`}>
                  <td>{r.cropAreaName}</td>
                  <td>
                    {r.speciesLabel}
                    {r.plantingIndex > 0 ? ` · #${r.plantingIndex + 1}` : ''}
                  </td>
                  <td>{r.startIndoorsDate ?? '—'}</td>
                  <td>{r.directSowDate ?? '—'}</td>
                  <td>{r.transplantDate ?? '—'}</td>
                  <td>{r.harvestOpenDate}</td>
                  <td>{r.harvestCloseDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {lastOutput && lastOutput.rows.length === 0 ? (
        <section className={styles.section}>
          <div className={styles.empty}>
            No plantings produced — check that crop areas list species the
            phenology catalog recognises (tomato, lettuce, kale, etc.).
          </div>
        </section>
      ) : null}
    </div>
  );
}
