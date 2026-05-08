/**
 * PlantDatabaseSiteMatchCard — Plan Module 4, fresh build per Permaculture
 * Scholar verdict (2026-05-07).
 *
 * Inherits Atlas's filterable PLANT_DATABASE browser, then adds a per-row
 * site-match score driven by a 3-axis weighted composite (hardiness 0.55,
 * precipitation 0.30, slope 0.15 — see `siteMatch.ts`). Hardiness is
 * derived from `project.country`; precipitation and slope come live from
 * the climate / elevation layers in `siteDataStore`. Axes that haven't
 * been observed yet are dropped from the composite (weights renormalise),
 * so the score degrades gracefully on under-observed sites. Scholar
 * quote anchoring this rebuild:
 *   "Tree placement will follow the patterns of water flow and access
 *    and will be part of the long-term major infrastructure of our
 *    design sites."
 *
 * Picks persist into `usePolycultureStore.species` (unchanged from
 * Atlas v1) so downstream cards (Guild Builder, Canopy Succession) keep
 * working off the same store contract.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  PLANT_DATABASE,
  type CanopyLayer,
  type LightNeeds,
  type WaterNeeds,
  type EcologicalFunction,
} from '../../../../data/plantDatabase.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import {
  newAnnotationId,
  type SpeciesPick,
} from '../../../../store/site-annotations.js';
import { scoreSiteMatch } from './siteMatch.js';
import { useSiteData, getLayerSummary } from '../../../../store/siteDataStore.js';
import styles from '../../../../features/plan/planCard.module.css';

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
  { value: 'all',                 label: 'Any function' },
  { value: 'n_fixer',             label: 'N-fixer' },
  { value: 'dynamic_accumulator', label: 'Dynamic accumulator' },
  { value: 'pollinator',          label: 'Pollinator' },
  { value: 'insectary',           label: 'Insectary' },
  { value: 'wildlife_food',       label: 'Wildlife food' },
  { value: 'edible_yield',        label: 'Edible yield' },
  { value: 'timber',              label: 'Timber' },
  { value: 'fodder',              label: 'Fodder' },
  { value: 'medicinal',           label: 'Medicinal' },
];

export default function PlantDatabaseSiteMatchCard({ project }: Props) {
  const allPicks = usePolycultureStore((s) => s.species);
  const addPick = usePolycultureStore((s) => s.addSpeciesPick);
  const removePick = usePolycultureStore((s) => s.removeSpeciesPick);

  const projectPicks = useMemo(
    () => allPicks.filter((p) => p.projectId === project.id),
    [allPicks, project.id],
  );
  const pickedIds = useMemo(
    () => new Set(projectPicks.map((p) => p.speciesId)),
    [projectPicks],
  );

  // ── Site context (optional axes for scoreSiteMatch v2) ────────────────
  const siteData = useSiteData(project.id);
  const annualPrecipMm = useMemo(() => {
    if (!siteData) return null;
    const climate = getLayerSummary<{ annual_precip_mm?: number }>(siteData, 'climate');
    return climate?.annual_precip_mm ?? null;
  }, [siteData]);
  const meanSlopeDeg = useMemo(() => {
    if (!siteData) return null;
    const elev = getLayerSummary<{ mean_slope_deg?: number }>(siteData, 'elevation');
    return elev?.mean_slope_deg ?? null;
  }, [siteData]);
  const siteContext = useMemo(
    () => ({ annualPrecipMm, meanSlopeDeg }),
    [annualPrecipMm, meanSlopeDeg],
  );

  const [query, setQuery] = useState('');
  const [layer, setLayer] = useState<CanopyLayer | 'all'>('all');
  const [light, setLight] = useState<LightNeeds | 'all'>('all');
  const [water, setWater] = useState<WaterNeeds | 'all'>('all');
  const [func, setFunc] = useState<EcologicalFunction | 'all'>('all');
  const [minMatch, setMinMatch] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PLANT_DATABASE
      .map((p) => ({ p, m: scoreSiteMatch(p, project.country, siteContext) }))
      .filter(({ p, m }) => {
        if (q && !p.commonName.toLowerCase().includes(q) && !p.latinName.toLowerCase().includes(q)) return false;
        if (layer !== 'all' && p.layer !== layer) return false;
        if (light !== 'all' && p.lightNeeds !== light) return false;
        if (water !== 'all' && p.waterNeeds !== water) return false;
        if (func !== 'all' && !p.ecologicalFunction.includes(func)) return false;
        if (m.score < minMatch) return false;
        return true;
      })
      .sort((a, b) => b.m.score - a.m.score);
  }, [query, layer, light, water, func, minMatch, project.country, siteContext]);

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
          {PLANT_DATABASE.length} species across the seven canopy layers,
          ranked by site-match score for{' '}
          <strong>{project.name}</strong> ({project.country}). Scholar
          guidance: tree and guild placement should follow the site’s
          water and access patterns, so picks here become inputs to the
          spatial guild builder and the succession simulator.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Macro-site context</h2>
        <p className={styles.empty} style={{ textAlign: 'left', padding: '0 0 8px' }}>
          Site-match score weights: hardiness 0.55 · precipitation 0.30 ·
          slope 0.15. Axes without observed data are dropped (weights
          renormalise) — fetch missing layers in Observe to sharpen the
          score.
        </p>
        <div className={styles.statRow}>
          <span>Hardiness (country band)</span>
          <span>{project.country}</span>
        </div>
        <div className={styles.statRow}>
          <span>Annual precipitation (climate)</span>
          <span>
            {annualPrecipMm != null
              ? `${Math.round(annualPrecipMm)} mm`
              : 'not fetched — run an Observe site fetch'}
          </span>
        </div>
        <div className={styles.statRow}>
          <span>Mean slope (elevation)</span>
          <span>
            {meanSlopeDeg != null
              ? `${meanSlopeDeg.toFixed(1)}°`
              : 'not fetched'}
          </span>
        </div>
      </section>

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
          <label className={styles.field}>
            <span>Min site-match (%)</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minMatch}
              onChange={(e) => setMinMatch(Number(e.target.value))}
            />
            <span style={{ fontSize: 11, opacity: 0.7 }}>{minMatch}%</span>
          </label>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {filtered.length} matching · {projectPicks.length} picked
        </h2>
        {filtered.length === 0 ? (
          <p className={styles.empty}>No species match these filters.</p>
        ) : (
          <ul className={styles.list}>
            {filtered.map(({ p, m }) => {
              const picked = pickedIds.has(p.id);
              return (
                <li key={p.id} className={styles.listRow}>
                  <div style={{ flex: 1 }}>
                    <strong>{p.commonName}</strong>
                    <span
                      title={m.rationale}
                      style={{
                        marginLeft: 8,
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        background:
                          m.score >= 60
                            ? 'rgba(140,180,120,0.25)'
                            : m.score >= 30
                              ? 'rgba(200,170,100,0.25)'
                              : 'rgba(180,100,90,0.25)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {m.score}% match
                    </span>
                    <div className={styles.listMeta}>
                      <em>{p.latinName}</em> · {p.layer} ·{' '}
                      {p.matureHeightM} m × {p.matureWidthM} m · USDA{' '}
                      {p.hardinessZones[0]}–{p.hardinessZones[1]} ·{' '}
                      {p.ecologicalFunction.join(', ')}
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
