/**
 * §11 NutrientBalanceCard \u2014 nitrogen demand from placed crops vs.
 * nitrogen supply from livestock manure (paddocks) and compost / biochar
 * stations. Surfaces the deficit/surplus, names the two largest demand
 * lines and the two largest supply lines, and assigns a coverage rating.
 *
 * Pure presentation. No shared-package math. Defaults drawn from
 * regenerative-ag literature (e.g. SARE manure-N tables; cover-crop /
 * crop-removal rates from extension service handbooks). All defaults are
 * stewards-overridable in the future via a sliders panel \u2014 not in this
 * iteration.
 *
 * Maps to manifest \u00A711 `fertility-manure-impact-heatmap` (P3, planned)
 * as a presentation-layer subset \u2014 the rollup is the textual companion
 * to the future heatmap overlay.
 */

import { useMemo } from 'react';
import { useCropStore, type CropAreaType } from '../../store/cropStore.js';
import {
  useLivestockStore,
  type LivestockSpecies,
} from '../../store/livestockStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import css from './NutrientBalanceCard.module.css';

/* \u2500\u2500 Lookup tables (kg N / unit / year) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

/** Annual nitrogen removed/required per hectare, by crop area type. */
const N_DEMAND_PER_HA: Record<CropAreaType, number> = {
  market_garden: 100,
  row_crop: 80,
  garden_bed: 60,
  nursery: 50,
  orchard: 35,
  food_forest: 15,
  silvopasture: 10,
  shelterbelt: 5,
  windbreak: 5,
  pollinator_strip: 0,
};

/** Annual nitrogen excreted per head, by species. */
const N_PER_HEAD_PER_YEAR: Record<LivestockSpecies, number> = {
  cattle: 100,
  horses: 70,
  pigs: 16,
  sheep: 12,
  goats: 12,
  rabbits: 2,
  ducks_geese: 0.6,
  poultry: 0.5,
  bees: 0,
};

/** Default stocking density (head / hectare) when paddock leaves it null. */
const DEFAULT_STOCKING_PER_HA: Record<LivestockSpecies, number> = {
  cattle: 1,
  horses: 1,
  pigs: 5,
  sheep: 8,
  goats: 8,
  rabbits: 50,
  ducks_geese: 100,
  poultry: 200,
  bees: 0,
};

/** Per compost station, kg N / year captured into a usable amendment. */
const N_PER_COMPOST_STATION = 25;
/** Per biochar station, kg N / year retained / reactivated (conservative). */
const N_PER_BIOCHAR_STATION = 5;

const CROP_TYPE_LABEL: Record<CropAreaType, string> = {
  market_garden: 'Market garden',
  row_crop: 'Row crop',
  garden_bed: 'Garden bed',
  nursery: 'Nursery',
  orchard: 'Orchard',
  food_forest: 'Food forest',
  silvopasture: 'Silvopasture',
  shelterbelt: 'Shelterbelt',
  windbreak: 'Windbreak',
  pollinator_strip: 'Pollinator strip',
};

const SPECIES_LABEL: Record<LivestockSpecies, string> = {
  cattle: 'Cattle',
  horses: 'Horses',
  pigs: 'Pigs',
  sheep: 'Sheep',
  goats: 'Goats',
  rabbits: 'Rabbits',
  ducks_geese: 'Ducks / geese',
  poultry: 'Poultry',
  bees: 'Bees',
};

