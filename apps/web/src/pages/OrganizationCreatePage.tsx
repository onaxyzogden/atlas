/**
 * OrganizationCreatePage — Phase 4.5 (2026-05-21).
 *
 * Stewarding-tier prelude: visitor lands here right after `/register` if
 * the ContactCTA `fullSetup=true` flag was set, OR any time an authed
 * visitor wants to customize the personal default workspace that the
 * register handler auto-created for them (per locked decision #3:
 * register-time auto-org for ALL tiers).
 *
 * Progressive disclosure (locked decision #1):
 *   - Required: org name (defaults to `${displayName}'s Workspace`)
 *   - "More options" reveals:
 *       · plan tier (free / standard / enterprise)
 *       · jurisdiction (free-text — e.g. "Ontario, Canada")
 *       · registry id (free-text — e.g. registered charity number)
 *       · member invite list (email + role per row; roles excl. 'owner')
 *
 * Surface placement (locked decision #2): dedicated route at
 *   /organizations/new
 *     [?next=instantiate&template=<slug>]   ← optional handoff thread
 *
 * On submit:
 *   1. PATCH the existing default org with any changed fields.
 *   2. POST each invite to /organizations/:id/members.
 *   3. If `next=instantiate&template=<slug>` was set, route to
 *      /new?prefillTemplate=<slug>&orgId=<id>&fullSetup=true.
 *      Otherwise route to /home.
 *
 * Covenant boundary (per 2026-05-04 erasure ADR): no CSRA / member-as-
 * investor / advance-purchase / yield-share / ROI language anywhere on
 * this surface. Capital language stays absent here entirely.
 */

import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore.js';
import { api, ApiError } from '../lib/apiClient.js';
import styles from './LoginPage.module.css';

interface OrganizationCreateSearch {
  next?: string;
  template?: string;
}

type InviteRole = 'admin' | 'editor' | 'viewer';

interface InviteRow {
  email: string;
  role: InviteRole;
}

function deriveDefaultOrgName(
  displayName: string | null | undefined,
  email: string | null | undefined,
): string {
  const trimmed = (displayName ?? '').trim();
  if (trimmed.length > 0) return `${trimmed}'s Workspace`;
  const handle = (email ?? '').split('@')[0]?.trim();
  if (handle && handle.length > 0) return `${handle}'s Workspace`;
  return 'My Workspace';
}

