/**
 * AdaptiveDecisionRail — lifecycle-aware right rail.
 *
 * Reads `useSitingEvaluation(project)` for live rule output and the active
 * lifecycle stage from `uiStore.activeDashboardSection` (mapped via
 * `deriveActiveBanner`). Surfaces a capped, readable summary tuned to the
 * stage:
 *
 *   Discover  → candidate / comparison context (placeholder)
 *   Diagnose  → site data + completeness + counts
 *   Design    → top warning + suggested actions
 *   Prove     → top blocking + feasibility teaser
 *   Build     → placeholder (phasing/tasks)
 *   Operate   → placeholder (daily ops)
 *   Report    → placeholder
 *
 * Cap: 1 blocking issue, 3 actions. Empty state when no parcel boundary.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSitingEvaluation, type WeightedViolation } from '../../hooks/useSitingEvaluation.js';
import { useUIStore } from '../../store/uiStore.js';
import {
  VerdictCard,
  BlockingIssueCard,
  ScoreMetric,
  type VerdictTone,
} from '../../components/decision/index.js';
import { deriveActiveBanner, type BannerId } from './lifecycle.js';
import css from './AdaptiveDecisionRail.module.css';

const MAX_ACTIONS = 3;

interface AdaptiveDecisionRailProps {
  project: LocalProject;
}

interface VerdictView {
  tone: VerdictTone;
  title: string;
  summary: string;
}

function deriveVerdict(blocking: number, warnings: number): VerdictView {
  if (blocking > 0) {
    return {
      tone: 'blocking',
      title: 'Blocked',
      summary: `${blocking} blocking ${blocking === 1 ? 'issue' : 'issues'} must be resolved before feasibility.`,
    };
  }
  if (warnings > 0) {
    return {
      tone: 'warning',
      title: 'Needs attention',
      summary: `${warnings} ${warnings === 1 ? 'warning' : 'warnings'} flagged. Review to reduce risk before report.`,
    };
  }
  return {
    tone: 'clear',
    title: 'Clear',
    summary: 'All siting rules pass for the current design.',
  };
}

/** Pull up to N unique non-empty suggestion strings, blocking first then warnings. */
function pickActions(blocking: WeightedViolation[], warnings: WeightedViolation[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of [...blocking, ...warnings]) {
    const s = v.suggestion?.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

const STAGE_TITLE: Record<BannerId, string> = {
  discover: 'Discover',
  diagnose: 'Diagnose',
  design: 'Design',
  prove: 'Prove',
  build: 'Build',
  operate: 'Operate',
  report: 'Report',
};

export default function AdaptiveDecisionRail({ project }: AdaptiveDecisionRailProps) {
  const evaluation = useSitingEvaluation(project);
  const activeDashboardSection = useUIStore((s) => s.activeDashboardSection);
  const setActiveDashboardSection = useUIStore((s) => s.setActiveDashboardSection);

  const stage: BannerId = deriveActiveBanner(activeDashboardSection) ?? 'discover';

  const actions = useMemo(
    () => pickActions(evaluation.blocking, evaluation.warnings, MAX_ACTIONS),
    [evaluation.blocking, evaluation.warnings],
  );

  const blockingCount = evaluation.blockingCount;
  const warningCount = evaluation.warnings.length;
  const advisoryCount = evaluation.advisories.length;
  const verdict = deriveVerdict(blockingCount, warningCount);

  const openRules = () => setActiveDashboardSection('siting-rules');
  const openFeasibility = () => setActiveDashboardSection('feasibility');
  const openCompare = () => setActiveDashboardSection('site-intelligence');

  // Empty state — no boundary, no evaluation possible
  if (!project.hasParcelBoundary) {
    return (
      <div className={css.rail}>
        <div className={css.empty} role="status">
          <h3 className={css.emptyTitle}>Awaiting site boundary</h3>
          <p className={css.emptyBody}>
            Define a site boundary to begin evaluating this land.
          </p>
        </div>
      </div>
    );
  }

  const counts = (
    <p className={css.counts} aria-label="Evaluation counts">
      <span className={css.countBlocking}>{blockingCount} Blocking</span>
      <span className={css.dot} aria-hidden>·</span>
      <span className={css.countWarning}>{warningCount} Warnings</span>
      <span className={css.dot} aria-hidden>·</span>
      <span className={css.countAdvisory}>{advisoryCount} Advisory</span>
    </p>
  );

  const actionList = actions.length > 0 && (
    <section className={css.section} aria-label="Suggested actions">
      <h4 className={css.sectionTitle}>Suggested actions</h4>
      <ul className={css.actions}>
        {actions.map((a, i) => (
          <li key={i} className={css.actionItem}>{a}</li>
        ))}
      </ul>
      <button type="button" className={css.viewAll} onClick={openRules}>
        View all
      </button>
    </section>
  );

  const topBlocking = evaluation.blocking[0];
  const topWarning = evaluation.warnings[0];

  const stageBody = (() => {
    switch (stage) {
      case 'discover':
        return (
          <section className={css.section}>
            <h4 className={css.sectionTitle}>Candidates</h4>
            <p className={css.placeholderBody}>
              Compare alternative parcels and shortlists here once candidate workspaces are wired up.
            </p>
            <button type="button" className={css.viewAll} onClick={openCompare}>
              Open Site Intelligence
            </button>
          </section>
        );

      case 'diagnose':
        return (
          <>
            <section className={css.section}>
              <h4 className={css.sectionTitle}>Site data</h4>
              <p className={css.placeholderBody}>
                {evaluation.hasSiteData
                  ? 'Public datasets loaded. Constraint coverage is live.'
                  : 'Fetching public datasets — completeness will refresh shortly.'}
              </p>
            </section>
            {actionList}
          </>
        );

      case 'design':
        return (
          <>
            {topWarning && (
              <section className={css.section}>
                <h4 className={css.sectionTitle}>Top warning</h4>
                <BlockingIssueCard violation={topWarning} />
              </section>
            )}
            {actionList}
          </>
        );

      case 'prove':
        return (
          <>
            {topBlocking && (
              <section className={css.section}>
                <h4 className={css.sectionTitle}>Top blocking</h4>
                <BlockingIssueCard violation={topBlocking} />
              </section>
            )}
            <section className={css.section}>
              <h4 className={css.sectionTitle}>Feasibility</h4>
              <p className={css.placeholderBody}>
                Run feasibility to combine siting verdict, biomass, and economics into a go/no-go.
              </p>
              <button type="button" className={css.viewAll} onClick={openFeasibility}>
                Open Feasibility
              </button>
            </section>
            {actionList}
          </>
        );

      case 'build':
        return (
          <section className={css.section}>
            <h4 className={css.sectionTitle}>Build</h4>
            <p className={css.placeholderBody}>
              Phasing, build order, and task surfaces will live here.
            </p>
          </section>
        );

      case 'operate':
        return (
          <section className={css.section}>
            <h4 className={css.sectionTitle}>Operate</h4>
            <p className={css.placeholderBody}>
              Daily operations — rotations, alerts, ledger entries — will surface here.
            </p>
          </section>
        );

      case 'report':
        return (
          <section className={css.section}>
            <h4 className={css.sectionTitle}>Report</h4>
            <p className={css.placeholderBody}>
              Investor summary and export readiness will surface here.
            </p>
          </section>
        );
    }
  })();

  return (
    <div className={css.rail}>
      <header className={css.stageHeader} aria-label="Active lifecycle stage">
        <span className={css.stageEyebrow}>Lifecycle</span>
        <span className={css.stageName}>{STAGE_TITLE[stage]}</span>
      </header>

      <VerdictCard
        verdict={verdict.tone}
        title={verdict.title}
        summary={verdict.summary}
        blockingCount={blockingCount}
        warningCount={warningCount}
        advisoryCount={advisoryCount}
        primaryAction={evaluation.totalCount > 0 ? { label: 'Open Rules', onClick: openRules } : undefined}
      />

      {counts}

      {stageBody}

      <section className={css.metrics}>
        <ScoreMetric label="Features" value={evaluation.featureCount} tone="neutral" />
        <ScoreMetric
          label="Blocking"
          value={blockingCount}
          tone={blockingCount > 0 ? 'error' : 'success'}
        />
        <ScoreMetric
          label="Warnings"
          value={warningCount}
          tone={warningCount > 0 ? 'warning' : 'success'}
        />
        <ScoreMetric
          label="Site data"
          value={evaluation.hasSiteData ? 'Loaded' : 'Pending'}
          tone={evaluation.hasSiteData ? 'success' : 'info'}
        />
      </section>
    </div>
  );
}
