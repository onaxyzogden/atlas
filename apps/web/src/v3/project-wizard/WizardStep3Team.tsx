/**
 * WizardStep3Team — Phase 2 / Slice 2.3.
 *
 * Step 3 of the Project Creation Wizard: "Who else works on this land?"
 *
 *   - Primary steward (name + email)
 *   - 0+ invite rows (email + role: team_member / contractor / landowner /
 *     reviewer) with inline duplicate-email warning per AC 7.3.
 *   - "Add another" appends a blank row.
 *   - Finish persists to `project.metadata.team`, flips wizardStatus =
 *     'complete', clears wizardLastStep, clears the wizard draft store,
 *     and routes to `/v3/project/$id/wizard/complete` (the celebration
 *     screen).
 *   - "Skip for now" runs the same advance path with whatever was filled
 *     in (or nothing).
 *
 * Sends for queued invites are deferred to Phase 6 — the queue itself is
 * durable from this slice onward.
 */

import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { ProjectTypeVersion } from '@ogden/shared';
import { useProjectStore } from '../../store/projectStore.js';
import { useProjectWizardStore } from '../../store/projectWizardStore.js';
import ProjectWizardShell from './ProjectWizardShell.js';
import WizardMapThumbnail from './WizardMapThumbnail.js';
import TeamInviteRow, { type TeamInviteRowValue } from './TeamInviteRow.js';
import type { TeamInviteRole } from './teamInviteTypes.js';
import styles from './WizardStep3Team.module.css';

interface WizardStep3TeamProps {
  projectId: string;
}

interface PrimaryStewardState {
  name: string;
  email: string;
}

const EMPTY_INVITE: TeamInviteRowValue = { email: '', role: 'team_member' };

// Marks the versionHistory entry stamped when the wizard completes, so a
// repeated finish() (double-click / resume) never appends a duplicate.
const COMPLETION_NOTE = 'wizard completion';