export default function OrganizationCreatePage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as OrganizationCreateSearch;
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const defaultOrgId = user?.defaultOrgId ?? null;
  const initialName = useMemo(
    () => deriveDefaultOrgName(user?.displayName ?? null, user?.email ?? null),
    [user?.displayName, user?.email],
  );

  const [name, setName] = useState(initialName);
  const [showMore, setShowMore] = useState(false);
  const [plan, setPlan] = useState<string>('free');
  const [jurisdiction, setJurisdiction] = useState('');
  const [registryId, setRegistryId] = useState('');
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageNote, setStageNote] = useState<string | null>(null);

  // If the visitor lands here without a token, send them to /register.
  // (No silent failure — Stewarding-tier flow expects a fresh registration
  // immediately preceding this surface.)
  useEffect(() => {
    if (!token) {
      navigate({
        to: '/register',
        search: { next: search.next, template: search.template } as never,
      });
    }
  }, [token, navigate, search.next, search.template]);

  const wantsTemplate =
    search.next === 'instantiate' && typeof search.template === 'string';
  const slug = search.template ?? '';

  function addInviteRow() {
    setInvites((rows) => [...rows, { email: '', role: 'editor' }]);
  }

  function updateInvite(index: number, patch: Partial<InviteRow>) {
    setInvites((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeInvite(index: number) {
    setInvites((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStageNote(null);

    if (!defaultOrgId) {
      setError(
        'No default workspace found on your account. Please refresh and try again.',
      );
      return;
    }

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError('Organization name is required.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. PATCH the existing default org — but only include fields the
      //    visitor actually changed (PATCH body must be non-empty per
      //    UpdateOrganizationInput schema).
      const patchBody: {
        name?: string;
        plan?: string;
        jurisdiction?: string | null;
        registryId?: string | null;
      } = {};
      if (trimmedName !== initialName) patchBody.name = trimmedName;
      if (plan !== 'free') patchBody.plan = plan;
      if (jurisdiction.trim().length > 0) {
        patchBody.jurisdiction = jurisdiction.trim();
      }
      if (registryId.trim().length > 0) {
        patchBody.registryId = registryId.trim();
      }

      if (Object.keys(patchBody).length > 0) {
        setStageNote('Saving workspace details…');
        await api.organizations.update(defaultOrgId, patchBody);
      }

      // 2. Process invites (one POST per row with a non-empty email).
      const validInvites = invites.filter((r) => r.email.trim().length > 0);
      if (validInvites.length > 0) {
        setStageNote(
          validInvites.length === 1
            ? 'Sending 1 invitation…'
            : `Sending ${validInvites.length} invitations…`,
        );
        for (const row of validInvites) {
          try {
            await api.organizations.inviteMember(
              defaultOrgId,
              row.email.trim(),
              row.role,
            );
          } catch (inviteErr) {
            // Non-fatal — surface the failed email but keep going.
            const msg =
              inviteErr instanceof ApiError
                ? inviteErr.message
                : 'Unknown error';
            // eslint-disable-next-line no-console
            console.warn(
              `[OrganizationCreatePage] invite ${row.email} failed: ${msg}`,
            );
          }
        }
      }

      // 3. Route to the next surface.
      if (wantsTemplate) {
        navigate({
          to: '/new',
          search: {
            prefillTemplate: slug,
            orgId: defaultOrgId,
            fullSetup: 'true',
          } as never,
        });
        return;
      }

      navigate({ to: '/' });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save workspace';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return null; // redirect in flight
  }

  return (
    <div className={styles.page}>
      <div className={styles.card} style={{ maxWidth: 520 }}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>OGDEN</span>
          <span className={styles.brandSub}>Land Design Atlas</span>
        </div>

        <h1
          style={{
            fontSize: 20,
            margin: '0 0 8px 0',
            color: 'var(--color-text)',
            fontWeight: 600,
          }}
        >
          Set up your workspace
        </h1>
        <p
          className={styles.localNote}
          style={{ marginTop: 0, marginBottom: 20 }}
        >
          Your projects live inside a workspace. We&apos;ve created a personal
          one for you — you can keep it, rename it, or expand it into a
          shared workspace for your team or organization.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="org-name">
              Workspace name
            </label>
            <input
              id="org-name"
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              autoFocus
            />
          </div>

          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              fontSize: 13,
              cursor: 'pointer',
              padding: '4px 0',
              textDecoration: 'underline',
            }}
          >
            {showMore ? 'Hide options' : 'More options (team, jurisdiction)'}
          </button>

          {showMore && (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="org-plan">
                  Plan <span className={styles.optional}>(optional)</span>
                </label>
                <select
                  id="org-plan"
                  className={styles.input}
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                >
                  <option value="free">Free — solo steward</option>
                  <option value="standard">Standard — small body (2–5)</option>
                  <option value="enterprise">
                    Enterprise — institutional body
                  </option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="org-jurisdiction">
                  Jurisdiction{' '}
                  <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="org-jurisdiction"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Ontario, Canada"
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="org-registry">
                  Registry / charity number{' '}
                  <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="org-registry"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. CRA registered charity #"
                  value={registryId}
                  onChange={(e) => setRegistryId(e.target.value)}
                  maxLength={200}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Invite teammates{' '}
                  <span className={styles.optional}>(optional)</span>
                </label>
                {invites.length === 0 && (
                  <p
                    style={{
                      fontSize: 12,
                      color: 'var(--color-text-muted)',
                      margin: '0 0 8px 0',
                    }}
                  >
                    No invitations yet. Add a row to invite people to this
                    workspace.
                  </p>
                )}
                {invites.map((row, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginBottom: 8,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="email@example.com"
                      value={row.email}
                      onChange={(e) =>
                        updateInvite(i, { email: e.target.value })
                      }
                      style={{ flex: 1 }}
                    />
                    <select
                      className={styles.input}
                      value={row.role}
                      onChange={(e) =>
                        updateInvite(i, { role: e.target.value as InviteRole })
                      }
                      style={{ flex: '0 0 110px' }}
                    >
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeInvite(i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        fontSize: 18,
                        padding: '0 6px',
                      }}
                      aria-label="Remove invite"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addInviteRow}
                  style={{
                    background: 'none',
                    border: '1px dashed var(--color-border)',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontSize: 13,
                    padding: '8px 12px',
                    borderRadius: 6,
                    alignSelf: 'flex-start',
                  }}
                >
                  + Add teammate
                </button>
              </div>
            </>
          )}

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
          {stageNote && !error && (
            <div
              className={styles.error}
              role="status"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {stageNote}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting
              ? 'Saving…'
              : wantsTemplate
                ? 'Continue to project setup'
                : 'Continue'}
          </button>
        </form>

        <p className={styles.localNote}>
          You can change these details anytime from your workspace settings.
        </p>
      </div>
    </div>
  );
}
