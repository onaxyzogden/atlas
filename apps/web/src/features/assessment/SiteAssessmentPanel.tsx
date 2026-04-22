/**
 * SiteAssessmentPanel — displays computed site scores with confidence indicators.
 *
 * P1 features from Section 4:
 *   - Property suitability, regenerative potential, buildability scores
 *   - Water resilience, agricultural suitability, habitat sensitivity scores
 *   - Risk / opportunity / limitation summaries
 *
 * All scores show confidence levels per Section 0d.
 * Without real data layers, scores are shown as "pending" with low confidence.
 */

import type { ConfidenceLevel } from '@ogden/shared';
import ConfidenceIndicator from './ConfidenceIndicator.js';
import { useAssessment } from '../../hooks/useProjectQueries.js';
import type { LocalProject } from '../../store/projectStore.js';
import p from '../../styles/panel.module.css';
import s from './SiteAssessmentPanel.module.css';

interface ScoreEntry {
  label: string;
  value: number | null; // 0-100 or null if not computed
  confidence: ConfidenceLevel;
  sources: string[];
  description: string;
}

interface AssessmentFlag {
  type: 'risk' | 'opportunity' | 'limitation';
  title: string;
  description: string;
  confidence: ConfidenceLevel;
}

interface SiteAssessmentPanelProps {
  project: LocalProject;
}

const FLAG_TYPE_CONFIG: Record<string, { className: string; icon: string }> = {
  risk: { className: 'flagRisk', icon: '⚠' },
  opportunity: { className: 'flagOpportunity', icon: '✦' },
  limitation: { className: 'flagLimitation', icon: '◆' },
};

