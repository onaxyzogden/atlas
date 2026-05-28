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
// Tapping the card navigates to the project's existing entry point. Slice
// 5.4 (Per-Project Home) will repoint that to `/v3/project/$id/home`.

import { useNavigate } from '@tanstack/react-router';
import { AlertTriangle, Clock, RefreshCw, Sprout } from 'lucide-react';
import type { ProjectUrgencyResult } from '@ogden/shared';
import { BentoBox } from '../../components/ui/BentoBox.js';
import type { LocalProject } from '../../store/projectStore.js';
import css from './PortfolioHomePage.module.css';

export interface ProjectUrgencyCardProps {
  project: LocalProject;
  urgency: ProjectUrgencyResult | undefined;
}

interface Chip {
  key: string;
  label: string;
  tone: 'critical' | 'high' | 'foundation' | 'cadence' | 'info';
}

function buildChips(urgency: ProjectUrgencyResult | undefined): Chip[] {
  if (!urgency) return [];
  const b = urgency.breakdown;
  const chips: Chip[] = [];

  if (b.divergencesCritical > 0) {
    chips.push({
      key: 'divergencesCritical',
      label: `${b.divergencesCritical} critical divergence${b.divergencesCritical === 1 ? '' : 's'}`,
      tone: 'critical',
    });
  }
  if (b.divergencesHigh > 0) {
    chips.push({
      key: 'divergencesHigh',
      label: `${b.divergencesHigh} high divergence${b.divergencesHigh === 1 ? '' : 's'}`,
      tone: 'high',
    });
  }
  if (b.staleFoundationDomains > 0) {
    chips.push({
      key: 'staleFoundationDomains',
      label: `${b.staleFoundationDomains} stale foundation domain${b.staleFoundationDomains === 1 ? '' : 's'}`,
      tone: 'foundation',
    });
  }
  if (b.ageingFoundationDomains > 0) {
    chips.push({
      key: 'ageingFoundationDomains',
      label: `${b.ageingFoundationDomains} ageing foundation domain${b.ageingFoundationDomains === 1 ? '' : 's'}`,
      tone: 'cadence',
    });
  }
  if (b.cyclicalReviewsDue > 0) {
    chips.push({
      key: 'cyclicalReviewsDue',
      label: `${b.cyclicalReviewsDue} cyclical review${b.cyclicalReviewsDue === 1 ? '' : 's'} due`,
      tone: 'cadence',
    });
  }
  if (b.blockedFieldActions > 0) {
    chips.push({
      key: 'blockedFieldActions',
      label: `${b.blockedFieldActions} blocked field action${b.blockedFieldActions === 1 ? '' : 's'}`,
      tone: 'high',
    });
  }
  if (b.pendingVerifications > 0) {
    chips.push({
      key: 'pendingVerifications',
      label: `${b.pendingVerifications} pending verification${b.pendingVerifications === 1 ? '' : 's'}`,
      tone: 'info',
    });
  }
  if (b.inactivityDays > 0) {
    chips.push({
      key: 'inactivityDays',
      label:
        b.inactivityDays === 1
          ? '1 day inactive'
          : `${b.inactivityDays}${b.inactivityDays >= 14 ? '+' : ''} days inactive`,
      tone: 'info',
    });
  }

  return chips;
}

export default function ProjectUrgencyCard({
  project,
  urgency,
}: ProjectUrgencyCardProps) {
  const navigate = useNavigate();
  const draftWizard = urgency?.breakdown.draftWizard ?? false;
  const chips = buildChips(urgency);
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
      to: '/v3/project/$projectId',
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
