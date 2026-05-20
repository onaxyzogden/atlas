/**
 * LandAssessmentSlideUp — full-screen slide-up pane showing the land
 * assessment scores for the current project.
 *
 * Surfaces the 8 core assessment dimensions prominently, with the
 * weight-0 diagnostic facets (sub-resilience scores + formal classifications
 * — FAO/USDA/Canada) collapsed under a `<details>` panel to keep the
 * surface honest to the "Eight-dimension assessment" promise without
 * losing the underlying detail.
 *
 * Triggered by clicking the LevelNavigatorBar center element when on a
 * /v3/project/:projectId route. Data pipeline mirrors SiteIntelligencePanel:
 *   useSiteData(projectId) → layers
 *   computeAssessmentScores(layers, acreage, country) → ScoredResult[]
 *
 * Each score row expands to show per-indicator breakdowns with human-readable
 * descriptions (SCORE_COMPONENT_DESCRIPTIONS) and Lucide icons
 * (SCORE_COMPONENT_ICONS) from scoreComponentMeta.ts.
 *
 * ESC and backdrop-click close the sheet.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { AssessmentScore } from '../../lib/computeScores.js';
import { computeAssessmentScores } from '../../lib/computeScores.js';
import { useSiteData } from '../../store/siteDataStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import {
  SCORE_COMPONENT_DESCRIPTIONS,
  SCORE_COMPONENT_ICONS,
} from '../../data/scoreComponentMeta.js';
import css from './LandAssessmentSlideUp.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_LAYERS: never[] = [];

/**
 * The 8 core assessment dimensions returned first by
 * `computeAssessmentScores`. Anything outside this set (water-resilience
 * sub-facets and formal classification systems — FAO / USDA / Canada Soil
 * Capability) is weighted 0 in the overall score and shown collapsed
 * under a "Diagnostic facets" disclosure.
 *
 * Kept here rather than exported from shared/scoring so this UX choice
 * doesn't leak into API surfaces.
 */
const CORE_EIGHT_LABELS: ReadonlySet<string> = new Set([
  'Water Resilience',
  'Agricultural Suitability',
  'Regenerative Potential',
  'Buildability',
  'Habitat Sensitivity',
  'Stewardship Readiness',
  'Community Suitability',
  'Design Complexity',
]);

/**
 * "Pending data" replaces the noisier "Insufficient Data / 25" badge that
 * the 5/20 walkthrough flagged on cold-start projects. We key off the
 * `Insufficient Data` rating (score < 30 per `ratingFromScore`) — formal
 * classification systems (FAO / USDA / Canada) override `rating` with their
 * own class strings, so they are never reclassified as pending.
 */
function isPending(item: AssessmentScore): boolean {
  return item.rating === 'Insufficient Data';
}

/** Mirrors getScoreColor from _helpers.ts — token values. */
function getScoreColor(score: number): string {
  if (score >= 80) return '#2d7a4f';
  if (score >= 60) return '#d4af5f';
  return '#9b3a2a';
}

function formatName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const MTC_FALLBACK: LocalProject = {
  id: 'mtc',
  name: 'Moontrance Creek',
  description: null,
  status: 'active',
  projectType: null,
  country: 'CA',
  provinceState: 'ON',
  conservationAuthId: null,
  address: null,
  parcelId: null,
  acreage: null,
  dataCompletenessScore: null,
  hasParcelBoundary: false,
  createdAt: '',
  updatedAt: '',
  parcelBoundaryGeojson: null,
  ownerNotes: null,
  zoningNotes: null,
  accessNotes: null,
  waterRightsNotes: null,
  visionStatement: null,
  units: 'metric',
  attachments: [],
};

// ─── Score list ────────────────────────────────────────────────────────────────

interface ScoreListProps {
  scores: AssessmentScore[];
  expandedScore: string | null;
  onToggle: (label: string) => void;
}

