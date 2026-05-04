/**
 * §26 AuditLogCard — admin / governance audit-trail read-back.
 *
 * Sits alongside MetadataManagementCard but answers a different question:
 * not "what intake fields are filled" but "what governance-sensitive
 * actions have happened on this project, by whom, and how recently".
 *
 * Merges three audit-able streams into one chronological log:
 *   - Version snapshots (useVersionStore) — auto-save / manual checkpoints
 *   - Governance subset of api.activity.list (member_joined,
 *     member_removed, role_changed, feature_deleted, export_generated)
 *   - Attachment uploads from project.attachments
 *
 * Each event lands in one of three severity bands:
 *   - critical : feature_deleted, member_removed, role demotions
 *   - warn     : export_generated, member_joined, attachment uploaded
 *   - info     : snapshots, role promotions
 *
 * Pure presentation — single read-only fetch on mount, no entity writes.
 *
 * Spec: §26 audit-log (featureManifest line 598).
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useVersionStore, type ProjectSnapshot } from '../../store/versionStore.js';
import { useMemberStore } from '../../store/memberStore.js';
import { api } from '../../lib/apiClient.js';
import type { ActivityRecord, ActivityAction, ProjectRole } from '@ogden/shared';
import css from './AuditLogCard.module.css';

interface Props {
  project: LocalProject;
}

/* ── Tunables ────────────────────────────────────────────────────── */

const FETCH_LIMIT = 100;
const RECENT_DAYS = 30;
const TIMELINE_LIMIT = 12;
const SNAPSHOT_FRESH_DAYS = 14;

/* ── Severity ────────────────────────────────────────────────────── */

type Severity = 'critical' | 'warn' | 'info';

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  warn: 'Warn',
  info: 'Info',
};

const SEVERITY_BLURB: Record<Severity, string> = {
  critical: 'Deletions, removals, demotions',
  warn: 'Exports, joins, uploads',
  info: 'Snapshots, promotions, edits',
};

const SEVERITY_CLS: Record<Severity, string> = {
  critical: css.sevCritical!,
  warn: css.sevWarn!,
  info: css.sevInfo!,
};

/* ── Activity governance subset ──────────────────────────────────── */

const GOVERNANCE_ACTIONS: ReadonlyArray<ActivityAction> = [
  'member_joined',
  'member_removed',
  'role_changed',
  'feature_deleted',
  'export_generated',
];

const GOVERNANCE_SET = new Set<ActivityAction>(GOVERNANCE_ACTIONS);

const ROLE_RANK: Record<ProjectRole, number> = {
  owner: 4,
  designer: 3,
  reviewer: 2,
  viewer: 1,
};

function activitySeverity(a: ActivityRecord): Severity {
  if (a.action === 'feature_deleted' || a.action === 'member_removed') return 'critical';
  if (a.action === 'role_changed') {
    const meta = a.metadata ?? {};
    const from = meta.from as ProjectRole | undefined;
    const to = meta.to as ProjectRole | undefined;
    if (from && to && ROLE_RANK[to] < ROLE_RANK[from]) return 'critical';
    return 'info';
  }
  return 'warn';
}

const ACTION_LABEL: Record<ActivityAction, string> = {
  comment_added: 'Comment added',
  comment_resolved: 'Comment resolved',
  comment_deleted: 'Comment deleted',
  feature_created: 'Feature created',
  feature_updated: 'Feature updated',
  feature_deleted: 'Feature deleted',
  member_joined: 'Member joined',
  member_removed: 'Member removed',
  role_changed: 'Role changed',
  export_generated: 'Export generated',
  suggestion_created: 'Suggestion created',
  suggestion_approved: 'Suggestion approved',
  suggestion_rejected: 'Suggestion rejected',
};

/* ── Verdict ─────────────────────────────────────────────────────── */

type Verdict = 'unknown' | 'sparse' | 'monitored' | 'compliant';

const VERDICT_CFG: Record<Verdict, { label: string; cls: string; blurb: string }> = {
  compliant: { label: 'Compliant',  cls: css.verdictCompliant!,  blurb: 'Snapshots fresh, governance trail recorded' },
  monitored: { label: 'Monitored',  cls: css.verdictMonitored!,  blurb: 'Audit trail present, gaps in some streams' },
  sparse:    { label: 'Sparse',     cls: css.verdictSparse!,     blurb: 'Few audit events captured — review before sign-off' },
  unknown:   { label: 'Not started', cls: css.verdictUnknown!,   blurb: 'No snapshots, no governance events recorded' },
};

/* ── Helpers ─────────────────────────────────────────────────────── */

function daysAgo(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86400000;
}

