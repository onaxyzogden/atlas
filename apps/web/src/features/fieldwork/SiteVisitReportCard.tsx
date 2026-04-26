/**
 * §17 SiteVisitReportCard — composes a date-stamped, audience-aware site-visit
 * report from fieldworkStore entries + walk routes. Pure presentation: emits
 * markdown text into a copy-pasteable textarea. No PDF, no print, no upload.
 *
 * Two audiences:
 *   - steward-internal: blunt issue list, GPS, measurement detail, "to follow up"
 *   - owner-facing: tone-softened narrative, hides raw issue counts, leads with what was observed
 *
 * Date windows: today / last 7 days / last 30 days / all. Defaults to "last 7 days"
 * as the canonical "this visit" proxy.
 */

import { useMemo, useState, useCallback } from 'react';
import {
  useFieldworkStore,
  type FieldworkEntry,
  type WalkRoute,
} from '../../store/fieldworkStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import css from './SiteVisitReportCard.module.css';

interface Props {
  project: LocalProject;
}

type Audience = 'internal' | 'owner';
type Window = 'today' | '7d' | '30d' | 'all';

const WINDOW_LABELS: Record<Window, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

const WINDOW_HINTS: Record<Window, string> = {
  today: 'Single-visit report. Useful when you walked the site this morning.',
  '7d': 'Standard "this visit" window — captures multi-day site visits.',
  '30d': 'Monthly rollup. Useful for stewardship reviews.',
  all: 'Everything ever logged — typically only for handoff.',
};

const TYPE_LABELS: Record<string, string> = {
  observation: 'Observation',
  question: 'Question',
  measurement: 'Measurement',
  issue: 'Issue',
  soil_sample: 'Soil sample',
  water_issue: 'Water issue',
  structure_issue: 'Structure issue',
  annotation: 'Annotation',
};

const TYPE_OWNER_LABELS: Record<string, string> = {
  observation: 'What I noticed',
  question: 'Open question',
  measurement: 'Measurement taken',
  issue: 'Item flagged',
  soil_sample: 'Soil reading',
  water_issue: 'Water observation',
  structure_issue: 'Structure note',
  annotation: 'Annotation',
};

