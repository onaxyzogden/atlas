/**
 * §19 ScriptDeckReadinessCard — voiceover-script + slide-deck export readiness audit.
 *
 * Bridges the two existing §19 P4 surfaces — `WalkingTourScriptCard`
 * (voiceover script along longest path) and `SlideExportPreviewCard`
 * (one-slide-per-feature deck) — into a single export-readiness verdict
 * so a steward can see at a glance whether both halves of "Voiceover-ready
 * script export, slide presentation mode" are presentable today.
 *
 * Pure derivation — reads structure / zone / utility / path stores
 * filtered by project. No new entities, no shared math, no map overlays.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { usePathStore } from '../../store/pathStore.js';
import css from './ScriptDeckReadinessCard.module.css';

interface Props {
  project: LocalProject;
}

type Verdict = 'ready' | 'presentable' | 'thin' | 'empty';

const VERDICT_LABEL: Record<Verdict, string> = {
  ready: 'Export-ready',
  presentable: 'Presentable',
  thin: 'Too thin',
  empty: 'Not started',
};

const VERDICT_BLURB: Record<Verdict, string> = {
  ready: 'Slide deck is full and a tour script will derive from a real path.',
  presentable: 'One half is solid; the other is missing or thin.',
  thin: 'Too few features for a useful slide deck or tour.',
  empty: 'No structures, zones, utilities, or paths placed yet.',
};

const SLIDE_SECONDS = 30;
const TOUR_STOP_SECONDS = 60;
const MIN_PATH_M = 10;
const READY_SLIDE_MIN = 8;
const THIN_SLIDE_MAX = 3;
const NAMING_READY_RATIO = 0.7;

function verdictClass(v: Verdict): string {
  if (v === 'ready') return css.verdictReady ?? '';
  if (v === 'presentable') return css.verdictPresentable ?? '';
  if (v === 'thin') return css.verdictThin ?? '';
  return css.verdictEmpty ?? '';
}

function fmtRuntime(seconds: number): string {
  if (seconds <= 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

export default function ScriptDeckReadinessCard({ project }: Props): JSX.Element {
  const allStructures = useStructureStore((st) => st.structures);
  const allZones = useZoneStore((st) => st.zones);
  const allUtilities = useUtilityStore((st) => st.utilities);
  const allPaths = usePathStore((st) => st.paths);

  const audit = useMemo(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const zones = allZones.filter((z) => z.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);

    const slidesTotal = structures.length + zones.length + utilities.length;

    const structuresNamed = structures.filter((s) => (s.name ?? '').trim().length > 0).length;
    const zonesNamed = zones.filter((z) => (z.name ?? '').trim().length > 0).length;
    const utilitiesNamed = utilities.filter((u) => (u.name ?? '').trim().length > 0).length;
    const slidesNamed = structuresNamed + zonesNamed + utilitiesNamed;
    const namingRatio = slidesTotal === 0 ? 0 : slidesNamed / slidesTotal;

    const longest = paths
      .filter((p) => p.geometry.coordinates.length >= 2 && p.lengthM >= MIN_PATH_M)
      .sort((a, b) => b.lengthM - a.lengthM)[0];
    const tourReady = Boolean(longest);
    const tourStops = tourReady ? 5 : 0; // WalkingTourScriptCard targets 5 stops
    const tourLengthM = longest?.lengthM ?? 0;

    const slideRuntime = slidesTotal * SLIDE_SECONDS;
    const tourRuntime = tourStops * TOUR_STOP_SECONDS;

    const deckReady = slidesTotal >= READY_SLIDE_MIN && namingRatio >= NAMING_READY_RATIO;
    const deckPresentable = slidesTotal >= THIN_SLIDE_MAX && !deckReady;

    let verdict: Verdict;
    if (slidesTotal === 0 && !tourReady) verdict = 'empty';
    else if (slidesTotal < THIN_SLIDE_MAX && !tourReady) verdict = 'thin';
    else if (deckReady && tourReady) verdict = 'ready';
    else if (deckReady || deckPresentable || tourReady) verdict = 'presentable';
    else verdict = 'thin';

    return {
      slidesTotal,
      slidesNamed,
      slidesUnnamed: slidesTotal - slidesNamed,
      namingRatio,
      structuresCount: structures.length,
      zonesCount: zones.length,
      utilitiesCount: utilities.length,
      tourReady,
      tourStops,
      tourLengthM,
      slideRuntime,
      tourRuntime,
      pathsTotal: paths.length,
      verdict,
    };
  }, [allStructures, allZones, allUtilities, allPaths, project.id]);

  const isEmpty = audit.slidesTotal === 0 && audit.pathsTotal === 0;

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Script & Deck Export Readiness
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Crosses <em>SlideExportPreviewCard</em> (one slide per placed feature) with{' '}
            <em>WalkingTourScriptCard</em> (5-stop voiceover script along the longest path) to verdict
            whether both halves of §19's voiceover-script + slide-presentation export are presentable today.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass(audit.verdict)}`}>
          <span className={css.verdictLabel}>{VERDICT_LABEL[audit.verdict]}</span>
          <span className={css.verdictBlurb}>{VERDICT_BLURB[audit.verdict]}</span>
        </div>
      </header>

      {isEmpty ? (
        <p className={css.empty}>
          No placed features and no paths drawn for this project yet — neither the slide deck nor the
          walking-tour script can derive content. Place structures, zones, utilities, or draw at least one
          path to begin.
        </p>
      ) : (
        <>
          <div className={css.statsRow}>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.slidesTotal}</span>
              <span className={css.statLabel}>Slides</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.slidesNamed}</span>
              <span className={css.statLabel}>Named</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.slidesUnnamed}</span>
              <span className={css.statLabel}>Unnamed</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.tourStops}</span>
              <span className={css.statLabel}>Tour stops</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{fmtRuntime(audit.slideRuntime)}</span>
              <span className={css.statLabel}>Deck runtime</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{fmtRuntime(audit.tourRuntime)}</span>
              <span className={css.statLabel}>Tour runtime</span>
            </div>
          </div>

          <div className={css.halvesGrid}>
            <article className={css.half}>
              <header className={css.halfHead}>
                <span className={css.halfTitle}>Slide deck</span>
                <span
                  className={`${css.halfPill} ${
                    audit.slidesTotal >= READY_SLIDE_MIN && audit.namingRatio >= NAMING_READY_RATIO
                      ? css.pillReady ?? ''
                      : audit.slidesTotal >= THIN_SLIDE_MAX
                      ? css.pillPartial ?? ''
                      : css.pillThin ?? ''
                  }`}
                >
                  {audit.slidesTotal >= READY_SLIDE_MIN && audit.namingRatio >= NAMING_READY_RATIO
                    ? 'Ready'
                    : audit.slidesTotal >= THIN_SLIDE_MAX
                    ? 'Presentable'
                    : audit.slidesTotal === 0
                    ? 'Empty'
                    : 'Thin'}
                </span>
              </header>
              <ul className={css.halfList}>
                <li>
                  <span className={css.halfRowLabel}>Structures</span>
                  <span className={css.halfRowValue}>{audit.structuresCount}</span>
                </li>
                <li>
                  <span className={css.halfRowLabel}>Zones</span>
                  <span className={css.halfRowValue}>{audit.zonesCount}</span>
                </li>
                <li>
                  <span className={css.halfRowLabel}>Utilities</span>
                  <span className={css.halfRowValue}>{audit.utilitiesCount}</span>
                </li>
                <li>
                  <span className={css.halfRowLabel}>Naming coverage</span>
                  <span className={css.halfRowValue}>
                    {audit.slidesTotal === 0 ? '—' : `${Math.round(audit.namingRatio * 100)}%`}
                  </span>
                </li>
              </ul>
              <p className={css.halfHint}>
                Threshold: ≥{READY_SLIDE_MIN} slides and ≥{Math.round(NAMING_READY_RATIO * 100)}% named to
                ship a presenter-ready deck. Unnamed features still render as slides but read as generic
                placeholders.
              </p>
            </article>

            <article className={css.half}>
              <header className={css.halfHead}>
                <span className={css.halfTitle}>Tour script</span>
                <span
                  className={`${css.halfPill} ${
                    audit.tourReady ? css.pillReady ?? '' : css.pillThin ?? ''
                  }`}
                >
                  {audit.tourReady ? 'Ready' : audit.pathsTotal === 0 ? 'No paths' : 'Path too short'}
                </span>
              </header>
              <ul className={css.halfList}>
                <li>
                  <span className={css.halfRowLabel}>Paths drawn</span>
                  <span className={css.halfRowValue}>{audit.pathsTotal}</span>
                </li>
                <li>
                  <span className={css.halfRowLabel}>Longest path</span>
                  <span className={css.halfRowValue}>
                    {audit.tourLengthM > 0 ? `${Math.round(audit.tourLengthM)} m` : '—'}
                  </span>
                </li>
                <li>
                  <span className={css.halfRowLabel}>Stops generated</span>
                  <span className={css.halfRowValue}>{audit.tourStops}</span>
                </li>
                <li>
                  <span className={css.halfRowLabel}>Voiceover length</span>
                  <span className={css.halfRowValue}>{fmtRuntime(audit.tourRuntime)}</span>
                </li>
              </ul>
              <p className={css.halfHint}>
                Threshold: at least one path with ≥{MIN_PATH_M} m and ≥2 vertices. The walking-tour card
                samples 5 evenly-spaced points along the longest qualifying path.
              </p>
            </article>
          </div>

          <p className={css.footnote}>
            Runtime estimates fix <em>{SLIDE_SECONDS}s/slide</em> and <em>{TOUR_STOP_SECONDS}s/stop</em>,
            matching the sibling cards. This card derives — it does not export. To preview the actual deck
            and script copy, open <em>Slide Export Preview</em> and <em>Walking Tour Script</em> directly.
          </p>
        </>
      )}
    </section>
  );
}