function formatRelative(iso: string): string {
  const d = daysAgo(iso);
  if (d < 1 / 24) return 'just now';
  if (d < 1) return `${Math.floor(d * 24)}h ago`;
  if (d < 30) return `${Math.floor(d)}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Unified event ───────────────────────────────────────────────── */

type EventKind = 'snapshot' | 'activity' | 'attachment';

interface AuditEvent {
  kind: EventKind;
  at: string;
  severity: Severity;
  title: string;
  detail: string;
  actor: string;
}

/* ── Component ───────────────────────────────────────────────────── */

export default function AuditLogCard({ project }: Props) {
  const isAuthenticated = !!useAuthStore((s) => s.user);
  const projectId = project.serverId ?? project.id;

  const allSnapshots = useVersionStore((s) => s.snapshots);
  const snapshots = useMemo<ProjectSnapshot[]>(
    () =>
      allSnapshots
        .filter((s) => s.projectId === project.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [allSnapshots, project.id],
  );

  const members = useMemberStore((s) => s.members);

  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setFetchFailed(false);
    api.activity
      .list(projectId, FETCH_LIMIT, 0)
      .then(({ data }) => {
        if (!cancelled) setActivities(data ?? []);
      })
      .catch(() => {
        if (!cancelled) setFetchFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, isAuthenticated]);

  const governance = useMemo(
    () => activities.filter((a) => GOVERNANCE_SET.has(a.action)),
    [activities],
  );

  const events = useMemo<AuditEvent[]>(() => {
    const out: AuditEvent[] = [];

    for (const s of snapshots) {
      out.push({
        kind: 'snapshot',
        at: s.timestamp,
        severity: 'info',
        title: 'Version snapshot',
        detail: s.label,
        actor: 'system',
      });
    }

    for (const a of governance) {
      const sev = activitySeverity(a);
      const meta = a.metadata ?? {};
      let detail = ACTION_LABEL[a.action];
      if (a.action === 'role_changed' && meta.from && meta.to) {
        detail = `Role ${String(meta.from)} → ${String(meta.to)}`;
      } else if (a.entityType) {
        detail = `${ACTION_LABEL[a.action]} · ${a.entityType}`;
      }
      out.push({
        kind: 'activity',
        at: a.createdAt,
        severity: sev,
        title: ACTION_LABEL[a.action],
        detail,
        actor: a.userName ?? 'unknown',
      });
    }

    for (const att of project.attachments) {
      out.push({
        kind: 'attachment',
        at: att.addedAt,
        severity: 'warn',
        title: 'Attachment uploaded',
        detail: `${att.filename} (${att.type})`,
        actor: 'steward',
      });
    }

    return out.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [snapshots, governance, project.attachments]);

  /* ── Headline stats ─────────────────────────────────────────── */

  const totalEvents = events.length;
  const snapshotCount = snapshots.length;
  const recentGovernance = useMemo(
    () => governance.filter((a) => daysAgo(a.createdAt) <= RECENT_DAYS).length,
    [governance],
  );
  const lastEventAt = events[0]?.at ?? null;

  const lastSnapshotAge = snapshots[0] ? daysAgo(snapshots[0].timestamp) : null;
  const snapshotsFresh = lastSnapshotAge !== null && lastSnapshotAge <= SNAPSHOT_FRESH_DAYS;

  const severityCounts = useMemo<Record<Severity, number>>(() => {
    const c: Record<Severity, number> = { critical: 0, warn: 0, info: 0 };
    for (const e of events) c[e.severity] += 1;
    return c;
  }, [events]);

  const roleChangeCount = governance.filter((a) => a.action === 'role_changed').length;
  const deletionCount = governance.filter((a) => a.action === 'feature_deleted').length;

  /* ── Verdict ────────────────────────────────────────────────── */

  const verdict: Verdict = useMemo(() => {
    if (!isAuthenticated && totalEvents === 0) return 'unknown';
    if (totalEvents === 0) return 'unknown';
    const trailScore =
      (snapshotCount > 0 ? 1 : 0) +
      (governance.length > 0 ? 1 : 0) +
      (snapshotsFresh ? 1 : 0) +
      (recentGovernance > 0 ? 1 : 0);
    if (trailScore >= 3) return 'compliant';
    if (trailScore >= 2) return 'monitored';
    return 'sparse';
  }, [isAuthenticated, totalEvents, snapshotCount, governance.length, snapshotsFresh, recentGovernance]);

  const verdictCfg = VERDICT_CFG[verdict];

  /* ── Render ─────────────────────────────────────────────────── */

  const visibleEvents = events.slice(0, TIMELINE_LIMIT);
  const remainingCount = Math.max(0, events.length - visibleEvents.length);

  return (
    <section className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>
            Audit log
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.hint}>
            Governance-sensitive events on this project — version snapshots, member changes, role transitions, deletions, exports, and attachment uploads — collapsed into one chronological trail.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictCfg.cls}`}>
          <span className={css.verdictLabel}>{verdictCfg.label}</span>
          <span className={css.verdictBlurb}>{verdictCfg.blurb}</span>
        </div>
      </div>

      <div className={css.statRow}>
        <div className={css.statCell}>
          <div className={css.statLabel}>Total events</div>
          <div className={css.statValue}>{totalEvents}</div>
        </div>
        <div className={css.statCell}>
          <div className={css.statLabel}>Snapshots</div>
          <div className={css.statValue}>{snapshotCount}</div>
        </div>
        <div className={css.statCell}>
          <div className={css.statLabel}>Governance · {RECENT_DAYS}d</div>
          <div className={css.statValue}>{recentGovernance}</div>
        </div>
        <div className={css.statCell}>
          <div className={css.statLabel}>Last event</div>
          <div className={css.statValue}>{lastEventAt ? formatRelative(lastEventAt) : '—'}</div>
        </div>
      </div>

      <div className={css.section}>
        <div className={css.sectionHead}>
          Severity bands
          <span className={css.sectionMeta}>{totalEvents} events</span>
        </div>
        <div className={css.severityRow}>
          {(['critical', 'warn', 'info'] as Severity[]).map((s) => (
            <div key={s} className={`${css.severityCell} ${SEVERITY_CLS[s]}`}>
              <div className={css.severityHead}>
                <span className={css.severityLabel}>{SEVERITY_LABEL[s]}</span>
                <span className={css.severityCount}>{severityCounts[s]}</span>
              </div>
              <div className={css.severityBlurb}>{SEVERITY_BLURB[s]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className={css.section}>
        <div className={css.sectionHead}>
          Governance summary
          <span className={css.sectionMeta}>members: {members.length}</span>
        </div>
        <div className={css.govGrid}>
          <div className={css.govCell}>
            <div className={css.govLabel}>Role changes</div>
            <div className={css.govValue}>{roleChangeCount}</div>
          </div>
          <div className={css.govCell}>
            <div className={css.govLabel}>Deletions</div>
            <div className={css.govValue}>{deletionCount}</div>
          </div>
          <div className={css.govCell}>
            <div className={css.govLabel}>Status</div>
            <div className={css.govValue}>{project.status}</div>
          </div>
          <div className={css.govCell}>
            <div className={css.govLabel}>Last snapshot</div>
            <div className={css.govValue}>
              {lastSnapshotAge === null ? '—' : `${Math.floor(lastSnapshotAge)}d ago`}
            </div>
          </div>
        </div>
      </div>

      <div className={css.section}>
        <div className={css.sectionHead}>
          Timeline
          <span className={css.sectionMeta}>most recent {visibleEvents.length}</span>
        </div>
        {visibleEvents.length === 0 ? (
          <div className={css.empty}>
            No audit events yet. Snapshots are recorded automatically as the project evolves; governance events appear once members are invited or roles change.
          </div>
        ) : (
          <ol className={css.timeline}>
            {visibleEvents.map((e, i) => (
              <li key={i} className={`${css.timelineItem} ${SEVERITY_CLS[e.severity]}`}>
                <span className={css.timelineDot} aria-hidden>●</span>
                <div className={css.timelineBody}>
                  <div className={css.timelineTitle}>{e.title}</div>
                  <div className={css.timelineDetail}>{e.detail}</div>
                </div>
                <div className={css.timelineMeta}>
                  <div className={css.timelineActor}>{e.actor}</div>
                  <div className={css.timelineAt}>{formatRelative(e.at)}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
        {remainingCount > 0 && (
          <div className={css.more}>+ {remainingCount} earlier event{remainingCount === 1 ? '' : 's'} not shown</div>
        )}
      </div>

      {!isAuthenticated && (
        <p className={css.note}>
          Sign in to load the server-side governance trail. Local snapshots and attachments are still shown.
        </p>
      )}
      {fetchFailed && isAuthenticated && (
        <p className={css.note}>
          Could not reach the activity service — server-side events are omitted from this view.
        </p>
      )}

      <p className={css.footnote}>
        Severity bands map to admin response thresholds: <em>critical</em> events warrant a review note, <em>warn</em> events are routine but recorded, <em>info</em> is the auto-save baseline. Snapshots prune to the most recent {20} per project (see <code>versionStore.maxSnapshots</code>).
      </p>
    </section>
  );
}
