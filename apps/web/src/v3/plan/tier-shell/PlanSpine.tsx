/**
 * PlanSpine — collapse-aware wrapper around the shared ActTierSpine for the
 * Plan tier-shell.
 *
 * Expanded (default): the full S1-S7 stratum tab row, with a slim "Collapse
 * strata" chevron pinned to the right edge. Collapsed: the heavy tablist is
 * unmounted and replaced by a slim summary bar showing the project name + the
 * active stratum (e.g. "S1 · Project Foundation") + an "Expand strata" chevron,
 * so the design canvas below (StageShell center, flex: 1 1 auto) reclaims the
 * row's height. The collapsed/expanded choice is a global, persisted uiStore
 * preference (mirrors planToolDockCollapsed).
 *
 * Plan-only: the shared ActTierSpine and the Act tier-shell are untouched — Act
 * renders ActTierSpine directly and never reads `spineCollapsed`. This wrapper
 * forwards ActTierSpine's full prop set unchanged, so it is a drop-in swap at
 * the single Plan call site.
 */

import type { ComponentProps } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useUIStore } from '../../../store/uiStore.js';
import ActTierSpine from '../../act/tier-shell/ActTierSpine.js';
import css from './PlanSpine.module.css';

type Props = ComponentProps<typeof ActTierSpine>;

export default function PlanSpine(props: Props) {
  const collapsed = useUIStore((s) => s.spineCollapsed);
  const toggle = useUIStore((s) => s.toggleSpineCollapsed);

  if (collapsed) {
    const active = props.strata.find((s) => s.id === props.activeStratumId);
    const activeLabel = active
      ? `S${active.ordinal} · ${active.title}`
      : null;
    return (
      <div className={css.collapsedBar} data-collapsed="true">
        <span className={css.collapsedTitle}>{props.projectTitle}</span>
        {activeLabel ? (
          <span className={css.collapsedStratum}>{activeLabel}</span>
        ) : null}
        <button
          type="button"
          className={css.collapseBtn}
          onClick={toggle}
          aria-expanded={false}
          aria-label="Expand strata"
        >
          <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className={css.spineWrap} data-collapsed="false">
      <div className={css.spineSlot}>
        <ActTierSpine {...props} />
      </div>
      <button
        type="button"
        className={css.collapseBtn}
        onClick={toggle}
        aria-expanded={true}
        aria-label="Collapse strata"
      >
        <ChevronUp size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </div>
  );
}
