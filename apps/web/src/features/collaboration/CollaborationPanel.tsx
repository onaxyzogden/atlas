/**
 * CollaborationPanel — commenting, sharing, activity feed.
 * Replaces the placeholder collaboration sidebar view.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useCallback, useMemo } from 'react';
import { useCommentStore, type Comment } from '../../store/commentStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import p from '../../styles/panel.module.css';

interface CollaborationPanelProps {
  project: LocalProject;
  map: maplibregl.Map | null;
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
    navigator.clipboard.writeText(url).catch((err) => {
      console.warn('[OGDEN] Clipboard write failed:', err);
    });
  };

  const flyToComment = (comment: Comment) => {
    if (!map || !comment.location) return;
    map.flyTo({ center: comment.location, zoom: 17, duration: 1200 });
  };

  return (
    <div className={p.container}>
      <h2 className={p.title}>
        Collaboration
      </h2>

      {/* Tab switcher */}
      <div className={p.tabBar}>
        {(['comments', 'share', 'activity'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${p.tabBtn} ${activeTab === tab ? p.tabBtnActive : ''}`}
          >
            {tab === 'comments' ? `Comments (${openComments.length})` : tab === 'share' ? 'Share' : 'Activity'}
          </button>
        ))}
      </div>

      {activeTab === 'comments' && (
        <>
          {/* Author name */}
          <div className={`${p.row} ${p.mb12}`} style={{ gap: 6 }}>
            <span className={`${p.text10} ${p.muted}`} style={{ flexShrink: 0 }}>As:</span>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className={p.input}
              style={{ padding: '4px 8px', fontSize: 11 }}
            />
          </div>

          {/* Quick comment */}
          <div className={`${p.row} ${p.mb12}`} style={{ gap: 6 }}>
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickComment(); }}
              placeholder="Add a general comment..."
              className={p.input}
              style={{ flex: 1 }}
            />
            <button onClick={handleQuickComment} disabled={!quickText.trim()} className={`${p.btnSmall} ${p.fontSemibold}`} style={{
              padding: '8px 12px',
              background: quickText.trim() ? 'rgba(196,162,101,0.2)' : 'var(--color-panel-subtle)',
              color: quickText.trim() ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: quickText.trim() ? 'pointer' : 'not-allowed',
              border: 'none', borderRadius: 6,
            }}>
              Add
            </button>
          </div>

          {/* Add map comment button */}
          <button
            onClick={onAddCommentMode}
            className={p.btn}
            style={{
              marginBottom: 16,
              ...(isAddingComment ? { borderColor: 'rgba(196,162,101,0.3)', background: 'rgba(196,162,101,0.08)', color: '#c4a265' } : {}),
            }}
          >
            {isAddingComment ? 'Click on map to place comment...' : '\u{1F4CD} Add Comment to Map'}
          </button>

          {/* Open comments */}
          {openComments.length > 0 && (
            <>
              <h3 className={p.sectionLabel}>Open ({openComments.length})</h3>
              <div className={`${p.section} ${p.mb16}`}>
                {openComments.map((c) => (
                  <CommentCard key={c.id} comment={c} onResolve={() => resolveComment(c.id)} onDelete={() => deleteComment(c.id)} onFly={() => flyToComment(c)} />
                ))}
              </div>
            </>
          )}

          {/* Resolved */}
          {resolvedComments.length > 0 && (
            <>
              <h3 className={p.sectionLabel}>Resolved ({resolvedComments.length})</h3>
              <div className={p.section}>
                {resolvedComments.map((c) => (
                  <CommentCard key={c.id} comment={c} onDelete={() => deleteComment(c.id)} onFly={() => flyToComment(c)} resolved />
                ))}
              </div>
            </>
          )}

          {comments.length === 0 && (
            <div className={p.empty}>
              No comments yet. Add notes, questions, or review items.
            </div>
          )}
        </>
      )}

      {activeTab === 'share' && (
        <div>
          <div className={`${p.text12} ${p.muted} ${p.leading16} ${p.mb16}`}>
            Generate a view-only link to share this project with stakeholders, community members, or reviewers.
            No account required to view.
          </div>

          <button
            onClick={handleGenerateShareLink}
            className={p.drawBtn}
            style={{ background: 'rgba(196,162,101,0.15)', color: '#c4a265' }}
          >
            {'\u{1F517}'} Generate Share Link
          </button>

          {shareUrl && (
            <div className={`${p.card} ${p.mb16}`} style={{ background: 'var(--color-panel-subtle)' }}>
              <div className={`${p.text10} ${p.muted} ${p.mb4}`}>Share URL (copied to clipboard)</div>
              <div className={`${p.text11} ${p.breakAll} ${p.mono}`} style={{ color: '#c4a265' }}>{shareUrl}</div>
            </div>
          )}

          <h3 className={p.sectionLabel}>Access Roles</h3>
          <div className={p.section}>
            {[
              { role: 'Owner', desc: 'Full access — create, edit, delete, share', icon: '\u{1F451}' },
              { role: 'Designer', desc: 'Edit zones, structures, paths — no delete', icon: '\u270F' },
              { role: 'Reviewer', desc: 'Comment, suggest edits — no direct changes', icon: '\u{1F4AC}' },
              { role: 'Viewer', desc: 'View only — no comments or changes', icon: '\u{1F441}' },
            ].map((r) => (
              <div key={r.role} className={`${p.cardCompact} ${p.cardRow}`} style={{ padding: '8px 10px', background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
                <span className={p.text14}>{r.icon}</span>
                <div>
                  <div className={`${p.text12} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)' }}>{r.role}</div>
                  <div className={`${p.text10} ${p.muted}`}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div>
          <div className={`${p.empty} ${p.leading16}`}>
            Activity feed tracks changes by all collaborators.
            <br /><br />
            <span className={`${p.text11} ${p.opacity70}`}>Multi-user sync requires a backend server. Activity tracking is local-only in this version.</span>
          </div>

          {/* Show recent comments as activity */}
          {comments.length > 0 && (
            <>
              <h3 className={p.sectionLabel}>Recent Activity</h3>
              <div className={p.section}>
                {comments.slice(0, 10).map((c) => (
                  <div key={c.id} className={`${p.cardCompact} ${p.cardRow} ${p.text11}`} style={{ background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)' }}>
                    <span className={p.muted} style={{ flexShrink: 0 }}>{c.author}</span>
                    <span style={{ color: 'var(--color-panel-text)', flex: 1 }}>{c.resolved ? 'resolved' : 'commented'}: {c.text.slice(0, 60)}{c.text.length > 60 ? '...' : ''}</span>
                    <span className={`${p.muted} ${p.text9}`} style={{ flexShrink: 0 }}>{formatTime(c.createdAt)}</span>
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
    <div className={p.card} style={{ opacity: resolved ? 0.6 : 1 }}>
      <div className={`${p.row} ${p.mb4}`} style={{ gap: 6 }}>
        <span className={`${p.text11} ${p.fontSemibold}`} style={{ color: 'var(--color-panel-text)' }}>{comment.author}</span>
        <span className={`${p.text9} ${p.muted}`}>{formatTime(comment.createdAt)}</span>
        {comment.location && (
          <button onClick={onFly} className={p.textBtn} style={{ marginLeft: 'auto', fontSize: 11 }} title="Fly to location">
            {'\u{1F4CD}'}
          </button>
        )}
      </div>
      <div className={`${p.text12} ${p.leading15} ${p.mb8}`} style={{ color: 'var(--color-panel-text)' }}>{comment.text}</div>
      <div className={p.flexGap8} style={{ gap: 6 }}>
        {onResolve && !resolved && (
          <button onClick={onResolve} className={p.actionBtnResolve}>
            {'\u2713'} Resolve
          </button>
        )}
        <button onClick={onDelete} className={p.actionBtnDelete}>
          Delete
        </button>
      </div>
    </div>
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
