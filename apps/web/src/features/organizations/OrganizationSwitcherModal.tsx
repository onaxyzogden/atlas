/**
 * OrganizationSwitcherModal — Phase 4.5 (2026-05-21).
 *
 * Lightweight modal mounted from NewProjectPage when the visitor needs to
 * pick an existing workspace OR quick-create one inline, without leaving
 * the wizard. Distinct from /organizations/new — that route handles the
 * full progressive-disclosure prelude on the Stewarding cold-visitor
 * flow. This modal is the *returning-user* path (multi-org switching +
 * inline quick-create).
 *
 * Trigger conditions (caller decides — see NewProjectPage):
 *   - Visitor has more than one workspace AND the wizard needs explicit
 *     org choice
 *   - Visitor hit /new with ?fullSetup=true AND no ?orgId param
 *
 * Resolves: `onPick(orgId)` — caller receives the chosen/created org id
 * and threads it into wizard state.
 *
 * Covenant boundary (2026-05-04 erasure ADR): no CSRA, no investor,
 * no advance-purchase framing anywhere in this surface.
 */

import { useEffect, useState } from 'react';
import type { OrganizationRecord } from '@ogden/shared';
import { api, ApiError } from '../../lib/apiClient.js';
import { useAuthStore } from '../../store/authStore.js';

interface OrganizationSwitcherModalProps {
  /** Called with the chosen or newly-created org id. */
  onPick: (orgId: string) => void;
  /** Called when the visitor dismisses the modal without choosing. */
  onClose?: () => void;
  /** Show the dismiss affordance? Default true. */
  dismissable?: boolean;
}

export function OrganizationSwitcherModal({
  onPick,
  onClose,
  dismissable = true,
}: OrganizationSwitcherModalProps) {
  const defaultOrgId = useAuthStore((s) => s.user?.defaultOrgId ?? null);
  const [orgs, setOrgs] = useState<OrganizationRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await api.organizations.list();
        if (!cancelled) setOrgs(data);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof ApiError ? err.message : 'Could not load workspaces';
        setLoadError(msg);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate() {
    const trimmed = newName.trim();
    if (trimmed.length === 0) {
      setSubmitError('Workspace name is required.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { data } = await api.organizations.create(trimmed);
      onPick(data.id);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Could not create workspace';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a workspace"
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 12,
          padding: 24,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              margin: 0,
              color: 'var(--color-text)',
            }}
          >
            Choose a workspace
          </h2>
          {dismissable && onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 22,
                lineHeight: 1,
                padding: 0,
              }}
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        <p
          style={{
            fontSize: 13,
            color: 'var(--color-text-muted)',
            margin: '0 0 16px 0',
          }}
        >
          Your project will belong to this workspace. You can change workspaces
          later from settings.
        </p>

        {loadError && (
          <div
            role="alert"
            style={{
              fontSize: 13,
              color: 'var(--color-danger, #c44)',
              marginBottom: 12,
            }}
          >
            {loadError}
          </div>
        )}

        {!loadError && orgs === null && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--color-text-muted)',
              margin: '0 0 12px 0',
            }}
          >
            Loading workspaces…
          </p>
        )}

        {orgs && orgs.length > 0 && !creating && (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 16px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {orgs.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  onClick={() => onPick(org.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    background:
                      org.id === defaultOrgId
                        ? 'var(--color-bg)'
                        : 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    color: 'var(--color-text)',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{org.name}</span>
                  {org.id === defaultOrgId && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--color-text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Default
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {creating ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <label
              htmlFor="new-org-name"
              style={{
                fontSize: 12,
                color: 'var(--color-text-muted)',
                fontWeight: 500,
              }}
            >
              New workspace name
            </label>
            <input
              id="new-org-name"
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={200}
              placeholder="e.g. Three Streams Stewardship"
              style={{
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: 14,
              }}
            />
            {submitError && (
              <div
                role="alert"
                style={{ fontSize: 12, color: 'var(--color-danger, #c44)' }}
              >
                {submitError}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'var(--color-text)',
                  color: 'var(--color-bg)',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: submitting ? 'wait' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? 'Creating…' : 'Create workspace'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setNewName('');
                  setSubmitError(null);
                }}
                style={{
                  padding: '10px 12px',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              border: '1px dashed var(--color-border)',
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            + Create a new workspace
          </button>
        )}
      </div>
    </div>
  );
}