/* \u2500\u2500 Analysis \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

interface Line {
  source: string;
  qtyKgN: number;
  detail: string;
}

interface NutrientReport {
  totalDemandKgN: number;
  totalSupplyKgN: number;
  demandLines: Line[];
  supplyLines: Line[];
  cropCount: number;
  paddockCount: number;
  compostCount: number;
}

function analyzeBalance(
  cropAreas: { type: CropAreaType; areaM2: number }[],
  paddocks: {
    areaM2: number;
    species: LivestockSpecies[];
    stockingDensity: number | null;
  }[],
  compostCount: number,
  biocharCount: number,
): NutrientReport {
  // Demand: aggregate by crop type.
  const demandByType = new Map<CropAreaType, { ha: number; kgN: number }>();
  for (const c of cropAreas) {
    const ha = c.areaM2 / 10_000;
    const kgN = ha * (N_DEMAND_PER_HA[c.type] ?? 0);
    const prev = demandByType.get(c.type) ?? { ha: 0, kgN: 0 };
    demandByType.set(c.type, { ha: prev.ha + ha, kgN: prev.kgN + kgN });
  }
  const demandLines: Line[] = [];
  for (const [type, { ha, kgN }] of demandByType) {
    if (kgN <= 0) continue;
    demandLines.push({
      source: CROP_TYPE_LABEL[type],
      qtyKgN: kgN,
      detail: `${ha.toFixed(2)} ha @ ${N_DEMAND_PER_HA[type]} kg N/ha`,
    });
  }
  demandLines.sort((a, b) => b.qtyKgN - a.qtyKgN);

  // Supply: livestock manure aggregated by species.
  const supplyByKey = new Map<string, { kgN: number; detail: string }>();
  for (const pad of paddocks) {
    const ha = pad.areaM2 / 10_000;
    if (pad.species.length === 0) continue;
    // Stocking density either set on paddock (head/ha total across species)
    // or fall back to per-species default head/ha. When set, split equally
    // across species in the paddock.
    const declared = pad.stockingDensity;
    for (const sp of pad.species) {
      const headPerHa = declared !== null && declared > 0
        ? declared / pad.species.length
        : DEFAULT_STOCKING_PER_HA[sp];
      const head = headPerHa * ha;
      const kgN = head * (N_PER_HEAD_PER_YEAR[sp] ?? 0);
      if (kgN <= 0) continue;
      const prev = supplyByKey.get(sp) ?? { kgN: 0, detail: '' };
      supplyByKey.set(sp, {
        kgN: prev.kgN + kgN,
        detail: declared !== null && declared > 0 ? 'declared stocking' : 'default stocking',
      });
    }
  }
  const supplyLines: Line[] = [];
  for (const [sp, { kgN, detail }] of supplyByKey) {
    supplyLines.push({
      source: `${SPECIES_LABEL[sp as LivestockSpecies]} manure`,
      qtyKgN: kgN,
      detail,
    });
  }
  // Compost / biochar.
  if (compostCount > 0) {
    supplyLines.push({
      source: 'Compost stations',
      qtyKgN: compostCount * N_PER_COMPOST_STATION,
      detail: `${compostCount} \u00D7 ${N_PER_COMPOST_STATION} kg N/yr`,
    });
  }
  if (biocharCount > 0) {
    supplyLines.push({
      source: 'Biochar retention',
      qtyKgN: biocharCount * N_PER_BIOCHAR_STATION,
      detail: `${biocharCount} \u00D7 ${N_PER_BIOCHAR_STATION} kg N/yr`,
    });
  }
  supplyLines.sort((a, b) => b.qtyKgN - a.qtyKgN);

  const totalDemandKgN = demandLines.reduce((s, l) => s + l.qtyKgN, 0);
  const totalSupplyKgN = supplyLines.reduce((s, l) => s + l.qtyKgN, 0);

  return {
    totalDemandKgN,
    totalSupplyKgN,
    demandLines,
    supplyLines,
    cropCount: cropAreas.length,
    paddockCount: paddocks.length,
    compostCount,
  };
}

function ratingFor(coverageRatio: number): {
  word: string;
  tone: 'good' | 'fair' | 'poor';
} {
  if (coverageRatio >= 0.9) return { word: 'Self-fertile', tone: 'good' };
  if (coverageRatio >= 0.5) return { word: 'Partial coverage', tone: 'fair' };
  if (coverageRatio > 0) return { word: 'Major deficit', tone: 'poor' };
  return { word: 'No on-site supply', tone: 'poor' };
}

/* \u2500\u2500 Component \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */

interface Props {
  projectId: string;
}

