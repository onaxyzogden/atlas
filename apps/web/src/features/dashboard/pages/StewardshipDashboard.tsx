/**
 * StewardshipDashboard — Regenerative goals wired to scoring engine,
 * action items from opportunity analysis, honest progress reporting.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../store/siteDataStore.js';
import { computeAssessmentScores, computeOverallScore, deriveOpportunities } from '../../../lib/computeScores.js';
import type { ScoredResult } from '../../../lib/computeScores.js';
import ProgressBar from '../components/ProgressBar.js';
import css from './StewardshipDashboard.module.css';
import { status as statusToken } from '../../../lib/tokens.js';

interface StewardshipDashboardProps {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface SoilsSummary { organic_matter_pct?: number | string; }

interface SoilRegenSummary {
  carbonSequestration?: {
    totalAnnualSeq_tCyr?: number;
  };
}

function scoreQuality(score: number): string {
  if (score >= 85) return 'Exceptional';
  if (score >= 65) return 'Good';
  if (score >= 50) return 'Moderate';
  return 'Developing';
}

export default function StewardshipDashboard({ project, onSwitchToMap }: StewardshipDashboardProps) {
  const siteData = useSiteData(project.id);

  // Compute all 7 scores from scoring engine
  const scores = useMemo((): ScoredResult[] => {
    if (!siteData?.layers?.length) return [];
    return computeAssessmentScores(siteData.layers, project.acreage ?? null);
  }, [siteData, project.acreage]);

  // Overall readiness score
  const overallScore = useMemo(() => {
    if (!scores.length) return 0;
    return computeOverallScore(scores);
  }, [scores]);

  const overallQuality = scoreQuality(overallScore);

  // Average confidence across all scores
  const avgConfidence = useMemo(() => {
    if (!scores.length) return 'low' as const;
    const confMap = { high: 3, medium: 2, low: 1 };
    const avg = scores.reduce((sum, s) => sum + confMap[s.confidence], 0) / scores.length;
    if (avg >= 2.5) return 'high' as const;
    if (avg >= 1.5) return 'medium' as const;
    return 'low' as const;
  }, [scores]);

  // Extract individual scores for goal wiring
  const waterScore = scores.find((s) => s.label === 'Water Resilience');
  const habitatScore = scores.find((s) => s.label === 'Habitat Sensitivity');
  const stewardshipScore = scores.find((s) => s.label === 'Stewardship Readiness');

  // Real layer data
  const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
  const soilRegen = siteData ? getLayerSummary<SoilRegenSummary>(siteData, 'soil_regeneration') : null;

  const omRaw = parseFloat(String(soils?.organic_matter_pct ?? ''));
  const om = isFinite(omRaw) ? omRaw : null;
  const annualSeq = soilRegen?.carbonSequestration?.totalAnnualSeq_tCyr ?? null;

  // Wire goals to real data
  const goals = useMemo(() => {
    // Carbon: annual sequestration relative to target (0.5 tC/yr per hectare as baseline target)
    const acreage = project.acreage ?? 10;
    const targetSeq = acreage * 0.5;
    const carbonProgress = annualSeq !== null
      ? Math.min(100, Math.round((annualSeq / targetSeq) * 100))
      : null;

    // Biodiversity: from Habitat Sensitivity score
    const habitatProgress = habitatScore ? Math.round(habitatScore.score) : null;

    // Water: from Water Resilience score
    const waterProgress = waterScore ? Math.round(waterScore.score) : null;

    // Soil OM: percentage towards 6% target
    const omProgress = om !== null
      ? Math.min(100, Math.round((om / 6) * 100))
      : null;

    return [
      { name: 'Carbon Sequestration', target: annualSeq !== null ? `${annualSeq.toFixed(2)} tC/yr` : 'Pending analysis', progress: carbonProgress, color: statusToken.good },
      { name: 'Biodiversity Index', target: habitatScore ? habitatScore.rating : 'Pending data', progress: habitatProgress, color: statusToken.good },
      { name: 'Water Retention', target: waterScore ? waterScore.rating : 'Pending data', progress: waterProgress, color: statusToken.good },
      { name: 'Soil Organic Matter', target: om !== null ? `${om.toFixed(1)}% (target: >6%)` : 'Pending soil data', progress: omProgress, color: statusToken.moderate },
      { name: 'Zero External Inputs', target: 'Requires field verification', progress: null, color: 'rgba(180,165,140,0.3)' },
    ];
  }, [annualSeq, habitatScore, waterScore, om, project.acreage]);

  // Derive action items from opportunity analysis
  const actionItems = useMemo(() => {
    if (!siteData?.layers?.length) return [];
    const opps = deriveOpportunities(siteData.layers, (project.country as 'US' | 'CA') || 'US');
    return opps.slice(0, 4).map((opp) => ({
      priority: opp.severity === 'critical' ? 'High' : opp.severity === 'warning' ? 'Medium' : 'Standard',
      task: opp.message,
      source: opp.layerSource ?? 'General',
      category: opp.category,
    }));
  }, [siteData, project.country]);

  return (
    <div className={css.page}>
      <h1 className={css.title}>Stewardship Protocol</h1>
      <p className={css.desc}>
        Track regenerative goals and land stewardship commitments. Progress is derived from
        environmental layer analysis and scoring engine computations.
      </p>

      {/* Headline — Stewardship Readiness Score */}
      <div className={css.headlineCard}>
        <div className={css.headlineScoreWrap}>
          <svg width={100} height={100} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
            <circle
              cx={50} cy={50} r={42}
              fill="none"
              stroke={statusToken.good}
              strokeWidth={4}
              strokeDasharray={`${(overallScore / 100) * 264} 264`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 600ms ease' }}
            />
            <text x={50} y={46} textAnchor="middle" fill="rgba(232,220,200,0.95)" fontSize={28} fontWeight={600} fontFamily="var(--font-display, 'Lora', Georgia, serif)">{overallScore}</text>
            <text x={50} y={62} textAnchor="middle" fill="rgba(180,165,140,0.4)" fontSize={10}>/100</text>
          </svg>
        </div>
        <div className={css.headlineInfo}>
          <span className={css.headlineLabel}>STEWARDSHIP READINESS</span>
          <span className={css.headlineRating}>{overallQuality}</span>
          <span className={css.headlineConf}>Confidence: {avgConfidence}</span>
        </div>
      </div>

      {/* Regenerative Goals */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>REGENERATIVE GOALS</h3>
        <div className={css.goalsCard}>
          {goals.map((g) => (
            <div key={g.name} className={css.goalItem}>
              <div className={css.goalHeader}>
                <span className={css.goalName}>{g.name}</span>
                <span className={css.goalTarget}>{g.target}</span>
              </div>
              {g.progress !== null ? (
                <ProgressBar label="" value={g.progress} color={g.color} />
              ) : (
                <div className={css.goalPending}>No data available — requires field verification</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Items — from opportunity analysis */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>RECOMMENDED ACTIONS</h3>
        {actionItems.length > 0 ? (
          <div className={css.actionTable}>
            <div className={css.actionHeaderRow}>
              <span>Priority</span>
              <span>Action</span>
              <span>Source</span>
            </div>
            {actionItems.map((a, i) => (
              <div key={i} className={css.actionRow}>
                <span className={a.priority === 'High' ? css.priorityHigh : a.priority === 'Medium' ? css.priorityMed : css.priorityLow}>
                  {a.priority}
                </span>
                <span className={css.actionTask}>{a.task}</span>
                <span className={css.actionSource}>{a.source}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={css.pendingCard}>
            Action items will be generated once environmental layer data is available.
          </div>
        )}
      </div>

      {/* Certification Tracking — placeholder */}
      <div className={css.section}>
        <h3 className={css.sectionLabel}>CERTIFICATION TRACKING</h3>
        <div className={css.certPlaceholder}>
          Connect certification programs to track compliance status.
          Supported frameworks include Ecological Goods & Services, carbon credit registries,
          and organic transition programs.
        </div>
      </div>

      {/* Stewardship quote */}
      <div className={css.quoteCard}>
        <p className={css.quote}>
          &ldquo;To steward is to remember every step taken across the land.&rdquo;
        </p>
      </div>
    </div>
  );
}
