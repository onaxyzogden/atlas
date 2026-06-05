/**
 * BeneficialHabitatCard — B5 beneficial-organism habitat audit surface.
 * Cross-registered under both the habitat-allocation and plant-systems
 * Plan modules (one card, one sectionId, two surfacing tabs).
 *
 * Renders three bands: plant-richness counters (pollinator / insectary /
 * wildlife-food / n-fixer), structural counters (hedgerow length, pond
 * area, shrub count), and a composite 0..100 coverage pct projecting
 * toward the `beneficial-organism-habitat-pct` goal-tree criterion.
 *
 * Strictly presentational. No store writes, no save gate. Reads
 * polycultureStore + designElementsStore filtered by `projectId`, calls
 * `computeBeneficialHabitatReport` in a single useMemo.
 *
 * Covenant: ecological-function signal only. Never a financial or
 * yield-as-return notion — no riba / gharar / CSRA / salam / investor /
 * financing / cost-of-capital framing.
 */

import { useMemo } from 'react';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import { computeBeneficialHabitatReport } from './beneficialHabitatMath.js';
import css from './BeneficialHabitatCard.module.css';

interface Props {
  projectId: string;
}

const GUILD_PREVIEW_CAP = 8;

function pillClassFor(pct: number, base: typeof css): string {
  if (pct >= 60) return `${base.pill} ${base.pillGreen}`;
  if (pct >= 30) return `${base.pill} ${base.pillAmber}`;
  return `${base.pill} ${base.pillRed}`;
}

export default function BeneficialHabitatCard({ projectId }: Props) {
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const designElements = useDesignElementsForProject(projectId);

  const report = useMemo(
    () =>
      computeBeneficialHabitatReport({
        projectId,
        guilds: allGuilds,
        designElements,
      }),
    [projectId, allGuilds, designElements],
  );

  const Head = () => (
    <div className={css.cardHead}>
      <div>
        <h3 className={css.cardTitle}>Beneficial-organism audit</h3>
        <p className={css.cardHint}>
          Composite habitat coverage from beneficial plant species across
          guilds and structural elements (hedgerow, pond, shrub) on this
          parcel. Coarse ecological-function signal — not a vet/ecology
          lab measurement.
        </p>
      </div>
      <span className={css.modeBadge}>Read-only</span>
    </div>
  );

  const nonEmptyGuildRows = report.guildRows.filter(
    (r) => r.beneficialSpeciesCount > 0,
  );
  const hasAnyStructure =
    report.overall.hedgerowLengthM > 0 ||
    report.overall.pondAreaM2 > 0 ||
    report.overall.shrubCount > 0;

  if (nonEmptyGuildRows.length === 0 && !hasAnyStructure) {
    return (
      <section className={css.card}>
        <Head />
        <div className={css.empty}>
          No guilds or habitat elements yet — draw a hedgerow, pond, or
          build a guild with pollinator/insectary species to begin the
          audit.
        </div>
      </section>
    );
  }

  const guildPreview = nonEmptyGuildRows.slice(0, GUILD_PREVIEW_CAP);
  const guildRest = nonEmptyGuildRows.length - guildPreview.length;

  return (
    <section className={css.card}>
      <Head />

      <div className={css.headline}>
        <span className={css.headlineNumber}>
          {report.overall.coveragePct.toFixed(0)}
        </span>
        <span className={css.headlineLabel}>
          beneficial-habitat coverage %
        </span>
        <span className={pillClassFor(report.overall.coveragePct, css)}>
          {report.overall.coveragePct >= 60
            ? 'on track'
            : report.overall.coveragePct >= 30
              ? 'building'
              : 'sparse'}
        </span>
      </div>

      <div className={css.bandTitle}>Beneficial plants</div>
      <div className={css.counterGrid}>
        <div className={css.counter}>
          <span className={css.counterNum}>
            {report.overall.pollinatorPlantCount}
          </span>
          <span className={css.counterLabel}>Pollinator</span>
        </div>
        <div className={css.counter}>
          <span className={css.counterNum}>
            {report.overall.insectaryPlantCount}
          </span>
          <span className={css.counterLabel}>Insectary</span>
        </div>
        <div className={css.counter}>
          <span className={css.counterNum}>
            {report.overall.wildlifeFoodPlantCount}
          </span>
          <span className={css.counterLabel}>Wildlife food</span>
        </div>
        <div className={css.counter}>
          <span className={css.counterNum}>
            {report.overall.nFixerPlantCount}
          </span>
          <span className={css.counterLabel}>N-fixer</span>
        </div>
      </div>

      <div className={css.bandTitle}>Structural habitat</div>
      <div className={css.counterGrid}>
        <div className={css.counter}>
          <span className={css.counterNum}>
            {report.overall.hedgerowLengthM.toFixed(0)}
          </span>
          <span className={css.counterLabel}>Hedgerow m</span>
        </div>
        <div className={css.counter}>
          <span className={css.counterNum}>
            {report.overall.pondAreaM2.toFixed(0)}
          </span>
          <span className={css.counterLabel}>Pond m²</span>
        </div>
        <div className={css.counter}>
          <span className={css.counterNum}>{report.overall.shrubCount}</span>
          <span className={css.counterLabel}>Shrubs</span>
        </div>
      </div>

      {report.overall.categoriesPresent.length > 0 ? (
        <div className={css.categoryBlock}>
          <span className={css.categoryLabel}>Functional categories:</span>{' '}
          {report.overall.categoriesPresent.map((c) => (
            <span key={c} className={css.categoryChip}>
              {c.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      ) : null}

      {guildPreview.length > 0 ? (
        <div className={css.guildList}>
          <div className={css.bandTitle}>Guilds carrying beneficial species</div>
          {guildPreview.map((row) => (
            <div key={row.guildId} className={css.guildRow}>
              <div className={css.guildHead}>
                <span className={css.guildName}>{row.guildName}</span>
                <span className={css.guildCount}>
                  {row.beneficialSpeciesCount} sp.
                </span>
              </div>
              {row.categoriesPresent.length > 0 ? (
                <div className={css.guildCats}>
                  {row.categoriesPresent.map((c) => (
                    <span key={c} className={css.categoryChip}>
                      {c.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {guildRest > 0 ? (
            <div className={css.guildMore}>+{guildRest} more</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
