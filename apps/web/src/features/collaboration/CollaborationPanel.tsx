/**
 * CollaborationPanel — commenting, members, activity feed.
 * Wired to backend API for multi-user collaboration.
 */

import type maplibregl from 'maplibre-gl';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCommentStore, type Comment } from '../../store/commentStore.js';
import { useAuthStore } from '../../store/authStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import MembersTab from './MembersTab.js';
import { api } from '../../lib/apiClient.js';
import type { ActivityRecord } from '@ogden/shared';
import p from '../../styles/panel.module.css';

interface CollaborationPanelProps {
  project: LocalProject;
  map: maplibregl.Map | null;
  onAddCommentMode: () => void;
  isAddingComment: boolean;
}

type Tab = 'comments' | 'members' | 'activity';

export default function CollaborationPanel({ project, map, onAddCommentMode, isAddingComment }: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('comments');
  const allComments = useCommentStore((s) => s.comments);
  const comments = useMemo(() => allComments.filter((c) => c.projectId === project.id), [allComments, project.id]);
  const fetchComments = useCommentStore((s) => s.fetchComments);
  const createComment = useCommentStore((s) => s.createComment);
  const resolveCommentRemote = useCommentStore((s) => s.resolveCommentRemote);
  const deleteCommentRemote = useCommentStore((s) => s.deleteCommentRemote);
  const deleteComment = useCommentStore((s) => s.deleteComment);
  const resolveComment = useCommentStore((s) => s.resolveComment);

  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;
  const authorName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Designer';

  const [quickText, setQuickText] = useState('');

  const openComments = comments.filter((c) => !c.resolved);
  const resolvedComments = comments.filter((c) => c.resolved);

  // Fetch comments from backend on mount (if authenticated)
  const projectId = project.serverId ?? project.id;
  useEffect(() => {
    if (isAuthenticated) {
      fetchComments(projectId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, isAuthenticated]);

  const handleQuickComment = useCallback(async () => {
    if (!quickText.trim()) return;

    if (isAuthenticated) {
      await createComment(projectId, { text: quickText.trim() }, authorName);
    } else {
      // Local-only fallback
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
      useCommentStore.getState().addComment(comment);
    }
    setQuickText('');
  }, [quickText, project.id, projectId, authorName, isAuthenticated, createComment]);

  const handleResolve = useCallback((comment: Comment) => {
    if (isAuthenticated && comment.serverId) {
      resolveCommentRemote(projectId, comment.serverId);
    } else {
      resolveComment(comment.id);
    }
  }, [isAuthenticated, projectId, resolveCommentRemote, resolveComment]);

  const handleDelete = useCallback((comment: Comment) => {
    if (isAuthenticated && comment.serverId) {
      deleteCommentRemote(projectId, comment.serverId);
    } else {
      deleteComment(comment.id);
    }
  }, [isAuthenticated, projectId, deleteCommentRemote, deleteComment]);

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
        {(['comments', 'members', 'activity'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`${p.tabBtn} ${activeTab === tab ? p.tabBtnActive : ''}`}
          >
            {tab === 'comments' ? `Comments (${openComments.length})` : tab === 'members' ? 'Members' : 'Activity'}
          </button>
        ))}
      </div>

      {activeTab === 'comments' && (
        <>
          {/* Quick comment */}
          <div className={`${p.row} ${p.mb12}`} style={{ gap: 6 }}>
            <input
              type="text"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickComment(); }}
              placeholder="Add a comment..."
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

          {/* Posting as indicator */}
          <div className={`${p.text10} ${p.muted} ${p.mb12}`} style={{ paddingLeft: 2 }}>
            Posting as <strong style={{ color: 'var(--color-panel-text)' }}>{authorName}</strong>
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
                  <CommentCard key={c.id} comment={c} onResolve={() => handleResolve(c)} onDelete={() => handleDelete(c)} onFly={() => flyToComment(c)} />
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
                  <CommentCard key={c.id} comment={c} onDelete={() => handleDelete(c)} onFly={() => flyToComment(c)} resolved />
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

      {activeTab === 'members' && (
        <MembersTab project={project} />
      )}

      {activeTab === 'activity' && (
        <ActivityTab projectId={projectId} isAuthenticated={isAuthenticated} />
      )}
    </div>
  );
}


/** Activity tab — real backend-powered activity feed */
function ActivityTab({ projectId, isAuthenticated }: { projectId: string; isAuthenticated: boolean }) {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);
    api.activity.list(projectId, 30, 0)
      .then(({ data, meta }) => {
        if (!cancelled) {
          setActivities(data ?? []);
          setTotal(meta?.total ?? 0);
        }
      })
      .catch((err) => console.warn('[OGDEN] Failed to fetch activity:', err))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className={`${p.empty} ${p.leading16}`}>
        Sign in to view the project activity feed.
      </div>
    );
  }

  return (
    <div>
      <h3 className={p.sectionLabel}>
        Recent Activity {total > 0 && `(${total})`}
        {isLoading && <span className={`${p.text10} ${p.muted}`} style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>loading...</span>}
      </h3>

      {activities.length > 0 ? (
        <div className={p.section}>
          {activities.map((a) => (
            <div key={a.id} className={`${p.cardCompact} ${p.cardRow} ${p.text11}`} style={{ background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)', gap: 8 }}>
              <span style={{ fontSize: 13, flexShrink: 0 }}>{actionIcon(a.action)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: 'var(--color-panel-text)' }}>
                  <strong>{a.userName ?? 'System'}</strong>{' '}
                  {actionVerb(a.action)}
                  {a.metadata && typeof a.metadata === 'object' && 'text' in a.metadata
                    ? `: ${String(a.metadata.text).slice(0, 50)}${String(a.metadata.text).length > 50 ? '...' : ''}`
                    : ''}
                </span>
              </div>
              <span className={`${p.muted} ${p.text9}`} style={{ flexShrink: 0 }}>{formatTime(a.createdAt)}</span>
            </div>
          ))}
        </div>
      ) : !isLoading ? (
        <div className={p.empty}>
          No activity recorded yet. Actions like commenting, editing features, and managing members will appear here.
        </div>
      ) : null}
    </div>
  );
}

function actionIcon(action: string): string {
  const map: Record<string, string> = {
    comment_added: '\u{1F4AC}',
    comment_resolved: '\u2705',
    comment_deleted: '\u{1F5D1}\uFE0F',
    feature_created: '\u2728',
    feature_updated: '\u270F\uFE0F',
    feature_deleted: '\u{1F5D1}\uFE0F',
    member_joined: '\u{1F44B}',
    member_removed: '\u{1F6AB}',
    role_changed: '\u{1F451}',
    export_generated: '\u{1F4E6}',
    suggestion_created: '\u{1F4A1}',
    suggestion_approved: '\u2705',
    suggestion_rejected: '\u274C',
  };
  return map[action] ?? '\u{1F4CB}';
}

function actionVerb(action: string): string {
  const map: Record<string, string> = {
    comment_added: 'added a comment',
    comment_resolved: 'resolved a comment',
    comment_deleted: 'deleted a comment',
    feature_created: 'created a feature',
    feature_updated: 'updated a feature',
    feature_deleted: 'deleted a feature',
    member_joined: 'joined the project',
    member_removed: 'was removed',
    role_changed: 'role was changed',
    export_generated: 'generated an export',
    suggestion_created: 'suggested an edit',
    suggestion_approved: 'approved a suggestion',
    suggestion_rejected: 'rejected a suggestion',
  };
  return map[action] ?? action.replace(/_/g, ' ');
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
