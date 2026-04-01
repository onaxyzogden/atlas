/**
 * VersionHistory — shows project version snapshots with restore capability.
 *
 * P1 features from Section 1:
 *   - Auto-save and version snapshots
 *   - Restore previous project state (P2)
 */

import { useMemo } from 'react';
import { useVersionStore, type ProjectSnapshot } from '../../store/versionStore.js';
import { useProjectStore } from '../../store/projectStore.js';

interface VersionHistoryProps {
  projectId: string;
}

export default function VersionHistory({ projectId }: VersionHistoryProps) {
  const allSnapshots = useVersionStore((s) => s.snapshots);
  const snapshots = useMemo(
    () => allSnapshots
      .filter((s) => s.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [allSnapshots, projectId],
  );
  const restoreSnapshot = useVersionStore((s) => s.restoreSnapshot);
  const deleteSnapshot = useVersionStore((s) => s.deleteSnapshot);
  const updateProject = useProjectStore((s) => s.updateProject);

  const handleRestore = (snap: ProjectSnapshot) => {
    const data = restoreSnapshot(snap.id);
    if (data) {
      // Restore all fields except id, createdAt
      const { id: _id, createdAt: _created, ...updates } = data;
      updateProject(projectId, { ...updates, updatedAt: new Date().toISOString() });
    }
  };

  if (snapshots.length === 0) {
    return (
      <div style={{ padding: 16, fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>
        No version history yet. Snapshots are created automatically when you make changes.
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-text-muted)',
          marginBottom: 12,
        }}
      >
        Version History ({snapshots.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {snapshots.map((snap) => (
          <div
            key={snap.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{snap.label}</div>
              <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                {formatTimestamp(snap.timestamp)}
              </div>
            </div>
            <button
              onClick={() => handleRestore(snap)}
              style={{
                padding: '3px 8px',
                fontSize: 10,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
              title="Restore this version"
            >
              Restore
            </button>
            <button
              onClick={() => deleteSnapshot(snap.id)}
              style={{
                padding: '3px 6px',
                fontSize: 12,
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
              title="Delete snapshot"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
