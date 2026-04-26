/**
 * §27 ClientHandoffPackageCard — read-only delivery package preview.
 *
 * Distinct from the seven export PDFs above and from the public portal
 * (anonymous / mass-broadcast). The handoff package is the *outbound
 * deliverable* a steward hands a paying client — typically the
 * landowner — at the end of an engagement: a curated read-only view
 * of the design with the steward's internal scaffolding stripped.
 *
 * The §20 collaboration cluster covers comparison previews,
 * shareable-link readiness, and stakeholder review. This card sits
 * one level above those: it consolidates *what gets delivered*, runs
 * a readiness check on the deliverable as a whole, and surfaces the
 * three handoff modes (snapshot URL / PDF bundle / hybrid) so the
 * steward can pick the right shape for this particular client.
 *
 * Pure presentation; reads project + entity stores. No API calls;
 * mode chooser is preview-only (highlights the chosen tile).
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { usePathStore } from '../../store/pathStore.js';
import css from './ClientHandoffPackageCard.module.css';

interface Props {
  project: LocalProject;
}

type HandoffMode = 'snapshot-url' | 'pdf-bundle' | 'hybrid';

interface ModeOption {
  id: HandoffMode;
  title: string;
  detail: string;
  delivery: string;
  bestFor: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: 'snapshot-url',
    title: 'Snapshot URL',
    detail: 'Live read-only clone of the project workspace with editing affordances stripped.',
    delivery: 'Client clicks a link, sees the dashboards and the map exactly as the steward sees them, but cannot edit, comment, or export.',
    bestFor: 'Tech-fluent clients who want to explore the design themselves.',
  },
  {
    id: 'pdf-bundle',
    title: 'PDF bundle',
    detail: 'Curated bundle of the seven export PDFs zipped together with a handoff README.',
    delivery: 'Client receives a single .zip with site assessment, design brief, feature schedule, scenario comparison, and educational booklet.',
    bestFor: 'Clients who prefer paper artifacts or need an offline archival record.',
  },
  {
    id: 'hybrid',
    title: 'Hybrid',
    detail: 'Snapshot URL for exploration + PDF bundle for the archival record.',
    delivery: 'Client gets both — link in the email body, .zip attached for the file.',
    bestFor: 'Most stewardship engagements. Slightly more setup but covers both audiences.',
  },
];

interface ReadinessFinding {
  id: string;
  tier: 'blocker' | 'caution' | 'green';
  label: string;
  detail: string;
}

const AI_DRAFT_PATTERN = /\[AI-DRAFT\]|AI-DRAFT|TODO|TBD|placeholder|FIXME/i;

function checkAiDraftPresence(...texts: (string | null | undefined)[]): boolean {
  for (const t of texts) {
    if (typeof t === 'string' && AI_DRAFT_PATTERN.test(t)) return true;
  }
  return false;
}

interface PackageInclusion {
  label: string;
  detail: string;
  count?: number | string;
  ready: boolean;
}

export default function ClientHandoffPackageCard({ project }: Props): React.ReactElement {
  const [mode, setMode] = useState<HandoffMode>('hybrid');
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);

  const counts = useMemo(() => {
    const id = project.id;
    return {
      structures: allStructures.filter((s) => s.projectId === id).length,
      utilities: allUtilities.filter((u) => u.projectId === id).length,
      crops: allCrops.filter((c) => c.projectId === id).length,
      paddocks: allPaddocks.filter((p) => p.projectId === id).length,
      zones: allZones.filter((z) => z.projectId === id).length,
      paths: allPaths.filter((p) => p.projectId === id).length,
    };
  }, [allStructures, allUtilities, allCrops, allPaddocks, allZones, allPaths, project.id]);

  const totalEntities = counts.structures + counts.utilities + counts.crops + counts.paddocks + counts.zones + counts.paths;

  const inclusions: PackageInclusion[] = useMemo(() => {
    return [
      {
        label: 'Project map snapshot',
        detail: 'Aerial render with all placed entities, overlay legend, and acreage scale.',
        count: `${totalEntities} placed`,
        ready: totalEntities > 0,
      },
      {
        label: 'Design brief',
        detail: 'Vision, intent, zoning rationale, phasing rollup, headline metrics.',
        ready: typeof project.description === 'string' && project.description.trim().length > 80,
      },
      {
        label: 'Feature schedule',
        detail: 'Per-entity table grouped by phase with cost / labor / material rollups.',
        count: totalEntities,
        ready: totalEntities >= 3,
      },
      {
        label: 'Scenario comparison (if any)',
        detail: 'Side-by-side of saved design alternatives. Optional — skipped if only one scenario exists.',
        ready: true,
      },
      {
        label: 'Field-record archive',
        detail: 'Site visit photos, walk routes, and punch-list entries packaged as a chronological log.',
        ready: true,
      },
      {
        label: 'Decision-support narrative',
        detail: 'Capital intensity, seasonal realism, terrain premiums, hospitality/education/energy fit — the cards a paying client wants to see, not the steward dashboards they don\u2019t.',
        ready: true,
      },
    ];
  }, [project.description, totalEntities, counts.structures]);

  const findings: ReadinessFinding[] = useMemo(() => {
    const out: ReadinessFinding[] = [];

    const description = project.description ?? '';
    const name = project.name ?? '';
    const visionStatement = (project as { visionStatement?: string }).visionStatement ?? '';

    if (totalEntities < 3) {
      out.push({
        id: 'too-thin',
        tier: 'blocker',
        label: 'Site is too thin to hand off',
        detail: `Only ${totalEntities} placed entit${totalEntities === 1 ? 'y' : 'ies'}. Most clients expect at least 6\u20138 placed features (zones, structures, paths) before the package feels finished.`,
      });
    } else if (totalEntities < 8) {
      out.push({
        id: 'thin',
        tier: 'caution',
        label: 'Site placement is sparse',
        detail: `${totalEntities} entities placed. Workable, but the design brief will skim — call out explicitly that this is a first-pass concept, not a built-out plan.`,
      });
    } else {
      out.push({
        id: 'placement-ok',
        tier: 'green',
        label: 'Placement density supports a finished feel',
        detail: `${totalEntities} placed entities across zones, structures, paths, and water/energy infrastructure.`,
      });
    }

    if (description.trim().length < 80) {
      out.push({
        id: 'description-thin',
        tier: 'blocker',
        label: 'Project description is missing or too short',
        detail: 'The design brief leans on the project description for the framing paragraph. Aim for at least 80 characters with the why-this-land in the steward\u2019s voice.',
      });
    } else {
      out.push({
        id: 'description-ok',
        tier: 'green',
        label: 'Project description is hand-off ready',
        detail: `${description.trim().length} characters of hand-written framing.`,
      });
    }

    if (checkAiDraftPresence(description, name, visionStatement)) {
      out.push({
        id: 'ai-draft',
        tier: 'blocker',
        label: 'AI-draft / TODO markers in client-facing copy',
        detail: 'Words like AI-DRAFT, TODO, TBD, placeholder, or FIXME appear in the project name, description, or vision statement. Promote or strip them before handoff \u2014 they read as unfinished work.',
      });
    } else {
      out.push({
        id: 'ai-draft-ok',
        tier: 'green',
        label: 'No AI-draft markers in client-facing fields',
        detail: 'Project name, description, and vision statement read as final.',
      });
    }

    if (counts.structures + counts.utilities === 0) {
      out.push({
        id: 'no-built-environment',
        tier: 'caution',
        label: 'No structures or utilities placed',
        detail: 'Pure-land projects are valid handoffs, but the package will surface zones and crops only. Consider whether the client expects a built-environment plan.',
      });
    }

    return out;
  }, [project.description, project.name, totalEntities, counts.structures, counts.utilities]);

  const blockers = findings.filter((f) => f.tier === 'blocker').length;
  const cautions = findings.filter((f) => f.tier === 'caution').length;
  const greens = findings.filter((f) => f.tier === 'green').length;

  let overallVerdict: 'green' | 'caution' | 'blocker';
  let overallNote: string;
  if (blockers > 0) {
    overallVerdict = 'blocker';
    overallNote = `${blockers} blocker${blockers === 1 ? '' : 's'} \u2014 do not hand off until resolved.`;
  } else if (cautions > 0) {
    overallVerdict = 'caution';
    overallNote = `${cautions} caution${cautions === 1 ? '' : 's'} \u2014 handoff is possible but explain the gaps in the cover note.`;
  } else {
    overallVerdict = 'green';
    overallNote = `All ${greens} checks pass \u2014 package is ready for client handoff.`;
  }

  const verdictClass =
    overallVerdict === 'blocker' ? css.verdictBlocker : overallVerdict === 'caution' ? css.verdictCaution : css.verdictGreen;

  function tierClass(tier: ReadinessFinding['tier']): string {
    if (tier === 'blocker') return css.findingBlocker ?? '';
    if (tier === 'caution') return css.findingCaution ?? '';
    return css.findingGreen ?? '';
  }

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Client handoff package</h3>
          <p className={css.cardHint}>
            Read-only delivery the steward hands a paying client at the end of an engagement. Distinct
            from the seven export PDFs above {'\u2014'} this card consolidates {'\u201C'}what gets delivered{'\u201D'}, audits
            the deliverable as a whole, and lets you pick the right delivery shape for this client.
          </p>
        </div>
        <span className={css.modeBadge}>§27 {'\u00B7'} Read-only deliverable</span>
      </header>

      {/* ── Overall verdict ── */}
      <div className={`${css.verdictBanner} ${verdictClass ?? ''}`}>
        <div className={css.verdictTitle}>
          {overallVerdict === 'blocker'
            ? 'Not ready'
            : overallVerdict === 'caution'
              ? 'Conditionally ready'
              : 'Ready to hand off'}
        </div>
        <div className={css.verdictNote}>{overallNote}</div>
      </div>

      {/* ── Inclusions list ── */}
      <h4 className={css.sectionLabel}>What gets delivered</h4>
      <ul className={css.inclusionList}>
        {inclusions.map((inc) => (
          <li key={inc.label} className={inc.ready ? css.inclusionItem : css.inclusionItemMissing}>
            <div className={css.inclusionDot} aria-hidden="true">
              {inc.ready ? '\u2713' : '\u00B7'}
            </div>
            <div className={css.inclusionMain}>
              <div className={css.inclusionLabel}>
                {inc.label}
                {typeof inc.count !== 'undefined' ? (
                  <span className={css.inclusionCount}>{'\u00B7'} {inc.count}</span>
                ) : null}
              </div>
              <div className={css.inclusionDetail}>{inc.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      {/* ── Readiness findings ── */}
      <h4 className={css.sectionLabel}>Readiness audit</h4>
      <div className={css.findings}>
        {findings.map((f) => (
          <div key={f.id} className={`${css.findingRow} ${tierClass(f.tier)}`}>
            <div className={css.findingTier}>
              {f.tier === 'blocker' ? 'Blocker' : f.tier === 'caution' ? 'Caution' : 'OK'}
            </div>
            <div className={css.findingMain}>
              <div className={css.findingLabel}>{f.label}</div>
              <div className={css.findingDetail}>{f.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Mode chooser ── */}
      <h4 className={css.sectionLabel}>Delivery mode</h4>
      <div className={css.modeGrid}>
        {MODE_OPTIONS.map((opt) => {
          const active = mode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              className={active ? css.modeTileActive : css.modeTile}
              onClick={() => setMode(opt.id)}
              aria-pressed={active}
            >
              <div className={css.modeTitle}>{opt.title}</div>
              <div className={css.modeDetail}>{opt.detail}</div>
              <div className={css.modeRow}>
                <span className={css.modeRowLabel}>How</span>
                <span className={css.modeRowValue}>{opt.delivery}</span>
              </div>
              <div className={css.modeRow}>
                <span className={css.modeRowLabel}>Best for</span>
                <span className={css.modeRowValue}>{opt.bestFor}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Privacy note ── */}
      <div className={css.privacyNote}>
        <strong className={css.privacyTitle}>Read-only by construction.</strong>{' '}
        The handoff package strips: editing affordances, internal stewardship notes, AI-DRAFT
        prose, completeness scores, raw cost-of-acquisition figures, and owner contact details.
        Whatever delivery mode is chosen, the client never sees the steward{'\u2019'}s inner workspace.
        Mode chooser above is preview-only; selecting a tile highlights it but does not
        trigger a delivery {'\u2014'} the actual snapshot URL and PDF-bundle composer are still
        manifest-planned (P4) and will land in a follow-on shipment.
      </div>
    </section>
  );
}
