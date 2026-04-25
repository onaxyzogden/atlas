/**
 * §26 DataCompletenessCard — per-section intake completeness audit.
 *
 * Surfaces how much of the project's design state has actually been
 * filled in, broken down by section: project basics, boundary, site
 * data layers, placed entities, vision / economics. Each section gets
 * a 0-100 score (fields filled / fields tracked). Overall is the mean.
 * The card highlights the three lowest-scoring sections so the steward
 * knows what to fix first.
 *
 * Pure introspection over existing stores — no new endpoints, no new
 * shared math. Mounts on `SiteAssessmentPanel` above the score cards
 * so completeness context frames the headline scores.
 *
 * Closes manifest §26 `incomplete-data-warnings` (P2) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useFinancialStore } from '../../store/financialStore.js';
import { useSiteData, getLayer } from '../../store/siteDataStore.js';
import css from './DataCompletenessCard.module.css';

interface Props {
  project: LocalProject;
}

interface FieldCheck {
  label: string;
  filled: boolean;
}

interface SectionScore {
  id: string;
  label: string;
  score: number; // 0-100
  filled: number;
  total: number;
  missing: string[];
}

const SITE_LAYER_TYPES = [
  'climate',
  'soil',
  'hydrology',
  'landcover',
  'elevation',
] as const;

export default function DataCompletenessCard({ project }: Props) {
  const structures = useStructureStore((s) => s.structures);
  const utilities = useUtilityStore((s) => s.utilities);
  const paths = usePathStore((s) => s.paths);
  const zones = useZoneStore((s) => s.zones);
  const crops = useCropStore((s) => s.cropAreas);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const costOverrides = useFinancialStore((s) => s.costOverrides);
  const revenueOverrides = useFinancialStore((s) => s.revenueOverrides);
  const siteData = useSiteData(project.id);

  const sections = useMemo<SectionScore[]>(() => {
    const out: SectionScore[] = [];

    // 1. Project basics
    const basics: FieldCheck[] = [
      { label: 'Address', filled: !!project.address && project.address.trim() !== '' },
      { label: 'Parcel ID', filled: !!project.parcelId && project.parcelId.trim() !== '' },
      { label: 'Project type', filled: !!project.projectType },
      {
        label: 'Province / state',
        filled: !!project.provinceState && project.provinceState.trim() !== '',
      },
      { label: 'Acreage', filled: project.acreage != null && project.acreage > 0 },
      {
        label: 'Description',
        filled: !!project.description && project.description.trim() !== '',
      },
    ];
    out.push(scoreSection('basics', 'Project basics', basics));

    // 2. Boundary & geometry
    const boundaryFc = project.parcelBoundaryGeojson;
    const hasBoundary =
      project.hasParcelBoundary &&
      !!boundaryFc &&
      Array.isArray(boundaryFc.features) &&
      boundaryFc.features.length > 0;
    const boundary: FieldCheck[] = [
      { label: 'Parcel boundary drawn', filled: hasBoundary },
      { label: 'Acreage derived', filled: project.acreage != null && project.acreage > 0 },
      {
        label: 'Map projection set',
        filled: project.units === 'metric' || project.units === 'imperial',
      },
    ];
    out.push(scoreSection('boundary', 'Boundary & geometry', boundary));

    // 3. Site data layers (Tier-1 fetches)
    const siteLayers: FieldCheck[] = SITE_LAYER_TYPES.map((t) => ({
      label: layerLabel(t),
      filled: siteData ? !!getLayer(siteData, t) : false,
    }));
    out.push(scoreSection('site-data', 'Site data layers', siteLayers));

    // 4. Placed entities (≥1 of each is the floor)
    const projectStructures = structures.filter((s) => s.projectId === project.id);
    const projectUtilities = utilities.filter((u) => u.projectId === project.id);
    const projectPaths = paths.filter((p) => p.projectId === project.id);
    const projectZones = zones.filter((z) => z.projectId === project.id);
    const projectCrops = crops.filter((c) => c.projectId === project.id);
    const projectPaddocks = paddocks.filter((p) => p.projectId === project.id);
    const entities: FieldCheck[] = [
      { label: 'At least one structure', filled: projectStructures.length > 0 },
      { label: 'At least one utility', filled: projectUtilities.length > 0 },
      { label: 'At least one path', filled: projectPaths.length > 0 },
      { label: 'At least one zone', filled: projectZones.length > 0 },
      { label: 'At least one paddock or crop area',
        filled: projectPaddocks.length > 0 || projectCrops.length > 0 },
    ];
    out.push(scoreSection('entities', 'Placed entities', entities));

    // 5. Vision & economics
    const hasFinancialOverride =
      Object.keys(costOverrides).length > 0 || Object.keys(revenueOverrides).length > 0;
    const visionEcon: FieldCheck[] = [
      {
        label: 'Vision statement',
        filled: !!project.visionStatement && project.visionStatement.trim() !== '',
      },
      {
        label: 'Owner / stakeholder notes',
        filled: !!project.ownerNotes && project.ownerNotes.trim() !== '',
      },
      {
        label: 'Zoning notes',
        filled: !!project.zoningNotes && project.zoningNotes.trim() !== '',
      },
      {
        label: 'Access notes',
        filled: !!project.accessNotes && project.accessNotes.trim() !== '',
      },
      {
        label: 'Cost or revenue override set',
        filled: hasFinancialOverride,
      },
    ];
    out.push(scoreSection('vision-econ', 'Vision & economics', visionEcon));

    return out;
  }, [
    project,
    siteData,
    structures,
    utilities,
    paths,
    zones,
    crops,
    paddocks,
    costOverrides,
    revenueOverrides,
  ]);

  const overall = useMemo(() => {
    if (sections.length === 0) return 0;
    const sum = sections.reduce((acc, s) => acc + s.score, 0);
    return Math.round(sum / sections.length);
  }, [sections]);

  // Top-3 lowest-scoring sections (with at least one missing field).
  const fixFirst = useMemo(() => {
    return sections
      .filter((s) => s.score < 100)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);
  }, [sections]);

  return (
    <section className={css.card} aria-label="Data completeness">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Data completeness</h3>
          <p className={css.cardHint}>
            How much of this project&rsquo;s intake is filled in. Sections
            below the overall score are dragging the assessment down &mdash;
            fix the lowest first.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      <div className={css.overallRow}>
        <div className={css.overallBlock}>
          <div className={`${css.overallValue} ${toneClass(overall)}`}>
            {overall}
            <span className={css.overallUnit}>/100</span>
          </div>
          <div className={css.overallLabel}>Overall completeness</div>
        </div>
        <div className={css.overallBarWrap}>
          <div className={css.overallBar}>
            <div
              className={`${css.overallBarFill} ${toneBgClass(overall)}`}
              style={{ width: `${overall}%` }}
            />
          </div>
        </div>
      </div>

      <ul className={css.sectionList}>
        {sections.map((s) => (
          <li key={s.id} className={`${css.sectionRow} ${toneBorderClass(s.score)}`}>
            <div className={css.sectionHead}>
              <span className={css.sectionLabel}>{s.label}</span>
              <span className={`${css.sectionScore} ${toneClass(s.score)}`}>
                {s.score}
                <span className={css.sectionScoreUnit}>/100</span>
              </span>
            </div>
            <div className={css.sectionMeta}>
              {s.filled} of {s.total} fields filled
              {s.missing.length > 0 && (
                <>
                  {' '}&middot; missing:{' '}
                  <span className={css.sectionMissing}>{s.missing.join(', ')}</span>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {fixFirst.length > 0 && (
        <div className={css.fixBlock}>
          <div className={css.fixKey}>Fix these first</div>
          <ol className={css.fixList}>
            {fixFirst.map((s) => (
              <li key={s.id} className={css.fixRow}>
                <strong>{s.label}</strong> &mdash;{' '}
                {s.missing.length > 0
                  ? `${s.missing.length} missing (${s.missing.slice(0, 2).join(', ')}${
                      s.missing.length > 2 ? '\u2026' : ''
                    })`
                  : `at ${s.score}/100`}
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className={css.footnote}>
        <em>How this is built:</em> 5 sections, ~24 tracked fields total.
        Each section scores fields-filled &divide; fields-tracked &times; 100;
        overall is the unweighted mean. Tracked fields are project intake
        attributes, parcel boundary geometry, Tier-1 site-data layers,
        &ge;1 placed entity per kind, and vision / economics notes. No
        server check &mdash; reads stores only.
      </p>
    </section>
  );
}

function scoreSection(id: string, label: string, fields: FieldCheck[]): SectionScore {
  const filled = fields.filter((f) => f.filled).length;
  const total = fields.length;
  const score = total === 0 ? 0 : Math.round((filled / total) * 100);
  const missing = fields.filter((f) => !f.filled).map((f) => f.label);
  return { id, label, score, filled, total, missing };
}

function layerLabel(t: string): string {
  switch (t) {
    case 'climate': return 'Climate';
    case 'soil': return 'Soil';
    case 'hydrology': return 'Hydrology';
    case 'landcover': return 'Land cover';
    case 'elevation': return 'Elevation';
    default: return t;
  }
}

function toneClass(score: number): string {
  if (score >= 80) return css.tone_good!;
  if (score >= 50) return css.tone_fair!;
  return css.tone_poor!;
}

function toneBgClass(score: number): string {
  if (score >= 80) return css.bg_good!;
  if (score >= 50) return css.bg_fair!;
  return css.bg_poor!;
}

function toneBorderClass(score: number): string {
  if (score >= 80) return css.border_good!;
  if (score >= 50) return css.border_fair!;
  return css.border_poor!;
}
