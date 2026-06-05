/**
 * PresentationModeOverlay — full-screen takeover that drives the four
 * Presentation Mode sections (OLOS Observe Dashboard Spec §6.1). One
 * overlay component drives two surfaces:
 *
 *   1. In-app preview / share generator: every section visible, an
 *      `onClose` exits back to the live dashboard. The host (Unified
 *      Land State surface) controls when the Share dialog mounts.
 *
 *   2. Public share viewer: read-only. `mode='shared'` strips any
 *      controls that mutate state (Exit, Share) and respects the
 *      `includedSections` filter so a share with section opt-outs only
 *      paints what the link granted. The viewer route resolves the
 *      token to a project + share + boundary snapshot then mounts this
 *      overlay.
 *
 * Sidebar nav holds the four section anchors so a steward can scan a
 * long share without scrolling end-to-end. Active section is tracked
 * via component state; navigating updates the scroll position too so
 * deep links into a section will work without extra plumbing.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import type { PresentationShareSectionId } from '@ogden/shared';
import SiteOverviewSection from './SiteOverviewSection.js';
import CurrentConditionsSection from './CurrentConditionsSection.js';
import EcologicalTrajectorySection from './EcologicalTrajectorySection.js';
import EvidenceLibrarySection from './EvidenceLibrarySection.js';
import { downloadPresentationPdf } from './pdfExport.js';
import css from './PresentationModeOverlay.module.css';

type Mode = 'live' | 'shared';

interface Props {
  project: LocalProject;
  mode?: Mode;
  /** Sections to render. Empty / undefined ⇒ all four. */
  includedSections?: readonly PresentationShareSectionId[];
  /** Live mode only — exits back to the dashboard. */
  onClose?: () => void;
  /** Live mode only — mounts the Share dialog. */
  onShare?: () => void;
  /** Shown as the "Frozen at" timestamp in shared mode. */
  frozenAt?: string;
}

interface NavItem {
  id: PresentationShareSectionId;
  label: string;
}

const NAV: readonly NavItem[] = [
  { id: 'site_overview', label: 'Site overview' },
  { id: 'current_conditions', label: 'Current conditions' },
  { id: 'ecological_trajectory', label: 'Ecological trajectory' },
  { id: 'evidence_library', label: 'Evidence library' },
];

function formatFrozenAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PresentationModeOverlay({
  project,
  mode = 'live',
  includedSections,
  onClose,
  onShare,
  frozenAt,
}: Props) {
  const visibleSet = useMemo<Set<PresentationShareSectionId>>(() => {
    if (!includedSections || includedSections.length === 0) {
      return new Set(NAV.map((n) => n.id));
    }
    return new Set(includedSections);
  }, [includedSections]);

  const orderedVisible = useMemo(
    () => NAV.filter((n) => visibleSet.has(n.id)),
    [visibleSet],
  );

  const [activeId, setActiveId] = useState<PresentationShareSectionId>(
    orderedVisible[0]?.id ?? 'site_overview',
  );

  const frozenLabel = formatFrozenAt(frozenAt);

  return (
    <div
      className={css.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Observe presentation mode"
    >
      <nav className={css.rail} aria-label="Presentation sections">
        <div className={css.brand}>OLOS Observe</div>
        <div className={css.title}>{project.name}</div>
        {orderedVisible.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              item.id === activeId ? css.navItemActive : css.navItem
            }
            onClick={() => setActiveId(item.id)}
            aria-current={item.id === activeId ? 'page' : undefined}
          >
            {item.label}
          </button>
        ))}
        <div className={css.footer}>
          {mode === 'live' && onShare && (
            <button type="button" className={css.action} onClick={onShare}>
              Share view
            </button>
          )}
          {mode === 'live' && (
            <button
              type="button"
              className={css.action}
              onClick={() => downloadPresentationPdf({ project })}
            >
              Download PDF
            </button>
          )}
          {mode === 'live' && onClose && (
            <button type="button" className={css.exit} onClick={onClose}>
              Exit presentation
            </button>
          )}
          {mode === 'shared' && (
            <span className={css.frozenChip}>Read-only share</span>
          )}
        </div>
      </nav>
      <div className={css.canvas}>
        {mode === 'shared' && frozenLabel && (
          <div className={css.frozenChip}>Frozen at {frozenLabel}</div>
        )}
        {activeId === 'site_overview' && visibleSet.has('site_overview') && (
          <SiteOverviewSection project={project} />
        )}
        {activeId === 'current_conditions' &&
          visibleSet.has('current_conditions') && (
            <CurrentConditionsSection projectId={project.id} />
          )}
        {activeId === 'ecological_trajectory' &&
          visibleSet.has('ecological_trajectory') && (
            <EcologicalTrajectorySection projectId={project.id} />
          )}
        {activeId === 'evidence_library' &&
          visibleSet.has('evidence_library') && (
            <EvidenceLibrarySection projectId={project.id} />
          )}
      </div>
    </div>
  );
}