export default function NutrientBalanceCard({ projectId }: Props) {
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const report = useMemo(() => {
    const crops = allCrops.filter((c) => c.projectId === projectId);
    const paddocks = allPaddocks.filter((p) => p.projectId === projectId);
    const utilities = allUtilities.filter((u) => u.projectId === projectId);
    const compostCount = utilities.filter((u) => u.type === 'compost').length;
    const biocharCount = utilities.filter((u) => u.type === 'biochar').length;
    return analyzeBalance(crops, paddocks, compostCount, biocharCount);
  }, [allCrops, allPaddocks, allUtilities, projectId]);

  const isEmpty = report.cropCount === 0 && report.paddockCount === 0;

  if (isEmpty) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>Nutrient Cycling Balance</h4>
            <p className={css.cardHint}>
              Nitrogen demand from crops vs. on-site supply from livestock and
              compost.
            </p>
          </div>
          <span className={css.heuristicBadge}>Heuristic</span>
        </div>
        <div className={css.empty}>
          Draw a crop area or a paddock to compute the nutrient balance.
        </div>
      </div>
    );
  }

  const coverageRatio = report.totalDemandKgN > 0
    ? report.totalSupplyKgN / report.totalDemandKgN
    : (report.totalSupplyKgN > 0 ? 2 : 0); // surplus when zero demand
  const rating = ratingFor(coverageRatio);
  const balanceKgN = report.totalSupplyKgN - report.totalDemandKgN;
  const balanceTone = balanceKgN >= 0 ? 'tone_good' : (Math.abs(balanceKgN) > report.totalDemandKgN * 0.5 ? 'tone_poor' : 'tone_fair');

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h4 className={css.cardTitle}>Nutrient Cycling Balance</h4>
          <p className={css.cardHint}>
            Annual nitrogen demand from placed crops compared with supply from
            livestock manure and compost / biochar stations.
          </p>
        </div>
        <span className={css.heuristicBadge}>Heuristic</span>
      </div>

      {/* Headline balance */}
      <div className={`${css.balanceRow} ${css[balanceTone]}`}>
        <div className={css.balanceFigure}>
          <span className={css.balanceSign}>{balanceKgN >= 0 ? '+' : ''}</span>
          {Math.round(balanceKgN).toLocaleString()}
          <span className={css.balanceUnit}>kg N / yr</span>
        </div>
        <div className={css.balanceMeta}>
          <span className={css.balanceWord}>{rating.word}</span>
          <span className={css.balanceSub}>
            {report.totalDemandKgN > 0
              ? `${Math.round(coverageRatio * 100)}% of demand met on-site`
              : 'No active crop demand'}
          </span>
        </div>
      </div>

      {/* Two-column demand vs supply */}
      <div className={css.columnsRow}>
        <Column
          label="Demand"
          tone="demand"
          totalKgN={report.totalDemandKgN}
          lines={report.demandLines.slice(0, 4)}
          remainder={Math.max(0, report.demandLines.length - 4)}
        />
        <Column
          label="Supply"
          tone="supply"
          totalKgN={report.totalSupplyKgN}
          lines={report.supplyLines.slice(0, 4)}
          remainder={Math.max(0, report.supplyLines.length - 4)}
        />
      </div>

      <p className={css.footnote}>
        <em>Heuristic.</em> Demand uses literature-default kg N/ha/yr for each
        crop type (market garden 100, row crop 80, orchard 35, food forest 15,
        etc.); supply uses default kg N/head/yr for each species
        (cattle 100, horses 70, pigs 16, sheep / goats 12, poultry 0.5) at
        declared stocking density or a conservative default. Compost stations
        contribute {N_PER_COMPOST_STATION} kg N/yr each, biochar
        {' '}{N_PER_BIOCHAR_STATION}. Cover crops, off-site purchased compost,
        and rotational fallow are not yet counted \u2014 a steward overrides
        panel will land in a follow-on iteration.
      </p>
    </div>
  );
}

function Column({
  label,
  tone,
  totalKgN,
  lines,
  remainder,
}: {
  label: string;
  tone: 'demand' | 'supply';
  totalKgN: number;
  lines: Line[];
  remainder: number;
}) {
  return (
    <div className={`${css.column} ${css[`column_${tone}`]}`}>
      <div className={css.columnHead}>
        <span className={css.columnLabel}>{label}</span>
        <span className={css.columnTotal}>
          {Math.round(totalKgN).toLocaleString()}{' '}
          <span className={css.columnUnit}>kg N/yr</span>
        </span>
      </div>
      {lines.length === 0 ? (
        <div className={css.columnEmpty}>
          {tone === 'demand'
            ? 'No active crop demand recorded.'
            : 'No on-site nitrogen supply.'}
        </div>
      ) : (
        <ul className={css.lineList}>
          {lines.map((ln, i) => (
            <li key={i} className={css.line}>
              <div className={css.lineHead}>
                <span className={css.lineSrc}>{ln.source}</span>
                <span className={css.lineQty}>
                  {Math.round(ln.qtyKgN).toLocaleString()}
                </span>
              </div>
              <span className={css.lineDetail}>{ln.detail}</span>
            </li>
          ))}
          {remainder > 0 && (
            <li className={css.lineMore}>
              {' + '}{remainder} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
