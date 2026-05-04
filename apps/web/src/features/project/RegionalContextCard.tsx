/**
 * §1 RegionalContextCard — surfaces the three long-tail intake metadata
 * fields (climateRegion, bioregion, county) alongside live values derived
 * from the seven Tier-1 site-data layers, so a steward can see at a glance
 * which intake fields are filled in, which match the data, and which the
 * adapters could fill in for them.
 *
 * Spec mapping: §1 Project Creation & Property Intake ·
 * `climate-bioregion-county` (P1, partial → done).
 *
 * Pure presentation — reads `project.metadata` (where the wizard persists
 * the entered values) and `useSiteData(project.id)` (where adapter results
 * land), runs three deterministic comparisons, renders rows with status
 * pills. No entity writes — the steward still goes back to the intake
 * wizard to commit a derived value.
 */
import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import type {
  ClimateSummary,
  LandCoverSummary,
  WatershedSummary,
  ZoningSummary,
} from '@ogden/shared/scoring';
import css from './RegionalContextCard.module.css';

type RowStatus = 'match' | 'mismatch' | 'derived' | 'entered' | 'missing';

interface Row {
  field: string;
  hint: string;
  entered: string | null;
  derived: string | null;
  derivedSource: string | null;
  status: RowStatus;
}

interface Props {
  project: LocalProject;
}

const STATUS_LABEL: Record<RowStatus, string> = {
  match: 'MATCH',
  mismatch: 'MISMATCH',
  derived: 'DERIVED ONLY',
  entered: 'ENTERED ONLY',
  missing: 'MISSING',
};

function classify(entered: string | null, derived: string | null): RowStatus {
  if (entered && derived) {
    const e = entered.toLowerCase().trim();
    const d = derived.toLowerCase().trim();
    if (e === d || e.includes(d) || d.includes(e)) return 'match';
    return 'mismatch';
  }
  if (entered) return 'entered';
  if (derived) return 'derived';
  return 'missing';
}