function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export default function WizardStep3Team({ projectId }: WizardStep3TeamProps) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { projectId?: string };
  const resolvedProjectId = projectId || params.projectId || '';

  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === resolvedProjectId),
  );
  const updateProject = useProjectStore((s) => s.updateProject);
  const clearWizardDraft = useProjectWizardStore((s) => s.clear);

  // Hydrate local state from any persisted team payload so a draft
  // resume (URL: /wizard/team after a refresh mid-Step-3) keeps the
  // steward's entries intact.
  const persistedTeam = project?.metadata?.team;
  const [primary, setPrimary] = useState<PrimaryStewardState>({
    name: persistedTeam?.primarySteward?.name ?? '',
    email: persistedTeam?.primarySteward?.email ?? '',
  });
  const [invites, setInvites] = useState<TeamInviteRowValue[]>(
    () =>
      persistedTeam?.queuedInvites?.map((i) => ({
        email: i.email,
        role: i.role as TeamInviteRole,
      })) ?? [],
  );

  const duplicateEmails = useMemo(() => {
    const counts = new Map<string, number>();
    for (const invite of invites) {
      const key = normaliseEmail(invite.email);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const set = new Set<string>();
    for (const [key, count] of counts.entries()) {
      if (count > 1) set.add(key);
    }
    return set;
  }, [invites]);

  const addInvite = useCallback(() => {
    setInvites((current) => [...current, { ...EMPTY_INVITE }]);
  }, []);

  const updateInvite = useCallback(
    (index: number, next: TeamInviteRowValue) => {
      setInvites((current) =>
        current.map((row, i) => (i === index ? next : row)),
      );
    },
    [],
  );

  const removeInvite = useCallback((index: number) => {
    setInvites((current) => current.filter((_, i) => i !== index));
  }, []);

  const finish = useCallback(() => {
    if (!project) return;
    const now = new Date().toISOString();
    const trimmedName = primary.name.trim();
    const trimmedEmail = primary.email.trim();
    const primaryPayload =
      trimmedName || trimmedEmail
        ? {
            primarySteward: {
              ...(trimmedName ? { name: trimmedName } : {}),
              ...(trimmedEmail ? { email: trimmedEmail } : {}),
            },
          }
        : {};
    const queuedInvites = invites
      .map((invite) => ({ email: invite.email.trim(), role: invite.role }))
      .filter((invite) => invite.email.length > 0)
      .map((invite) => ({ ...invite, queuedAt: now }));
    const teamPayload = {
      ...(project.metadata?.team ?? {}),
      ...primaryPayload,
      queuedInvites,
    };

    // Stamp the Step-2 type selection into versionHistory on completion so
    // the resolved objective set has durable provenance (read later by the
    // mid-project reopen modal). On-the-fly resolution (Sub-slice D) renders
    // straight from the record, so there is no separate resolved-set to
    // persist here. Idempotent: a repeated finish() won't append a second
    // completion entry.
    const existingRecord = project.metadata?.projectTypeRecord;
    let nextRecord = existingRecord;
    if (
      existingRecord &&
      !existingRecord.versionHistory.some((v) => v.note === COMPLETION_NOTE)
    ) {
      const completionVersion: ProjectTypeVersion = {
        primaryTypeId: existingRecord.primaryTypeId,
        secondaryTypeIds: existingRecord.secondaryTypeIds,
        changedAt: now,
        note: COMPLETION_NOTE,
      };
      nextRecord = {
        ...existingRecord,
        versionHistory: [...existingRecord.versionHistory, completionVersion],
      };
    }

    updateProject(project.id, {
      metadata: {
        ...(project.metadata ?? {}),
        wizardStatus: 'complete',
        // wizardLastStep is the resume cursor; on completion the screen
        // is the canonical landing so an explicit cursor is no longer
        // meaningful. Leaving it as-is rather than deleting (passthrough
        // metadata isn't sensitive to stale enums) keeps the diff small.
        wizardLastStep: 'team',
        team: teamPayload,
        ...(nextRecord ? { projectTypeRecord: nextRecord } : {}),
      },
    });
    clearWizardDraft();
    navigate({
      to: '/v3/project/$projectId/wizard/$step',
      params: { projectId: project.id, step: 'complete' },
    });
  }, [clearWizardDraft, invites, navigate, primary, project, updateProject]);

  const goBack = useCallback(() => {
    if (!project) return;
    navigate({
      to: '/v3/project/$projectId/wizard/$step',
      params: { projectId: project.id, step: 'vision' },
    });
  }, [navigate, project]);

  if (!project) {
    return (
      <ProjectWizardShell step="team">
        <div className={styles.empty}>
          <p>Project not found.</p>
        </div>
      </ProjectWizardShell>
    );
  }

  return (
    <ProjectWizardShell
      step="team"
      onBack={goBack}
      onNext={finish}
      onSkip={finish}
      nextLabel="Finish"
      hint="Optional - skip if you'd rather come back to this"
    >
      <div className={styles.layout}>
        <aside className={styles.form} aria-label="Team form">
          <h1 className={styles.title}>Who else works on this land?</h1>
          <p className={styles.subtitle}>
            Name the primary steward and queue invites for anyone you want
            to bring in. Invites are stored locally and will be sent when
            the notification system ships.
          </p>

          <div className={styles.bento}>
            <h2 className={styles.sectionLabel}>Primary steward</h2>
            <div className={styles.primaryStewardRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="primary-steward-name">
                  Name
                </label>
                <input
                  id="primary-steward-name"
                  type="text"
                  className={styles.input}
                  value={primary.name}
                  onChange={(e) =>
                    setPrimary((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="primary-steward-email">
                  Email
                </label>
                <input
                  id="primary-steward-email"
                  type="email"
                  className={styles.input}
                  value={primary.email}
                  onChange={(e) =>
                    setPrimary((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          <div className={styles.invitesGroup} aria-label="Pending invites">
            <h2 className={styles.sectionLabel}>Pending invites</h2>
            {invites.length === 0 ? (
              <p className={styles.invitesEmpty}>
                No invites queued yet. Use &ldquo;Add another&rdquo; to
                queue one.
              </p>
            ) : (
              invites.map((invite, index) => {
                const key = normaliseEmail(invite.email);
                return (
                  <TeamInviteRow
                    key={`invite-${index}`}
                    index={index}
                    value={invite}
                    duplicate={key.length > 0 && duplicateEmails.has(key)}
                    onChange={(next) => updateInvite(index, next)}
                    onRemove={() => removeInvite(index)}
                  />
                );
              })
            )}
            <button
              type="button"
              className={styles.addBtn}
              onClick={addInvite}
            >
              + Add another
            </button>
          </div>
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
