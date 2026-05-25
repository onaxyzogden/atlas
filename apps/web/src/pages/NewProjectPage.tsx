/**
 * NewProjectPage — minimal project intake.
 *
 * The old multi-step property wizard (template → name → location → boundary →
 * notes) has been replaced by the Stage Zero Vision Builder: project creation
 * now captures only a name, and the parcel boundary + site context are gathered
 * later (boundary in OBSERVE, vision in the Stage Zero questionnaire).
 *
 * On submit this creates the project locally (always, so the flow works offline
 * / unauthenticated) and — when signed in — mirrors it to the server, honouring
 * the `?prefillTemplate` slug (public template instantiation) and `?orgId`
 * workspace context. It then routes to the Stage Zero Vision Builder.
 *
 * The legacy `features/project/wizard/Step*` components are intentionally
 * preserved on disk; they are no longer mounted here but remain available for
 * reuse in later stages.
 */

import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { useProjectStore } from '../store/projectStore.js';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/apiClient.js';
import { recordShowcaseEvent } from '../showcase/lib/showcaseEventLog.js';
import { OrganizationSwitcherModal } from '../features/organizations/OrganizationSwitcherModal.js';
import styles from './NewProjectPage.module.css';

interface NewProjectSearch {
  prefillTemplate?: string;
  fullSetup?: boolean | string;
  orgId?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  fontSize: 15,
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  fontFamily: 'inherit',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 500,
  color: 'var(--color-text-muted)',
  marginBottom: 6,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
};

export default function NewProjectPage() {
  const search = useSearch({ strict: false }) as NewProjectSearch;
  const navigate = useNavigate();
  const createProject = useProjectStore((s) => s.createProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const defaultOrgId = useAuthStore((s) => s.user?.defaultOrgId ?? null);
  const token = useAuthStore((s) => s.token);

  const prefillTemplate =
    typeof search.prefillTemplate === 'string' && search.prefillTemplate
      ? search.prefillTemplate
      : undefined;
  const fullSetup = search.fullSetup === true || search.fullSetup === 'true';
  const prefillOrgId =
    typeof search.orgId === 'string' && search.orgId ? search.orgId : undefined;

  // Workspace id resolution: explicit URL param → user's default org →
  // undefined (the picker modal forces a choice on the Stewarding path).
  const effectiveOrgId = prefillOrgId ?? defaultOrgId ?? undefined;

  const [name, setName] = useState(
    prefillTemplate === 'ecosystem-farm' ? 'My Ecosystem Farm' : '',
  );
  const [orgId, setOrgId] = useState<string | undefined>(effectiveOrgId);
  const [creating, setCreating] = useState(false);

  // Stewarding-tier handoff (?fullSetup=true) with no explicit ?orgId must
  // pick a workspace before submit.
  const [showOrgModal, setShowOrgModal] = useState<boolean>(
    fullSetup && !prefillOrgId,
  );
  useEffect(() => {
    if (fullSetup && !prefillOrgId && !orgId) setShowOrgModal(true);
  }, [fullSetup, prefillOrgId, orgId]);

  const canSubmit = useMemo(() => name.trim().length > 0 && !creating, [name, creating]);

  const handleCreate = async () => {
    if (!canSubmit) return;
    setCreating(true);
    const trimmed = name.trim();
    const metadata = prefillTemplate
      ? { instantiatedFromTemplate: prefillTemplate }
      : undefined;

    // Local copy first — always created so the flow works offline / unauth.
    const project = createProject({ name: trimmed, metadata });

    // Authenticated: mirror to the server and adopt the server id.
    if (token) {
      try {
        if (prefillTemplate) {
          const { data: serverProject } = await api.templates.instantiatePublic(
            prefillTemplate,
            { name: trimmed, parcelBoundaryGeojson: null, orgId },
          );
          updateProject(project.id, { serverId: serverProject.id });
          recordShowcaseEvent({
            eventType: 'template_instantiated',
            projectId: serverProject.id,
            payload: { template: prefillTemplate },
          });
        } else {
          const { data: serverProject } = await api.projects.create({
            name: trimmed,
            orgId,
          });
          updateProject(project.id, { serverId: serverProject.id });
        }
      } catch {
        // Backend unavailable — local copy is intact, sync retries later.
      }
    }

    navigate({
      to: '/v3/project/$projectId/stage-zero',
      params: { projectId: project.id },
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create New Project</h1>
      </div>

      <div className={styles.content}>
        <div className={styles.card}>
          <p
            style={{
              fontSize: 14,
              color: 'var(--color-text-muted)',
              marginTop: 0,
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            Give your project a name to begin. Next, the Stage Zero Vision
            Builder will help you shape its vision — you’ll draw or import the
            land boundary in the Observe stage.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreate();
            }}
          >
            <label style={labelStyle} htmlFor="new-project-name">
              Project Name
            </label>
            <input
              id="new-project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maple Creek Homestead"
              style={inputStyle}
              autoFocus
            />

            <div style={{ marginTop: 28, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '11px 22px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: canSubmit
                    ? 'var(--color-earth-600)'
                    : 'var(--color-border)',
                  color: canSubmit ? '#fff' : 'var(--color-text-muted)',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: canSubmit ? 'pointer' : 'not-allowed',
                  transition: 'background 120ms ease',
                }}
              >
                {creating ? 'Creating…' : 'Continue to Vision Builder'}
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {showOrgModal && (
        <OrganizationSwitcherModal
          onPick={(picked) => {
            setOrgId(picked);
            setShowOrgModal(false);
          }}
          onClose={() => setShowOrgModal(false)}
          dismissable={Boolean(defaultOrgId)}
        />
      )}
    </div>
  );
}