function nonEmpty(s: string | null | undefined): string | null {
  if (s == null) return null;
  const trimmed = s.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function RegionalContextCard({ project }: Props) {
  const siteData = useSiteData(project.id);

  const { rows, contextChips, layersFetched } = useMemo(() => {
    const meta = project.metadata ?? {};
    const enteredClimate = nonEmpty(meta.climateRegion ?? null);
    const enteredBioregion = nonEmpty(meta.bioregion ?? null);
    const enteredCounty = nonEmpty(meta.county ?? null);

    let derivedClimate: string | null = null;
    let derivedBioregion: string | null = null;
    let derivedCounty: string | null = null;
    let climateSrc: string | null = null;
    let bioregionSrc: string | null = null;
    let countySrc: string | null = null;
    const chips: { label: string; value: string; source: string }[] = [];
    let count = 0;

    if (siteData && siteData.layers.length > 0) {
      const climate = getLayerSummary<ClimateSummary>(siteData, 'climate');
      const landCover = getLayerSummary<LandCoverSummary>(siteData, 'land_cover');
      const watershed = getLayerSummary<WatershedSummary>(siteData, 'watershed');
      const zoning = getLayerSummary<ZoningSummary>(siteData, 'zoning');
      count = siteData.layers.length;

      const climateLayer = siteData.layers.find((l) => l.layerType === 'climate');
      const lcLayer = siteData.layers.find((l) => l.layerType === 'land_cover');
      const watershedLayer = siteData.layers.find((l) => l.layerType === 'watershed');
      const zoningLayer = siteData.layers.find((l) => l.layerType === 'zoning');

      // ── Climate region: prefer Köppen label, else classification, else hardiness zone
      const koppen = nonEmpty(climate?.koppen_label ?? null) ?? nonEmpty(climate?.koppen_classification ?? null);
      const hardiness = nonEmpty(climate?.hardiness_zone ?? null);
      if (koppen) {
        derivedClimate = hardiness ? `${koppen} (zone ${hardiness})` : koppen;
        climateSrc = climateLayer?.attribution ?? null;
      } else if (hardiness) {
        derivedClimate = `Hardiness zone ${hardiness}`;
        climateSrc = climateLayer?.attribution ?? null;
      }

      // ── Bioregion proxy: land cover primary class + watershed name
      const primaryCover = nonEmpty(landCover?.primary_class ?? null);
      const watershedName = nonEmpty(watershed?.watershed_name ?? null);
      const bioParts: string[] = [];
      if (primaryCover) bioParts.push(primaryCover.toLowerCase());
      if (watershedName) bioParts.push(`${watershedName} watershed`);
      if (bioParts.length > 0) {
        derivedBioregion = bioParts.join(' · ');
        bioregionSrc = lcLayer?.attribution ?? watershedLayer?.attribution ?? null;
      }

      // ── County from zoning adapter
      derivedCounty = nonEmpty(zoning?.county_name ?? null);
      if (derivedCounty) countySrc = zoningLayer?.attribution ?? null;

      // ── Supporting context chips
      if (hardiness) chips.push({ label: 'Hardiness zone', value: hardiness, source: 'climate' });
      if (watershedName) chips.push({ label: 'Watershed', value: watershedName, source: 'watershed' });
      if (primaryCover) chips.push({ label: 'Land cover', value: primaryCover, source: 'land_cover' });
      const muni = nonEmpty(zoning?.municipality ?? null);
      if (muni) chips.push({ label: 'Municipality', value: muni, source: 'zoning' });
    }

    const out: Row[] = [
      {
        field: 'Climate region',
        hint: 'Köppen classification + USDA hardiness zone',
        entered: enteredClimate,
        derived: derivedClimate,
        derivedSource: climateSrc,
        status: classify(enteredClimate, derivedClimate),
      },
      {
        field: 'Bioregion',
        hint: 'Land cover + watershed (proxy for ecoregion)',
        entered: enteredBioregion,
        derived: derivedBioregion,
        derivedSource: bioregionSrc,
        status: classify(enteredBioregion, derivedBioregion),
      },
      {
        field: 'County / municipality',
        hint: 'Administrative jurisdiction',
        entered: enteredCounty,
        derived: derivedCounty,
        derivedSource: countySrc,
        status: classify(enteredCounty, derivedCounty),
      },
    ];

    return { rows: out, contextChips: chips, layersFetched: count };
  }, [project.metadata, siteData]);

  const filled = rows.filter((r) => r.status !== 'missing').length;
  const mismatches = rows.filter((r) => r.status === 'mismatch').length;

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>{'REGIONAL CONTEXT (\u00A71)'}</h3>
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h4 className={css.cardTitle}>Climate · Bioregion · Jurisdiction</h4>
            <p className={css.cardHint}>
              Long-tail intake metadata you entered during project setup,
              cross-referenced with values derived from the Tier-1 site-data
              adapters. Mismatches and missing fields surface so a steward
              can update the intake form.
            </p>
          </div>
          <span className={css.metaBadge}>
            {filled}/{rows.length} filled
            {mismatches > 0 && ` · ${mismatches} mismatch`}
          </span>
        </div>

        {layersFetched === 0 && (
          <div className={css.notice}>
            Site data not yet fetched — derived values are empty. Open Site
            Intelligence to populate climate, land cover, watershed, and
            zoning layers.
          </div>
        )}

        <div className={css.rowList}>
          {rows.map((row) => (
            <div key={row.field} className={`${css.row} ${css[`row_${row.status}`]}`}>
              <div className={css.rowHead}>
                <div className={css.rowField}>{row.field}</div>
                <span className={`${css.statusPill} ${css[`pill_${row.status}`]}`}>
                  {STATUS_LABEL[row.status]}
                </span>
              </div>
              <div className={css.rowHint}>{row.hint}</div>
              <div className={css.rowGrid}>
                <div className={css.col}>
                  <div className={css.colLabel}>Entered</div>
                  <div className={css.colValue}>
                    {row.entered ?? <span className={css.dim}>—</span>}
                  </div>
                </div>
                <div className={css.col}>
                  <div className={css.colLabel}>Derived</div>
                  <div className={css.colValue}>
                    {row.derived ?? <span className={css.dim}>—</span>}
                    {row.derivedSource && (
                      <span className={css.attr}>{' '}({row.derivedSource})</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {contextChips.length > 0 && (
          <div className={css.chipRow}>
            <span className={css.chipRowLabel}>Context</span>
            {contextChips.map((c) => (
              <span key={`${c.label}-${c.value}`} className={css.chip}>
                <span className={css.chipLabel}>{c.label}:</span> {c.value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
