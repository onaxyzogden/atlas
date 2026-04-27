/**
 * §20 TeamActivityDigestCard — rolled-up team activity feed with
 * sign-off readiness checklist for the Collaboration panel.
 *
 * The existing `ActivityTab` already lists raw recent activity events
 * one-by-one. The §20 leaf calls for a *team activity feed, review
 * checklist, sign-off workflow by stage* — so this card sits above the
 * tab bar and gives the collaborator a single-glance digest:
 *
 *   - 4-stat headline (total activities, distinct contributors, last
 *     24h count, days tracked)
 *   - Action-category roll-up across Discussion / Design / Governance
 *     / Publication, with count + last-event time per category
 *   - Sign-off readiness checklist — five derived signals from the
 *     project's design state (boundary, zones, structures, comments
 *     resolved ratio, scenarios or recent export)
 *   - Contributor leaderboard (top contributors with role chip from
 *     the member roster)
 *   - 4-state verdict pill (signed off / in review / starting /
 *     not started)
 *
 * Self-fetches a 100-event window from `api.activity.list` mirroring
 * the existing ActivityTab pattern. When the user is unauthenticated
 * or the fetch fails, falls back to local-only signals (comments
 * store + design stores) so the card still gives a useful read-back.
 *
 * Pure presentation — single read-only fetch on mount, no entity
 * writes, no mutations to the activity record.
 *
 * Spec: §20 team-activity-feed (featureManifest line 481).
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useCommentStore } from '../../store/commentStore.js';
import { useMemberStore } from '../../store/memberStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useScenarioStore } from '../../store/scenarioStore.js';
import { api } from '../../lib/apiClient.js';
import type { ActivityRecord, ActivityAction, ProjectRole } from '@ogden/shared';
import css from './TeamActivityDigestCard.module.css';

interface Props {
  project: LocalProject;
}

/* ── Tunables ────────────────────────────────────────────────────── */

const FETCH_LIMIT = 100;
const RECENT_WINDOW_HOURS = 24;
const STALE_DAYS = 30;
const RESOLVED_RATIO_TARGET = 0.8;
const TOP_CONTRIBUTORS = 4;

/* ── Action categorisation ───────────────────────────────────────── */

type ActionCategory = 'discussion' | 'design' | 'governance' | 'publication';

const ACTION_CATEGORY: Record<ActivityAction, ActionCategory> = {
  comment_added: 'discussion',
  comment_resolved: 'discussion',
  comment_deleted: 'discussion',
  suggestion_created: 'discussion',
  suggestion_approved: 'discussion',
  suggestion_rejected: 'discussion',
  feature_created: 'design',
  feature_updated: 'design',
  feature_deleted: 'design',
  member_joined: 'governance',
  member_removed: 'governance',
  role_changed: 'governance',
  export_generated: 'publication',
};

const CATEGORY_LABEL: Record<ActionCategory, string> = {
  discussion: 'Discussion',
  design: 'Design changes',
  governance: 'Governance',
  publication: 'Publication',
};

const CATEGORY_BLURB: Record<ActionCategory, string> = {
  discussion: 'Comments, suggestions, threads',
  design: 'Feature creates, edits, deletes',
  governance: 'Members joined, removed, roles changed',
  publication: 'Exports and snapshots generated',
};

const CATEGORY_CLS: Record<ActionCategory, string> = {
  discussion: css.catDiscussion!,
  design: css.catDesign!,
  governance: css.catGovernance!,
  publication: css.catPublication!,
};

/* ── Verdict ─────────────────────────────────────────────────────── */

type Verdict = 'unknown' | 'starting' | 'review' | 'signed';

const VERDICT_CFG: Record<Verdict, { label: string; cls: string; blurb: string }> = {
  signed:   { label: 'Signed off',  cls: css.verdictSigned!,   blurb: 'Most readiness signals met and activity is fresh' },
  review:   { label: 'In review',   cls: css.verdictReview!,   blurb: 'Multiple signals met — keep iterating' },
  starting: { label: 'Starting',    cls: css.verdictStarting!, blurb: 'Few signals yet — early in the review cycle' },
  unknown:  { label: 'Not started', cls: css.verdictUnknown!,  blurb: 'No activity tracked — sign in to enable' },
};

