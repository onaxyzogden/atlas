/**
 * WizardStepRouter — Phase 2 / Slices 2.1.g + 2.2.
 *
 * Resume entry for `/v3/project/$projectId/wizard/$step`. Project record
 * exists by this point (created on Step 1 "Next"). Switches on `$step`:
 *
 *   vision   → WizardStep2Vision  (Slice 2.2)
 *   team     → WizardStep3Team    (placeholder until Slice 2.3)
 *   complete → WizardCompletionScreen (placeholder until Slice 2.3)
 *
 * If the wizard is already `complete`, redirect to the project's Plan
 * route — there's nothing to resume. If `$step` is unrecognised, fall
 * back to vision (the first step after Step 1's pre-project Site).
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useProjectStore } from '../../store/projectStore.js';
import ProjectWizardShell, {
  type WizardStepId,
} from './ProjectWizardShell.js';
import WizardStep2Vision from './WizardStep2Vision.js';

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

  // If wizard already finished, the project has graduated to Plan. Bounce
  // there rather than rendering an empty resume surface.
  useEffect(() => {
    if (project && wizardStatus === 'complete') {
      navigate({
        to: '/v3/project/$projectId/plan',
        params: { projectId },
      });
    }
  }, [project, wizardStatus, projectId, navigate]);

  if (!project) {
    return (
      <ProjectWizardShell step="site">
        <div style={{ padding: 24 }}>
          <p style={{ color: 'var(--text-muted, #8a8275)' }}>
            Project not found.
          </p>
        </div>
      </ProjectWizardShell>
    );
  }

  if (wizardStatus === 'complete') {
    // Effect above redirects; render nothing so we don't flash content.
    return null;
  }

  const step: WizardStepId | 'complete' = isRecognisedStep(stepParam)
    ? stepParam
    : 'vision';

  // Step 2 ships live in Slice 2.2; Step 3 + completion remain
  // placeholders until Slice 2.3. The shell stays mounted around the
  // placeholders so step indicator + footer are testable today.
  if (step === 'vision') {
    return <WizardStep2Vision projectId={projectId} />;
  }

  if (step === 'team') {
    return (
      <ProjectWizardShell
        step="team"
        onBack={() =>
          navigate({
            to: '/v3/project/$projectId/wizard/$step',
            params: { projectId, step: 'vision' },
          })
        }
        onNext={() =>
          navigate({
            to: '/v3/project/$projectId/wizard/$step',
            params: { projectId, step: 'complete' },
          })
        }
        nextLabel="Finish"
        hint="Team step lands in Slice 2.3"
      >
        <div style={{ padding: 24, color: 'var(--text-muted, #8a8275)' }}>
          <p>Step 3 (Team) lands in Slice 2.3.</p>
        </div>
      </ProjectWizardShell>
    );
  }

  // step === 'complete'
  return (
    <ProjectWizardShell step="team">
      <div style={{ padding: 24, color: 'var(--text-muted, #8a8275)' }}>
        <p>Completion screen lands in Slice 2.3.</p>
      </div>
    </ProjectWizardShell>
  );
}
