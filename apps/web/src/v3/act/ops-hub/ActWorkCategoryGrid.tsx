/**
 * ActWorkCategoryGrid — the "what kind of work" filter row of the Operations
 * Hub.
 *
 * The mock's work-type category cards become one card per UniversalDomain that
 * the project actually touches (the 16-domain taxonomy the Operational Role
 * Layer already uses). Each card shows the domain label, an accent dot, and a
 * live count of OPEN field actions in that domain (anything not yet verified).
 * Selecting a card lifts `activeDomain` to ActOpsHub, which feeds the map panel
 * a `scopedDomains` set — reusing the EXACT marker-dim mechanism the role layer
 * built (`objectiveInScope`), so out-of-category pins de-emphasise (never hide,
 * golden rule). Clicking the active card again clears the filter.
 *
 * Domains are derived from real objectives via `getObjectiveObserveDomains`
 * (the canonical objective→domain map); only domains with at least one
 * objective render. Counts come from the field-action store bucketed through
 * the same map. A fresh project with objectives but no logged actions still
 * shows selectable cards at count 0 (selection works without the map — the
 * hide-until-real markers may be empty), per the plan's risk note.
 */

import { useMemo, useState } from 'react';
import {
  UNIVERSAL_DOMAINS,
  UNIVERSAL_DOMAIN_LABELS,
  getObjectiveObserveDomains,
  type UniversalDomain,
} from '@ogden/shared';
import {
  selectFieldActionsForProject,
  useFieldActionStore,
} from '../../../store/fieldActionStore.js';
import { useProjectObjectives } from '../../plan/strata/useProjectObjectives.js';
import { partitionByScope } from '../../roles/viewScope.js';
import { OBSERVE_MODULE_DOT } from '../../observe/moduleGuidance.js';
import css from './ActWorkCategoryGrid.module.css';

const DOT_FALLBACK = '#9ca3af';

interface Props {
  projectId: string;
  activeDomain: UniversalDomain | null;
  /** Toggle the domain filter; pass `null` to clear (or re-click active card). */
  onSelectDomain: (domain: UniversalDomain | null) => void;
  /**
   * Operational Role Layer scope (additive). When present + non-empty, in-scope
   * domain cards lead and out-of-scope cards collapse behind a "+N more"
   * expander -- never hidden, only de-emphasized (still one click away). Absent
   * or empty ⇒ every present-domain card renders inline in canonical order,
   * exactly as before the role filter. Mirrors ObserveModuleBar's partition.
   */
  scopedDomains?: ReadonlySet<UniversalDomain>;
}

interface DomainCell {
  domain: UniversalDomain;
  label: string;
  dot: string;
  /** Open (not-yet-verified) field actions whose objective touches this domain. */
  openCount: number;
}

export default function ActWorkCategoryGrid({
  projectId,
  activeDomain,
  onSelectDomain,
  scopedDomains,
}: Props) {
  const { objectives } = useProjectObjectives(projectId);
  const actions = useFieldActionStore((s) =>
    selectFieldActionsForProject(s, projectId),
  );
  // Out-of-focus cards start collapsed behind "+N more"; this reveals them.
  const [outOpen, setOutOpen] = useState(false);

  const cells = useMemo<DomainCell[]>(() => {
    // objectiveId → its domains, computed once (an objective can touch several).
    const domainsByObjective = new Map<string, readonly UniversalDomain[]>();
    const present = new Set<UniversalDomain>();
    for (const o of objectives) {
      const domains = getObjectiveObserveDomains(o);
      domainsByObjective.set(o.id, domains);
      for (const d of domains) present.add(d);
    }

    // Open-task counts per domain (skip verified — those are done, not "to do").
    const openByDomain = new Map<UniversalDomain, number>();
    for (const a of actions) {
      if (a.status === 'verified') continue;
      const domains = domainsByObjective.get(a.planObjectiveId);
      if (!domains) continue;
      for (const d of domains) {
        openByDomain.set(d, (openByDomain.get(d) ?? 0) + 1);
      }
    }

    // Stable canonical order; only domains the project actually touches.
    return UNIVERSAL_DOMAINS.filter((d) => present.has(d)).map((domain) => ({
      domain,
      label: UNIVERSAL_DOMAIN_LABELS[domain],
      dot: OBSERVE_MODULE_DOT[domain] ?? DOT_FALLBACK,
      openCount: openByDomain.get(domain) ?? 0,
    }));
  }, [objectives, actions]);

  if (cells.length === 0) return null;

  // Scope engaged only when a non-empty domain set is supplied. Full view /
  // unscoped callers leave scopedDomains undefined ⇒ every card renders inline.
  const scoped = scopedDomains !== undefined && scopedDomains.size > 0;
  const { inScope, outScope } = scoped
    ? partitionByScope(cells, (c) => [c.domain], scopedDomains)
    : { inScope: cells, outScope: [] as DomainCell[] };

  const renderCard = (cell: DomainCell, dimmed: boolean) => {
    const isActive = activeDomain === cell.domain;
    return (
      <button
        key={cell.domain}
        type="button"
        className={css.card}
        data-active={isActive}
        data-scope={dimmed ? 'out' : 'in'}
        aria-pressed={isActive}
        onClick={() => onSelectDomain(isActive ? null : cell.domain)}
      >
        <span className={css.cardHead}>
          <span
            className={css.dot}
            style={{ background: cell.dot }}
            aria-hidden="true"
          />
          <span className={css.label}>{cell.label}</span>
        </span>
        <span className={css.count}>
          {cell.openCount}
          <span className={css.countWord}>
            {cell.openCount === 1 ? ' task' : ' tasks'}
          </span>
        </span>
      </button>
    );
  };

  return (
    <section className={css.wrap} aria-label="Work categories">
      <div className={css.head}>
        <h2 className={css.title}>Work by area</h2>
        {activeDomain && (
          <button
            type="button"
            className={css.clear}
            onClick={() => onSelectDomain(null)}
          >
            Clear filter
          </button>
        )}
      </div>
      <div className={css.grid} role="group">
        {inScope.map((cell) => renderCard(cell, false))}
        {scoped && outScope.length > 0 && (
          <button
            type="button"
            className={css.moreTile}
            aria-expanded={outOpen}
            onClick={() => setOutOpen((open) => !open)}
            data-testid="work-category-outside-focus-toggle"
          >
            {outOpen ? `Hide ${outScope.length}` : `+${outScope.length} more`}
          </button>
        )}
        {scoped && outOpen && outScope.map((cell) => renderCard(cell, true))}
      </div>
    </section>
  );
}
