/**
 * ThreeEthicsRollupCard — Plan Module 8 (Principle Verification), card 2/2.
 *
 * Per Permaculture Scholar verdict 2026-05-07
 * (`wiki/decisions/2026-05-07-atlas-plan-principles-scholar-keep-atlas.md`):
 * "Permaculture is fundamentally an ethically based design system" with
 * the three ethics (Earth Care, People Care, Fair Share) at its core, and
 * the 12 Holmgren principles serve the ethics. Atlas's existing
 * HolmgrenChecklistCard captures principle-level reflection; this
 * additive card rolls those reflections up to the three-Ethics layer
 * the Scholar required.
 *
 * The card reads from `principleCheckStore.byProject[projectId]` (no
 * new persistence) and PERMACULTURE_ETHICS (data/holmgrenPrinciples.ts)
 * which maps each principle to a primary ethic. For each ethic it
 * surfaces:
 *   - the constituent principles + their per-principle status
 *   - a per-ethic health pill (met / partial / unmet running counts)
 *   - a coverage hint when an ethic has zero met principles
 *
 * Source: NotebookLM Permaculture Scholar (5aa3dcf3-…), 2026-05-07.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  HOLMGREN_PRINCIPLES,
  PERMACULTURE_ETHICS,
  type PermacultureEthicDef,
} from '../../../../data/holmgrenPrinciples.js';
import {
  usePrincipleCheckStore,
  type PrincipleStatus,
} from '../../../../store/principleCheckStore.js';
import { usePrincipleEvidenceVisibleIds } from './usePrincipleEvidenceVisibleIds.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const STATUS_LABEL: Record<PrincipleStatus, string> = {
  unmet: 'Unmet',
  partial: 'Partial',
  met: 'Met',
};

interface EthicRollup {
  ethic: PermacultureEthicDef;
  rows: Array<{ id: string; number: number; title: string; status: PrincipleStatus; linkCount: number }>;
  met: number;
  partial: number;
  unmet: number;
  total: number;
  /** Sum of linked-feature counts across this ethic's principles. */
  evidenceLinks: number;
  /** Number of principles with at least one linked feature. */
  evidencedPrinciples: number;
}

export default function ThreeEthicsRollupCard({ project }: Props) {
  const byProject = usePrincipleCheckStore((s) => s.byProject);
  const checks = useMemo(() => byProject[project.id] ?? {}, [byProject, project.id]);

  // Evidence depth is capped to features visible at the active year
  // scrubber position: phase-tagged features (water nodes, paddocks,
  // fertility infra) drop out when their BuildPhase's `yeomansCap`
  // exceeds `yeomansCapForYear(currentYear)`. The steward's `linkedFeatureIds`
  // narrative is preserved untouched — only the *count* shown here
  // reflects the view. See
  // wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md.
  const { visibleIds } = usePrincipleEvidenceVisibleIds(project.id);

  const rollups: EthicRollup[] = useMemo(() => {
    return PERMACULTURE_ETHICS.map((ethic) => {
      const rows = ethic.principleIds.map((pid) => {
        const principle = HOLMGREN_PRINCIPLES.find((p) => p.id === pid);
        const status: PrincipleStatus = checks[pid]?.status ?? 'unmet';
        const linked = checks[pid]?.linkedFeatureIds ?? [];
        const linkCount = linked.filter((id) => visibleIds.has(id)).length;
        return {
          id: pid,
          number: principle?.number ?? 0,
          title: principle?.title ?? pid,
          status,
          linkCount,
        };
      });
      const met = rows.filter((r) => r.status === 'met').length;
      const partial = rows.filter((r) => r.status === 'partial').length;
      const unmet = rows.length - met - partial;
      const evidenceLinks = rows.reduce((s, r) => s + r.linkCount, 0);
      const evidencedPrinciples = rows.filter((r) => r.linkCount > 0).length;
      return { ethic, rows, met, partial, unmet, total: rows.length, evidenceLinks, evidencedPrinciples };
    });
  }, [checks, visibleIds]);

  // Overall health pill: percentage of (met + 0.5*partial) across all 12.
  const overall = useMemo(() => {
    let met = 0, partial = 0;
    for (const r of rollups) {
      met += r.met;
      partial += r.partial;
    }
    const total = HOLMGREN_PRINCIPLES.length;
    const score = total === 0 ? 0 : Math.round(((met + 0.5 * partial) / total) * 100);
    return { met, partial, total, score };
  }, [rollups]);

  function pillClassFor(score: number): string {
    if (score >= 70) return styles.pillMet ?? '';
    if (score >= 30) return styles.pillPartial ?? '';
    return styles.pillUnmet ?? '';
  }

  function statusPillClass(status: PrincipleStatus): string {
    if (status === 'met') return styles.pillMet ?? '';
    if (status === 'partial') return styles.pillPartial ?? '';
    return styles.pillUnmet ?? '';
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 8 · Principle Verification</span>
        <h1 className={styles.title}>Three Ethics rollup</h1>
        <p className={styles.lede}>
          Permaculture's twelve principles serve three ethics. This view
          rolls your principle-by-principle assessment up to Earth Care,
          People Care, and Fair Share so you can see whether the design
          honours all three — not just the ones that came easily. The
          evidence-depth counts reflect only features visible at the
          year scrubber's current position; your status pills and
          linked features themselves are unchanged.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Overall health
          <span className={`${styles.pill} ${pillClassFor(overall.score)}`} style={{ marginLeft: 8 }}>
            {overall.score}%
          </span>
        </h2>
        <div className={styles.statRow}><span>Met</span><span>{overall.met} / {overall.total}</span></div>
        <div className={styles.statRow}><span>Partial</span><span>{overall.partial} / {overall.total}</span></div>
        <div className={styles.statRow}><span>Unmet or unanswered</span><span>{overall.total - overall.met - overall.partial} / {overall.total}</span></div>
      </section>

      {rollups.map(({ ethic, rows, met, partial, unmet, total, evidenceLinks, evidencedPrinciples }) => {
        const score = total === 0 ? 0 : Math.round(((met + 0.5 * partial) / total) * 100);
        return (
          <section key={ethic.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {ethic.label}
              <span className={`${styles.pill} ${pillClassFor(score)}`} style={{ marginLeft: 8 }}>
                {met} met · {partial} partial · {unmet} unmet
              </span>
            </h2>
            <p className={styles.lede} style={{ marginTop: 0 }}>{ethic.blurb}</p>
            <p className={styles.listMeta} style={{ marginTop: 4 }}>
              Evidence depth: {evidenceLinks} linked feature{evidenceLinks === 1 ? '' : 's'} across {evidencedPrinciples} / {total} principle{total === 1 ? '' : 's'}.
            </p>

            {met === 0 && total > 0 && (
              <p className={styles.empty} style={{ marginTop: 0 }}>
                No principles serving <strong>{ethic.label}</strong> are marked Met yet.
                Use the Holmgren checklist to record evidence for at least one of the principles below.
              </p>
            )}

            <ul className={styles.list}>
              {rows.map((row) => (
                <li key={row.id} className={styles.listRow}>
                  <div>
                    <strong>{row.number}. {row.title}</strong>
                    {row.linkCount > 0 && (
                      <span className={styles.listMeta} style={{ marginLeft: 8 }}>
                        · {row.linkCount} linked
                      </span>
                    )}
                  </div>
                  <span className={`${styles.pill} ${statusPillClass(row.status)}`}>
                    {STATUS_LABEL[row.status]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
