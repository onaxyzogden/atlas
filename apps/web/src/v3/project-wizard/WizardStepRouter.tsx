/**
 * WizardStepRouter — Phase 2 / Slices 2.1.g + 2.2 + 2.3.
 *
 * Resume entry for `/v3/project/$projectId/wizard/$step`. Project record
 * exists by this point (created on Step 1 "Next"). Switches on `$step`:
 *
 *   vision   → WizardStep2Vision         (Slice 2.2)
 *   team     → WizardStep3Team           (Slice 2.3)
 *   complete → WizardCompletionScreen    (Slice 2.3 — celebration)
 *
 * If the wizard is already `complete` and the URL is NOT the completion
 * step itself, redirect to the project's Plan route — the wizard has
 * graduated to Plan and there's nothing to resume. Visiting
 * `/wizard/complete` after completion is the canonical landing right
 * after Finish, so we don't redirect away from it.
 *
 * If `$step` is unrecognised, fall back to vision (the first step after
 * Step 1's pre-project Site).
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useProjectStore } from '../../store/projectStore.js';
import ProjectWizardShell, {
  type WizardStepId,
} from './ProjectWizardShell.js';
import WizardStep2Vision from './WizardStep2Vision.js';
import WizardStep3Team from './WizardStep3Team.js';
import WizardCompletionScreen from './WizardCompletionScreen.js';

const RECOGNISED_STEPS: ReadonlyArray<WizardStepId | 'complete'> = [
  'vision',
  'team',
  'complete',
];

function isRecognisedStep(value: unknown): value is WizardStepId | 'complete' {
  return (
    typeof value === 'string' &&
    (RECOGNISED_STEPS as ReadonlyArray<string>).includes(value)
  );
}

export default function WizardStepRouter() {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as {
    projectId?: string;
    step?: string;
  };
  const projectId = params.projectId ?? '';
  const stepParam = params.step ?? 'vision';
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const wizardStatus = project?.metadata?.wizardStatus;

  const step: WizardStepId | 'complete' = isRecognisedStep(stepParam)
    ? stepParam
    : 'vision';

  // Wizard already finished AND the URL is a resume step (vision/team).
  // The completion screen is allowed even when status === 'complete' —
  // that's the canonical landing right after Finish.
  useEffect(() => {
    if (project && wizardStatus === 'complete' && step !== 'complete') {
      navigate({
        to: '/v3/project/$projectId/plan',
        params: { projectId },
      });
    }
  }, [project, wizardStatus, step, projectId, navigate]);

  if (!project) {
    return (
      <ProjectWizardShell step="site">
        <div style={{ padding: 24 }}>
          <p style={{ color: 'var(--color-text-muted)' }}>
            Project not found.
          </p>
        </div>
      </ProjectWizardShell>
    );
  }

  if (wizardStatus === 'complete' && step !== 'complete') {
    // Effect above redirects; render nothing so we don't flash content.
    return null;
  }

  if (step === 'vision') {
    return <WizardStep2Vision projectId={projectId} />;
  }

  if (step === 'team') {
    return <WizardStep3Team projectId={projectId} />;
  }

  // step === 'complete'
  return <WizardCompletionScreen projectId={projectId} />;
}
