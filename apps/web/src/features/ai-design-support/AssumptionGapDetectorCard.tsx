/**
 * §17 AssumptionGapDetectorCard — deterministic detector for the
 * implicit assumptions and unanswered questions sitting underneath
 * the design state. Pairs with AiSiteSynthesisCard (§18).
 *
 * Two row kinds:
 *   - ASSUMPTION: a default value is being treated as fact (e.g.,
 *     midline cost band with no override; equal-weight monthly rainfall
 *     because no climate layer fetched).
 *   - OPEN QUESTION: a slot the steward has not answered yet (e.g.,
 *     no parcel boundary, no vision statement, zero entities of kind X).
 *
 * Severity tone:
 *   - high: blocks downstream analysis (no boundary, no acreage)
 *   - medium: meaningful default in play (no layer, no mission tuning)
 *   - low: stylistic gap (notes empty, no media)
 *
 * Pure introspection — no shared math, no LLM call. The "AI DRAFT"
 * badge tracks the spec language; the engine is a deterministic rule
 * cascade.
 *
 * Closes manifest §17
 * `ai-assumptions-unanswered-questions-data-gap-detector`
 * (P3) planned -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useFinancialStore } from '../../store/financialStore.js';
import { useSiteData, getLayer } from '../../store/siteDataStore.js';
import css from './AssumptionGapDetectorCard.module.css';

interface Props {
  project: LocalProject;
}

type Kind = 'assumption' | 'open_question';
type Severity = 'high' | 'medium' | 'low';
type Domain =
  | 'project_basics'
  | 'site_data'
  | 'entities'
  | 'economics'
  | 'vision';

interface Finding {
  id: string;
  domain: Domain;
  kind: Kind;
  severity: Severity;
  title: string;
  detail: string;
}

const DOMAIN_LABEL: Record<Domain, string> = {
  project_basics: 'Project basics',
  site_data: 'Site data layers',
  entities: 'Placed entities',
  economics: 'Economics',
  vision: 'Vision & narrative',
};

const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

const DOMAIN_ORDER: Domain[] = [
  'project_basics',
  'site_data',
  'entities',
  'economics',
  'vision',
];

export default function AssumptionGapDetectorCard({ project }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(
    () => allStructures.filter((st) => st.projectId === project.id),
    [allStructures, project.id],
  );
  const allUtilities = useUtilityStore((s) => s.utilities);
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id),
    [allUtilities, project.id],
  );
  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === project.id),
    [allZones, project.id],
  );
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id),
    [allCropAreas, project.id],
  );
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );
  const siteData = useSiteData(project.id);
  const region = useFinancialStore((s) => s.region);
  const missionWeights = useFinancialStore((s) => s.missionWeights);
  const costOverrides = useFinancialStore((s) => s.costOverrides);
  const revenueOverrides = useFinancialStore((s) => s.revenueOverrides);

  const findings = useMemo<Finding[]>(() => {
    const out: Finding[] = [];

    // ── project basics ─────────────────────────────────────────────
    const hasBoundary =
      project.hasParcelBoundary &&
      !!project.parcelBoundaryGeojson &&
      (project.parcelBoundaryGeojson.features?.length ?? 0) > 0;

    if (!hasBoundary) {
      out.push({
        id: 'no-parcel-boundary',
        domain: 'project_basics',
        kind: 'open_question',
        severity: 'high',
        title: 'No parcel boundary drawn',
        detail:
          'Most spatial scoring (acreage-relative density, slope coverage, water budget per acre) cannot run without a boundary. Draw or import the parcel before relying on the dashboards.',
      });
    }
    if (project.acreage == null || project.acreage <= 0) {
      out.push({
        id: 'no-acreage',
        domain: 'project_basics',
        kind: 'open_question',
        severity: 'high',
        title: 'Acreage not set',
        detail:
          'Per-acre carrying capacity, biomass, and economic-per-acre figures fall back to placeholders without an acreage value.',
      });
    }
    if (!project.address) {
      out.push({
        id: 'no-address',
        domain: 'project_basics',
        kind: 'open_question',
        severity: 'medium',
        title: 'No street address recorded',
        detail:
          'Address is the natural anchor for cross-referencing parcels with title and county records later.',
      });
    }
    if (!project.projectType) {
      out.push({
        id: 'no-project-type',
        domain: 'project_basics',
        kind: 'assumption',
        severity: 'medium',
        title: 'Project type unset — generic regenerative assumed',
        detail:
          'Mission-mix defaults and template recommendations key off project type. Without a value the panels treat the project as a generic regenerative farm.',
      });
    }
    if (!project.parcelId) {
      out.push({
        id: 'no-parcel-id',
        domain: 'project_basics',
        kind: 'open_question',
        severity: 'low',
        title: 'No parcel / APN recorded',
        detail:
          'Parcel ID is the canonical key for county data joins; useful before talking to the assessor or escrow.',
      });
    }

    // ── site data layers ───────────────────────────────────────────
    type LayerKey = 'climate' | 'soil' | 'hydrology' | 'landcover' | 'elevation';
    const layerSpecs: Array<{
      key: LayerKey;
      label: string;
      assumption: string;
    }> = [
      {
        key: 'climate',
        label: 'climate',
        assumption:
          'Hydrology and solar dashboards fall back to regional defaults; the seasonal water budget runs in equal-12 distribution mode.',
      },
      {
        key: 'soil',
        label: 'soil',
        assumption:
          'Carbon sequestration and organic-matter scoring fall back to mid-band defaults; SSURGO drainage class is unknown.',
      },
      {
        key: 'hydrology',
        label: 'hydrology',
        assumption:
          'Watershed delineation and drainage-network awareness are absent; flow analysis runs on heuristic slope-only routing.',
      },
      {
        key: 'landcover',
        label: 'land cover',
        assumption:
          'Tree-canopy and vegetation-type classifications are unknown; ecological scoring uses a generic baseline.',
      },
      {
        key: 'elevation',
        label: 'elevation',
        assumption:
          'Slope, aspect, and terrain-derived layers are unavailable; site assessment cannot identify steep slopes or sun traps.',
      },
    ];
    for (const spec of layerSpecs) {
      const layer = siteData ? getLayer(siteData, spec.key) : undefined;
      if (!layer) {
        out.push({
          id: `layer-missing-${spec.key}`,
          domain: 'site_data',
          kind: 'assumption',
          severity: 'medium',
          title: `No ${spec.label} layer fetched`,
          detail: spec.assumption,
        });
      }
    }

    // ── placed entities ────────────────────────────────────────────
    const entityKinds: Array<{
      label: string;
      count: number;
      detail: string;
    }> = [
      {
        label: 'structure',
        count: structures.length,
        detail:
          'Cost rollups, energy-load estimation, and footprint-vs-acreage density all run against zero structures.',
      },
      {
        label: 'utility',
        count: utilities.length,
        detail:
          'Off-grid readiness, water-system capacity, and infrastructure proximity checks have nothing to evaluate.',
      },
      {
        label: 'zone',
        count: zones.length,
        detail:
          'Functional allocation and land-use mix charts have no zoning to map against the assessment scores.',
      },
      {
        label: 'crop area',
        count: cropAreas.length,
        detail:
          'Biomass, nutrient-cycling balance, and orchard / food-forest revenue defaults all sit at zero.',
      },
      {
        label: 'paddock',
        count: paddocks.length,
        detail:
          'Stocking density, herd rotation, and livestock revenue defaults all sit at zero.',
      },
    ];
    for (const kind of entityKinds) {
      if (kind.count === 0) {
        out.push({
          id: `no-${kind.label.replace(/\s+/g, '-')}`,
          domain: 'entities',
          kind: 'open_question',
          severity: 'medium',
          title: `No ${kind.label}s placed`,
          detail: kind.detail,
        });
      }
    }

    // Entity-level open questions (notes / species empty).
    const structuresMissingNotes = structures.filter(
      (st) => !st.notes || st.notes.trim() === '',
    ).length;
    if (structures.length > 0 && structuresMissingNotes === structures.length) {
      out.push({
        id: 'structure-notes-all-empty',
        domain: 'entities',
        kind: 'open_question',
        severity: 'low',
        title: 'No notes on any structure',
        detail:
          'Steward notes are the audit trail for design intent. None of the placed structures carry a single note.',
      });
    }
    const cropsMissingSpecies = cropAreas.filter((c) => c.species.length === 0).length;
    if (cropAreas.length > 0 && cropsMissingSpecies > 0) {
      out.push({
        id: 'crop-species-missing',
        domain: 'entities',
        kind: 'open_question',
        severity: 'medium',
        title: `${cropsMissingSpecies} of ${cropAreas.length} crop areas have no species set`,
        detail:
          'Species drives nutrient-cycling balance, polyculture diversity, and harvest-window estimation. Empty species lists are treated as the area-type generic default.',
      });
    }
    const paddocksMissingSpecies = paddocks.filter((p) => p.species.length === 0).length;
    if (paddocks.length > 0 && paddocksMissingSpecies > 0) {
      out.push({
        id: 'paddock-species-missing',
        domain: 'entities',
        kind: 'open_question',
        severity: 'medium',
        title: `${paddocksMissingSpecies} of ${paddocks.length} paddocks have no livestock species set`,
        detail:
          'Stocking-density math defaults to a single AU/ac when no species are listed. Add species (cattle, sheep, goats, poultry) for realistic rotation modeling.',
      });
    }

    // ── economics ──────────────────────────────────────────────────
    const costOverrideCount = Object.keys(costOverrides).length;
    const revenueOverrideCount = Object.keys(revenueOverrides).length;
    if (costOverrideCount === 0) {
      out.push({
        id: 'no-cost-overrides',
        domain: 'economics',
        kind: 'assumption',
        severity: 'medium',
        title: 'All capital costs at midline regional default',
        detail: `No line-item overrides set. The model is using the ${region} regional cost database mid-band for every capital line. Real bids will diverge.`,
      });
    }
    if (revenueOverrideCount === 0) {
      out.push({
        id: 'no-revenue-overrides',
        domain: 'economics',
        kind: 'assumption',
        severity: 'medium',
        title: 'All revenue streams at engine-derived default',
        detail:
          'No stream-level revenue overrides set. The auto-detected revenue figures are entity-count placeholders, not market projections.',
      });
    }

    // Mission weights — flag if still at the seeded default.
    const isDefaultWeights =
      missionWeights.financial === 0.4 &&
      missionWeights.ecological === 0.25 &&
      missionWeights.spiritual === 0.2 &&
      missionWeights.community === 0.15;
    if (isDefaultWeights) {
      out.push({
        id: 'default-mission-weights',
        domain: 'economics',
        kind: 'assumption',
        severity: 'low',
        title: 'Mission weights at seeded default (40/25/20/15)',
        detail:
          'Mission-weighted ROI rollups treat financial > ecological > spiritual > community in the seeded ratio. Tune the weights to match this project\u2019s actual priorities.',
      });
    }

    // ── vision & narrative ─────────────────────────────────────────
    if (!project.visionStatement || project.visionStatement.trim() === '') {
      out.push({
        id: 'no-vision',
        domain: 'vision',
        kind: 'open_question',
        severity: 'medium',
        title: 'No vision statement recorded',
        detail:
          'Vision frames every downstream design decision; the AI synthesis card has no narrative anchor without it.',
      });
    }
    if (!project.ownerNotes || project.ownerNotes.trim() === '') {
      out.push({
        id: 'no-owner-notes',
        domain: 'vision',
        kind: 'open_question',
        severity: 'low',
        title: 'No owner / stakeholder notes',
        detail:
          'Owner constraints (budget cap, sweat-equity availability, family preferences) are not captured.',
      });
    }
    if (!project.zoningNotes || project.zoningNotes.trim() === '') {
      out.push({
        id: 'no-zoning-notes',
        domain: 'vision',
        kind: 'open_question',
        severity: 'low',
        title: 'No zoning / municipal notes',
        detail:
          'Use restrictions, setbacks, and ag-land classifications affect what can actually be built. Capture them before relying on the build-out plan.',
      });
    }
    if (!project.accessNotes || project.accessNotes.trim() === '') {
      out.push({
        id: 'no-access-notes',
        domain: 'vision',
        kind: 'open_question',
        severity: 'low',
        title: 'No access / road notes',
        detail:
          'Frontage, easements, and seasonal access constraints feed the §10 access-circulation analysis. The dashboard will read clean even when access is the actual blocker.',
      });
    }

    return out.sort((a, b) => {
      const da = DOMAIN_ORDER.indexOf(a.domain);
      const db = DOMAIN_ORDER.indexOf(b.domain);
      if (da !== db) return da - db;
      return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    });
  }, [
    project,
    structures,
    utilities,
    zones,
    cropAreas,
    paddocks,
    siteData,
    region,
    missionWeights,
    costOverrides,
    revenueOverrides,
  ]);

  const counts = useMemo(() => {
    const total = findings.length;
    const assumptions = findings.filter((f) => f.kind === 'assumption').length;
    const openQuestions = findings.filter((f) => f.kind === 'open_question').length;
    const high = findings.filter((f) => f.severity === 'high').length;
    return { total, assumptions, openQuestions, high };
  }, [findings]);

  const overallTone = counts.total === 0
    ? css.tone_good
    : counts.high > 0
      ? css.tone_poor
      : counts.openQuestions + counts.assumptions > 6
        ? css.tone_fair
        : css.tone_muted;

  // Group by domain for render.
  const grouped = useMemo(() => {
    const map: Partial<Record<Domain, Finding[]>> = {};
    for (const f of findings) {
      const arr = map[f.domain] ?? [];
      arr.push(f);
      map[f.domain] = arr;
    }
    return DOMAIN_ORDER.flatMap((d) => {
      const items = map[d];
      if (!items || items.length === 0) return [];
      return [{ domain: d, items }];
    });
  }, [findings]);

  return (
    <section className={css.card} aria-label="Assumption and gap detector">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Assumptions &amp; open questions</h3>
          <p className={css.cardHint}>
            Implicit assumptions the dashboards are running on, and the
            slots you haven&rsquo;t answered yet. Each row is tagged
            <span className={css.tagInline}>ASSUMPTION</span> (a default
            being treated as fact) or
            <span className={css.tagInline}>OPEN QUESTION</span> (no
            answer recorded). Walk the high-severity rows first.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      <div className={`${css.summaryRow} ${overallTone}`}>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.total}</div>
          <div className={css.summaryLabel}>Findings</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.high}</div>
          <div className={css.summaryLabel}>High severity</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.assumptions}</div>
          <div className={css.summaryLabel}>Assumptions</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.openQuestions}</div>
          <div className={css.summaryLabel}>Open questions</div>
        </div>
      </div>

      {counts.total === 0 && (
        <div className={css.empty}>
          No assumptions or open questions detected. Every domain has
          some answer recorded &mdash; revisit when the project state
          changes.
        </div>
      )}

      {grouped.map(({ domain, items }) => (
        <div key={domain} className={css.domainBlock}>
          <h4 className={css.domainTitle}>{DOMAIN_LABEL[domain]}</h4>
          <ul className={css.findingList}>
            {items.map((f) => (
              <li
                key={f.id}
                className={`${css.finding} ${
                  f.severity === 'high'
                    ? css.sev_high
                    : f.severity === 'medium'
                      ? css.sev_medium
                      : css.sev_low
                }`}
              >
                <div className={css.findingHead}>
                  <span
                    className={`${css.kindTag} ${
                      f.kind === 'assumption' ? css.tag_assumption : css.tag_open
                    }`}
                  >
                    {f.kind === 'assumption' ? 'ASSUMPTION' : 'OPEN QUESTION'}
                  </span>
                  <span className={css.findingTitle}>{f.title}</span>
                </div>
                <div className={css.findingDetail}>{f.detail}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className={css.footnote}>
        <em>How detection works:</em> deterministic rule cascade over
        project fields, the site-data store, the entity stores, and the
        financial store. Same inputs always produce the same output
        &mdash; no LLM call. The &ldquo;AI DRAFT&rdquo; badge tracks the
        spec language for &sect;17.
      </p>
    </section>
  );
}
