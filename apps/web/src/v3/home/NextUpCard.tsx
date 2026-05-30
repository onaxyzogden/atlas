// NextUpCard.tsx
//
// Per-Project Home (Slice 5.4) — surfaces the steward's single most
// important next action. Priority order, in line with the urgency engine
// docstring contract:
//
//   1. draftWizard       -> resume wizard at last step
//   2. blockedFieldActions or divergencesCritical/High -> open Act View B
//   3. cyclicalReviewsDue -> open Plan (tier shell)
//   4. fall back to fieldActionStore.getNextUpForProject(projectId)
//      (in-progress / pending-review / lowest-tier-not-started) and
//      route to the matching Act View A.
//   5. truly clear -> empty-state copy, no CTA. Steward can still navigate
//      via the Stage Status Row or page header.
//
// The component does NOT render the urgency score itself. It only reads
// the breakdown channels to decide which action to surface — same rule
// as Portfolio Home's chips.

import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Sparkles, Wrench, RefreshCw, AlertTriangle } from 'lucide-react';
import type { ProjectUrgencyResult } from '@ogden/shared';
import { BentoBox } from '../../components/ui/BentoBox.js';
import { useFieldActionStore } from '../../store/fieldActionStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import css from './PerProjectHomePage.module.css';

export interface NextUpCardProps {
  project: LocalProject;
  urgency: ProjectUrgencyResult | undefined;
}

type NextUpKind =
  | 'draft'
  | 'divergence'
  | 'blocked'
  | 'review'
  | 'field-action'
  | 'clear';

interface NextUpResolution {
  kind: NextUpKind;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  to: string;
  params: Record<string, string>;
}

function pickNextUp(
  project: LocalProject,
  urgency: ProjectUrgencyResult | undefined,
  nextFieldActionTitle: string | undefined,
  nextFieldActionObjectiveId: string | undefined,
): NextUpResolution {
  const b = urgency?.breakdown;

  if (b?.draftWizard) {
    const step = project.metadata?.wizardLastStep ?? 'vision';
    return {
      kind: 'draft',
      label: 'Finish setup',
      title: 'Resume the project wizard',
      description:
        'Your project is part-way through setup. Continue where you left off so Plan can light up with grounded T0 evidence.',
      ctaLabel: 'Resume wizard',
      to: '/v3/project/$projectId/wizard/$step',
      params: { projectId: project.id, step },
    };
  }

  if ((b?.divergencesCritical ?? 0) > 0 || (b?.divergencesHigh ?? 0) > 0) {
    const count =
      (b?.divergencesCritical ?? 0) + (b?.divergencesHigh ?? 0);
    return {
      kind: 'divergence',
      label: 'Reality diverged',
      title: `${count} field divergence${count === 1 ? '' : 's'} to review`,
      description:
        'A field action captured something the plan did not anticipate. Open Act to triage the divergence and decide if a Plan revision is in order.',
      ctaLabel: 'Open Act',
      to: '/v3/project/$projectId/act/field-action',
      params: { projectId: project.id },
    };
  }

  if ((b?.blockedFieldActions ?? 0) > 0) {
    const count = b!.blockedFieldActions;
    return {
      kind: 'blocked',
      label: 'Unblock fieldwork',
      title: `${count} blocked field action${count === 1 ? '' : 's'}`,
      description:
        'Work on the land is paused. Open Act to clear the blocker (access, weather, resources, or a different sequence).',
      ctaLabel: 'Open Act',
      to: '/v3/project/$projectId/act/field-action',
      params: { projectId: project.id },
    };
  }

  if ((b?.cyclicalReviewsDue ?? 0) > 0) {
    const count = b!.cyclicalReviewsDue;
    return {
      kind: 'review',
      label: 'Review decisions',
      title: `${count} cyclical review${count === 1 ? '' : 's'} due`,
      description:
        'A decision you locked earlier is up for review. Confirm it still holds or revise it with the new evidence you have.',
      ctaLabel: 'Open Plan',
      to: '/v3/project/$projectId/plan',
      params: { projectId: project.id },
    };
  }

  if (nextFieldActionTitle && nextFieldActionObjectiveId) {
    return {
      kind: 'field-action',
      label: 'Next on the land',
      title: nextFieldActionTitle,
      description:
        'This is the lowest-tier task ready to start. Open the objective in Act to capture proof on the land.',
      ctaLabel: 'Open task',
      to: '/v3/project/$projectId/act/field-action/$objectiveId',
      params: {
        projectId: project.id,
        objectiveId: nextFieldActionObjectiveId,
      },
    };
  }

  return {
    kind: 'clear',
    label: 'All clear',
    title: 'Nothing urgent — land is steady.',
    description:
      'No divergences, no blocked work, no reviews due. Browse the stages below when you are ready to plan a next move.',
    ctaLabel: '',
    to: '/v3/project/$projectId/plan',
    params: { projectId: project.id },
  };
}

function KindIcon({ kind }: { kind: NextUpKind }) {
  switch (kind) {
    case 'draft':
      return <Sparkles size={12} aria-hidden />;
    case 'divergence':
      return <AlertTriangle size={12} aria-hidden />;
    case 'blocked':
      return <Wrench size={12} aria-hidden />;
    case 'review':
      return <RefreshCw size={12} aria-hidden />;
    case 'field-action':
      return <ArrowRight size={12} aria-hidden />;
    case 'clear':
    default:
      return <Sparkles size={12} aria-hidden />;
  }
}

export default function NextUpCard({ project, urgency }: NextUpCardProps) {
  const navigate = useNavigate();
  const nextAction = useFieldActionStore((s) =>
    s.getNextUpForProject(project.id),
  );

  const resolution = pickNextUp(
    project,
    urgency,
    nextAction?.title,
    nextAction?.planObjectiveId,
  );

  const handleOpen = () => {
    if (resolution.kind === 'clear') return;
    navigate({
      to: resolution.to,
      params: resolution.params,
    } as never);
  };

  return (
    <BentoBox
      outer="elevated"
      padding="md"
      className={css.nextUpCard}
      aria-label="Next up"
    >
      <BentoBox.Header className={css.nextUpHeader}>
        <span className={css.nextUpLabel}>
          <KindIcon kind={resolution.kind} />
          {resolution.label}
        </span>
        {resolution.kind === 'field-action' && nextAction ? (
          <span className={css.nextUpKind}>
            Stratum {nextAction.stratumId.slice(1).split('-')[0]}
          </span>
        ) : null}
      </BentoBox.Header>

      <BentoBox.Body className={css.nextUpBody}>
        <h2 className={css.nextUpTitle}>{resolution.title}</h2>
        <p className={css.nextUpDescription}>{resolution.description}</p>
        {resolution.kind === 'clear' ? null : (
          <button
            type="button"
            className={css.nextUpCta}
            onClick={handleOpen}
          >
            {resolution.ctaLabel}
            <ArrowRight size={14} aria-hidden />
          </button>
        )}
      </BentoBox.Body>
    </BentoBox>
  );
}
