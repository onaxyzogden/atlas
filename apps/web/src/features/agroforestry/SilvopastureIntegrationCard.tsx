/**
 * SilvopastureIntegrationCard — B4 guild ↔ livestock ↔ silvopasture audit
 * surface. Cross-registered under both the livestock and plant-systems
 * Plan modules (one card, one sectionId, two surfacing tabs).
 *
 * Renders per silvopasture host: fodder species the resident guilds bring,
 * browse-toxicity findings narrowed to the herd actually paddocked there,
 * canopy coverage % over total paddock area, and a composite 0..100
 * integration score (fodder band + canopy band − toxicity penalty).
 *
 * Strictly presentational. No store writes, no save gate. Reads
 * livestockStore + polycultureStore + cropStore + designElementsStore
 * filtered by `projectId`, calls `computeSilvopastureIntegration` in
 * a single useMemo.
 *
 * Covenant: ecological integration only. Never a financial or yield-as-
 * return notion — no riba / gharar / CSRA / salam / investor / financing
 * / cost-of-capital framing.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import { computeSilvopastureIntegration } from './guildLivestockMath.js';
import { useSilvopastureDrilldownStore } from '../../v3/plan/layers/silvopastureDrilldownStore.js';
import css from './SilvopastureIntegrationCard.module.css';

interface Props {
  projectId: string;
  /** Slice M (host-union drilldown) — when set, the matching host row
   *  scrolls into view on mount and renders with a gold border-left
   *  that fades after ~2 s. Set via `useSilvopastureDrilldownStore`'s
   *  `requestOpenAudit(hostId)` from the drilldown card's "Open full
   *  audit →" link, or via direct prop. The prop wins over the store
   *  read so an explicit caller can override the routing. */
  targetHostId?: string;
}

const FODDER_PREVIEW_CAP = 8;

export default function SilvopastureIntegrationCard({
  projectId,
  targetHostId,
}: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const designElements = useDesignElementsForProject(projectId);
  const storeTargetHostId = useSilvopastureDrilldownStore(
    (s) => s.targetHostId,
  );
  // Prop wins over store; both are optional. Slice M routes via the
  // store; tests / direct callers can override via the prop.
  const effectiveTargetHostId = targetHostId ?? storeTargetHostId ?? null;

  // Highlight fade: data-target='true' carries the gold border-left,
  // data-target-faded='true' transitions it away after ~2 s so the
  // accent reads on entry without becoming permanent visual noise.
  const [highlightFaded, setHighlightFaded] = useState(false);
  const targetRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!effectiveTargetHostId) return;
    // Re-arm the highlight whenever the target id changes.
    setHighlightFaded(false);
    const row = targetRowRef.current;
    if (row && typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    const t = window.setTimeout(() => setHighlightFaded(true), 2000);
    return () => window.clearTimeout(t);
  }, [effectiveTargetHostId]);

  const report = useMemo(
    () =>
      computeSilvopastureIntegration({
        projectId,
        cropAreas: allCropAreas,
        designElements,
        paddocks: allPaddocks,
        guilds: allGuilds,
      }),
    [projectId, allCropAreas, designElements, allPaddocks, allGuilds],
  );

  const Head = () => (
    <div className={css.cardHead}>
      <div>
        <h3 className={css.cardTitle}>Silvopasture integration</h3>
        <p className={css.cardHint}>
          Per-host audit of fodder species, browse toxicity, and canopy
          coverage across guilds and paddocks sharing a silvopasture polygon.
          Coarse heuristic — not vet-grade.
        </p>
      </div>
      <span className={css.modeBadge}>Read-only</span>
    </div>
  );

  if (report.rows.length === 0) {
    return (
      <section className={css.card}>
        <Head />
        <div className={css.empty}>
          No silvopasture hosts on this parcel — draw one in the plant-systems
          module to begin integrating with livestock.
        </div>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <Head />

      <div className={css.headline}>
        <span className={css.headlineNumber}>
          {report.overallPct.toFixed(0)}
        </span>
        <span className={css.headlineLabel}>
          parcel integration % (mean across non-empty hosts)
        </span>
      </div>

      <div className={css.hostList}>
        {report.rows.map((row) => {
          const fodderPreview = row.fodderMatches.slice(0, FODDER_PREVIEW_CAP);
          const fodderRest = row.fodderMatches.length - fodderPreview.length;
          const isTarget = row.hostId === effectiveTargetHostId;
          return (
            <div
              key={row.hostId}
              ref={isTarget ? targetRowRef : undefined}
              className={css.hostRow}
              data-host-id={row.hostId}
              {...(isTarget ? { 'data-target': 'true' } : {})}
              {...(isTarget && highlightFaded
                ? { 'data-target-faded': 'true' }
                : {})}
            >
              <div className={css.hostHead}>
                <span className={css.hostName}>{row.hostName}</span>
                <span className={css.hostScore}>
                  {row.integrationScore.toFixed(0)}
                </span>
              </div>
              <div className={css.hostMeta}>
                {row.paddockCount} paddock
                {row.paddockCount === 1 ? '' : 's'} ·{' '}
                {row.guildCount} guild{row.guildCount === 1 ? '' : 's'} ·{' '}
                canopy {row.canopyCoveragePct.toFixed(0)}%
              </div>
              {row.canopyDedupedM2 > 0 ? (
                <div
                  className={css.canopyDeduped}
                  data-testid="canopy-deduped"
                >
                  canopy unioned across overlapping guilds — saved{' '}
                  {Math.round(row.canopyDedupedM2)} m²
                </div>
              ) : row.canopyClampedM2 > 0 ? (
                <div
                  className={css.canopyClipped}
                  data-testid="canopy-clipped"
                >
                  canopy claims clipped by {Math.round(row.canopyClampedM2)} m²
                  at host envelope
                </div>
              ) : null}

              {fodderPreview.length > 0 ? (
                <div className={css.fodderBlock}>
                  <span className={css.fodderLabel}>Fodder species:</span>{' '}
                  {fodderPreview.map((f, i) => (
                    <span key={f.speciesId} className={css.fodderChip}>
                      {f.commonName}
                      {i < fodderPreview.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                  {fodderRest > 0 ? (
                    <span className={css.fodderMore}>
                      {' '}
                      +{fodderRest} more
                    </span>
                  ) : null}
                </div>
              ) : null}

              {row.toxicityFindings.length > 0 ? (
                <div className={css.tox}>
                  {row.toxicityFindings.map((t) => (
                    <div
                      key={`${t.speciesId}-${t.affects.join(',')}`}
                      className={css.toxRow}
                    >
                      <span
                        className={
                          t.tier === 'avoid' ? css.pillAvoid : css.pillCaution
                        }
                      >
                        {t.tier}
                      </span>
                      <div className={css.toxBody}>
                        <div className={css.toxRationale}>
                          <strong>{t.speciesId}</strong> → {t.affects.join(', ')}:{' '}
                          {t.rationale}
                        </div>
                        <div className={css.toxCitation}>{t.citation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {row.paddockCount === 0 && row.guildCount === 0 ? (
                <div className={css.hostEmpty}>
                  Empty host — no resident guilds or paddocks yet.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