function windowCutoff(window: Window): number {
  const now = Date.now();
  if (window === 'all') return 0;
  if (window === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (window === '7d') return now - 7 * 24 * 60 * 60 * 1000;
  return now - 30 * 24 * 60 * 60 * 1000;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDistanceM(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r > 0 ? `${h}h ${r}m` : `${h}h`;
}

function buildReport(
  project: LocalProject,
  entries: FieldworkEntry[],
  routes: WalkRoute[],
  audience: Audience,
  window: Window,
): string {
  const lines: string[] = [];
  const today = new Date();

  // ── Header ──
  if (audience === 'internal') {
    lines.push(`# Site Visit Report \u2014 ${project.name}`);
    lines.push('');
    lines.push(`**Date:** ${formatDate(today)}`);
    lines.push(`**Window:** ${WINDOW_LABELS[window]}`);
    lines.push(`**Audience:** Steward-internal`);
  } else {
    lines.push(`# ${project.name} \u2014 Site Visit Notes`);
    lines.push('');
    lines.push(`Visit on ${formatDate(today)}. Sharing what came up while walking the land.`);
  }
  lines.push('');

  // ── Summary ──
  const issueCount = entries.filter((e) =>
    e.type === 'issue' || e.type === 'water_issue' || e.type === 'structure_issue' || e.noteType === 'issue',
  ).length;
  const questionCount = entries.filter((e) => e.type === 'question' || e.noteType === 'question').length;
  const measureCount = entries.filter((e) => e.type === 'measurement' || e.noteType === 'measurement').length;
  const observeCount = entries.filter((e) => e.type === 'observation' || e.noteType === 'observation').length;
  const totalRouteM = routes.reduce((sum, r) => sum + r.distanceM, 0);

  lines.push('## At a glance');
  lines.push('');
  if (audience === 'internal') {
    lines.push(`- ${entries.length} field entries logged`);
    lines.push(`  - ${observeCount} observations \u00B7 ${questionCount} questions \u00B7 ${measureCount} measurements \u00B7 ${issueCount} issues`);
    lines.push(`- ${routes.length} walk route(s), ${formatDistanceM(totalRouteM)} total`);
  } else {
    lines.push(`- ${entries.length} note(s) captured during the visit`);
    if (routes.length > 0) {
      lines.push(`- Walked ${formatDistanceM(totalRouteM)} across ${routes.length} route(s)`);
    }
    if (questionCount > 0) {
      lines.push(`- ${questionCount} open question(s) to follow up on together`);
    }
  }
  lines.push('');

  // ── Entries by type ──
  if (entries.length > 0) {
    const grouped: Record<string, FieldworkEntry[]> = {};
    for (const e of entries) {
      const key = e.noteType ?? e.type;
      if (!grouped[key]) grouped[key] = [];
      grouped[key]!.push(e);
    }

    const ordered = ['observation', 'measurement', 'question', 'issue', 'soil_sample', 'water_issue', 'structure_issue'];
    for (const key of ordered) {
      const list = grouped[key];
      if (!list || list.length === 0) continue;
      const label = audience === 'internal' ? TYPE_LABELS[key] : TYPE_OWNER_LABELS[key];
      lines.push(`## ${label ?? key} (${list.length})`);
      lines.push('');
      for (const e of list) {
        const text = e.notes.trim() || '(no notes)';
        if (audience === 'internal') {
          const gps = e.location[0] !== 0
            ? ` \u2014 GPS ${e.location[1].toFixed(5)}, ${e.location[0].toFixed(5)}`
            : '';
          const verified = e.verified ? ' \u2014 *verified*' : '';
          lines.push(`- ${text}${gps}${verified}`);
        } else {
          lines.push(`- ${text}`);
        }
      }
      lines.push('');
    }
  }

  // ── Walk routes ──
  if (routes.length > 0) {
    lines.push('## Walk routes');
    lines.push('');
    for (const r of routes) {
      const completed = r.completedAt ? '' : ' (in progress)';
      if (audience === 'internal') {
        lines.push(`- **${r.name}** \u2014 ${formatDistanceM(r.distanceM)}, ${formatDuration(r.durationMs)}, ${r.annotations.length} annotation(s)${completed}`);
      } else {
        lines.push(`- ${r.name} \u2014 ${formatDistanceM(r.distanceM)}${completed}`);
      }
    }
    lines.push('');
  }

  // ── Follow-up (steward-internal only) ──
  if (audience === 'internal' && (issueCount > 0 || questionCount > 0)) {
    lines.push('## To follow up');
    lines.push('');
    const followUps = entries.filter((e) =>
      e.type === 'issue' || e.type === 'question' ||
      e.type === 'water_issue' || e.type === 'structure_issue' ||
      e.noteType === 'issue' || e.noteType === 'question',
    );
    for (const e of followUps) {
      const text = e.notes.trim() || '(no notes)';
      lines.push(`- [ ] ${text}`);
    }
    lines.push('');
  }

  // ── Footer ──
  if (audience === 'internal') {
    lines.push('---');
    lines.push(`*Generated ${today.toISOString()} \u00B7 Atlas fieldwork report*`);
  } else {
    lines.push('---');
    lines.push(`Sent ${formatDate(today)}. Happy to walk through any of this together.`);
  }

  return lines.join('\n');
}

export default function SiteVisitReportCard({ project }: Props) {
  const entries = useFieldworkStore((s) => s.entries);
  const walkRoutes = useFieldworkStore((s) => s.walkRoutes);

  const [audience, setAudience] = useState<Audience>('internal');
  const [window, setWindow] = useState<Window>('7d');
  const [copied, setCopied] = useState(false);

  const filteredEntries = useMemo(() => {
    const cutoff = windowCutoff(window);
    return entries
      .filter((e) => e.projectId === project.id && new Date(e.timestamp).getTime() >= cutoff)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [entries, project.id, window]);

  const filteredRoutes = useMemo(() => {
    const cutoff = windowCutoff(window);
    return walkRoutes
      .filter((r) => r.projectId === project.id && new Date(r.startedAt).getTime() >= cutoff)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  }, [walkRoutes, project.id, window]);

  const report = useMemo(
    () => buildReport(project, filteredEntries, filteredRoutes, audience, window),
    [project, filteredEntries, filteredRoutes, audience, window],
  );

  const isEmpty = filteredEntries.length === 0 && filteredRoutes.length === 0;

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(report).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // clipboard API not available
    });
  }, [report]);

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Site Visit Report</h3>
          <p className={css.hint}>
            Compose a date-stamped report from this visit{'\u2019'}s field entries and walk routes.
            Choose an audience and time window; copy the markdown.
          </p>
        </div>
      </div>

      {/* Audience tabs */}
      <div className={css.tabRow}>
        <button
          type="button"
          onClick={() => setAudience('internal')}
          className={audience === 'internal' ? css.tabBtnActive : css.tabBtn}
        >
          Steward-internal
        </button>
        <button
          type="button"
          onClick={() => setAudience('owner')}
          className={audience === 'owner' ? css.tabBtnActive : css.tabBtn}
        >
          Owner-facing
        </button>
      </div>

      <div className={css.audienceNote}>
        {audience === 'internal'
          ? 'Blunt list, GPS coordinates, follow-up checkboxes. For your own records or your team.'
          : 'Narrative tone, no raw GPS, no issue counts. For an owner, neighbor, or stakeholder.'}
      </div>

      {/* Window selector */}
      <div className={css.windowRow}>
        {(['today', '7d', '30d', 'all'] as Window[]).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWindow(w)}
            className={window === w ? css.windowBtnActive : css.windowBtn}
          >
            {WINDOW_LABELS[w]}
          </button>
        ))}
      </div>
      <div className={css.windowHint}>{WINDOW_HINTS[window]}</div>

      {/* Stats strip */}
      <div className={css.statsRow}>
        <div className={css.stat}>
          <div className={css.statValue}>{filteredEntries.length}</div>
          <div className={css.statLabel}>entries</div>
        </div>
        <div className={css.stat}>
          <div className={css.statValue}>{filteredRoutes.length}</div>
          <div className={css.statLabel}>routes</div>
        </div>
        <div className={css.stat}>
          <div className={css.statValue}>
            {formatDistanceM(filteredRoutes.reduce((s, r) => s + r.distanceM, 0))}
          </div>
          <div className={css.statLabel}>walked</div>
        </div>
      </div>

      {isEmpty ? (
        <div className={css.empty}>
          No fieldwork entries or walk routes in the selected window. Capture observations or record a route, then come back.
        </div>
      ) : (
        <>
          <div className={css.previewLabel}>Report preview</div>
          <textarea
            className={css.preview}
            value={report}
            readOnly
            rows={Math.min(24, Math.max(8, report.split('\n').length))}
            aria-label="Site visit report markdown"
          />
          <div className={css.actionRow}>
            <button
              type="button"
              onClick={handleCopy}
              className={css.copyBtn}
            >
              {copied ? 'Copied!' : 'Copy markdown'}
            </button>
            <span className={css.charCount}>{report.length} chars</span>
          </div>
        </>
      )}

      <div className={css.footnote}>
        Pure presentation {'\u2014'} reads from fieldworkStore (entries + walkRoutes). No upload, no PDF, no email send.
        Report is regenerated deterministically from the current entries every time the audience or window changes.
      </div>
    </div>
  );
}