function LandAssessmentScoresList({ scores, expandedScore, onToggle }: ScoreListProps) {
  if (scores.length === 0) {
    return (
      <div className={css.emptyState}>
        <span>No assessment data available for this project yet.</span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>
          Add site layers to compute scores.
        </span>
      </div>
    );
  }

  return (
    <div className={css.scoreList}>
      {scores.map((item) => {
        const isExpanded = expandedScore === item.label;
        const pending = isPending(item);
        const color = pending ? '#7a7a7a' : getScoreColor(item.score);

        return (
          <div key={item.label}>
            {/* ── Collapsed row ── */}
            <div
              className={`${css.scoreRow} ${isExpanded ? css.scoreRowExpanded : ''}`}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              onClick={() => onToggle(item.label)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle(item.label);
                }
              }}
            >
              {/* Score circle */}
              <div
                className={css.scoreCircle}
                style={{ background: `${color}22`, color }}
              >
                {pending ? '—' : item.score}
              </div>

              {/* Meta */}
              <div className={css.scoreMeta}>
                <div className={css.scoreLabel}>{item.label}</div>
                <div className={css.scoreBar}>
                  <div
                    className={css.scoreBarFill}
                    style={{ width: `${pending ? 0 : item.score}%`, background: color }}
                  />
                </div>
                {item.dataSources.length > 0 && (
                  <div className={css.scoreTagList}>
                    {item.dataSources.map((src) => (
                      <span key={src} className={css.scoreTag}>
                        {src.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Rating badge ("Pending data" replaces "Insufficient Data / 25"
                  for residual-only rows on a fresh project) */}
              <span
                className={css.scoreBadge}
                style={{ background: `${color}18`, color }}
              >
                {pending ? 'Pending data' : item.rating}
              </span>

              {/* Chevron */}
              <ChevronDown
                className={`${css.chevron} ${isExpanded ? css.chevronOpen : ''}`}
                size={14}
                strokeWidth={2}
              />
            </div>

            {/* ── Breakdown panel ── */}
            {isExpanded && (
              <div className={css.breakdownPanel}>
                {item.score_breakdown.map((comp) => {
                  const Icon = SCORE_COMPONENT_ICONS[comp.name];
                  const description = SCORE_COMPONENT_DESCRIPTIONS[comp.name];
                  const isPenalty = comp.maxPossible < 0;
                  const pct = isPenalty
                    ? 0
                    : comp.maxPossible > 0
                      ? Math.max(0, Math.min(100, (comp.value / comp.maxPossible) * 100))
                      : 0;
                  const compColor = isPenalty && comp.value < 0
                    ? '#9b3a2a'
                    : getScoreColor(pct);

                  // Status label per indicator
                  let statusLabel: string;
                  let statusColor: string;
                  if (isPenalty) {
                    statusLabel = comp.value < 0 ? 'Penalty' : 'Clear';
                    statusColor = comp.value < 0 ? '#9b3a2a' : '#2d7a4f';
                  } else {
                    statusLabel = pct >= 80 ? 'High' : pct >= 50 ? 'Moderate' : 'Low';
                    statusColor = compColor;
                  }

                  return (
                    <div key={comp.name} className={css.breakdownRow}>
                      {/* Icon */}
                      <div className={css.breakdownIcon}>
                        {Icon && <Icon size={14} strokeWidth={1.75} />}
                      </div>

                      {/* Name + description */}
                      <div className={css.breakdownContent}>
                        <span className={css.breakdownName}>
                          {formatName(comp.name)}
                        </span>
                        {description && (
                          <span className={css.breakdownDescription}>
                            {description}
                          </span>
                        )}
                      </div>

                      {/* Score */}
                      <span className={css.breakdownScore}>
                        {comp.value} / {comp.maxPossible}
                      </span>

                      {/* Status badge */}
                      <span
                        className={css.breakdownStatus}
                        style={{
                          background: `${statusColor}18`,
                          color: statusColor,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}

                {item.score_breakdown.length > 0 && (
                  <div className={css.breakdownTimestamp}>
                    Computed {new Date(item.computedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export default function LandAssessmentSlideUp({ projectId, open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [expandedScore, setExpandedScore] = useState<string | null>(null);

  // Data pipeline
  const siteData = useSiteData(projectId);
  const projects = useProjectStore((s) => s.projects);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId || p.serverId === projectId) ?? MTC_FALLBACK,
    [projects, projectId],
  );

  const layers = siteData?.layers ?? EMPTY_LAYERS;

  const scores = useMemo(
    () => computeAssessmentScores(layers, project.acreage ?? null, project.country ?? undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layers, project.acreage, project.country],
  );

  // Partition: 8 core dimensions stay above-the-fold; weight-0 facets
  // (sub-resilience + formal classifications) collapse into a disclosure.
  const { coreScores, diagnosticScores } = useMemo(() => {
    const core: AssessmentScore[] = [];
    const diag: AssessmentScore[] = [];
    for (const s of scores) {
      if (CORE_EIGHT_LABELS.has(s.label)) core.push(s);
      else diag.push(s);
    }
    return { coreScores: core, diagnosticScores: diag };
  }, [scores]);

  // Reset expansion when closed
  useEffect(() => {
    if (!open) setExpandedScore(null);
  }, [open]);

  // ESC to close
  const handleEscape = useCallback(() => { onClose(); }, [onClose]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleEscape(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleEscape]);

  if (!open) return null;

  return (
    <div
      className={css.scrim}
      role="presentation"
      onClick={onClose}
    >
      <aside
        className={css.sheet}
        role="dialog"
        aria-modal="true"
        aria-label="Land Assessment Scores"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className={css.header}>
          <div className={css.titleBlock}>
            <span className={css.eyebrow}>Site Intelligence</span>
            <h2 className={css.title}>Land Assessment</h2>
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-text-muted)',
                marginTop: 2,
              }}
            >
              Eight-dimension assessment, scored against your site layers.
            </span>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={css.close}
            onClick={onClose}
            aria-label="Close land assessment"
          >
            ×
          </button>
        </header>

        {/* Body */}
        <div className={css.body}>
          <LandAssessmentScoresList
            scores={coreScores}
            expandedScore={expandedScore}
            onToggle={(label) =>
              setExpandedScore((prev) => (prev === label ? null : label))
            }
          />

          {diagnosticScores.length > 0 && (
            <details
              style={{
                maxWidth: 900,
                margin: '20px auto 0',
                padding: '0 12px',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-text-muted)',
                  padding: '8px 0',
                  userSelect: 'none',
                }}
              >
                Diagnostic facets ({diagnosticScores.length})
              </summary>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-muted)',
                  margin: '4px 0 8px',
                  lineHeight: 1.5,
                }}
              >
                Weight-0 sub-resilience scores and formal classification
                systems. Informational only — do not roll into the
                eight-dimension assessment above.
              </div>
              <LandAssessmentScoresList
                scores={diagnosticScores}
                expandedScore={expandedScore}
                onToggle={(label) =>
                  setExpandedScore((prev) => (prev === label ? null : label))
                }
              />
            </details>
          )}
        </div>
      </aside>
    </div>
  );
}
