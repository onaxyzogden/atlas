/**
 * §19 SiteAssessmentExportPreviewCard — chapter-by-chapter readiness preview
 * for the Site Assessment PDF export.
 *
 * The Site Assessment PDF (apps/api/src/services/pdf/templates/siteAssessment.ts)
 * has four chapters: Property Overview, Assessment Scores, Opportunities &
 * Constraints, Data Sources. Today the catalog row only flags binary readiness
 * ("ready" / "fetch site data layers first"). This card breaks that down so
 * the steward can see *which chapter populates from what* and where the gaps
 * are before they generate.
 *
 * Pure derivation — reads project, useAssessment(projectId), and useSiteData
 * (existing hooks). No new endpoint, no shared math, no map overlay.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useAssessment } from '../../hooks/useProjectQueries.js';
import { useSiteData } from '../../store/siteDataStore.js';
import css from './SiteAssessmentExportPreviewCard.module.css';

interface Props {
  project: LocalProject;
}

type ChapterStatus = 'ready' | 'partial' | 'thin' | 'empty';

interface Chapter {
  id: string;
  title: string;
  filledCount: number;
  totalCount: number;
  status: ChapterStatus;
  detail: string;
  fields: { label: string; filled: boolean }[];
}

const STATUS_LABEL: Record<ChapterStatus, string> = {
  ready: 'Ready',
  partial: 'Partial',
  thin: 'Thin',
  empty: 'Empty',
};

function statusFromRatio(filled: number, total: number, threshold = { ready: 0.85, partial: 0.5 }): ChapterStatus {
  if (filled === 0) return 'empty';
  const r = filled / total;
  if (r >= threshold.ready) return 'ready';
  if (r >= threshold.partial) return 'partial';
  return 'thin';
}

function statusClass(s: ChapterStatus): string {
  if (s === 'ready') return css.statusReady ?? '';
  if (s === 'partial') return css.statusPartial ?? '';
  if (s === 'thin') return css.statusThin ?? '';
  return css.statusEmpty ?? '';
}

export default function SiteAssessmentExportPreviewCard({ project }: Props) {
  const { data: assessment } = useAssessment(project.id);
  const siteData = useSiteData(project.id);

  const chapters = useMemo<Chapter[]>(() => {
    // ── Chapter 1: Property Overview ──
    const overviewFields = [
      { label: 'Name', filled: !!project.name && project.name.trim() !== '' },
      { label: 'Project type', filled: !!project.projectType },
      { label: 'Address', filled: !!project.address && project.address.trim() !== '' },
      { label: 'Parcel ID', filled: !!project.parcelId && project.parcelId.trim() !== '' },
      { label: 'Acreage', filled: project.acreage != null && project.acreage > 0 },
      { label: 'Climate region', filled: !!project.metadata?.climateRegion && project.metadata.climateRegion.trim() !== '' },
      { label: 'Bioregion', filled: !!project.metadata?.bioregion && project.metadata.bioregion.trim() !== '' },
      { label: 'Description', filled: !!project.description && project.description.trim() !== '' },
    ];
    const overviewFilled = overviewFields.filter((f) => f.filled).length;

    // ── Chapter 2: Assessment Scores ──
    const breakdown = Array.isArray(assessment?.score_breakdown) ? assessment!.score_breakdown : [];
    const overallScored = assessment?.overall_score != null;
    const scoreFields = [
      { label: 'Overall score', filled: overallScored },
      { label: 'Per-label breakdowns', filled: breakdown.length >= 1 },
      { label: 'Confidence rating', filled: !!assessment?.confidence },
      { label: 'Site-visit recommendation', filled: !!assessment },
    ];
    const scoreFilled = scoreFields.filter((f) => f.filled).length;

    // ── Chapter 3: Opportunities & Constraints ──
    const flags = Array.isArray(assessment?.flags) ? assessment!.flags : [];
    const flagFields = [
      { label: `Flags (${flags.length})`, filled: flags.length > 0 },
      { label: 'Site-visit guidance', filled: !!assessment && assessment.needs_site_visit !== undefined },
    ];
    const flagFilled = flagFields.filter((f) => f.filled).length;

    // ── Chapter 4: Data Sources ──
    const layers = siteData?.layers ?? [];
    const completeLayers = layers.filter((l) => l.fetchStatus === 'complete').length;
    const sourceFields = [
      { label: `Layers fetched (${completeLayers}/${layers.length || '—'})`, filled: completeLayers > 0 },
      { label: 'Live data flag', filled: siteData?.isLive === true },
      { label: 'Attribution metadata', filled: completeLayers > 0 },
    ];
    const sourceFilled = sourceFields.filter((f) => f.filled).length;

    return [
      {
        id: 'overview',
        title: 'Property Overview',
        filledCount: overviewFilled,
        totalCount: overviewFields.length,
        status: statusFromRatio(overviewFilled, overviewFields.length, { ready: 0.75, partial: 0.5 }),
        detail: 'Name, type, address, parcel ID, acreage, climate region, bioregion, description.',
        fields: overviewFields,
      },
      {
        id: 'scores',
        title: 'Assessment Scores',
        filledCount: scoreFilled,
        totalCount: scoreFields.length,
        status: statusFromRatio(scoreFilled, scoreFields.length, { ready: 1.0, partial: 0.5 }),
        detail: assessment
          ? `Overall ${assessment.overall_score != null ? assessment.overall_score.toFixed(1) : '—'} with ${breakdown.length} per-label breakdowns. Confidence: ${assessment.confidence}.`
          : 'Server assessment row not yet written. Tier-3 pipeline must run before scores populate.',
        fields: scoreFields,
      },
      {
        id: 'flags',
        title: 'Opportunities & Constraints',
        filledCount: flagFilled,
        totalCount: flagFields.length,
        status: statusFromRatio(flagFilled, flagFields.length, { ready: 1.0, partial: 0.5 }),
        detail: flags.length === 0 && assessment
          ? 'Assessment ran cleanly with no flags surfaced. Section will render an empty state.'
          : flags.length === 0
          ? 'No flags yet. Generated by the assessment pipeline alongside the score breakdown.'
          : `${flags.length} flag${flags.length === 1 ? '' : 's'} will render, grouped by risk / opportunity / limitation.`,
        fields: flagFields,
      },
      {
        id: 'sources',
        title: 'Data Sources',
        filledCount: sourceFilled,
        totalCount: sourceFields.length,
        status: statusFromRatio(sourceFilled, sourceFields.length, { ready: 1.0, partial: 0.34 }),
        detail: completeLayers === 0
          ? 'No site data layers fetched yet. Visit Site Intelligence and run the data fetch.'
          : `${completeLayers} layer${completeLayers === 1 ? '' : 's'} fetched${siteData?.isLive ? ' (live)' : ' (cached)'}. Each row in the PDF cites its source API.`,
        fields: sourceFields,
      },
    ];
  }, [project, assessment, siteData]);

  const overallReady = chapters.filter((c) => c.status === 'ready').length;
  const overallEmpty = chapters.filter((c) => c.status === 'empty').length;
  const verdict: ChapterStatus = overallReady === chapters.length
    ? 'ready'
    : overallEmpty === chapters.length
    ? 'empty'
    : overallEmpty > 1
    ? 'thin'
    : 'partial';

  return (
    <section className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Site Assessment export — chapter preview</h3>
          <p className={css.hint}>
            Four chapters compose the Site Assessment PDF. Each pulls from a different slice of project state. This preview shows what will populate vs. what will render as &ldquo;not available&rdquo; if you generated right now.
          </p>
        </div>
        <span className={css.modeBadge}>REPORT</span>
      </div>

      <div className={`${css.verdictBanner} ${statusClass(verdict)}`}>
        <div className={css.verdictTitle}>
          {verdict === 'ready' && 'All four chapters will populate.'}
          {verdict === 'partial' && `${overallReady} of ${chapters.length} chapters fully ready.`}
          {verdict === 'thin' && 'Most chapters will render placeholder text.'}
          {verdict === 'empty' && 'PDF will be mostly placeholder content.'}
        </div>
        <div className={css.verdictNote}>
          The PDF still generates — empty chapters fall back to a &ldquo;not available&rdquo; banner. This card flags which sections you&apos;d explain to the recipient.
        </div>
      </div>

      <div className={css.chapterList}>
        {chapters.map((c, i) => (
          <div key={c.id} className={css.chapter}>
            <div className={css.chapterHead}>
              <span className={css.chapterNum}>Ch {i + 1}</span>
              <div className={css.chapterTitleWrap}>
                <span className={css.chapterTitle}>{c.title}</span>
                <span className={css.chapterCount}>{c.filledCount} / {c.totalCount} fields</span>
              </div>
              <span className={`${css.statusPill} ${statusClass(c.status)}`}>{STATUS_LABEL[c.status]}</span>
            </div>
            <div className={css.chapterDetail}>{c.detail}</div>
            <div className={css.fieldGrid}>
              {c.fields.map((f, j) => (
                <div key={j} className={`${css.fieldRow} ${f.filled ? css.fieldFilled : css.fieldMissing}`}>
                  <span className={css.fieldDot} aria-hidden>{f.filled ? '✓' : '—'}</span>
                  <span className={css.fieldLabel}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={css.assumption}>
        Chapter mapping mirrors the four <code>&lt;h2&gt;</code> sections in <code>siteAssessment.ts</code>: Property Overview, Assessment Scores, Opportunities &amp; Constraints, Data Sources. Score and flag chapters depend on the server-side Tier-3 pipeline writing a <code>site_assessments</code> row — they stay thin until that runs even if local layers are present.
      </div>
    </section>
  );
}
