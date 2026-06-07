/**
 * WizardStep2Vision — Phase 2 / Slice 2.2 + Sub-slice E.2.
 *
 * Step 2 ("Project Type & Vision") of the Project Creation Wizard. Two
 * sections stacked in the left-third form column, with the Step-1 boundary
 * thumbnail filling the right two-thirds:
 *
 *   Section A (required) — primary project type, optional compatible
 *     secondary layers, and an advisory design-tension acknowledgement.
 *     Selections write straight to `project.metadata.projectTypeRecord`
 *     (durable draft; the resolution engine reads it on the fly).
 *
 * State source of truth: the project metadata. Section A writes are
 * immediate (selections are infrequent). The "Next" handler stamps
 * wizardLastStep='vision' and routes to Step 3. Next is disabled until a
 * primary type is chosen (project type is required, per Wizard Spec v1.1).
 */

import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type {
  ProjectTypeId,
  ProjectTypeRecord,
  TensionAck,
} from '@ogden/shared';
import { getActiveTensions, isCompatibleSecondary } from '@ogden/shared';
import {
  useProjectStore,
  recordFromBareProjectType,
} from '../../store/projectStore.js';
import ProjectWizardShell from './ProjectWizardShell.js';
import WizardMapThumbnail from './WizardMapThumbnail.js';
import WizardProjectTypeGrid from './WizardProjectTypeGrid.js';
import WizardSecondaryPicker from './WizardSecondaryPicker.js';
import WizardTensionPanel from './WizardTensionPanel.js';
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

  // --- Section A: project type record (durable draft) -------------------
  const typeRecord = project?.metadata?.projectTypeRecord;
  // Legacy/seeded projects carry a bare `projectType` string but no record.
  // Derive a materializable record from it (only when no record exists yet) so
  // the grid shows the type preselected and the secondary picker opens WITHOUT
  // forcing the steward to re-pick the primary first. The derived record is not
  // written until the steward actually acts (select / toggle / acknowledge);
  // the handlers below use it as their base — lazy-materialize, no write-on-mount.
  const derivedRecord = useMemo(
    () => (typeRecord ? null : recordFromBareProjectType(project?.projectType)),
    [typeRecord, project?.projectType],
  );
  // Effective selection: the durable record wins; otherwise the bare-string
  // derivation. Null only when the project genuinely has no resolvable primary.
  const primaryTypeId = typeRecord?.primaryTypeId ?? derivedRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = useMemo<readonly ProjectTypeId[]>(
    () => typeRecord?.secondaryTypeIds ?? [],
    [typeRecord?.secondaryTypeIds],
  );
  const acknowledgedTensionIds = useMemo<readonly string[]>(
    () => (typeRecord?.tensionAcknowledgements ?? []).map((a) => a.tensionId),
    [typeRecord?.tensionAcknowledgements],
  );
  const activeTensions = useMemo(
    () => (primaryTypeId ? getActiveTensions(primaryTypeId, secondaryTypeIds) : []),
    [primaryTypeId, secondaryTypeIds],
  );

  // Single write path so every record mutation spreads existing metadata
  // (updateProject replaces metadata wholesale) and re-stamps the step.
  const writeRecord = useCallback(
    (next: ProjectTypeRecord) => {
      if (!project) return;
      updateProject(project.id, {
        metadata: {
          ...(project.metadata ?? {}),
          projectTypeRecord: next,
          wizardLastStep: 'vision',
        },
      });
    },
    [project, updateProject],
  );

  const handleSelectPrimary = useCallback(
    (id: ProjectTypeId) => {
      // Base on the durable record, or the bare-string derivation for a legacy
      // project that has yet to materialize one.
      const base = project?.metadata?.projectTypeRecord ?? derivedRecord;
      // Dropping a primary for one that doesn't support a chosen secondary
      // must prune that secondary, or the record carries an invalid pairing.
      const keptSecondaries = (base?.secondaryTypeIds ?? []).filter((s) =>
        isCompatibleSecondary(s, id),
      );
      writeRecord({
        primaryTypeId: id,
        secondaryTypeIds: keptSecondaries,
        tensionAcknowledgements: base?.tensionAcknowledgements ?? [],
        versionHistory: base?.versionHistory ?? [],
        reopeningAcknowledgements: base?.reopeningAcknowledgements ?? [],
      });
    },
    [project?.metadata?.projectTypeRecord, derivedRecord, writeRecord],
  );

  const handleToggleSecondary = useCallback(
    (id: ProjectTypeId) => {
      // A legacy bare-string project has no record yet — materialize from the
      // derived base on first toggle so secondaries can be added without the
      // steward first re-picking the primary.
      const base = project?.metadata?.projectTypeRecord ?? derivedRecord;
      if (!base) return; // no primary derivable yet
      const has = base.secondaryTypeIds.includes(id);
      const nextSecondaries = has
        ? base.secondaryTypeIds.filter((s) => s !== id)
        : base.secondaryTypeIds.length >= 8
          ? base.secondaryTypeIds
          : [...base.secondaryTypeIds, id];
      writeRecord({ ...base, secondaryTypeIds: nextSecondaries });
    },
    [project?.metadata?.projectTypeRecord, derivedRecord, writeRecord],
  );

  const handleAcknowledgeTensions = useCallback(() => {
    const existing = project?.metadata?.projectTypeRecord ?? derivedRecord;
    if (!existing) return;
    const active = getActiveTensions(
      existing.primaryTypeId,
      existing.secondaryTypeIds,
    );
    const ackedIds = new Set(
      existing.tensionAcknowledgements.map((a) => a.tensionId),
    );
    const now = new Date().toISOString();
    const newAcks: TensionAck[] = active
      .filter((t) => !ackedIds.has(t.id))
      .map((t) => ({ tensionId: t.id, acknowledgedAt: now }));
    if (newAcks.length === 0) return;
    writeRecord({
      ...existing,
      tensionAcknowledgements: [
        ...existing.tensionAcknowledgements,
        ...newAcks,
      ],
    });
  }, [project?.metadata?.projectTypeRecord, derivedRecord, writeRecord]);

  const advance = useCallback(() => {
    if (!project) return;
    // Make sure wizardLastStep is recorded even if the steward made no edits
    // (Next-without-changes path).
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
      nextDisabled={!primaryTypeId}
      hint={
        primaryTypeId
          ? 'Vision details are optional - you can refine them later'
          : 'Select a project type to continue'
      }
    >
      <div className={styles.layout}>
        <aside className={styles.form} aria-label="Project type and vision form">
          <h1 className={styles.title}>What kind of land project is this?</h1>
          <p className={styles.subtitle}>
            Pick the primary purpose - this sets the objectives you will plan
            against. You can layer compatible secondary uses on top.
          </p>
          <div className={styles.bento}>
            <WizardProjectTypeGrid
              selectedId={primaryTypeId}
              onSelect={handleSelectPrimary}
            />
          </div>

          {primaryTypeId && (
            <div className={styles.bento}>
              <div className={styles.subsection}>
                <h2 className={styles.subheading}>Secondary layers (optional)</h2>
                <WizardSecondaryPicker
                  primaryId={primaryTypeId}
                  selectedIds={secondaryTypeIds}
                  onToggle={handleToggleSecondary}
                />
              </div>
            </div>
          )}

          {activeTensions.length > 0 && (
            <WizardTensionPanel
              tensions={activeTensions}
              acknowledgedTensionIds={acknowledgedTensionIds}
              onAcknowledge={handleAcknowledgeTensions}
            />
          )}
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
