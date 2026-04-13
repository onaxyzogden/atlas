/**
 * SuggestEditPanel — lists pending suggested edits for owner/designer review,
 * and provides a submission form for reviewers.
 *
 * Rendered inside CollaborationPanel or as a standalone panel.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/apiClient.js';
import { useAuthStore } from '../../store/authStore.js';
import { useProjectRole } from '../../hooks/useProjectRole.js';
import type { SuggestedEditRecord } from '@ogden/shared';
import p from '../../styles/panel.module.css';
import { group, semantic } from '../../lib/tokens.js';

interface SuggestEditPanelProps {
  projectId: string;
}

export default function SuggestEditPanel({ projectId }: SuggestEditPanelProps) {
  const [suggestions, setSuggestions] = useState<SuggestedEditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const { role, canEdit, canSuggestEdits } = useProjectRole(projectId);

  const fetchSuggestions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data } = await api.suggestions.list(projectId);
      if (data) setSuggestions(data);
    } catch (err) {
      console.warn('[OGDEN] Failed to fetch suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, user]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const handleReview = useCallback(async (suggestionId: string, action: 'approved' | 'rejected') => {
    try {
      await api.suggestions.review(projectId, suggestionId, { action });
      // Re-fetch to update the list
      fetchSuggestions();
    } catch (err) {
      console.warn('[OGDEN] Failed to review suggestion:', err);
    }
  }, [projectId, fetchSuggestions]);

  const pending = suggestions.filter((s) => s.status === 'pending');
  const reviewed = suggestions.filter((s) => s.status !== 'pending');

  if (!user) {
    return (
      <div className={`${p.empty} ${p.leading16}`}>
        Sign in to view and manage suggested edits.
      </div>
    );
  }

  return (
    <div>
      <h3 className={p.sectionLabel}>
        Pending Suggestions ({pending.length})
        {isLoading && <span className={`${p.text10} ${p.muted}`} style={{ marginLeft: 6, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>loading...</span>}
      </h3>

      {pending.length > 0 ? (
        <div className={`${p.section} ${p.mb16}`}>
          {pending.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              canReview={canEdit}
              onApprove={() => handleReview(s.id, 'approved')}
              onReject={() => handleReview(s.id, 'rejected')}
            />
          ))}
        </div>
      ) : (
        <div className={`${p.empty} ${p.mb16}`}>
          {canSuggestEdits
            ? 'No pending suggestions. Click a design feature to suggest an edit.'
            : 'No pending suggestions.'}
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h3 className={p.sectionLabel}>Reviewed ({reviewed.length})</h3>
          <div className={p.section}>
            {reviewed.slice(0, 10).map((s) => (
              <SuggestionCard key={s.id} suggestion={s} canReview={false} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  canReview,
  onApprove,
  onReject,
}: {
  suggestion: SuggestedEditRecord;
  canReview: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}) {
  const isPending = suggestion.status === 'pending';
  const isApproved = suggestion.status === 'approved';

  return (
    <div className={p.card} style={{
      opacity: isPending ? 1 : 0.6,
      borderLeft: `3px solid ${isPending ? semantic.sidebarActive : isApproved ? group.reporting : '#ef4444'}`,
    }}>
      <div className={`${p.row} ${p.mb4}`} style={{ gap: 6 }}>
        <span className={`${p.text11} ${p.fontSemibold}`} style={{ color: 'var(--color-panel-text)' }}>
          {suggestion.authorName ?? 'Unknown'}
        </span>
        <span style={{
          fontSize: 9, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
          background: isPending ? 'rgba(196,162,101,0.15)' : isApproved ? 'rgba(21,128,61,0.15)' : 'rgba(239,68,68,0.15)',
          color: isPending ? semantic.sidebarActive : isApproved ? group.reporting : '#ef4444',
        }}>
          {suggestion.status.toUpperCase()}
        </span>
        <span className={`${p.text9} ${p.muted}`} style={{ marginLeft: 'auto' }}>
          {formatSuggestionTime(suggestion.createdAt)}
        </span>
      </div>

      <div className={`${p.text11} ${p.muted} ${p.mb8}`}>
        Feature: <span style={{ color: 'var(--color-panel-text)' }}>{suggestion.featureId.slice(0, 8)}...</span>
      </div>

      {/* Show diff summary */}
      {suggestion.diffPayload && typeof suggestion.diffPayload === 'object' && (
        <div className={`${p.text10} ${p.muted} ${p.mb8}`} style={{
          background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: 4,
          fontFamily: 'monospace',
        }}>
          {(suggestion.diffPayload as Record<string, unknown>).properties ? 'Property changes' : ''}
          {(suggestion.diffPayload as Record<string, unknown>).geometry ? ' + Geometry changes' : ''}
        </div>
      )}

      {canReview && isPending && (
        <div className={p.flexGap8} style={{ gap: 6 }}>
          <button onClick={onApprove} className={p.actionBtnResolve}>
            {'\u2713'} Approve
          </button>
          <button onClick={onReject} className={p.actionBtnDelete}>
            {'\u2715'} Reject
          </button>
        </div>
      )}
    </div>
  );
}

function formatSuggestionTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return d.toLocaleDateString();
}
