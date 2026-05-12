/**
 * PermanenceLadderCard — Plan Module 1 (Dynamic Layering & Permanence), card 2/2.
 *
 * Per Permaculture Scholar verdict 2026-05-07: the existing rank+count
 * banner (PermanenceScalesCard) is "an accounting exercise" — it misses
 * the spatial-relational core of Yeomans / Mollison / Holmgren. A
 * rigorous Layering module must (a) preserve the orthodox 9-rank Yeomans
 * scale (collapsing Access+Structures violates Keyline ordering), (b)
 * surface the *ordering relationship* between layers visually, and (c)
 * warn the steward when lower-permanence elements have been placed
 * before their higher-permanence prerequisites.
 *
 * This card is BUILD_FRESH and additive: it keeps the Atlas store
 * wiring (9 Zustand stores → rank counts) and adds a vertical ladder
 * with proportional bars + a "design-implication" warning panel that
 * fires when ordering is violated (e.g. Vegetation populated before
 * Water; Structures populated before Access).
 *
 * Sources: NotebookLM Permaculture Scholar (5aa3dcf3-…), turn 1
 * 2026-05-07; Yeomans P.A. *The Keyline Plan*; Mollison B. *Permaculture
 * Designer's Manual* ch.5; Holmgren D. *Principles & Pathways* P8
 * (Integrate Rather Than Segregate).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import type { PlanModule } from '../../types.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { usePathStore } from '../../../../store/pathStore.js';
import { useStructureStore } from '../../../../store/structureStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { useClosedLoopStore } from '../../../../store/closedLoopStore.js';
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useSectorStore } from '../../../../store/sectorStore.js';
import { useSiteData, getLayerSummary } from '../../../../store/siteDataStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
  /**
   * Optional deep-link callback. When provided, each missing-prerequisite
   * warning becomes a button that switches the slide-up to the module
   * where the steward should design that prerequisite (e.g. missing rank
   * 3 Water → opens `water-management`). Per Module 4 follow-up
   * `2026-05-07-atlas-plan-layering-scholar-keep-atlas.md` — surface the
   * ordering check as a navigable next-action rather than a static lint.
   */
  onSwitchModule?: (mod: PlanModule) => void;
}

/**
 * Maps a Yeomans rank to the Plan module where its prerequisite is
 * authored. Ranks without a dedicated module (Climate, Structures,
 * Subsystems standalone, Fauna) return undefined — the warning still
 * lists them, just not as a clickable deep-link.
 */
function rankToModule(rank: number): PlanModule | undefined {
  switch (rank) {
    case 2: return 'cross-section-solar';   // Landform — transects
    case 3: return 'water-management';
    case 4: return 'zone-circulation';      // Access — paths
    case 7: return 'soil-fertility';
    case 8: return 'plant-systems';
    default: return undefined;
  }
}

// 9-rank Yeomans Scale of Permanence. Lower rank = more permanent.
// `prereqs` lists the ranks that should be designed first; if the
// current rank has elements but a prereq has zero, the steward has
// likely jumped ahead.
interface RankDef {
  rank: number;
  name: string;
  timescale: string;
  prereqs: number[];
  blurb: string;
}

const RANKS: RankDef[] = [
  { rank: 1, name: 'Climate',    timescale: 'centuries+',          prereqs: [],            blurb: 'The fixed envelope — hardiness, precip, season length.' },
  { rank: 2, name: 'Landform',   timescale: 'millennia',           prereqs: [1],           blurb: 'Slope, aspect, ridges, valleys — read, never bulldozed.' },
  { rank: 3, name: 'Water',      timescale: 'decades–centuries',   prereqs: [1, 2],        blurb: 'Swales, dams, drains. The first place the designer imposes will.' },
  { rank: 4, name: 'Access',     timescale: 'years–decades',       prereqs: [1, 2, 3],     blurb: 'Roads & paths — must follow water, not cross it.' },
  { rank: 5, name: 'Structures', timescale: 'years–decades',       prereqs: [1, 2, 3, 4],  blurb: 'Buildings & fences — placed only after water + access.' },
  { rank: 6, name: 'Subsystems', timescale: 'years',               prereqs: [3, 4, 5],     blurb: 'Composters, energy, waste loops — service the structures.' },
  { rank: 7, name: 'Soil',       timescale: 'years',               prereqs: [2, 3],        blurb: 'Beds, mulch, fertility — built atop landform + water.' },
  { rank: 8, name: 'Vegetation', timescale: 'months–years',        prereqs: [3, 4, 7],     blurb: 'Crops, orchard, guilds — planted into prepared soil + access.' },
  { rank: 9, name: 'Fauna',      timescale: 'days–years',          prereqs: [3, 4, 8],     blurb: 'Livestock & wildlife — last on, first off (most dynamic).' },
];

