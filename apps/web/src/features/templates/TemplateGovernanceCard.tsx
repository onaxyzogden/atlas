/**
 * §25 TemplateGovernanceCard — duplication and locking / governance audit.
 *
 * Verdicts the template registry: how many templates are built-in
 * (locked / governance-protected) versus custom (steward-editable),
 * the per-category split, and the structural integrity of each custom
 * template (zone count · structure count · phase count · cost range).
 * Built-in templates back the duplicate path on `projectStore`'s
 * `duplicateProject` action — locking them prevents an accidental
 * deletion that would orphan downstream projects.
 *
 * Pure derivation — reads the template store. No mutation.
 *
 * Closes manifest §25 `template-duplication-locking-governance` (P3)
 * partial -> done.
 */

import { useMemo } from 'react';
import {
  BUILT_IN_TEMPLATES,
  useTemplateStore,
  type ProjectTemplate,
} from '../../store/templateStore.js';
import css from './TemplateGovernanceCard.module.css';

type Verdict = 'governed' | 'mixed' | 'custom-heavy' | 'empty';

const VERDICT_LABEL: Record<Verdict, string> = {
  governed: 'Locked & governed',
  mixed: 'Locked + custom',
  'custom-heavy': 'Custom-heavy',
  empty: 'Empty registry',
};

const VERDICT_BLURB: Record<Verdict, string> = {
  governed: 'All templates are built-in and locked — no custom drift in the registry.',
  mixed: 'Built-in templates dominate; a small custom set sits alongside.',
  'custom-heavy': 'Custom templates outnumber locked ones — review for duplication and integrity.',
  empty: 'No built-in or custom templates registered.',
};

type CategoryKey = ProjectTemplate['category'];

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  regenerative: 'Regenerative',
  retreat: 'Retreat',
  homestead: 'Homestead',
  education: 'Education',
  conservation: 'Conservation',
  moontrance: 'Moontrance',
  custom: 'Custom',
};

const ZONE_MIN = 3;
const STRUCTURE_MIN = 2;
const PHASE_MIN = 2;

interface IntegrityIssue {
  template: ProjectTemplate;
  reasons: string[];
}

function verdictClass(v: Verdict): string {
  if (v === 'governed') return css.verdictGood ?? '';
  if (v === 'mixed') return css.verdictMixed ?? '';
  if (v === 'custom-heavy') return css.verdictWarn ?? '';
  return css.verdictEmpty ?? '';
}

