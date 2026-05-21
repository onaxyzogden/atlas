/**
 * /archive — projects the steward archived (status = 'archived').
 *
 * Lists archived projects with per-row Restore + Delete-forever actions.
 * Restore flips status back to 'active'; Delete-forever opens a danger
 * dialog that requires the user to type the project name.
 *
 * Source-of-truth: the local useProjectStore — archived projects whose
 * server canonical row exists are kept in localStorage by status. The
 * page also calls api.projects.list({ status: 'archived' }) at mount as
 * a hydration nudge; failures fall back to local data without error UI.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useProjectStore } from '../store/projectStore.js';
import { api } from '../lib/apiClient.js';
import { ConfirmDestructiveDialog } from '../components/ui/ConfirmDestructiveDialog.js';

type Dialog = null | { kind: 'delete'; projectId: string };

export default function ArchivePage() {
  const projects = useProjectStore((s) => s.projects);
  const unarchiveProject = useProjectStore((s) => s.unarchiveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [hydrationNote, setHydrationNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api.projects
      .list({ status: 'archived' })
      .then(() => {
        if (cancelled) return;
        setHydrationNote(null);
      })
      .catch(() => {
        if (cancelled) return;
        setHydrationNote('Showing locally cached archive — server unreachable.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const archived = useMemo(
    () =>
      projects.filter((p) => p.status === 'archived' && !p.isBuiltin),
    [projects],
  );

  const dialogProject = dialog
    ? projects.find((p) => p.id === dialog.projectId) ?? null
    : null;

  return (
    <div style={{ padding: '24px 32px', maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: 'var(--color-text)' }}>
          Archive
        </h1>
        <p style={{ margin: '6px 0 0', color: 'var(--color-text-muted)' }}>
          Projects you have archived. Restore brings them back to your
          projects list; Delete forever removes them and all dependent data.
        </p>
        {hydrationNote && (
          <p
            role="status"
            style={{
              marginTop: 8,
              fontSize: 12,
              color: 'var(--color-text-muted)',
            }}
          >
            {hydrationNote}
          </p>
        )}
      </header>

      {archived.length === 0 ? (
        <div
          style={{
            padding: 32,
            border: '1px dashed var(--color-border, #334155)',
            borderRadius: 8,
            color: 'var(--color-text-muted)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0 }}>No archived projects.</p>
          <Link
            to="/v3/project"
            style={{
              display: 'inline-block',
              marginTop: 12,
              color: 'var(--color-link, #60a5fa)',
            }}
          >
            Back to projects
          </Link>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {archived.map((p) => (
            <li
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                border: '1px solid var(--color-border, #334155)',
                borderRadius: 8,
                background: 'var(--color-surface, rgba(255,255,255,0.02))',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--color-text-muted)',
                    marginTop: 2,
                  }}
                >
                  {p.address ?? p.provinceState ?? p.country ?? '—'}
                  {p.acreage != null ? ` · ${p.acreage.toFixed(1)} ${p.units === 'metric' ? 'ha' : 'ac'}` : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => unarchiveProject(p.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--color-border, #334155)',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'pointer',
                }}
              >
                Restore
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: 'delete', projectId: p.id })}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#dc2626',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Delete forever
              </button>
            </li>
          ))}
        </ul>
      )}

      {dialog?.kind === 'delete' && dialogProject && (
        <ConfirmDestructiveDialog
          open
          tone="danger"
          title={`Delete ${dialogProject.name} forever?`}
          body={
            <>
              This permanently removes the project and all of its dependent
              data (designs, logs, attachments). This cannot be undone.
            </>
          }
          confirmLabel="Delete forever"
          typedConfirmation={dialogProject.name}
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            await deleteProject(dialogProject.id);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
