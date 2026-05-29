// ProjectUrgencyCard.tsx
//
// A single project card on Portfolio Home (Phase 5, Slice 5.3). Renders the
// project name, a "Finish setup" badge when the wizard hasn't finished, and
// chips for each non-zero urgency reason from the breakdown. The score
// itself is never displayed per the urgency-engine docstring contract:
//
//   "The number is an ordering signal only — the UI surfaces the
//    underlying reasons (divergences, stale domains, drafts) directly
//    rather than ever rendering the score."
//
// Tapping the card navigates to Per-Project Home at
// `/v3/project/$id/home` (Slice 5.4 repoint).

import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Clock, RefreshCw, Sprout } from 'lucide-react';
import type { ProjectUrgencyResult, ProjectRole } from '@ogden/shared';
import { BentoBox } from '../../components/ui/BentoBox.js';
import type { LocalProject } from '../../store/projectStore.js';
import { buildUrgencyChips } from '../home/urgencyChips.js';
import css from './PortfolioHomePage.module.css';

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

export interface ProjectUrgencyCardProps {
  project: LocalProject;
  urgency: ProjectUrgencyResult | undefined;
  role?: ProjectRole;
}

export default function ProjectUrgencyCard({
  project,
  urgency,
  role,
}: ProjectUrgencyCardProps) {
  const navigate = useNavigate();
  const roleLabel = role ? ROLE_BADGE_LABEL[role] : undefined;
  const draftWizard = urgency?.breakdown.draftWizard ?? false;
  const chips = buildUrgencyChips(urgency);
  const allClear = !draftWizard && chips.length === 0;

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
      padding="md"
      className={css.card}
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
      <BentoBox.Header className={css.cardHeader}>
        <div className={css.titleBlock}>
          <h3 className={css.cardTitle}>{project.name}</h3>
          {project.description ? (
            <p className={css.cardSubtitle}>{project.description}</p>
          ) : null}
        </div>
        {draftWizard ? (
          <span className={css.finishSetupBadge}>
            <Sprout size={12} aria-hidden /> Finish setup
          </span>
        ) : null}
        {roleLabel ? <span className={css.roleBadge}>{roleLabel}</span> : null}
      </BentoBox.Header>

      <BentoBox.Body className={css.cardBody}>
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
      </BentoBox.Body>
    </BentoBox>
  );
}
