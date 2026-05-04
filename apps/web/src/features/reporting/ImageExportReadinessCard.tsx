/**
 * §23 ImageExportReadinessCard — map-screenshot / image-export readiness audit.
 *
 * Sibling of `GisExportReadinessCard`. The "Map Screenshot" button on the
 * Reporting panel is wired (canvas.toDataURL → PNG), but no surface
 * verdicts whether the resulting image will actually be presentable —
 * how many features will appear, how many carry names, whether the
 * project has a boundary, title, or vision statement to caption a
 * branded export against, and how stale the design is relative to the
 * last save.
 *
 * Pure derivation — reads project + four spatial entity stores filtered
 * by `project.id`. No file write happens here.
 *
 * Closes manifest §23 `image-export-screenshot` (P3) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import css from './ImageExportReadinessCard.module.css';

interface Props {
  project: LocalProject;
}

type Verdict = 'ready' | 'presentable' | 'thin' | 'empty';

const VERDICT_LABEL: Record<Verdict, string> = {
  ready: 'Export-ready',
  presentable: 'Presentable',
  thin: 'Too sparse',
  empty: 'Nothing to capture',
};

const VERDICT_BLURB: Record<Verdict, string> = {
  ready: 'Boundary, features, names, and a project title — the screenshot will read cleanly.',
  presentable: 'Captures will work but read as a draft — naming or branding gaps remain.',
  thin: 'Too few placed features for a meaningful image export.',
  empty: 'No boundary or placed features yet — there is nothing to capture.',
};

const READY_FEATURE_MIN = 8;
const READY_NAMING_RATIO = 0.7;
const FRESHNESS_DAYS = 7;

type LayerKey = 'zones' | 'structures' | 'paths' | 'utilities';

const LAYER_LABEL: Record<LayerKey, string> = {
  zones: 'Zones',
  structures: 'Structures',
  paths: 'Paths',
  utilities: 'Utilities',
};

function verdictClass(v: Verdict): string {
  if (v === 'ready') return css.verdictReady ?? '';
  if (v === 'presentable') return css.verdictPresentable ?? '';
  if (v === 'thin') return css.verdictThin ?? '';
  return css.verdictEmpty ?? '';
}

function shareClass(ratio: number): string {
  if (ratio >= READY_NAMING_RATIO) return css.shareGood ?? '';
  if (ratio >= 0.4) return css.shareFair ?? '';
  return css.shareWeak ?? '';
}

function relativeUpdate(iso: string): { label: string; fresh: boolean } {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return { label: '—', fresh: false };
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return { label: 'today', fresh: true };
  if (days === 1) return { label: 'yesterday', fresh: true };
  if (days < FRESHNESS_DAYS) return { label: `${days}d ago`, fresh: true };
  if (days < 30) return { label: `${days}d ago`, fresh: false };
  const months = Math.floor(days / 30);
  return { label: `${months}mo ago`, fresh: false };
}

export default function ImageExportReadinessCard({ project }: Props): JSX.Element {
  const allZones = useZoneStore((st) => st.zones);
  const allStructures = useStructureStore((st) => st.structures);
  const allPaths = usePathStore((st) => st.paths);
  const allUtilities = useUtilityStore((st) => st.utilities);

  const audit = useMemo(() => {
    const zones = allZones.filter((z) => z.projectId === project.id);
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);

    const layerRows: { key: LayerKey; total: number; named: number }[] = [
      {
        key: 'zones',
        total: zones.length,
        named: zones.filter((z) => (z.name ?? '').trim().length > 0).length,
      },
      {
        key: 'structures',
        total: structures.length,
        named: structures.filter((s) => (s.name ?? '').trim().length > 0).length,
      },
      {
        key: 'paths',
        total: paths.length,
        named: paths.filter((p) => (p.name ?? '').trim().length > 0).length,
      },
      {
        key: 'utilities',
        total: utilities.length,
        named: utilities.filter((u) => (u.name ?? '').trim().length > 0).length,
      },
    ];

    const featuresTotal = layerRows.reduce((acc, r) => acc + r.total, 0);
    const featuresNamed = layerRows.reduce((acc, r) => acc + r.named, 0);
    const namingRatio = featuresTotal === 0 ? 0 : featuresNamed / featuresTotal;

    const hasBoundary = project.hasParcelBoundary;
    const hasTitle = project.name.trim().length > 0;
    const hasAddress = (project.address ?? '').trim().length > 0;
    const hasVision = (project.visionStatement ?? '').trim().length > 0;
    const branded = [hasTitle, hasAddress, hasVision].filter(Boolean).length;

    const updated = relativeUpdate(project.updatedAt);

    let verdict: Verdict;
    if (!hasBoundary && featuresTotal === 0) verdict = 'empty';
    else if (featuresTotal < 3) verdict = 'thin';
    else if (
      hasBoundary &&
      featuresTotal >= READY_FEATURE_MIN &&
      namingRatio >= READY_NAMING_RATIO &&
      hasTitle
    )
      verdict = 'ready';
    else verdict = 'presentable';

    return {
      layerRows,
      featuresTotal,
      featuresNamed,
      featuresUnnamed: featuresTotal - featuresNamed,
      namingRatio,
      hasBoundary,
      hasTitle,
      hasAddress,
      hasVision,
      branded,
      updated,
      verdict,
    };
  }, [allZones, allStructures, allPaths, allUtilities, project]);

  const isEmpty = audit.featuresTotal === 0 && !audit.hasBoundary;

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Image Export Readiness
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Verdicts the <em>Map Screenshot</em> action below. The PNG capture is canvas-direct from
            Mapbox — what you see in the viewport is what lands in the file. This card pre-flights{' '}
            <em>boundary · feature count · naming · branding</em> so the resulting image reads cleanly.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass(audit.verdict)}`}>
          <span className={css.verdictLabel}>{VERDICT_LABEL[audit.verdict]}</span>
          <span className={css.verdictBlurb}>{VERDICT_BLURB[audit.verdict]}</span>
        </div>
      </header>

      {isEmpty ? (
        <p className={css.empty}>
          No parcel boundary and no placed features for this project yet — there is nothing for the canvas
          to render. Import a boundary or place at least one feature before capturing.
        </p>
      ) : (
        <>
          <div className={css.statsRow}>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.featuresTotal}</span>
              <span className={css.statLabel}>Features</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.featuresNamed}</span>
              <span className={css.statLabel}>Named</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.featuresUnnamed}</span>
              <span className={css.statLabel}>Unnamed</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>
                {audit.featuresTotal === 0 ? '—' : `${Math.round(audit.namingRatio * 100)}%`}
              </span>
              <span className={css.statLabel}>Naming</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.branded}/3</span>
              <span className={css.statLabel}>Branding</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.updated.label}</span>
              <span className={css.statLabel}>Updated</span>
            </div>
          </div>

          <div className={css.layerBlock}>
            <h4 className={css.blockTitle}>Layers in canvas</h4>
            <ul className={css.layerList}>
              {audit.layerRows.map((row) => {
                const ratio = row.total === 0 ? 0 : row.named / row.total;
                return (
                  <li key={row.key} className={css.layerRow}>
                    <span className={css.layerLabel}>{LAYER_LABEL[row.key]}</span>
                    <span className={css.layerCount}>{row.total}</span>
                    <span className={`${css.layerShare} ${shareClass(ratio)}`}>
                      {row.total === 0 ? 'none' : `${row.named}/${row.total} named`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={css.brandBlock}>
            <h4 className={css.blockTitle}>Caption & branding</h4>
            <ul className={css.brandList}>
              <li className={css.brandRow}>
                <span className={css.brandLabel}>Project title</span>
                <span
                  className={`${css.brandPill} ${
                    audit.hasTitle ? css.pillOn ?? '' : css.pillOff ?? ''
                  }`}
                >
                  {audit.hasTitle ? project.name : 'Missing'}
                </span>
              </li>
              <li className={css.brandRow}>
                <span className={css.brandLabel}>Site address</span>
                <span
                  className={`${css.brandPill} ${
                    audit.hasAddress ? css.pillOn ?? '' : css.pillOff ?? ''
                  }`}
                >
                  {audit.hasAddress ? project.address : 'Not recorded'}
                </span>
              </li>
              <li className={css.brandRow}>
                <span className={css.brandLabel}>Vision statement</span>
                <span
                  className={`${css.brandPill} ${
                    audit.hasVision ? css.pillOn ?? '' : css.pillOff ?? ''
                  }`}
                >
                  {audit.hasVision ? 'Present' : 'Not written'}
                </span>
              </li>
              <li className={css.brandRow}>
                <span className={css.brandLabel}>Parcel boundary</span>
                <span
                  className={`${css.brandPill} ${
                    audit.hasBoundary ? css.pillOn ?? '' : css.pillOff ?? ''
                  }`}
                >
                  {audit.hasBoundary ? 'Imported' : 'Missing'}
                </span>
              </li>
              <li className={css.brandRow}>
                <span className={css.brandLabel}>Edit freshness</span>
                <span
                  className={`${css.brandPill} ${
                    audit.updated.fresh ? css.pillOn ?? '' : css.pillStale ?? ''
                  }`}
                >
                  {audit.updated.fresh
                    ? `Fresh — saved ${audit.updated.label}`
                    : `Stale — ${audit.updated.label}`}
                </span>
              </li>
            </ul>
          </div>

          <p className={css.footnote}>
            Threshold for <em>Export-ready</em>: parcel boundary present, ≥{READY_FEATURE_MIN} placed
            features, ≥{Math.round(READY_NAMING_RATIO * 100)}% named, project title set. Image quality is
            bound to viewport size at capture time — zoom and centre the map before clicking{' '}
            <em>Map Screenshot</em>.
          </p>
        </>
      )}
    </section>
  );
}