function relativeAge(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const days = Math.floor((Date.now() - t) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

export default function TemplateGovernanceCard(): JSX.Element {
  const customTemplates = useTemplateStore((s) => s.customTemplates);

  const audit = useMemo(() => {
    const all: ProjectTemplate[] = [...BUILT_IN_TEMPLATES, ...customTemplates];
    const lockedCount = BUILT_IN_TEMPLATES.length;
    const customCount = customTemplates.length;
    const total = all.length;

    const categoryCounts = new Map<CategoryKey, { locked: number; custom: number }>();
    for (const t of all) {
      const slot = categoryCounts.get(t.category) ?? { locked: 0, custom: 0 };
      if (t.isBuiltIn) slot.locked += 1;
      else slot.custom += 1;
      categoryCounts.set(t.category, slot);
    }
    const categoryRows = Array.from(categoryCounts.entries())
      .map(([key, counts]) => ({ key, ...counts, total: counts.locked + counts.custom }))
      .sort((a, b) => b.total - a.total);

    const issues: IntegrityIssue[] = [];
    for (const t of customTemplates) {
      const reasons: string[] = [];
      if (t.zones.length < ZONE_MIN) reasons.push(`only ${t.zones.length} zone(s) — expected ≥${ZONE_MIN}`);
      if (t.structures.length < STRUCTURE_MIN)
        reasons.push(`only ${t.structures.length} structure(s) — expected ≥${STRUCTURE_MIN}`);
      if (t.phases.length < PHASE_MIN)
        reasons.push(`only ${t.phases.length} phase(s) — expected ≥${PHASE_MIN}`);
      const [lo, hi] = t.costEstimateRange;
      if (!(lo > 0 && hi > lo)) reasons.push('cost range missing or inverted');
      if (!t.name.trim()) reasons.push('unnamed');
      if (!t.description.trim()) reasons.push('no description');
      if (reasons.length > 0) issues.push({ template: t, reasons });
    }

    const lockedRatio = total === 0 ? 0 : lockedCount / total;
    const newestCustom = customTemplates
      .map((t) => Date.parse(t.createdAt))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => b - a)[0];
    const newestCustomLabel = newestCustom ? relativeAge(new Date(newestCustom).toISOString()) : '—';

    let verdict: Verdict;
    if (total === 0) verdict = 'empty';
    else if (customCount === 0) verdict = 'governed';
    else if (lockedRatio >= 0.6) verdict = 'mixed';
    else verdict = 'custom-heavy';

    return {
      total,
      lockedCount,
      customCount,
      lockedRatio,
      categoryRows,
      issues,
      newestCustomLabel,
      verdict,
    };
  }, [customTemplates]);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Template Governance
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Built-in templates are <em>locked</em> — they back the duplicate path on{' '}
            <em>duplicateProject</em> and cannot be deleted. Custom templates are steward-editable;
            this card audits how many exist, the per-category split, and structural integrity (zone /
            structure / phase / cost-range coverage).
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass(audit.verdict)}`}>
          <span className={css.verdictLabel}>{VERDICT_LABEL[audit.verdict]}</span>
          <span className={css.verdictBlurb}>{VERDICT_BLURB[audit.verdict]}</span>
        </div>
      </header>

      {audit.total === 0 ? (
        <p className={css.empty}>
          No templates registered — neither built-in nor custom. Built-in templates ship with the
          application; if this list is empty, the registry has been intentionally cleared.
        </p>
      ) : (
        <>
          <div className={css.statsRow}>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.total}</span>
              <span className={css.statLabel}>Total</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.lockedCount}</span>
              <span className={css.statLabel}>Locked</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.customCount}</span>
              <span className={css.statLabel}>Custom</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{Math.round(audit.lockedRatio * 100)}%</span>
              <span className={css.statLabel}>Locked share</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.categoryRows.length}</span>
              <span className={css.statLabel}>Categories</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.newestCustomLabel}</span>
              <span className={css.statLabel}>Newest custom</span>
            </div>
          </div>

          <div className={css.block}>
            <h4 className={css.blockTitle}>Category split</h4>
            <ul className={css.catList}>
              {audit.categoryRows.map((row) => (
                <li key={row.key} className={css.catRow}>
                  <span className={css.catLabel}>{CATEGORY_LABEL[row.key]}</span>
                  <span className={css.catTotal}>{row.total}</span>
                  <span className={css.catChips}>
                    {row.locked > 0 && (
                      <span className={`${css.chip} ${css.chipLocked}`}>{row.locked} locked</span>
                    )}
                    {row.custom > 0 && (
                      <span className={`${css.chip} ${css.chipCustom}`}>{row.custom} custom</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {audit.issues.length > 0 ? (
            <div className={`${css.block} ${css.warnBlock}`}>
              <h4 className={css.blockTitle}>Custom-template integrity gaps</h4>
              <ul className={css.issueList}>
                {audit.issues.map((iss) => (
                  <li key={iss.template.id} className={css.issueRow}>
                    <span className={css.issueName}>
                      {iss.template.name.trim() || '(unnamed template)'}
                    </span>
                    <span className={css.issueReasons}>{iss.reasons.join(' · ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : audit.customCount > 0 ? (
            <p className={css.cleanNote}>
              All {audit.customCount} custom template{audit.customCount === 1 ? '' : 's'} pass
              integrity checks (≥{ZONE_MIN} zones · ≥{STRUCTURE_MIN} structures · ≥{PHASE_MIN} phases ·
              valid cost range · named & described).
            </p>
          ) : null}

          <p className={css.footnote}>
            <em>Lock semantics:</em> built-in templates have <em>isBuiltIn=true</em> in the template
            store and are excluded from <em>deleteTemplate</em>. Duplication is the steward's path to
            customise a locked template — clone, rename, then edit. The marketplace tab surfaces
            shared templates separately.
          </p>
        </>
      )}
    </section>
  );
}
