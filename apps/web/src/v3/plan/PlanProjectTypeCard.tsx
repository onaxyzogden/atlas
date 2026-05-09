/**
 * PlanProjectTypeCard — top-of-rail card in PlanChecklistAside that lets
 * the steward pick a project-type template (Regenerative Farm, Retreat
 * Center, Homestead, Educational Farm, Conservation, Multi-Enterprise) and
 * tick through type-specific design-prompt items.
 *
 * Default seed: when the steward has not yet interacted with the picker
 * for this project, the card mirrors `project.projectType` from the
 * wizard. The first picker change OR the first checkbox toggle locks
 * the choice into `planProjectTypeChecklistStore`, after which the
 * stored value wins (including an explicit "Select a project type…"
 * clear back to null — the wizard default does not re-seed).
 *
 * Reuses GuidanceCard.module.css for the bullet/check structure so the
 * checked-strikethrough behaviour matches the universal module cards below.
 */

import { useParams } from '@tanstack/react-router';
import type { CSSProperties } from 'react';
import { usePlanProjectTypeChecklistStore } from '../../store/planProjectTypeChecklistStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import {
  PLAN_PROJECT_TYPE_KEYS,
  PLAN_PROJECT_TYPE_TEMPLATES,
  type PlanProjectTypeKey,
} from './data/planProjectTypeTemplates.js';
import css from './PlanProjectTypeCard.module.css';
import guidanceCss from '../_shared/components/GuidanceCard.module.css';

const EMPTY_CHECKS: readonly number[] = [];

function asPlanProjectTypeKey(value: string | null | undefined): PlanProjectTypeKey | null {
  if (!value) return null;
  return (PLAN_PROJECT_TYPE_KEYS as readonly string[]).includes(value)
    ? (value as PlanProjectTypeKey)
    : null;
}

export default function PlanProjectTypeCard() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;

  const wizardType = useProjectStore((s) =>
    projectId ? (s.projects.find((p) => p.id === projectId)?.projectType ?? null) : null,
  );
  const wizardSeed = asPlanProjectTypeKey(wizardType);

  const hasInteracted = usePlanProjectTypeChecklistStore((s) =>
    projectId ? s.byProject[projectId] !== undefined : false,
  );
  const storedType = usePlanProjectTypeChecklistStore(
    (s) => (projectId ? s.byProject[projectId]?.selectedType : null) ?? null,
  );

  const effectiveType: PlanProjectTypeKey | null = hasInteracted
    ? storedType
    : wizardSeed;

  const checkedList = usePlanProjectTypeChecklistStore(
    (s) =>
      (projectId && effectiveType
        ? s.byProject[projectId]?.checks[effectiveType]
        : null) ?? EMPTY_CHECKS,
  );
  const setSelectedType = usePlanProjectTypeChecklistStore(
    (s) => s.setSelectedType,
  );
  const toggle = usePlanProjectTypeChecklistStore((s) => s.toggle);

  const template = effectiveType ? PLAN_PROJECT_TYPE_TEMPLATES[effectiveType] : null;
  const dotColor = template?.color ?? 'var(--color-text-muted)';
  const style = { ['--group-dot' as never]: dotColor } as CSSProperties;

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!projectId) return;
    const value = e.target.value;
    setSelectedType(
      projectId,
      value === '' ? null : (value as PlanProjectTypeKey),
    );
  };

  const handleToggle = (i: number) => {
    if (!projectId || !effectiveType) return;
    // First toggle on a wizard-seeded default locks the seed in as the
    // explicit choice, so subsequent renders don't fall back to the seed
    // (and a later wizard-side type change won't surprise the steward).
    if (!hasInteracted) {
      setSelectedType(projectId, effectiveType);
    }
    toggle(projectId, effectiveType, i);
  };

  return (
    <section className={css.card} style={style} aria-label="Project type template checklist">
      <header className={css.header}>
        <span className={css.dot} aria-hidden="true" />
        <span className={css.label}>Project Type</span>
      </header>

      <select
        className={css.picker}
        value={effectiveType ?? ''}
        onChange={handleSelect}
        disabled={!projectId}
        aria-label="Select project type template"
      >
        <option value="">Select a project type…</option>
        {PLAN_PROJECT_TYPE_KEYS.map((key) => (
          <option key={key} value={key}>
            {PLAN_PROJECT_TYPE_TEMPLATES[key].label}
          </option>
        ))}
      </select>

      {!template && (
        <p className={css.placeholder}>
          Pick a template to see project-type-specific design prompts.
        </p>
      )}

      {template && template.items.length === 0 && (
        <p className={css.empty}>
          Coming soon — checklist items for {template.label} are still being drafted.
        </p>
      )}

      {template && template.items.length > 0 && (
        <div className={guidanceCss.howBlock}>
          <span className={guidanceCss.blockLabel}>Checklist</span>
          <ul className={guidanceCss.howList}>
            {template.items.map((item, i) => {
              const checked = checkedList.includes(i);
              return (
                <li key={i} className={guidanceCss.howItem}>
                  <label
                    className={`${guidanceCss.howCheck} ${checked ? guidanceCss.howCheckDone : ''}`}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!projectId}
                      onChange={() => handleToggle(i)}
                    />
                    <span className={guidanceCss.howText}>{item}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
