/**
 * §20 PresentationDeckCard — meeting-presentation-mode.
 *
 * Flattens an active project into a 7-slide vertical deck suitable for
 * a meeting walkthrough or stakeholder briefing. Each slide is a styled
 * "card" composed entirely from already-derived data — project metadata,
 * site context, top zones / structures / utilities, phasing, the existing
 * `useFinancialModel` output, and the four-axis MissionScore.
 *
 * Discipline: pure presentation. Reads existing stores; emits no new
 * entities, no map overlays, no shared math. Frames itself as a
 * meeting-prep aid, not a real slide-playback engine (auto-advance,
 * voiceover, deck export are still §19/§23 P3/P4 deliverables).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useZoneStore, type ZoneCategory } from '../../store/zoneStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './PresentationDeckCard.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (!isFinite(n) || n === 0) return '\u2014';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${Math.round(n)}`;
}

function fmtRange(low: number, high: number): string {
  if (low === high) return fmtCurrency(low);
  return `${fmtCurrency(low)} \u2013 ${fmtCurrency(high)}`;
}

function projectTypeLabel(t: string | null): string {
  if (!t) return 'Unspecified';
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const ZONE_LABEL: Partial<Record<ZoneCategory, string>> = {
  habitation: 'Habitation', food_production: 'Food production',
  livestock: 'Livestock', commons: 'Commons', spiritual: 'Spiritual',
  education: 'Education', retreat: 'Retreat', conservation: 'Conservation',
  water_retention: 'Water retention', infrastructure: 'Infrastructure',
  access: 'Access', buffer: 'Buffer', future_expansion: 'Future expansion',
};

interface ClimateNotes { hardiness_zone?: string; annual_precip_mm?: number; annual_temp_mean_c?: number; }

// ─── Component ────────────────────────────────────────────────────────────────

interface PresentationDeckCardProps {
  project: LocalProject;
}

export default function PresentationDeckCard({ project }: PresentationDeckCardProps) {
  const allStructures = useStructureStore((s) => s.structures);
  const allZones = useZoneStore((s) => s.zones);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allPaths = usePathStore((s) => s.paths);
  const getProjectPhases = usePhaseStore((s) => s.getProjectPhases);
  const model = useFinancialModel(project.id);
  const siteData = useSiteData(project.id);

  const slideData = useMemo(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const zones = allZones.filter((z) => z.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    const crops = allCrops.filter((c) => c.projectId === project.id);
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);
    const phases = getProjectPhases(project.id);

    // Top zones by area (sqm computed via flat-earth approximation is overkill
    // here — just rank by point count of the polygon ring as a rough size proxy
    // when the store carries no precomputed area). Fall back to natural order.
    const topZones = [...zones]
      .sort((a, b) => {
        const ringA = a.geometry?.type === 'Polygon' ? a.geometry.coordinates[0]?.length ?? 0 : 0;
        const ringB = b.geometry?.type === 'Polygon' ? b.geometry.coordinates[0]?.length ?? 0 : 0;
        return ringB - ringA;
      })
      .slice(0, 3);

    const climate = siteData ? getLayerSummary<ClimateNotes>(siteData, 'climate') : null;

    return { structures, zones, utilities, crops, paddocks, paths, phases, topZones, climate };
  }, [allStructures, allZones, allUtilities, allCrops, allPaddocks, allPaths, project.id, siteData, getProjectPhases]);

  const featureCount =
    slideData.structures.length +
    slideData.zones.length +
    slideData.utilities.length +
    slideData.crops.length +
    slideData.paddocks.length +
    slideData.paths.length;

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h2 className={css.cardTitle}>Meeting Presentation Deck</h2>
          <p className={css.cardHint}>
            A 7-slide flattened view of this project, composed from existing
            stores. Read top-to-bottom for a stakeholder briefing &mdash; cover,
            site context, design, phasing, financial outlook, mission impact, ask.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      {featureCount === 0 ? (
        <div className={css.empty}>
          No features placed on this project yet. Add at least a handful of
          zones, structures, or utilities from the map view to populate the deck.
        </div>
      ) : (
        <div className={css.deck}>
          {/* Slide 1 — Cover */}
          <Slide num={1} kind="cover" title={project.name}>
            <p className={css.coverSub}>
              {projectTypeLabel(project.projectType)}
              {project.acreage != null && <> &middot; {project.acreage} acres</>}
            </p>
            <p className={css.coverNote}>
              A regenerative-design briefing assembled directly from the live
              project model. Each slide reflects what's on the map today.
            </p>
          </Slide>

          {/* Slide 2 — Site Context */}
          <Slide num={2} title="Site Context">
            <dl className={css.kvGrid}>
              <KV label="Acreage" value={project.acreage != null ? `${project.acreage} ac` : '\u2014'} />
              <KV label="Boundary" value={project.hasParcelBoundary ? 'Surveyed' : 'Not yet drawn'} />
              <KV label="Hardiness zone" value={slideData.climate?.hardiness_zone ?? '\u2014'} />
              <KV label="Annual precip" value={slideData.climate?.annual_precip_mm != null ? `${Math.round(slideData.climate.annual_precip_mm)} mm` : '\u2014'} />
              <KV label="Mean temp" value={slideData.climate?.annual_temp_mean_c != null ? `${slideData.climate.annual_temp_mean_c.toFixed(1)} \u00B0C` : '\u2014'} />
            </dl>
          </Slide>

          {/* Slide 3 — Design Highlights */}
          <Slide num={3} title="Design Highlights">
            <div className={css.statRow}>
              <Stat label="Zones" value={slideData.zones.length} />
              <Stat label="Structures" value={slideData.structures.length} />
              <Stat label="Utilities" value={slideData.utilities.length} />
              <Stat label="Crop areas" value={slideData.crops.length} />
              <Stat label="Paddocks" value={slideData.paddocks.length} />
            </div>
            {slideData.topZones.length > 0 && (
              <ul className={css.bullets}>
                {slideData.topZones.map((z) => (
                  <li key={z.id}>
                    <strong>{z.name}</strong>
                    <span className={css.bulletMeta}>{ZONE_LABEL[z.category] ?? z.category.replace(/_/g, ' ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </Slide>

          {/* Slide 4 — Phasing */}
          <Slide num={4} title="Phasing Plan">
            {slideData.phases.length === 0 ? (
              <p className={css.muted}>
                No phases defined. The project will appear as a single phase in
                downstream views until phases are added.
              </p>
            ) : (
              <ul className={css.bullets}>
                {slideData.phases.map((ph, i) => (
                  <li key={ph.id}>
                    <strong>Phase {i + 1}: {ph.name}</strong>
                    {ph.description && <span className={css.bulletMeta}>{ph.description}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Slide>

          {/* Slide 5 — Financial Outlook */}
          <Slide num={5} title="Financial Outlook">
            {model ? (
              <dl className={css.kvGrid}>
                <KV label="Total investment" value={fmtRange(model.totalInvestment.low, model.totalInvestment.high)} />
                <KV label="Annual revenue (mature)" value={fmtRange(model.annualRevenueAtMaturity.low, model.annualRevenueAtMaturity.high)} />
                <KV label="Break-even" value={
                  model.breakEven.breakEvenYear.mid != null
                    ? `Year ${model.breakEven.breakEvenYear.mid}`
                    : 'Not within 10 years'
                } />
                <KV label="10-year ROI" value={`${(model.breakEven.tenYearROI.mid * 100).toFixed(0)}%`} />
                <KV label="Peak negative cashflow" value={fmtCurrency(Math.abs(model.breakEven.peakNegativeCashflow.mid))} />
                <KV label="Enterprises" value={model.enterprises.length > 0 ? model.enterprises.map((e) => e.replace(/_/g, ' ')).join(', ') : '\u2014'} />
              </dl>
            ) : (
              <p className={css.muted}>Financial model not yet computed for this project.</p>
            )}
          </Slide>

          {/* Slide 6 — Mission Impact */}
          <Slide num={6} title="Mission Impact">
            {model ? (
              <>
                <div className={css.missionHeadline}>
                  <span className={css.missionScoreBig}>{model.missionScore.overall}</span>
                  <span className={css.missionScoreLabel}>Overall mission score</span>
                </div>
                <div className={css.missionAxes}>
                  <Axis label="Financial"   score={model.missionScore.financial} />
                  <Axis label="Ecological"  score={model.missionScore.ecological} />
                  <Axis label="Spiritual"   score={model.missionScore.spiritual} />
                  <Axis label="Community"   score={model.missionScore.community} />
                </div>
              </>
            ) : (
              <p className={css.muted}>Mission scoring requires a computed financial model.</p>
            )}
          </Slide>

          {/* Slide 7 — The Ask */}
          <Slide num={7} kind="ask" title="The Ask">
            {model ? (
              <>
                <p className={css.askLead}>
                  {fmtRange(model.totalInvestment.low, model.totalInvestment.high)} of capital across{' '}
                  {slideData.phases.length || 1} phase{slideData.phases.length === 1 ? '' : 's'}
                  {model.breakEven.breakEvenYear.mid != null
                    ? `, break-even projected in year ${model.breakEven.breakEvenYear.mid}.`
                    : '.'}
                </p>
                <ul className={css.bullets}>
                  <li><strong>Capital partners</strong><span className={css.bulletMeta}>CSRA members or values-aligned investors.</span></li>
                  <li><strong>Operational partners</strong><span className={css.bulletMeta}>Stewards, educators, or enterprise leads for each revenue stream.</span></li>
                  <li><strong>Next concrete step</strong><span className={css.bulletMeta}>Site visit, due-diligence pack review, or letter of intent.</span></li>
                </ul>
              </>
            ) : (
              <p className={css.muted}>Compute the financial model to populate the ask.</p>
            )}
          </Slide>
        </div>
      )}

      <p className={css.footnote}>
        This is a <em>print-and-read deck</em>, not a live slide-playback engine.
        Auto-advance, voiceover script export, and slide-mode rendering are
        tracked under §19 / §23 (still planned).
      </p>
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Slide({ num, title, children, kind }: {
  num: number;
  title: string;
  children: React.ReactNode;
  kind?: 'cover' | 'ask';
}) {
  const klass = kind === 'cover' ? css.slide_cover : kind === 'ask' ? css.slide_ask : css.slide;
  return (
    <article className={klass}>
      <header className={css.slideHead}>
        <span className={css.slideNum}>{String(num).padStart(2, '0')}</span>
        <h3 className={css.slideTitle}>{title}</h3>
      </header>
      <div className={css.slideBody}>{children}</div>
    </article>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className={css.kv}>
      <dt className={css.kvLabel}>{label}</dt>
      <dd className={css.kvValue}>{value}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className={css.stat}>
      <span className={css.statValue}>{value}</span>
      <span className={css.statLabel}>{label}</span>
    </div>
  );
}

function Axis({ label, score }: { label: string; score: number }) {
  const pct = Math.max(0, Math.min(100, score));
  const tone = pct >= 70 ? css.axisGood : pct >= 40 ? css.axisFair : css.axisPoor;
  return (
    <div className={css.axis}>
      <div className={css.axisHead}>
        <span className={css.axisLabel}>{label}</span>
        <span className={css.axisScore}>{score}</span>
      </div>
      <div className={css.axisBar}>
        <div className={`${css.axisFill} ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
