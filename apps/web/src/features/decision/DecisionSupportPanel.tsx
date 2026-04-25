/**
 * DecisionSupportPanel — feasibility checklist, vision fit analysis,
 * blocking/advisory constraints, capital intensity, phasing realism.
 *
 * Consumes financial model, site data, assessment scores, vision fit,
 * and siting rules to provide a comprehensive decision support view.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import { computeAssessmentScores, type ScoredResult } from '../../lib/computeScores.js';
import { computeVisionFit, fitStatusLabel, type FitResult } from '../../lib/visionFit.js';
import { evaluateRules, type ProjectState } from '../rules/RulesEngine.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import RulesPanel from '../rules/RulesPanel.js';
import AccessEfficiencyCard from '../rules/AccessEfficiencyCard.js';
import SafetyBufferRulesCard from '../rules/SafetyBufferRulesCard.js';
import MissingInformationChecklistCard from './MissingInformationChecklistCard.js';
import p from '../../styles/panel.module.css';
import s from './DecisionSupportPanel.module.css';

interface DecisionSupportPanelProps {
  project: LocalProject;
}

type CheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';

interface ChecklistItem {
  label: string;
  status: CheckStatus;
  note: string;
}

interface FloodWetlandSummary {
  flood_zone?: string;
  has_significant_wetland?: boolean;
}

export default function DecisionSupportPanel({ project }: DecisionSupportPanelProps) {
  const structures = useStructureStore((st) => st.structures).filter((st) => st.projectId === project.id);
  const zones = useZoneStore((st) => st.zones).filter((z) => z.projectId === project.id);
  const paddocks = useLivestockStore((st) => st.paddocks).filter((pk) => pk.projectId === project.id);
  const crops = useCropStore((st) => st.cropAreas).filter((c) => c.projectId === project.id);
  const paths = usePathStore((st) => st.paths).filter((pa) => pa.projectId === project.id);
  const utilities = useUtilityStore((st) => st.utilities).filter((u) => u.projectId === project.id);

  const siteData = useSiteData(project.id);
  const model = useFinancialModel(project.id);
  const getProjectPhases = usePhaseStore((st) => st.getProjectPhases);
  const phases = getProjectPhases(project.id);

  // Assessment scores
  const scores: ScoredResult[] = useMemo(() => {
    if (!siteData?.layers) return [];
    return computeAssessmentScores(siteData.layers, project.acreage);
  }, [siteData, project.acreage]);

  // Vision fit
  const fitResults = useMemo(() => {
    return computeVisionFit(project.projectType, scores);
  }, [project.projectType, scores]);

  // Rule violations
  const violations = useMemo(() => {
    const state: ProjectState = {
      hasBoundary: project.hasParcelBoundary,
      structures,
      zones,
      paddocks,
      crops,
      paths,
      utilities,
      siteData: siteData ?? null,
      projectCenter: null,
      projectType: project.projectType,
    };
    return evaluateRules(state);
  }, [project, structures, zones, paddocks, crops, paths, utilities, siteData]);

  // Flood/wetland for blocking constraints
  const floodWetland = siteData ? getLayerSummary<FloodWetlandSummary>(siteData, 'wetlands_flood') : null;

  // Feasibility checklist
  const checklist = useMemo(() => {
    const items: ChecklistItem[] = [];

    items.push({
      label: 'Property boundary defined',
      status: project.hasParcelBoundary ? 'pass' : 'fail',
      note: project.hasParcelBoundary ? 'Boundary set' : 'Draw or import a boundary first',
    });

    const hasWell = utilities.some((u) => u.type === 'well_pump');
    const hasWaterTank = utilities.some((u) => u.type === 'water_tank');
    items.push({
      label: 'Water source planned',
      status: hasWell ? 'pass' : hasWaterTank ? 'warn' : 'fail',
      note: hasWell ? 'Well/pump placed' : hasWaterTank ? 'Tank only \u2014 needs source' : 'No water infrastructure placed',
    });

    const hasSolar = utilities.some((u) => u.type === 'solar_panel');
    const hasGenerator = utilities.some((u) => u.type === 'generator');
    items.push({
      label: 'Energy source planned',
      status: hasSolar ? 'pass' : hasGenerator ? 'warn' : 'unknown',
      note: hasSolar ? 'Solar array placed' : hasGenerator ? 'Generator only \u2014 consider renewables' : 'No energy infrastructure',
    });

    const hasMainRoad = paths.some((pa) => pa.type === 'main_road');
    items.push({
      label: 'Site access planned',
      status: hasMainRoad ? 'pass' : paths.length > 0 ? 'warn' : 'fail',
      note: hasMainRoad ? 'Main road drawn' : paths.length > 0 ? 'Paths exist but no main road' : 'No access paths drawn',
    });

    const hasSeptic = utilities.some((u) => u.type === 'septic');
    const hasDwelling = structures.some((st) => STRUCTURE_TEMPLATES[st.type]?.category === 'dwelling');
    if (hasDwelling) {
      items.push({
        label: 'Septic/waste system planned',
        status: hasSeptic ? 'pass' : 'warn',
        note: hasSeptic ? 'Septic system placed' : 'Dwelling planned without septic \u2014 required for habitation',
      });
    }

    items.push({
      label: 'Land zones defined',
      status: zones.length >= 3 ? 'pass' : zones.length > 0 ? 'warn' : 'unknown',
      note: `${zones.length} zones defined`,
    });

    // Score-based items (only when scores are available)
    const getScore = (name: string) => scores.find((sc) => sc.label === name);

    const agScore = getScore('Agricultural Suitability');
    if (agScore) {
      items.push({
        label: 'Agricultural suitability',
        status: agScore.score >= 60 ? 'pass' : agScore.score >= 35 ? 'warn' : 'fail',
        note: `Score: ${agScore.score} (${agScore.rating})`,
      });
    }

    // Livestock suitability
    if (paddocks.length > 0) {
      const agSc = agScore?.score ?? 0;
      const hasWaterUtil = utilities.some((u) => u.type === 'well_pump' || u.type === 'water_tank');
      const livestockOk = agSc >= 40 && hasWaterUtil && paddocks.some((pk) => pk.species.length > 0);
      items.push({
        label: 'Livestock suitability',
        status: livestockOk ? 'pass' : 'warn',
        note: livestockOk ? 'Paddocks, water, and soil conditions adequate' : 'Verify soil, water, and paddock setup',
      });
    }

    const ecoScore = getScore('Habitat Sensitivity');
    if (ecoScore) {
      items.push({
        label: 'Ecological sensitivity',
        status: ecoScore.score >= 60 ? 'pass' : ecoScore.score >= 35 ? 'warn' : 'fail',
        note: `Score: ${ecoScore.score} (${ecoScore.rating})`,
      });
    }

    const buildScore = getScore('Buildability');
    if (buildScore) {
      items.push({
        label: 'Terrain buildability',
        status: buildScore.score >= 55 ? 'pass' : buildScore.score >= 30 ? 'warn' : 'fail',
        note: `Score: ${buildScore.score} (${buildScore.rating})`,
      });
    }

    // Financial viability
    if (model) {
      const beYear = model.breakEven.breakEvenYear.mid;
      items.push({
        label: 'Financial viability (est.)',
        status: beYear != null && beYear <= 5 ? 'pass' : beYear != null && beYear <= 8 ? 'warn' : 'fail',
        note: beYear != null ? `Break-even Year ${beYear}` : 'Break-even beyond 10 years',
      });
    }

    return items;
  }, [project, structures, zones, paddocks, crops, paths, utilities, scores, model]);

  const passCount = checklist.filter((c) => c.status === 'pass').length;
  const score = Math.round((passCount / checklist.length) * 100);

  // Blocking constraints
  const blockingItems = useMemo(() => {
    const items: { text: string; source: string }[] = [];

    // From rule violations
    for (const v of violations.filter((v) => v.severity === 'error')) {
      items.push({ text: `${v.title}: ${v.description}`, source: 'Design Rules' });
    }

    // From site data
    if (floodWetland?.flood_zone === 'AE') {
      items.push({ text: 'AE Flood Zone \u2014 structures restricted, insurance mandatory, permits required.', source: 'Flood Layer' });
    }
    if (floodWetland?.has_significant_wetland) {
      items.push({ text: 'Provincially Significant Wetland \u2014 Conservation Authority review required.', source: 'Wetland Layer' });
    }

    // From checklist fails
    for (const c of checklist.filter((c) => c.status === 'fail')) {
      items.push({ text: `${c.label}: ${c.note}`, source: 'Feasibility' });
    }

    return items;
  }, [violations, floodWetland, checklist]);

  // Advisory items
  const advisoryItems = useMemo(() => {
    const items: { text: string; source: string }[] = [];

    for (const v of violations.filter((v) => v.severity === 'warning' || v.severity === 'info')) {
      items.push({ text: `${v.title}: ${v.suggestion}`, source: v.category });
    }

    for (const c of checklist.filter((c) => c.status === 'warn' || c.status === 'unknown')) {
      items.push({ text: `${c.label}: ${c.note}`, source: 'Feasibility' });
    }

    return items;
  }, [violations, checklist]);

  // Capital intensity
  const capitalIntensity = useMemo(() => {
    if (!model) return null;
    const total = model.totalInvestment.mid;
    const peak = Math.abs(model.breakEven.peakNegativeCashflow.mid);
    let label: string;
    let color: string;

    if (total < 100000) {
      label = 'Low';
      color = 'var(--color-confidence-high)';
    } else if (total < 300000) {
      label = 'Moderate';
      color = 'var(--color-confidence-medium)';
    } else if (total < 600000) {
      label = 'High';
      color = 'var(--color-confidence-low)';
    } else {
      label = 'Very High';
      color = 'var(--color-confidence-low)';
    }

    return { total, peak, label, color };
  }, [model]);

  // Phasing realism score
  const phasingScore = useMemo(() => {
    return computePhasingRealism(model, phases, scores, violations);
  }, [model, phases, scores, violations]);

  return (
    <div className={p.container}>
      <h2 className={p.title}>Decision Support</h2>

      {/* Feasibility score */}
      <div className={`${p.card} ${p.row} ${p.mb20}`} style={{ gap: 16, padding: 16, borderRadius: 10 }}>
        <div className={`${p.scoreCircle} ${score >= 70 ? p.scoreCircleHigh : score >= 40 ? p.scoreCircleMed : p.scoreCircleLow}`}>
          <span className={p.scoreValue}>{score}</span>
        </div>
        <div>
          <div className={`${p.text14} ${p.fontSemibold}`} style={{ color: 'var(--color-panel-text)' }}>Feasibility Score</div>
          <div className={`${p.text11} ${p.muted}`}>{passCount} of {checklist.length} items resolved</div>
        </div>
      </div>

      {/* Feasibility checklist */}
      <h3 className={p.sectionLabel}>Feasibility Checklist</h3>
      <div className={`${p.section} ${p.mb20}`}>
        {checklist.map((item, i) => (
          <div key={i} className={p.card} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 6 }}>
            <span className={p.text14} style={{ flexShrink: 0, marginTop: 1 }}>
              {item.status === 'pass' ? '\u2705' : item.status === 'warn' ? '\u26A0\uFE0F' : item.status === 'fail' ? '\u274C' : '\u2753'}
            </span>
            <div>
              <div className={`${p.text12} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)' }}>{item.label}</div>
              <div className={`${p.text10} ${p.muted}`}>{item.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Missing information checklist */}
      <MissingInformationChecklistCard project={project} />

      {/* Vision fit analysis */}
      {fitResults.length > 0 && (
        <>
          <h3 className={p.sectionLabel}>Vision Fit Analysis</h3>
          <div className={`${p.section} ${p.mb20}`}>
            {fitResults.map((fit) => (
              <FitResultRow key={fit.scoreName} fit={fit} />
            ))}
          </div>
        </>
      )}

      {/* What must be solved first */}
      <h3 className={p.sectionLabel}>What Must Be Solved First</h3>
      {blockingItems.length > 0 ? (
        <div className={`${s.blockingSection} ${p.mb20}`}>
          {blockingItems.map((item, i) => (
            <div key={i} className={s.constraintItem}>
              <span className={s.constraintDot} style={{ background: 'var(--color-confidence-low)' }} />
              <div className={s.constraintContent}>
                <span className={s.constraintText}>{item.text}</span>
                <span className={s.constraintSource}>{item.source}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`${p.card} ${p.mb20}`} style={{ padding: '12px 14px', borderLeft: '3px solid var(--color-confidence-high)' }}>
          <div className={`${p.text12}`} style={{ color: 'var(--color-confidence-high)' }}>No blocking constraints detected</div>
          <div className={`${p.text10} ${p.muted}`}>All critical requirements are currently met.</div>
        </div>
      )}

      {/* What can wait */}
      {advisoryItems.length > 0 && (
        <>
          <h3 className={p.sectionLabel}>What Can Wait</h3>
          <div className={`${s.advisorySection} ${p.mb20}`}>
            {advisoryItems.slice(0, 8).map((item, i) => (
              <div key={i} className={s.constraintItem}>
                <span className={s.constraintDot} style={{ background: 'var(--color-confidence-medium)' }} />
                <div className={s.constraintContent}>
                  <span className={s.constraintText}>{item.text}</span>
                  <span className={s.constraintSource}>{item.source}</span>
                </div>
              </div>
            ))}
            {advisoryItems.length > 8 && (
              <div className={`${p.text10} ${p.muted}`} style={{ padding: '4px 0' }}>
                +{advisoryItems.length - 8} more advisory items
              </div>
            )}
          </div>
        </>
      )}

      {/* Capital intensity */}
      {capitalIntensity && (
        <>
          <h3 className={p.sectionLabel}>Capital Intensity (est.)</h3>
          <div className={s.capitalCard} style={{ borderLeftColor: capitalIntensity.color }}>
            <div className={s.capitalHeader}>
              <span className={s.capitalLabel} style={{ color: capitalIntensity.color }}>{capitalIntensity.label}</span>
              <span className={s.capitalTotal}>${Math.round(capitalIntensity.total / 1000)}K total investment</span>
            </div>
            <div className={`${p.text10} ${p.muted}`}>
              Peak cash outlay: ${Math.round(capitalIntensity.peak / 1000)}K
            </div>
          </div>
        </>
      )}

      {/* Phasing realism */}
      {phasingScore != null && (
        <>
          <h3 className={p.sectionLabel}>Phasing Realism</h3>
          <div className={`${p.card} ${p.row} ${p.mb20}`} style={{ gap: 12, padding: 12, borderRadius: 8 }}>
            <div className={`${p.scoreCircle} ${phasingScore.score >= 60 ? p.scoreCircleHigh : phasingScore.score >= 40 ? p.scoreCircleMed : p.scoreCircleLow}`}>
              <span className={p.scoreValue}>{phasingScore.score}</span>
            </div>
            <div>
              <div className={`${p.text12} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)' }}>{phasingScore.label}</div>
              <div className={`${p.text10} ${p.muted}`}>{phasingScore.description}</div>
            </div>
          </div>
        </>
      )}

      {/* Design rules (inline) */}
      <h3 className={p.sectionLabel}>Design Rules</h3>
      <AccessEfficiencyCard project={project} />
      <SafetyBufferRulesCard project={project} />
      <RulesPanel project={project} />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────

