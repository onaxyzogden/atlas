/**
 * CollaborationPanel — commenting, sharing, activity feed.
 * Replaces the placeholder collaboration sidebar view.
 */

import { useState, useCallback, useMemo } from 'react';
import { useCommentStore, type Comment } from '../../store/commentStore.js';
import type { LocalProject } from '../../store/projectStore.js';

interface CollaborationPanelProps {
  project: LocalProject;
  map: mapboxgl.Map | null;
  onAddCommentMode: () => void;
  isAddingComment: boolean;
}

type Tab = 'comments' | 'share' | 'activity';

export default function CollaborationPanel({ project, map, onAddCommentMode, isAddingComment }: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('comments');
  const allComments = useCommentStore((s) => s.comments);
  const comments = useMemo(() => allComments.filter((c) => c.projectId === project.id), [allComments, project.id]);
  const addComment = useCommentStore((s) => s.addComment);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const resolveComment = useCommentStore((s) => s.resolveComment);
  const authorName = useCommentStore((s) => s.authorName);
  const setAuthorName = useCommentStore((s) => s.setAuthorName);

  const [quickText, setQuickText] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const openComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  const handleQuickComment = useCallback(() => {
    if (!quickText.trim()) return;
    const comment: Comment = {
      id: crypto.randomUUID(),
      projectId: project.id,
      author: authorName,
      text: quickText.trim(),
      location: null,
      featureId: null,
      featureType: null,
      resolved: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addComment(comment);
    setQuickText('');
  }, [quickText, project.id, authorName, addComment]);

  const handleGenerateShareLink = () => {
    const url = `${window.location.origin}/project/${project.id}?view=readonly`;
    setShareUrl(url);
    navigator.clipboard.writeText(url).catch(() => {});
  };

  const flyToComment = (comment: Comment) => {
    if (!map || !comment.location) return;
    map.flyTo({ center: comment.location, zoom: 17, duration: 1200 });
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 16 }}>
        Collaboration
      </h2>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(196,162,101,0.2)' }}>
        {(['comments', 'share', 'activity'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '9px 0', fontSize: 11,
              fontWeight: activeTab === tab ? 600 : 400,
              background: activeTab === tab ? 'rgba(196,162,101,0.12)' : 'transparent',
              border: 'none',
              color: activeTab === tab ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: 'pointer', textTransform: 'capitalize',
            }}
          >
            {tab === 'comments' ? `Comments (${openComments.length})` : tab === 'share' ? 'Share' : 'Activity'}
          </button>
        ))}
      </div>

      {activeTab === 'comments' && (
        <>
          {/* Author name */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--color-panel-muted)', flexShrink: 0 }}>As:</span>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              style={{ flex: 1, padding: '4px 8px', fontSize: 11, background: 'var(--color-panel-subtle)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, color: 'var(--color-panel-text)', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {/* Quick comment */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickComment(); }}
              placeholder="Add a general comment..."
              style={{ flex: 1, padding: '8px 10px', fontSize: 12, background: 'var(--color-panel-subtle)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'var(--color-panel-text)', outline: 'none', fontFamily: 'inherit' }}
            />
            <button onClick={handleQuickComment} disabled={!quickText.trim()} style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, background: quickText.trim() ? 'rgba(196,162,101,0.2)' : 'var(--color-panel-subtle)', color: quickText.trim() ? '#c4a265' : 'var(--color-panel-muted)', cursor: quickText.trim() ? 'pointer' : 'not-allowed' }}>
              Add
            </button>
          </div>

          {/* Add map comment button */}
          <button
            onClick={onAddCommentMode}
            style={{
              width: '100%', padding: '10px', fontSize: 12, fontWeight: 500,
              border: isAddingComment ? '1px solid rgba(196,162,101,0.3)' : '1px solid var(--color-panel-card-border)',
              borderRadius: 8,
              background: isAddingComment ? 'rgba(196,162,101,0.08)' : 'transparent',
              color: isAddingComment ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: 'pointer', marginBottom: 16,
            }}
          >
            {isAddingComment ? 'Click on map to place comment...' : '\u{1F4CD} Add Comment to Map'}
          </button>

          {/* Open comments */}
          {openComments.length > 0 && (
            <>
              <SectionLabel>Open ({openComments.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                {openComments.map((c) => (
                  <CommentCard key={c.id} comment={c} onResolve={() => resolveComment(c.id)} onDelete={() => deleteComment(c.id)} onFly={() => flyToComment(c)} />
                ))}
              </div>
            </>
          )}

          {/* Resolved */}
          {resolvedComments.length > 0 && (
            <>
              <SectionLabel>Resolved ({resolvedComments.length})</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {resolvedComments.map((c) => (
                  <CommentCard key={c.id} comment={c} onDelete={() => deleteComment(c.id)} onFly={() => flyToComment(c)} resolved />
                ))}
              </div>
            </>
          )}

          {comments.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 20 }}>
              No comments yet. Add notes, questions, or review items.
            </div>
          )}
        </>
      )}

      {activeTab === 'share' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', lineHeight: 1.6, marginBottom: 16 }}>
            Generate a view-only link to share this project with stakeholders, community members, or reviewers.
            No account required to view.
          </div>

          <button
            onClick={handleGenerateShareLink}
            style={{
              width: '100%', padding: '12px', fontSize: 13, fontWeight: 600,
              border: 'none', borderRadius: 8,
              background: 'rgba(196,162,101,0.15)', color: '#c4a265',
              cursor: 'pointer', marginBottom: 12,
            }}
          >
            {'\u{1F517}'} Generate Share Link
          </button>

          {shareUrl && (
            <div style={{ padding: '10px 12px', background: 'var(--color-panel-subtle)', borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginBottom: 4 }}>Share URL (copied to clipboard)</div>
              <div style={{ fontSize: 11, color: '#c4a265', wordBreak: 'break-all', fontFamily: 'monospace' }}>{shareUrl}</div>
            </div>
          )}

          <SectionLabel>Access Roles</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { role: 'Owner', desc: 'Full access — create, edit, delete, share', icon: '\u{1F451}' },
              { role: 'Designer', desc: 'Edit zones, structures, paths — no delete', icon: '\u270F' },
              { role: 'Reviewer', desc: 'Comment, suggest edits — no direct changes', icon: '\u{1F4AC}' },
              { role: 'Viewer', desc: 'View only — no comments or changes', icon: '\u{1F441}' },
            ].map((r) => (
              <div key={r.role} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
                <span style={{ fontSize: 14 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>{r.role}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 20, lineHeight: 1.6 }}>
            Activity feed tracks changes by all collaborators.
            <br /><br />
            <span style={{ fontSize: 11, opacity: 0.7 }}>Multi-user sync requires a backend server. Activity tracking is local-only in this version.</span>
          </div>

          {/* Show recent comments as activity */}
          {comments.length > 0 && (
            <>
              <SectionLabel>Recent Activity</SectionLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {comments.slice(0, 10).map((c) => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)', fontSize: 11 }}>
                    <span style={{ color: 'var(--color-panel-muted)', flexShrink: 0 }}>{c.author}</span>
                    <span style={{ color: 'var(--color-panel-text)', flex: 1 }}>{c.resolved ? 'resolved' : 'commented'}: {c.text.slice(0, 60)}{c.text.length > 60 ? '...' : ''}</span>
                    <span style={{ color: 'var(--color-panel-muted)', fontSize: 9, flexShrink: 0 }}>{formatTime(c.createdAt)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CommentCard({ comment, onResolve, onDelete, onFly, resolved }: { comment: Comment; onResolve?: () => void; onDelete: () => void; onFly: () => void; resolved?: boolean }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: 'var(--color-panel-card)',
      border: '1px solid var(--color-panel-card-border)',
      opacity: resolved ? 0.6 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-panel-text)' }}>{comment.author}</span>
        <span style={{ fontSize: 9, color: 'var(--color-panel-muted)' }}>{formatTime(comment.createdAt)}</span>
        {comment.location && (
          <button onClick={onFly} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 11 }} title="Fly to location">
            {'\u{1F4CD}'}
          </button>
        )}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-panel-text)', lineHeight: 1.5, marginBottom: 6 }}>{comment.text}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {onResolve && !resolved && (
          <button onClick={onResolve} style={{ padding: '3px 8px', fontSize: 10, border: '1px solid rgba(45,122,79,0.2)', borderRadius: 4, background: 'transparent', color: '#2d7a4f', cursor: 'pointer' }}>
            {'\u2713'} Resolve
          </button>
        )}
        <button onClick={onDelete} style={{ padding: '3px 8px', fontSize: 10, border: '1px solid rgba(196,78,63,0.2)', borderRadius: 4, background: 'transparent', color: '#c44e3f', cursor: 'pointer' }}>
          Delete
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8 }}>
      {children}
    </h3>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString();
}