export default function SiteAssessmentPanel({ project }: SiteAssessmentPanelProps) {
  // Server-side persisted assessment (primary source when Tier-3 has run).
  const { data: serverAssessment, isLoading, isNotReady, isError } = useAssessment(project.id);

  // Local preview — used when the writer hasn't fired yet or the fetch failed.
  const localScores = computeLocalScores(project);
  const localFlags = computeLocalFlags(project);

  // Prefer the server row when available. Parity with the scorer was proven at
  // |Δ|=0.000 in bundle #12 (see wiki/log 2026-04-22), so no dual-display needed.
  const scores = serverAssessment ? buildServerScores(serverAssessment) : localScores;
  const computedAt = serverAssessment?.computed_at ?? null;
  const overall = serverAssessment?.overall_score ?? null;

  return (
    <div className={p.container}>
      <h3 className={p.sectionLabel}>
        Site Assessment
      </h3>

      {/* Headline — persisted overall score when available */}
      {serverAssessment && overall !== null && (
        <div className={s.notice} style={{ marginBottom: 12 }}>
          <strong>Overall {Number(overall).toFixed(1)}</strong>
          {computedAt && ` · computed ${formatTimestamp(computedAt)}`}
        </div>
      )}

      {isLoading && !serverAssessment && (
        <div className={s.notice} style={{ marginBottom: 12 }}>
          Loading latest assessment…
        </div>
      )}

      {isNotReady && (
        <div className={s.notice} style={{ marginBottom: 12 }}>
          Assessment pending Tier-3 completion. Showing preview based on project metadata.
        </div>
      )}

      {isError && (
        <div className={s.notice} style={{ marginBottom: 12 }}>
          Could not load server-side assessment — showing local preview.
        </div>
      )}

      {/* Score cards */}
      <div className={`${p.section} ${p.sectionGapLg}`}>
        {scores.map((score) => (
          <ScoreCard key={score.label} score={score} />
        ))}
      </div>

      {/* Flags */}
      {localFlags.length > 0 && (
        <div className={p.mb24}>
          <h4 className={p.sectionLabel}>
            Site Flags
          </h4>
          <div className={`${p.section} ${p.sectionGapLg}`}>
            {localFlags.map((flag, i) => (
              <FlagCard key={i} flag={flag} />
            ))}
          </div>
        </div>
      )}

      {/* Data sources notice */}
      {!serverAssessment && (
        <div className={s.notice}>
          <strong>Note:</strong> These preliminary scores are based on available project metadata.
          Full assessment requires Tier 1 data layers (elevation, soils, watershed, climate) which
          will auto-populate when the data pipeline is connected.
        </div>
      )}
    </div>
  );
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

// Shape the persisted `site_assessments` row into the UI's ScoreEntry list.
// Null-safe: each score card falls back to "—" if that axis is unavailable.
function buildServerScores(row: {
  suitability_score: number | null;
  buildability_score: number | null;
  water_resilience_score: number | null;
  ag_potential_score: number | null;
  confidence: 'high' | 'medium' | 'low';
  data_sources_used: string[] | null;
}): ScoreEntry[] {
  const sources = row.data_sources_used ?? ['Tier-3 pipeline'];
  const toNum = (v: number | null): number | null =>
    v === null || v === undefined ? null : Number(v);

  return [
    {
      label: 'Property Suitability',
      value: toNum(row.suitability_score),
      confidence: row.confidence,
      sources,
      description: 'Overall suitability for regenerative land use',
    },
    {
      label: 'Buildability',
      value: toNum(row.buildability_score),
      confidence: row.confidence,
      sources,
      description: 'Feasibility for structures, access, and utilities',
    },
    {
      label: 'Water Resilience',
      value: toNum(row.water_resilience_score),
      confidence: row.confidence,
      sources,
      description: 'Watershed capacity and climate resilience',
    },
    {
      label: 'Agricultural Potential',
      value: toNum(row.ag_potential_score),
      confidence: row.confidence,
      sources,
      description: 'Soils + climate fit for regenerative agriculture',
    },
  ];
}

function ScoreCard({ score }: { score: ScoreEntry }) {
  const barColor =
    score.value === null
      ? 'var(--color-border)'
      : score.value >= 70
        ? 'var(--color-confidence-high)'
        : score.value >= 40
          ? 'var(--color-confidence-medium)'
          : 'var(--color-confidence-low)';

  return (
    <div className={p.card}>
      <div className={`${p.rowBetween} ${p.mb8}`}>
        <span className={p.cardTitle}>{score.label}</span>
        <span
          className={s.scoreValue}
          style={{ color: score.value !== null ? barColor : 'var(--color-text-muted)' }}
        >
          {score.value !== null ? `${score.value}` : '—'}
        </span>
      </div>

      {/* Progress bar */}
      <div className={s.progressTrack}>
        {score.value !== null && (
          <div
            className={s.progressFill}
            style={{ width: `${score.value}%`, background: barColor }}
          />
        )}
      </div>

      <div className={s.scoreDesc}>
        {score.description}
      </div>

      <ConfidenceIndicator confidence={score.confidence} dataSources={score.sources} compact />
    </div>
  );
}

function FlagCard({ flag }: { flag: AssessmentFlag }) {
  const cfg = FLAG_TYPE_CONFIG[flag.type]!;

  return (
    <div className={`${s.flagCard} ${s[cfg.className]}`}>
      <div className={s.flagHeader}>
        <span className={s.flagIcon}>{cfg.icon}</span>
        <span className={s.flagTitle}>{flag.title}</span>
        <ConfidenceIndicator confidence={flag.confidence} compact />
      </div>
      <div className={s.flagDesc}>
        {flag.description}
      </div>
    </div>
  );
}

// ─── Local score computation (preliminary, pre-API) ────────────────────────

function computeLocalScores(project: LocalProject): ScoreEntry[] {
  const hasBoundary = project.hasParcelBoundary;
  const hasAddress = !!project.address;
  const hasZoning = !!project.zoningNotes;
  const hasWater = !!project.waterRightsNotes;

  // Base score from available metadata
  const metadataScore = [hasBoundary, hasAddress, hasZoning, hasWater].filter(Boolean).length;
  const baseConfidence: ConfidenceLevel = metadataScore >= 3 ? 'medium' : 'low';

  return [
    {
      label: 'Property Suitability',
      value: hasBoundary ? 35 + metadataScore * 8 : null,
      confidence: baseConfidence,
      sources: ['Project metadata'],
      description: 'Overall suitability for regenerative land use',
    },
    {
      label: 'Regenerative Potential',
      value: hasBoundary ? 40 + metadataScore * 6 : null,
      confidence: baseConfidence,
      sources: ['Project metadata'],
      description: 'Capacity for ecological restoration and soil improvement',
    },
    {
      label: 'Buildability',
      value: hasAddress ? 30 + metadataScore * 10 : null,
      confidence: baseConfidence,
      sources: hasZoning ? ['Zoning notes', 'Project metadata'] : ['Project metadata'],
      description: 'Feasibility for structures, access, and utilities',
    },
    {
      label: 'Water Resilience',
      value: null,
      confidence: 'low',
      sources: [],
      description: 'Requires watershed and climate data layers',
    },
    {
      label: 'Agricultural Suitability',
      value: null,
      confidence: 'low',
      sources: [],
      description: 'Requires soils and climate data layers',
    },
  ];
}

function computeLocalFlags(project: LocalProject): AssessmentFlag[] {
  const flags: AssessmentFlag[] = [];

  if (!project.hasParcelBoundary) {
    flags.push({
      type: 'limitation',
      title: 'No property boundary',
      description: 'Define a boundary to enable terrain analysis, data layer fetching, and area calculations.',
      confidence: 'high',
    });
  }

  if (!project.zoningNotes) {
    flags.push({
      type: 'risk',
      title: 'Zoning not documented',
      description: 'Zoning constraints may affect permitted uses. Add zoning notes or connect to municipal GIS data.',
      confidence: 'medium',
    });
  }

  if (!project.waterRightsNotes) {
    flags.push({
      type: 'risk',
      title: 'Water rights unknown',
      description: 'Water access is critical for agricultural and retreat operations. Document existing water rights.',
      confidence: 'medium',
    });
  }

  if (project.hasParcelBoundary) {
    flags.push({
      type: 'opportunity',
      title: 'Ready for site analysis',
      description: 'Property boundary is set. Connect Tier 1 data layers to unlock terrain, soils, and climate analysis.',
      confidence: 'high',
    });
  }

  if (project.country === 'CA' && project.provinceState === 'ON') {
    flags.push({
      type: 'opportunity',
      title: 'Ontario Conservation Authority data available',
      description: 'Conservation Halton, CVC, and TRCA datasets can enhance wetland and flood risk analysis.',
      confidence: 'medium',
    });
  }

  return flags;
}