function FitResultRow({ fit }: { fit: FitResult }) {
  const statusClass = fit.status === 'strong' ? s.fitResultGood : fit.status === 'challenge' ? s.fitResultBad : s.fitResultModerate;
  const weightColors: Record<string, string> = {
    critical: 'var(--color-confidence-low)',
    important: 'var(--color-confidence-medium)',
    supportive: 'var(--color-text-muted)',
  };

  return (
    <div className={`${s.fitResultRow} ${statusClass}`}>
      <div className={s.fitResultMain}>
        <span className={s.fitResultName}>{fit.scoreName}</span>
        <span className={s.fitResultStatus}>{fitStatusLabel(fit.status)}</span>
      </div>
      <div className={s.fitResultMeta}>
        <span className={s.fitResultScores}>
          {fit.actual} / {fit.threshold} threshold
        </span>
        <span className={s.weightBadge} style={{ color: weightColors[fit.weight] }}>
          {fit.weight}
        </span>
        <span className={`${p.text10} ${p.muted}`}>
          {fit.confidence} conf.
        </span>
      </div>
    </div>
  );
}

// ─── Logic ───────────────────────────────────────────────────────────────

interface PhasingResult {
  score: number;
  label: string;
  description: string;
}

function computePhasingRealism(
  model: ReturnType<typeof useFinancialModel>,
  phases: { id: string; name: string }[],
  scores: ScoredResult[],
  violations: ReturnType<typeof evaluateRules>,
): PhasingResult | null {
  if (!model) return null;

  let score = 70;

  // Phase 1 > 60% of cost
  if (model.cashflow.length >= 2) {
    const cf0 = model.cashflow[0];
    const cf1 = model.cashflow[1];
    const phase1Cost = (cf0?.capitalCosts.mid ?? 0) + (cf1?.capitalCosts.mid ?? 0);
    const totalCost = model.totalInvestment.mid;
    if (totalCost > 0 && phase1Cost / totalCost > 0.6) {
      score -= 15;
    }
  }

  // Design complexity
  const complexityScore = scores.find((sc) => sc.label === 'Design Complexity');
  if (complexityScore && complexityScore.score > 70) {
    score -= 10;
  }

  // Few phases
  if (phases.length < 2) {
    score -= 10;
  }

  // Blocking violations in Phase 1
  const phase1Violations = violations.filter((v) => v.severity === 'error');
  if (phase1Violations.length > 0) {
    score -= 15;
  }

  // High capital with few phases
  if (model.totalInvestment.mid > 500000 && phases.length <= 2) {
    score -= 10;
  }

  // Long timespan is good
  if (phases.length >= 4) {
    score += 10;
  }

  score = Math.max(0, Math.min(100, score));

  let label: string;
  let description: string;

  if (score >= 70) {
    label = 'Well-Phased';
    description = 'Capital is distributed across phases with manageable early investment.';
  } else if (score >= 45) {
    label = 'Needs Adjustment';
    description = 'Phase distribution could be improved. Consider spreading investment across more phases.';
  } else {
    label = 'Over-Concentrated';
    description = 'Most investment is front-loaded. Break Phase 1 into smaller, sequenced stages.';
  }

  return { score, label, description };
}
