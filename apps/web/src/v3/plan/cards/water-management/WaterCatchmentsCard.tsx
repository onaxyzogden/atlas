/**
 * WaterCatchmentsCard — Plan Module 2 (Water), card 1/3.
 *
 * Defines catchment SOURCES — roof, paved, pasture, forest polygons in
 * surface terms (area + runoff coefficient). Per Permaculture Scholar
 * verdict 2026-05-07: catchments are the *sources* of the directed water
 * graph; their annual yield = Area × Precip × C feeds downstream storage
 * and swale nodes.
 *
 * v1 captures area numerically (no map-draw yet). Annual precipitation
 * defaults from `siteDataStore` (climate layer) when available, with a
 * per-card override input.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  useWaterSystemsStore,
  type WaterNode,
  type CatchmentSurface,
} from '../../../../store/waterSystemsStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useSiteData, getLayer, getLayerSummary } from '../../../../store/siteDataStore.js';
import { usePhaseStoreCappedEntities } from '../../usePhaseStoreCappedEntities.js';
import {
  DEFAULT_COEFF,
  SURFACE_LABEL,
  catchmentYieldM3,
  formatLitres,
} from './waterMath.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function WaterCatchmentsCard({ project }: Props) {
  const all = useWaterSystemsStore((s) => s.waterNodes);
  const add = useWaterSystemsStore((s) => s.addWaterNode);
  const update = useWaterSystemsStore((s) => s.updateWaterNode);
  const remove = useWaterSystemsStore((s) => s.removeWaterNode);

  const siteData = useSiteData(project.id);
  const sitePrecipMm = useMemo(() => {
    if (!siteData) return null;
    const climate = getLayer(siteData, 'climate');
    const summary = climate?.summary as { annual_precip_mm?: number } | undefined;
    return summary?.annual_precip_mm ?? null;
  }, [siteData]);

  const elev = useMemo(() => {
    if (!siteData) return null;
    return getLayerSummary<{
      min_elevation_m?: number;
      max_elevation_m?: number;
      mean_elevation_m?: number;
      mean_slope_deg?: number;
      max_slope_deg?: number;
      predominant_aspect?: string;
    }>(siteData, 'elevation');
  }, [siteData]);

  const [precipMm, setPrecipMm] = useState<number>(sitePrecipMm ?? 900);

  // Project-scoped catchment WaterNodes. The Yeomans cap adapter then
  // filters by the active Plan view (Year 1 / Year 5) using each node's
  // phaseStore phase id → BuildPhase.yeomansCap → PHASE_VIEW_CAP chain.
  // See wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md.
  const catchmentsRaw = useMemo(
    () => all.filter((n) => n.projectId === project.id && n.kind === 'catchment'),
    [all, project.id],
  );
  const catchments = usePhaseStoreCappedEntities(catchmentsRaw);

  // Draft for new catchment
  const [name, setName] = useState('');
  const [surface, setSurface] = useState<CatchmentSurface>('metal_roof');
  const [areaM2, setAreaM2] = useState<number>(50);

  function commit() {
    if (!name.trim()) return;
    const node: WaterNode = {
      id: newAnnotationId('wn'),
      projectId: project.id,
      name: name.trim(),
      kind: 'catchment',
      surface,
      areaM2,
      runoffCoeff: DEFAULT_COEFF[surface],
      overflowToNodeId: null,
      createdAt: new Date().toISOString(),
    };
    add(node);
    setName('');
    setAreaM2(50);
  }

  const totalYieldM3 = useMemo(
    () => catchments.reduce((s, n) => s + catchmentYieldM3(n, precipMm), 0),
    [catchments, precipMm],
  );
  const totalYieldL = totalYieldM3 * 1000;

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 2 · Water</span>
        <h1 className={styles.title}>Catchment sources</h1>
        <p className={styles.lede}>
          Catchments are where water enters the design — roofs, paved areas,
          pasture, forest. Yield is computed per node from the simple
          permaculture formula <strong>V = Area × Precipitation × C</strong>{' '}
          (Mollison, <em>Designers&rsquo; Manual</em> ch.7). These nodes feed the
          directed water graph in the network view.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Topographic context</h2>
        <p className={styles.empty} style={{ textAlign: 'left', padding: '4px 0 8px' }}>
          Yeomans places <em>Climate &amp; Landform</em> above <em>Water</em> on
          the Scale of Permanence — read the slope & aspect before sizing
          catchments so swales and storage land on the right contours.
        </p>
        {elev ? (
          <>
            {typeof elev.min_elevation_m === 'number' &&
             typeof elev.max_elevation_m === 'number' && (
              <div className={styles.statRow}>
                <span>Elevation range</span>
                <span>
                  {elev.min_elevation_m}–{elev.max_elevation_m} m
                  {typeof elev.mean_elevation_m === 'number'
                    ? ` (mean ${elev.mean_elevation_m} m)`
                    : ''}
                </span>
              </div>
            )}
            {typeof elev.mean_slope_deg === 'number' && (
              <div className={styles.statRow}>
                <span>Mean slope</span>
                <span>
                  {elev.mean_slope_deg.toFixed(1)}°
                  {typeof elev.max_slope_deg === 'number'
                    ? ` (max ${elev.max_slope_deg.toFixed(1)}°)`
                    : ''}
                </span>
              </div>
            )}
            {elev.predominant_aspect && (
              <div className={styles.statRow}>
                <span>Predominant aspect</span>
                <span>{elev.predominant_aspect} (downslope direction)</span>
              </div>
            )}
          </>
        ) : (
          <p className={styles.empty} style={{ textAlign: 'left', padding: '4px 0' }}>
            No elevation layer fetched — run an Observe site fetch to populate
            slope, aspect, and elevation context.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Site precipitation</h2>
        <div className={styles.statRow}>
          <span>Site climate (annual precip)</span>
          <span>
            {sitePrecipMm != null ? `${sitePrecipMm} mm/yr (from site data)` : 'no climate layer'}
          </span>
        </div>
        <label className={styles.field}>
          <span>Override (mm/yr) used for this view</span>
          <input
            type="number"
            min={0}
            step={10}
            value={precipMm}
            onChange={(e) => setPrecipMm(Number(e.target.value) || 0)}
          />
        </label>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add catchment</h2>
        <div className={styles.grid}>
          <label className={`${styles.field} ${styles.full}`}>
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. House roof — north slope"
            />
          </label>
          <label className={styles.field}>
            <span>Surface</span>
            <select
              value={surface}
              onChange={(e) => setSurface(e.target.value as CatchmentSurface)}
            >
              {(Object.keys(SURFACE_LABEL) as CatchmentSurface[]).map((s) => (
                <option key={s} value={s}>
                  {SURFACE_LABEL[s]} (C = {DEFAULT_COEFF[s]})
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Area (m²)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={areaM2}
              onChange={(e) => setAreaM2(Number(e.target.value) || 0)}
            />
          </label>
        </div>
        <div className={styles.btnRow}>
          <button
            type="button"
            className={styles.btn}
            onClick={commit}
            disabled={!name.trim() || areaM2 <= 0}
          >
            Add catchment
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Catchment ledger ({catchments.length})
        </h2>
        {catchments.length === 0 ? (
          <p className={styles.empty}>No catchments yet — add one above.</p>
        ) : (
          <ul className={styles.list}>
            {catchments.map((n) => {
              const yieldM3 = catchmentYieldM3(n, precipMm);
              return (
                <li key={n.id} className={styles.listRow}>
                  <div style={{ flex: 1 }}>
                    <strong>{n.name}</strong>
                    <div className={styles.listMeta}>
                      {n.surface ? SURFACE_LABEL[n.surface] : '—'} · {n.areaM2 ?? 0} m² · C ={' '}
                      {n.runoffCoeff?.toFixed(2) ?? '—'} · ≈{' '}
                      {formatLitres(yieldM3 * 1000)}/yr
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => {
                      const newC =
                        n.surface != null ? DEFAULT_COEFF[n.surface] : 0.5;
                      update(n.id, { runoffCoeff: newC });
                    }}
                    title="Reset C to surface default"
                  >
                    Reset C
                  </button>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => remove(n.id)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className={styles.statRow}>
          <span>Total annual yield</span>
          <span>
            {totalYieldM3.toFixed(1)} m³ · {formatLitres(totalYieldL)}
          </span>
        </div>
      </section>
    </div>
  );
}