interface Row {
  rank: number;
  name: string;
  timescale: string;
  blurb: string;
  count: number;
  countLabel: string;
  prereqs: number[];
  /**
   * Optional per-rank weight (extent), in the rank's natural unit:
   *   · area-bearing ranks (Soil zones, Vegetation, Storage area) → m²
   *   · linear ranks (Access paths, Swales) → m
   * Zero/undefined when no extent metric applies (Climate, Fauna obs).
   * Surfaced separately so a single 1-acre swale system out-weights a
   * cluster of toy-sized footprints — Module 4 follow-up score-weighting
   * (`2026-05-07-atlas-plan-layering-scholar-build-fresh.md`).
   */
  weight: number;
  weightLabel: string;
}

export default function PermanenceLadderCard({ project, onSwitchModule }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allTransects = useTopographyStore((s) => s.transects);
  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);
  const allStorage = useWaterSystemsStore((s) => s.storageInfra);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);
  const allEcology = useEcologyStore((s) => s.ecology);
  const allGuilds = usePolycultureStore((s) => s.guilds);
  // Sector Compass entries land on the Climate row (rank 1) — wind &
  // downslope are derived from the climate / elevation site-data layers,
  // fire / view / noise are steward-authored in `sectorStore`. Per the
  // Module 1 follow-up: surface sectors as part of the Scale of
  // Permanence rather than treating Climate as a single binary "Observe
  // happened" toggle. Each sector is itself a permaculture-orthodox
  // climate-rank reading (Mollison ch.3).
  const sectorsByProject = useSectorStore((s) => s.byProject);
  const siteData = useSiteData(project.id);

  const rows: Row[] = useMemo(() => {
    const pId = project.id;
    const zones = allZones.filter((z) => z.projectId === pId);
    const paths = allPaths.filter((p) => p.projectId === pId);
    const structures = allStructures.filter((s) => s.projectId === pId);
    const crops = allCrops.filter((c) => c.projectId === pId);
    const transects = allTransects.filter((t) => t.projectId === pId);
    const earthworks = allEarthworks.filter((e) => e.projectId === pId);
    const storage = allStorage.filter((s) => s.projectId === pId);
    const fertility = allFertility.filter((f) => f.projectId === pId);
    const ecology = allEcology.filter((e) => e.projectId === pId);
    const guilds = allGuilds.filter((g) => g.projectId === pId);

    const foodZones = zones.filter((z) => z.category === 'food_production');
    const earthworksLen = earthworks.reduce((a, e) => a + (e.lengthM ?? 0), 0);
    const pathsLen = paths.reduce((a, p) => a + (p.lengthM ?? 0), 0);
    const foodArea = foodZones.reduce((a, z) => a + (z.areaM2 ?? 0), 0);
    const cropArea = crops.reduce((a, c) => a + (c.areaM2 ?? 0), 0);

    const fmtM = (m: number) => (m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`);
    const fmtA = (m2: number) =>
      m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${Math.round(m2)} m²`;

    // Climate-rank sector inventory. Wind / downslope are present iff
    // the Observe layer carries a populated string field; fire / view /
    // noise are present iff the steward has authored them in
    // `sectorStore` (any non-null Compass8). Each populated sector is
    // worth one unit of Climate-rank evidence — the row reads as the
    // total number of sector readings on file rather than a binary 1.
    const climate = siteData
      ? getLayerSummary<{ prevailing_wind?: string | null }>(siteData, 'climate')
      : null;
    const elev = siteData
      ? getLayerSummary<{ predominant_aspect?: string | null }>(siteData, 'elevation')
      : null;
    const sectors = sectorsByProject[pId] ?? {};
    const climateBits: string[] = [];
    if (climate?.prevailing_wind) climateBits.push('wind');
    if (elev?.predominant_aspect) climateBits.push('downslope');
    if (sectors.fire) climateBits.push('fire');
    if (sectors.view) climateBits.push('view');
    if (sectors.noise) climateBits.push('noise');
    const climateCount = climateBits.length;
    const climateLabel = climateCount === 0
      ? 'no sectors yet — fetch climate / elevation, mark fire / view / noise'
      : `${climateCount} sector${climateCount === 1 ? '' : 's'}: ${climateBits.join(' · ')}`;

    const counts: Record<number, { count: number; label: string; weight: number; weightLabel: string }> = {
      1: { count: climateCount, label: climateLabel, weight: 0, weightLabel: '' },
      2: { count: transects.length, label: `${transects.length} transect(s)`, weight: 0, weightLabel: '' },
      3: {
        count: earthworks.length + storage.length,
        label: `${earthworks.length} earthworks · ${storage.length} storage`,
        weight: earthworksLen,
        weightLabel: earthworksLen > 0 ? `${fmtM(earthworksLen)} of swales / drains` : '',
      },
      4: {
        count: paths.length,
        label: `${paths.length} path(s)`,
        weight: pathsLen,
        weightLabel: pathsLen > 0 ? `${fmtM(pathsLen)} of access` : '',
      },
      5: { count: structures.length, label: `${structures.length} structure(s)`, weight: 0, weightLabel: '' },
      6: { count: fertility.length, label: `${fertility.length} fertility unit(s)`, weight: 0, weightLabel: '' },
      7: {
        count: foodZones.length,
        label: `${foodZones.length} food-production zone(s)`,
        weight: foodArea,
        weightLabel: foodArea > 0 ? `${fmtA(foodArea)} under management` : '',
      },
      8: (() => {
        // Function-count weighting on rank 8 Vegetation (Module 1 follow-up
        // 2026-05-07): a guild that fills 6 of 7 GuildLayers integrates more
        // niches than one with two layers — Holmgren P8 *Integrate rather
        // than segregate*. Compute distinct-layer count per guild and surface
        // the average + the maximum (the "deepest stack") so the steward
        // sees not just *how many* polycultures are in play but how layered
        // each one is. Crops aren't subdivided by layer in `cropStore`, so
        // they contribute purely to count.
        const guildLayerCounts = guilds.map((g) => {
          const set = new Set<string>();
          for (const m of g.members) set.add(m.layer);
          // anchor species typically a canopy/sub-canopy layer — but the
          // members array already includes the anchor's layer in normal
          // editor flow, so we don't double-count.
          return set.size;
        });
        const avgLayers = guildLayerCounts.length > 0
          ? guildLayerCounts.reduce((a, b) => a + b, 0) / guildLayerCounts.length
          : 0;
        const maxLayers = guildLayerCounts.reduce((m, n) => Math.max(m, n), 0);
        const richness = guilds.length > 0
          ? ` · avg ${avgLayers.toFixed(1)} / 7 layers (deepest ${maxLayers})`
          : '';

        // Age weighting (Module 1 follow-up 2026-05-07). A 5-year-old
        // food-forest carries more permanence than a freshly-recorded
        // garden bed; Yeomans treats Vegetation as a months–years rank
        // because canopy depth and soil-microbiome maturity *accumulate*
        // with time. Use `createdAt` as a `plantedAt` proxy until a
        // first-class field is added — the steward's recording date is
        // the best signal we have. Aggregate the *oldest* and *median*
        // age across crop areas + guilds, in years.
        const now = Date.now();
        const ageYears: number[] = [];
        for (const c of crops) {
          const ts = Date.parse(c.createdAt);
          if (Number.isFinite(ts)) ageYears.push((now - ts) / (365.25 * 24 * 3600 * 1000));
        }
        for (const g of guilds) {
          const ts = Date.parse(g.createdAt);
          if (Number.isFinite(ts)) ageYears.push((now - ts) / (365.25 * 24 * 3600 * 1000));
        }
        let agePart = '';
        if (ageYears.length > 0) {
          const sorted = ageYears.slice().sort((a, b) => a - b);
          const oldest = sorted[sorted.length - 1] ?? 0;
          const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
          // Format: <0.1 yr → weeks; <1 yr → months; ≥1 yr → years to 1dp.
          const fmtYr = (y: number): string => {
            if (y >= 1) return `${y.toFixed(1)} yr`;
            if (y >= 1 / 12) return `${Math.round(y * 12)} mo`;
            return `${Math.max(1, Math.round(y * 52))} wk`;
          };
          agePart = ` · oldest ${fmtYr(oldest)} (median ${fmtYr(median)})`;
        }

        const cropAreaLabel = cropArea > 0 ? `${fmtA(cropArea)} of crop` : '';
        const weightLabel = [cropAreaLabel, richness.replace(/^ · /, ''), agePart.replace(/^ · /, '')]
          .filter(Boolean)
          .join(' · ');
        return {
          count: crops.length + guilds.length,
          label: `${crops.length} crop area(s) · ${guilds.length} guild(s)${richness}${agePart}`,
          weight: cropArea,
          weightLabel,
        };
      })(),
      9: { count: ecology.length, label: `${ecology.length} ecology obs.`, weight: 0, weightLabel: '' },
    };

    return RANKS.map((r) => ({
      rank: r.rank,
      name: r.name,
      timescale: r.timescale,
      blurb: r.blurb,
      count: counts[r.rank]?.count ?? 0,
      countLabel: counts[r.rank]?.label ?? '',
      weight: counts[r.rank]?.weight ?? 0,
      weightLabel: counts[r.rank]?.weightLabel ?? '',
      prereqs: r.prereqs,
    }));
  }, [project.id, allZones, allPaths, allStructures, allCrops, allTransects, allEarthworks, allStorage, allFertility, allEcology, allGuilds, sectorsByProject, siteData]);

  // Detect ordering violations: any rank with count > 0 whose prereqs
  // have count == 0. These are the "design-implication" warnings the
  // Scholar called for.
  const violations = useMemo(() => {
    const byRank = new Map(rows.map((r) => [r.rank, r] as const));
    const out: Array<{ at: Row; missing: Row[] }> = [];
    for (const row of rows) {
      if (row.count === 0) continue;
      const missing = row.prereqs
        .map((p) => byRank.get(p)!)
        .filter((p) => p && p.count === 0);
      if (missing.length > 0) out.push({ at: row, missing });
    }
    return out;
  }, [rows]);

  const maxCount = useMemo(
    () => rows.reduce((m, r) => Math.max(m, r.count), 1),
    [rows],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 1 · Layering</span>
        <h1 className={styles.title}>Permanence ladder</h1>
        <p className={styles.lede}>
          Yeomans&rsquo; nine ranks, longest-lived at the top. Each rank is
          designed *before* the ranks below it — water before paths, paths
          before buildings, soil before plants. Bars show how many on-site
          elements presently anchor each rank.
        </p>
      </header>

      {violations.length > 0 && (
        <section className={styles.section} style={{ borderLeft: '3px solid rgba(220,160,90,0.7)', paddingLeft: 12 }}>
          <h2 className={styles.sectionTitle}>Ordering check</h2>
          <p className={styles.lede} style={{ marginBottom: 8 }}>
            Lower-permanence elements appear to be in place before their
            higher-permanence prerequisites. Keyline practice (P.A. Yeomans)
            warns this often forces costly rework.
          </p>
          <ul className={styles.list}>
            {violations.map((v) => (
              <li key={v.at.rank} className={styles.listRow}>
                <div>
                  <strong>{v.at.rank}. {v.at.name}</strong>
                  <div className={styles.listMeta} style={{ marginTop: 2 }}>
                    {v.at.count} element(s) but missing prerequisite
                    {v.missing.length > 1 ? 's' : ''}:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {v.missing.map((m) => {
                      const mod = rankToModule(m.rank);
                      const linkable = mod !== undefined && onSwitchModule !== undefined;
                      const labelText = `${m.rank}. ${m.name}`;
                      if (!linkable) {
                        return (
                          <span
                            key={m.rank}
                            style={{
                              padding: '2px 8px',
                              borderRadius: 12,
                              border: '1px solid rgba(255,255,255,0.15)',
                              fontSize: '0.85em',
                              opacity: 0.7,
                            }}
                          >
                            {labelText}
                          </span>
                        );
                      }
                      return (
                        <button
                          key={m.rank}
                          type="button"
                          onClick={() => onSwitchModule!(mod!)}
                          title={`Open ${m.name} module to design this prerequisite first`}
                          style={{
                            padding: '2px 10px',
                            borderRadius: 12,
                            border: '1px solid rgba(220,160,90,0.55)',
                            background: 'rgba(220,160,90,0.12)',
                            color: 'inherit',
                            font: 'inherit',
                            fontSize: '0.85em',
                            cursor: 'pointer',
                          }}
                        >
                          → {labelText}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Nine ranks · element counts</h2>
        <ul className={styles.list}>
          {rows.map((r) => {
            const w = Math.max(2, Math.round((r.count / maxCount) * 100));
            const filled = r.count > 0;
            return (
              <li key={r.rank} className={styles.listRow} style={{ display: 'block' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                  <strong>
                    {r.rank}. {r.name}{' '}
                    <span style={{ fontWeight: 400, opacity: 0.6, fontSize: '0.85em' }}>
                      ({r.timescale})
                    </span>
                  </strong>
                  <span style={{ fontVariantNumeric: 'tabular-nums', opacity: filled ? 1 : 0.5 }}>
                    {r.count} · {r.countLabel}
                  </span>
                </div>
                <div className={styles.listMeta} style={{ marginTop: 2 }}>
                  {r.blurb}
                  {r.weightLabel && (
                    <>
                      {' · '}
                      <span style={{ opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>
                        {r.weightLabel}
                      </span>
                    </>
                  )}
                </div>
                <div
                  aria-hidden
                  style={{
                    height: 6,
                    marginTop: 6,
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${w}%`,
                      height: '100%',
                      background: filled
                        ? `hsl(${Math.round(40 + (r.rank - 1) * 18)}, 55%, 55%)`
                        : 'rgba(255,255,255,0.08)',
                      transition: 'width 250ms',
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Layer relationships</h2>
        <p className={styles.lede} style={{ marginBottom: 8 }}>
          Each rank inherits constraints from the ranks above it. Arrows point
          from a rank to every prerequisite that must already be in place —
          so e.g. Vegetation depends on Water, Access, and Soil. Edges are
          colour-coded: <span style={{ color: 'rgb(220,150,90)' }}>amber</span>{' '}
          when the source rank is populated but its prerequisite is empty
          (the same violation flagged in the panel above), {' '}
          <span style={{ color: 'rgb(140,180,120)' }}>green</span> when both
          ends carry elements, and dim grey when neither does. Holmgren P8
          (<em>Integrate rather than segregate</em>) made diagnostic, not
          just narrated.
        </p>
        {(() => {
          const W = 360;
          const H = 280;
          const PAD_TOP = 18;
          const PAD_BOT = 18;
          const STEP = (H - PAD_TOP - PAD_BOT) / (RANKS.length - 1);
          const nodeX = 70;
          const yOf = (rank: number) => PAD_TOP + (rank - 1) * STEP;
          // Edge state encoding (Scholar 2026-05-07 follow-up): the
          // ordering-check panel reports violations as a list, but the
          // graph itself was previously inert — every prereq edge drawn
          // the same neutral grey. Colour by source/target population:
          //   · violation: src.count > 0 ∧ tgt.count == 0  → amber, solid
          //   · satisfied: src.count > 0 ∧ tgt.count > 0   → green
          //   · latent:    src.count == 0                  → dim grey,
          //                                                  thin/dashed
          const byRank = new Map(rows.map((r) => [r.rank, r] as const));
          const edgeStateOf = (srcRank: number, tgtRank: number) => {
            const src = byRank.get(srcRank);
            const tgt = byRank.get(tgtRank);
            if (!src || !tgt) return 'latent' as const;
            if (src.count === 0) return 'latent' as const;
            if (tgt.count === 0) return 'violation' as const;
            return 'satisfied' as const;
          };
          const EDGE_STYLE = {
            satisfied: { stroke: 'rgba(140,180,120,0.85)', width: 1.5, marker: 'prereq-arrow-ok',   dashArray: undefined },
            violation: { stroke: 'rgba(220,150,90,0.95)',  width: 2,   marker: 'prereq-arrow-warn', dashArray: undefined },
            latent:    { stroke: 'rgba(180,180,180,0.35)', width: 1,   marker: 'prereq-arrow',      dashArray: '3 3' },
          } as const;
          return (
            <svg
              viewBox={`0 0 ${W} ${H}`}
              style={{
                width: '100%',
                height: 'auto',
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
              }}
            >
              <defs>
                <marker
                  id="prereq-arrow"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(180,180,180,0.65)" />
                </marker>
                <marker
                  id="prereq-arrow-ok"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(140,180,120,0.95)" />
                </marker>
                <marker
                  id="prereq-arrow-warn"
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(220,150,90,0.95)" />
                </marker>
              </defs>
              {/* Edges: from each rank to each prerequisite. Curved out
                  to the right so multi-prereq stacks read clearly.
                  Coloured by satisfaction state. */}
              {RANKS.flatMap((r) =>
                r.prereqs.map((p) => {
                  const y1 = yOf(r.rank);
                  const y2 = yOf(p);
                  const dy = Math.abs(y1 - y2);
                  const ctrl = nodeX + 30 + dy * 0.35;
                  const state = edgeStateOf(r.rank, p);
                  const style = EDGE_STYLE[state];
                  return (
                    <path
                      key={`${r.rank}-${p}`}
                      d={`M ${nodeX + 6} ${y1} C ${ctrl} ${y1}, ${ctrl} ${y2}, ${nodeX + 6} ${y2}`}
                      stroke={style.stroke}
                      strokeWidth={style.width}
                      strokeDasharray={style.dashArray}
                      fill="none"
                      markerEnd={`url(#${style.marker})`}
                    >
                      <title>
                        {state === 'violation'
                          ? `${r.rank}.${r.name} has elements but prerequisite ${p} is empty`
                          : state === 'satisfied'
                            ? `${r.rank}.${r.name} → ${p} (both populated)`
                            : `${r.rank}.${r.name} → ${p} (neither populated yet)`}
                      </title>
                    </path>
                  );
                }),
              )}
              {/* Nodes — coloured filled when count > 0, grey when empty. */}
              {rows.map((r) => {
                const cy = yOf(r.rank);
                const filled = r.count > 0;
                const colour = filled
                  ? `hsl(${Math.round(40 + (r.rank - 1) * 18)}, 55%, 55%)`
                  : 'rgba(255,255,255,0.18)';
                return (
                  <g key={r.rank}>
                    <circle
                      cx={nodeX}
                      cy={cy}
                      r={6}
                      fill={colour}
                      stroke="rgba(0,0,0,0.4)"
                      strokeWidth={1}
                    />
                    <text
                      x={nodeX - 12}
                      y={cy + 4}
                      fontSize={11}
                      textAnchor="end"
                      fill={filled ? 'rgba(232,220,200,0.95)' : 'rgba(232,220,200,0.55)'}
                    >
                      {r.rank}. {r.name}
                    </text>
                    <text
                      x={W - 14}
                      y={cy + 4}
                      fontSize={10}
                      textAnchor="end"
                      fill="rgba(232,220,200,0.55)"
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {r.count}
                    </text>
                  </g>
                );
              })}
            </svg>
          );
        })()}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why this ladder</h2>
        <p className={styles.lede}>
          Holmgren P8 — <em>Integrate rather than segregate</em>. Each rank
          enables and constrains the rank below it. Designing top-down
          (Climate → Fauna) preserves degrees of freedom; designing
          bottom-up burns them. The ordering check above flags where the
          current site state has run ahead of its prerequisites.
        </p>
      </section>
    </div>
  );
}
