/**
 * PlantDatabaseCard — PLAN Module 4.
 *
 * Searchable / filterable browser over the v1 hand-curated species list
 * in `data/plantDatabase.ts`. "Add to project" stores a SpeciesPick in
 * `siteAnnotationsStore.species` keyed by speciesId, so the same plant
 * library can later feed the Guild Builder and Canopy Simulator.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { PLANT_DATABASE, type CanopyLayer, type LightNeeds, type WaterNeeds, type EcologicalFunction } from '../../data/plantDatabase.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { newAnnotationId, type SpeciesPick } from '../../store/site-annotations.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const LAYERS: Array<{ value: CanopyLayer | 'all'; label: string }> = [
  { value: 'all',          label: 'All layers' },
  { value: 'canopy',       label: 'Canopy' },
  { value: 'sub_canopy',   label: 'Sub-canopy' },
  { value: 'shrub',        label: 'Shrub' },
  { value: 'herbaceous',   label: 'Herbaceous' },
  { value: 'ground_cover', label: 'Ground cover' },
  { value: 'vine',         label: 'Vine' },
  { value: 'root',         label: 'Root' },
];

const FUNCTIONS: Array<{ value: EcologicalFunction | 'all'; label: string }> = [
  { value: 'all',                  label: 'Any function' },
  { value: 'n_fixer',              label: 'N-fixer' },
  { value: 'dynamic_accumulator',  label: 'Dynamic accumulator' },
  { value: 'pollinator',           label: 'Pollinator' },
  { value: 'insectary',            label: 'Insectary' },
  { value: 'wildlife_food',        label: 'Wildlife food' },
  { value: 'edible_yield',         label: 'Edible yield' },
  { value: 'timber',               label: 'Timber' },
  { value: 'fodder',               label: 'Fodder' },
  { value: 'medicinal',            label: 'Medicinal' },
];

export default function PlantDatabaseCard({ project }: Props) {
  const allPicks = usePolycultureStore((s) => s.species);
  const addPick = usePolycultureStore((s) => s.addSpeciesPick);
  const removePick = usePolycultureStore((s) => s.removeSpeciesPick);

  const projectPicks = useMemo(() => allPicks.filter((p) => p.projectId === project.id), [allPicks, project.id]);
  const pickedIds = useMemo(() => new Set(projectPicks.map((p) => p.speciesId)), [projectPicks]);

  const [query, setQuery] = useState('');
  const [layer, setLayer] = useState<CanopyLayer | 'all'>('all');
  const [light, setLight] = useState<LightNeeds | 'all'>('all');
  const [water, setWater] = useState<WaterNeeds | 'all'>('all');
  const [func, setFunc] = useState<EcologicalFunction | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLANT_DATABASE.filter((p) => {
      if (q && !p.commonName.toLowerCase().includes(q) && !p.latinName.toLowerCase().includes(q)) return false;
      if (layer !== 'all' && p.layer !== layer) return false;
      if (light !== 'all' && p.lightNeeds !== light) return false;
      if (water !== 'all' && p.waterNeeds !== water) return false;
      if (func !== 'all' && !p.ecologicalFunction.includes(func)) return false;
      return true;
    });
  }, [query, layer, light, water, func]);

  function pick(speciesId: string) {
    const sp: SpeciesPick = {
      id: newAnnotationId('sp'),
      projectId: project.id,
      speciesId,
      createdAt: new Date().toISOString(),
    };
    addPick(sp);
  }

  function unpick(speciesId: string) {
    const existing = projectPicks.find((p) => p.speciesId === speciesId);
    if (existing) removePick(existing.id);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Plant database</h1>
        <p className={styles.lede}>
          {PLANT_DATABASE.length} species · curated v1 starter set across the
          seven canopy layers. Add picks to your project library so they
          appear in the Guild Builder and Canopy Simulator.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Filters</h2>
        <div className={styles.grid}>
          <label className={`${styles.field} ${styles.full}`}>
            <span>Search (common or Latin name)</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. apple, comfrey" />
          </label>
          <label className={styles.field}>
            <span>Layer</span>
            <select value={layer} onChange={(e) => setLayer(e.target.value as CanopyLayer | 'all')}>
              {LAYERS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Light</span>
            <select value={light} onChange={(e) => setLight(e.target.value as LightNeeds | 'all')}>
              <option value="all">Any</option>
              <option value="full">Full sun</option>
              <option value="partial">Partial</option>
              <option value="shade">Shade</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Water</span>
            <select value={water} onChange={(e) => setWater(e.target.value as WaterNeeds | 'all')}>
              <option value="all">Any</option>
              <option value="low">Low</option>
              <option value="med">Med</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className={styles.field}>
            <span>Ecological function</span>
            <select value={func} onChange={(e) => setFunc(e.target.value as EcologicalFunction | 'all')}>
              {FUNCTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{filtered.length} matching · {projectPicks.length} picked</h2>
        {filtered.length === 0 ? (
          <p className={styles.empty}>No species match these filters.</p>
        ) : (
          <ul className={styles.list}>
            {filtered.map((p) => {
              const picked = pickedIds.has(p.id);
              return (
                <li key={p.id} className={styles.listRow}>
                  <div>
                    <strong>{p.commonName}</strong>
                    <div className={styles.listMeta}>
                      <em>{p.latinName}</em> · {p.layer} · {p.matureHeightM} m × {p.matureWidthM} m · USDA {p.hardinessZones[0]}–{p.hardinessZones[1]} · {p.ecologicalFunction.join(', ')}
                    </div>
                  </div>
                  {picked ? (
                    <button type="button" className={styles.removeBtn} onClick={() => unpick(p.id)}>Remove</button>
                  ) : (
                    <button type="button" className={styles.btn} onClick={() => pick(p.id)}>Add</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
