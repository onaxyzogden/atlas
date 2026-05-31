// ProjectUrgencyCard.tsx
//
// A single project card on the Portfolio Dashboard (OLOS Portfolio Home Spec
// §3.3). P7 revamp: the card now carries the full §3.3 composition — a stage
// colour bar, serif name, primary/secondary type badges, stage + active
// stratum with a Plan-progress bar, a last-activity line, the alert badges
// (the urgency chips, preserved from Phase 5), the area, and an explicit Open
// CTA. The urgency *score* is still never displayed (ordering signal only):
//
//   "The number is an ordering signal only — the UI surfaces the
//    underlying reasons (divergences, stale domains, drafts) directly
//    rather than ever rendering the score."
//
// Stage + Plan-progress are computed once in the parent (usePortfolioStages /
// usePortfolioPlanProgress) and passed in as props so the grid never runs a
// hook per card. Tapping the card (or the Open CTA) navigates to Per-Project
// Home, or resumes the wizard when setup is unfinished.

import { useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  RefreshCw,
  Sprout,
} from 'lucide-react';
import type { ProjectUrgencyResult, ProjectRole } from '@ogden/shared';
import { BentoBox } from '../../components/ui/BentoBox.js';
import type { LocalProject } from '../../store/projectStore.js';
import { buildUrgencyChips } from '../home/urgencyChips.js';
import {
  STAGE_PAINT,
  projectAreaLabel,
  projectTypeBadges,
  type PortfolioStage,
} from './portfolioModel.js';
import type { PortfolioPlanProgress } from './usePortfolioPlanProgress.js';
import css from './ProjectUrgencyCard.module.css';

// Non-steward roles get a badge; owner / primary_steward are omitted (the
// portfolio belongs to the steward, so their own projects carry no badge).
const ROLE_BADGE_LABEL: Partial<Record<ProjectRole, string>> = {
  designer: 'Designer',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
  team_member: 'Team',
  contractor: 'Contractor',
  landowner: 'Landowner',
};

function lastActivityLabel(days: number | undefined): string | null {
  if (days == null || !Number.isFinite(days)) return null;
  if (days <= 0) return 'Active today';
  if (days === 1) return 'Active yesterday';
  return `Active ${days} days ago`;
}

export interface ProjectUrgencyCardProps {
  project: LocalProject;
  urgency: ProjectUrgencyResult | undefined;
  /** Live-data §2.6 stage (usePortfolioStages) — drives the colour bar + pill. */
  stage: PortfolioStage;
  /** Live-data Plan progress (usePortfolioPlanProgress) — stratum + bar. */
  planProgress?: PortfolioPlanProgress;
  role?: ProjectRole;
}

export default function ProjectUrgencyCard({
  project,
  urgency,
  stage,
  planProgress,
  role,
}: ProjectUrgencyCardProps) {
  const navigate = useNavigate();
  const roleLabel = role ? ROLE_BADGE_LABEL[role] : undefined;
  const draftWizard = urgency?.breakdown.draftWizard ?? false;
  const chips = buildUrgencyChips(urgency);
  const allClear = !draftWizard && chips.length === 0;

  const paint = STAGE_PAINT[stage];
  const { primary, secondary } = projectTypeBadges(project);
  const activity = lastActivityLabel(urgency?.breakdown.inactivityDays);

  const stratumLabel =
    planProgress && planProgress.activeStratumOrdinal != null
      ? `S${planProgress.activeStratumOrdinal} — ${planProgress.activeStratumTitle}`
      : planProgress?.allComplete
        ? 'All strata complete'
        : 'Plan not started';
  const showProgress = (planProgress?.objectivesTotal ?? 0) > 0;

  const handleOpen = () => {
    if (draftWizard) {
      // Resume at the wizard step the user left off, defaulting to vision.
      const step = project.metadata?.wizardLastStep ?? 'vision';
      navigate({
        to: '/v3/project/$projectId/wizard/$step',
        params: { projectId: project.id, step },
      });
      return;
    }
    navigate({
      to: '/v3/project/$projectId/home',
      params: { projectId: project.id },
    });
  };

  return (
    <BentoBox
      outer="elevated"
      padding="none"
      className={css.card}
      style={{ ['--stage-color' as string]: paint.color }}
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpen();
        }
      }}
      aria-label={`Open ${project.name}`}
    >
      <div className={css.stageBar} aria-hidden />
      <div className={css.inner}>
        {/* ---- Header: name + type badges · status badges ----------------- */}
        <header className={css.header}>
          <div className={css.titleBlock}>
            <h3 className={css.name}>{project.name}</h3>
            {primary || secondary.length > 0 ? (
              <div className={css.typeBadges}>
                {primary ? (
                  <span className={`${css.typeBadge} ${css.typePrimary}`}>
                    {primary.label}
                  </span>
                ) : null}
                {secondary.map((t) => (
                  <span
                    key={t.id}
                    className={`${css.typeBadge} ${css.typeSecondary}`}
                  >
                    {t.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className={css.headerMeta}>
            {draftWizard ? (
              <span className={css.finishSetupBadge}>
                <Sprout size={12} aria-hidden /> Finish setup
              </span>
            ) : null}
            {roleLabel ? <span className={css.roleBadge}>{roleLabel}</span> : null}
          </div>
        </header>

        {/* ---- Stage & stratum + Plan progress --------------------------- */}
        <div className={css.stageRow}>
          <span className={`${css.stagePill} ${css[`stage-${stage}`]}`}>
            {paint.label}
          </span>
          <span className={css.stratumLabel}>{stratumLabel}</span>
        </div>
        {showProgress ? (
          <div className={css.progressBlock}>
            <div
              className={css.progressTrack}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={planProgress?.pct ?? 0}
              aria-label="Plan objectives complete"
            >
              <div
                className={css.progressFill}
                style={{ width: `${planProgress?.pct ?? 0}%` }}
              />
            </div>
            <span className={css.progressCaption}>
              {planProgress?.objectivesComplete}/{planProgress?.objectivesTotal}{' '}
              objectives
            </span>
          </div>
        ) : null}

        {/* ---- Last activity --------------------------------------------- */}
        {activity ? (
          <p className={css.activity}>
            <Clock size={12} aria-hidden /> {activity}
          </p>
        ) : null}

        {/* ---- Alert badges ---------------------------------------------- */}
        {allClear ? (
          <p className={css.allClear}>No urgent signals. Land is steady.</p>
        ) : (
          <ul className={css.chipList}>
            {chips.map((chip) => (
              <li
                key={chip.key}
                className={`${css.chip} ${css[`chip-${chip.tone}`]}`}
              >
                {chip.tone === 'critical' || chip.tone === 'high' ? (
                  <AlertTriangle size={12} aria-hidden />
                ) : chip.tone === 'cadence' ? (
                  <RefreshCw size={12} aria-hidden />
                ) : (
                  <Clock size={12} aria-hidden />
                )}
                {chip.label}
              </li>
            ))}
          </ul>
        )}

        {/* ---- Footer: area + Open CTA ----------------------------------- */}
        <footer className={css.footer}>
          <span className={css.area}>{projectAreaLabel(project)}</span>
          <button
            type="button"
            className={css.openBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
          >
            {draftWizard ? 'Finish setup' : 'Open'}
            <ArrowRight size={13} aria-hidden />
          </button>
        </footer>
      </div>
    </BentoBox>
  );
}