const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: 'Owner',
  designer: 'Designer',
  reviewer: 'Reviewer',
  viewer: 'Viewer',
};

/* ── Helpers ─────────────────────────────────────────────────────── */

function hoursAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 3600000;
}

function daysSince(iso: string): number {
  return hoursAgo(iso) / 24;
}

function formatRelative(iso: string): string {
  const h = hoursAgo(iso);
  if (h < 1) return 'just now';
  if (h < 24) return `${Math.floor(h)}h ago`;
  if (h < 24 * 30) return `${Math.floor(h / 24)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Component ───────────────────────────────────────────────────── */

interface CategoryRoll {
  category: ActionCategory;
  count: number;
  lastAt: string | null;
}

interface ContributorRoll {
  userId: string | null;
  userName: string;
  count: number;
  role: ProjectRole | null;
  lastAt: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
  met: boolean;
  detail: string;
}

export default function TeamActivityDigestCard({ project }: Props) {
  const isAuthenticated = !!useAuthStore((s) => s.user);
  const projectId = project.serverId ?? project.id;

  const allComments = useCommentStore((s) => s.comments);
  const comments = useMemo(
    () => allComments.filter((c) => c.projectId === project.id),
    [allComments, project.id],
  );
  const members = useMemberStore((s) => s.members);

  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === project.id);
  const structures = useStructureStore((s) => s.structures).filter(
    (st) => st.projectId === project.id,
  );
  const scenarios = useScenarioStore((s) => s.scenarios).filter(
    (sc) => sc.projectId === project.id,
  );

  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setIsLoading(true);
    setFetchFailed(false);
    api.activity
      .list(projectId, FETCH_LIMIT, 0)
      .then(({ data }) => {
        if (!cancelled) setActivities(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, isAuthenticated]);

  const totalActivities = activities.length;

  const recent24h = useMemo(
    () => activities.filter((a) => hoursAgo(a.createdAt) <= RECENT_WINDOW_HOURS).length,
    [activities],
  );

  const distinctContributors = useMemo(() => {
    const ids = new Set<string>();
    for (const a of activities) ids.add(a.userId ?? a.userName ?? 'system');
    return ids.size;
  }, [activities]);

  const lastActivityAt = activities[0]?.createdAt ?? null;
  const oldestAt = activities[activities.length - 1]?.createdAt ?? null;
  const daysTracked = oldestAt && lastActivityAt
    ? Math.max(1, Math.round(daysSince(oldestAt) - daysSince(lastActivityAt)))
    : 0;

  const categoryRolls: CategoryRoll[] = useMemo(() => {
    const counts: Record<ActionCategory, { count: number; lastAt: string | null }> = {
      discussion: { count: 0, lastAt: null },
      design: { count: 0, lastAt: null },
      governance: { count: 0, lastAt: null },
      publication: { count: 0, lastAt: null },
    };
    for (const a of activities) {
      const cat = ACTION_CATEGORY[a.action];
      counts[cat].count += 1;
      if (!counts[cat].lastAt || a.createdAt > counts[cat].lastAt!) {
        counts[cat].lastAt = a.createdAt;
      }
    }
    return (['discussion', 'design', 'governance', 'publication'] as ActionCategory[]).map(
      (category) => ({ category, count: counts[category].count, lastAt: counts[category].lastAt }),
    );
  }, [activities]);

  const memberByUserId = useMemo(() => {
    const m = new Map<string, ProjectRole>();
    for (const mem of members) m.set(mem.userId, mem.role);
    return m;
  }, [members]);

  const contributors: ContributorRoll[] = useMemo(() => {
    const map = new Map<string, ContributorRoll>();
    for (const a of activities) {
      const key = a.userId ?? `name:${a.userName ?? 'system'}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        if (a.createdAt > existing.lastAt) existing.lastAt = a.createdAt;
      } else {
        map.set(key, {
          userId: a.userId,
          userName: a.userName ?? 'System',
          count: 1,
          role: a.userId ? memberByUserId.get(a.userId) ?? null : null,
          lastAt: a.createdAt,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, TOP_CONTRIBUTORS);
  }, [activities, memberByUserId]);

  const resolvedRatio = comments.length === 0
    ? 0
    : comments.filter((c) => c.resolved).length / comments.length;

  const recentExport = useMemo(
    () =>
      activities.some(
        (a) => a.action === 'export_generated' && daysSince(a.createdAt) <= STALE_DAYS,
      ),
    [activities],
  );

  const checklist: ChecklistItem[] = useMemo(() => {
    const items: ChecklistItem[] = [
      {
        id: 'boundary',
        label: 'Property boundary captured',
        hint: 'Parcel boundary drawn or imported.',
        met: project.hasParcelBoundary,
        detail: project.hasParcelBoundary ? 'Captured' : 'Not yet drawn',
      },
      {
        id: 'zones',
        label: 'Zones drawn',
        hint: 'At least three land-use zones recorded.',
        met: zones.length >= 3,
        detail: `${zones.length} zone${zones.length === 1 ? '' : 's'}`,
      },
      {
        id: 'structures',
        label: 'Structures placed',
        hint: 'At least one structure on the map.',
        met: structures.length >= 1,
        detail: `${structures.length} structure${structures.length === 1 ? '' : 's'}`,
      },
      {
        id: 'comments',
        label: 'Comments resolved',
        hint: `${Math.round(RESOLVED_RATIO_TARGET * 100)}%+ of comments resolved (or no open threads).`,
        met: comments.length === 0 || resolvedRatio >= RESOLVED_RATIO_TARGET,
        detail:
          comments.length === 0
            ? 'No comment threads'
            : `${Math.round(resolvedRatio * 100)}% resolved (${comments.filter((c) => c.resolved).length}/${comments.length})`,
      },
      {
        id: 'publication',
        label: 'Snapshot or export ready',
        hint: 'Recent export generated or a saved scenario locked in.',
        met: recentExport || scenarios.length >= 1,
        detail: recentExport
          ? 'Recent export logged'
          : scenarios.length >= 1
            ? `${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'} saved`
            : 'No export or scenario yet',
      },
    ];
    return items;
  }, [project.hasParcelBoundary, zones.length, structures.length, comments, resolvedRatio, recentExport, scenarios.length]);

  const metCount = checklist.filter((c) => c.met).length;
  const isFresh = lastActivityAt ? daysSince(lastActivityAt) <= STALE_DAYS : false;

  const verdict: Verdict = useMemo(() => {
    if (!isAuthenticated) return 'unknown';
    if (totalActivities === 0 && metCount === 0) return 'unknown';
    if (metCount >= 4 && (totalActivities === 0 || isFresh)) return 'signed';
    if (metCount >= 2) return 'review';
    return 'starting';
  }, [isAuthenticated, totalActivities, metCount, isFresh]);

  return (
    <section className={css.card!} aria-labelledby="team-activity-digest-title">
      <header className={css.cardHead!}>
        <div>
          <h3 id="team-activity-digest-title" className={css.cardTitle!}>
            Team activity digest
            <span className={css.badge!}>REVIEW</span>
          </h3>
          <p className={css.cardHint!}>
            Rolled-up activity feed plus a sign-off readiness checklist —
            scan recent traffic by category, see who&apos;s contributing, and
            judge whether the design package is ready for sign-off. Pure
            read-back of the activity log and project state.
          </p>
        </div>
        <div className={`${css.verdictPill!} ${VERDICT_CFG[verdict].cls}`}>
          <span className={css.verdictLabel!}>{VERDICT_CFG[verdict].label}</span>
          <span className={css.verdictBlurb!}>{VERDICT_CFG[verdict].blurb}</span>
        </div>
      </header>

      <div className={css.statRow!}>
        <div className={css.statCell!}>
          <span className={css.statLabel!}>Activities</span>
          <span className={css.statValue!}>{totalActivities}</span>
        </div>
        <div className={css.statCell!}>
          <span className={css.statLabel!}>Contributors</span>
          <span className={css.statValue!}>{distinctContributors}</span>
        </div>
        <div className={css.statCell!}>
          <span className={css.statLabel!}>Last 24h</span>
          <span className={css.statValue!}>{recent24h}</span>
        </div>
        <div className={css.statCell!}>
          <span className={css.statLabel!}>Window</span>
          <span className={css.statValue!}>
            {daysTracked > 0 ? `${daysTracked}d` : '—'}
          </span>
        </div>
      </div>

      <div className={css.section!}>
        <div className={css.sectionHead!}>By category</div>
        <div className={css.categoryGrid!}>
          {categoryRolls.map((roll) => (
            <div
              key={roll.category}
              className={`${css.categoryCell!} ${roll.count > 0 ? CATEGORY_CLS[roll.category] : css.categoryEmpty!}`}
            >
              <div className={css.categoryHead!}>
                <span className={css.categoryLabel!}>{CATEGORY_LABEL[roll.category]}</span>
                <span className={css.categoryCount!}>{roll.count}</span>
              </div>
              <div className={css.categoryBlurb!}>{CATEGORY_BLURB[roll.category]}</div>
              <div className={css.categoryFooter!}>
                {roll.lastAt ? `Last: ${formatRelative(roll.lastAt)}` : 'No events yet'}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={css.section!}>
        <div className={css.sectionHead!}>
          Sign-off readiness <span className={css.sectionMeta!}>{metCount} / {checklist.length} met</span>
        </div>
        <ul className={css.checklist!}>
          {checklist.map((item) => (
            <li
              key={item.id}
              className={`${css.checklistItem!} ${item.met ? css.checklistMet! : css.checklistUnmet!}`}
            >
              <span className={css.checklistMark!} aria-hidden="true">
                {item.met ? '✓' : '○'}
              </span>
              <div className={css.checklistBody!}>
                <div className={css.checklistLabel!}>{item.label}</div>
                <div className={css.checklistHint!}>{item.hint}</div>
              </div>
              <span className={css.checklistDetail!}>{item.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      {contributors.length > 0 && (
        <div className={css.section!}>
          <div className={css.sectionHead!}>
            Top contributors
            <span className={css.sectionMeta!}>top {contributors.length}</span>
          </div>
          <ul className={css.contribList!}>
            {contributors.map((c) => (
              <li key={c.userId ?? c.userName} className={css.contribRow!}>
                <span className={css.contribName!}>{c.userName}</span>
                {c.role && (
                  <span className={css.contribRole!}>{ROLE_LABEL[c.role]}</span>
                )}
                <span className={css.contribCount!}>{c.count} event{c.count === 1 ? '' : 's'}</span>
                <span className={css.contribLast!}>{formatRelative(c.lastAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isAuthenticated && (
        <p className={css.note!}>
          Sign in to load the activity log — checklist below is computed from
          local design state only.
        </p>
      )}
      {isAuthenticated && fetchFailed && (
        <p className={css.note!}>
          Activity feed unavailable right now — readiness signals still
          reflect current design state.
        </p>
      )}
      {isAuthenticated && isLoading && totalActivities === 0 && (
        <p className={css.note!}>Loading activity feed…</p>
      )}

      <p className={css.footnote!}>
        <em>Verdict logic:</em> 4+ checklist items met with fresh activity
        (last event within {STALE_DAYS}d) reads as signed off; 2-3 met as in
        review; less than 2 as starting. Unknown when unauthenticated and
        no local design signals are present.
      </p>
    </section>
  );
}
