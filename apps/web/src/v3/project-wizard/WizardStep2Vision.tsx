/**
 * WizardStep2Vision — Phase 2 / Slice 2.2.
 *
 * Step 2 ("Vision & Capacity") of the Project Creation Wizard. Form-
 * dominant split: left-third inputs (land-use goals, budget, labour,
 * timeline, optional vision statement), right two-thirds map thumbnail
 * fitted to the boundary captured on Step 1.
 *
 * State source of truth: `project.metadata.visionProfile`. Every chip /
 * textarea change writes through to it via `updateProject` (debounced
 * 300 ms in the textarea, immediate for chips). The wizard's "Next"
 * handler flushes any pending writes, stamps wizardLastStep='vision',
 * and routes to Step 3. "Skip for now" performs the same advance
 * without modifying the profile (per spec §7.2).
 */

import { useCallback, useMemo, useRef } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { VisionProfile } from '@ogden/shared';
import { useProjectStore } from '../../store/projectStore.js';
import ProjectWizardShell from './ProjectWizardShell.js';
import WizardMapThumbnail from './WizardMapThumbnail.js';
import WizardVisionFormFields from './WizardVisionFormFields.js';
import styles from './WizardStep2Vision.module.css';

interface WizardStep2VisionProps {
  /**
   * Forwarded by WizardStepRouter so this component doesn't have to
   * re-derive it from route params.
   */
  projectId: string;
}

export default function WizardStep2Vision({ projectId }: WizardStep2VisionProps) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { projectId?: string };
  const resolvedProjectId = projectId || params.projectId || '';

  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === resolvedProjectId),
  );
  const updateProject = useProjectStore((s) => s.updateProject);
  const flushRef = useRef<(() => void) | null>(null);

  const profile = useMemo<VisionProfile>(
    () => project?.metadata?.visionProfile ?? {},
    [project?.metadata?.visionProfile],
  );

  const handleProfileChange = useCallback(
    (next: VisionProfile) => {
      if (!project) return;
      const stamped: VisionProfile = {
        ...next,
        updatedAt: new Date().toISOString(),
      };
      updateProject(project.id, {
        metadata: {
          ...(project.metadata ?? {}),
          visionProfile: stamped,
          wizardLastStep: 'vision',
        },
      });
    },
    [project, updateProject],
  );

  const advance = useCallback(() => {
    if (!project) return;
    flushRef.current?.();
    // Make sure wizardLastStep is recorded even if the steward made no edits
    // (Next-without-changes path or Skip).
    if (project.metadata?.wizardLastStep !== 'vision') {
      updateProject(project.id, {
        metadata: {
          ...(project.metadata ?? {}),
          wizardLastStep: 'vision',
        },
      });
    }
    navigate({
      to: '/v3/project/$projectId/wizard/$step',
      params: { projectId: project.id, step: 'team' },
    });
  }, [navigate, project, updateProject]);

  const goBack = useCallback(() => {
    // Step 1 lives at the create entry; the project is already saved so
    // going back keeps it intact — the steward can still edit Step 1
    // fields via the project record later. For now, route to Plan as a
    // safe "out", matching the spec's expectation that Step 2 is a
    // one-way advance from Step 1.
    if (!project) {
      navigate({ to: '/v3/project/wizard' });
      return;
    }
    navigate({
      to: '/v3/project/$projectId/plan',
      params: { projectId: project.id },
    });
  }, [navigate, project]);

  if (!project) {
    return (
      <ProjectWizardShell step="vision">
        <div className={styles.empty}>
          <p>Project not found.</p>
        </div>
      </ProjectWizardShell>
    );
  }

  return (
    <ProjectWizardShell
      step="vision"
      onBack={goBack}
      onNext={advance}
      onSkip={advance}
      hint="Optional - skip if you'd rather come back to this"
    >
      <div className={styles.layout}>
        <aside className={styles.form} aria-label="Vision and capacity form">
          <h1 className={styles.title}>What do you want this land to become?</h1>
          <p className={styles.subtitle}>
            A rough sketch is enough. You can refine all of this later in
            the Plan stage.
          </p>
          <WizardVisionFormFields
            profile={profile}
            onChange={handleProfileChange}
            flushRef={flushRef}
          />
        </aside>
        <div className={styles.thumbHost}>
          <WizardMapThumbnail
            boundary={project.parcelBoundaryGeojson}
            projectName={project.name}
          />
        </div>
      </div>
    </ProjectWizardShell>
  );
}
