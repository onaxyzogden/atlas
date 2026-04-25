/**
 * ScenarioPanel — create, compare, and manage what-if scenarios.
 *
 * Financial values are always from the financial modeling engine.
 * Variant config (project type, region, mission focus) is stored as
 * metadata and used to re-weight mission scoring at snapshot time.
 *
 * Features:
 * 1. Financial comparison — total capital, break-even, Year 5 & 10 cashflow
 * 2. Scenario variants — project type, mission weighting presets
 * 3. Design diff — zone/structure/enterprise changes between two scenarios
 * 4. Export stub — PDF export placeholder wired to success state
 * 5. Recommended scenario — scored by financial + mission fit
 */

import { useState, useMemo } from 'react';
import { useScenarioStore, type Scenario } from '../../store/scenarioStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import { useFinancialStore } from '../../store/financialStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import { computeMissionScore } from '../financial/engine/missionScoring.js';
import type { AllFeaturesInput, MissionWeights, MissionScore } from '../financial/engine/types.js';
import { REGION_LABELS, type CostRegion } from '../financial/engine/types.js';
import { computeAssessmentScores } from '../../lib/computeScores.js';
import { computeVisionFit } from '../../lib/visionFit.js';
import { fmtK, formatKRange } from '../../lib/formatRange.js';
import p from '../../styles/panel.module.css';
import s from './ScenarioPanel.module.css';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import BestBaseWorstCaseCard from './BestBaseWorstCaseCard.js';

interface ScenarioPanelProps {
  project: LocalProject;
}

type MissionFocus = 'balanced' | 'financial' | 'ecological' | 'spiritual';
type ExportState = 'idle' | 'loading' | 'done';

const MISSION_WEIGHT_PRESETS: Record<MissionFocus, MissionWeights> = {
  balanced:   { financial: 0.40, ecological: 0.25, spiritual: 0.20, community: 0.15 },
  financial:  { financial: 0.60, ecological: 0.15, spiritual: 0.15, community: 0.10 },
  ecological: { financial: 0.20, ecological: 0.45, spiritual: 0.20, community: 0.15 },
  spiritual:  { financial: 0.20, ecological: 0.25, spiritual: 0.40, community: 0.15 },
};

const PROJECT_TYPE_OPTIONS = [
  { value: '', label: 'Current project type' },
  { value: 'regenerative_farm', label: 'Regenerative Farm' },
  { value: 'retreat_center', label: 'Retreat Center' },
  { value: 'homestead', label: 'Homestead' },
  { value: 'educational_farm', label: 'Educational Farm' },
  { value: 'conservation', label: 'Conservation' },
  { value: 'multi_enterprise', label: 'Multi-Enterprise' },
  { value: 'moontrance', label: 'Moontrance' },
];

const humanize = (str: string) =>
  str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function ScenarioPanel({ project }: ScenarioPanelProps) {
  const allScenarios = useScenarioStore((st) => st.scenarios);
  const scenarios = useMemo(
    () => allScenarios.filter((sc) => sc.projectId === project.id),
    [allScenarios, project.id],
  );
  const addScenario = useScenarioStore((st) => st.addScenario);
  const deleteScenario = useScenarioStore((st) => st.deleteScenario);

  const allZones = useZoneStore((st) => st.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const allStructures = useStructureStore((st) => st.structures);
  const structures = useMemo(() => allStructures.filter((st) => st.projectId === project.id), [allStructures, project.id]);
  const allPaddocks = useLivestockStore((st) => st.paddocks);
  const paddocks = useMemo(() => allPaddocks.filter((pd) => pd.projectId === project.id), [allPaddocks, project.id]);
  const allCrops = useCropStore((st) => st.cropAreas);
  const crops = useMemo(() => allCrops.filter((c) => c.projectId === project.id), [allCrops, project.id]);
  const allPaths = usePathStore((st) => st.paths);
  const paths = useMemo(() => allPaths.filter((pa) => pa.projectId === project.id), [allPaths, project.id]);
  const allUtilities = useUtilityStore((st) => st.utilities);
  const utilities = useMemo(() => allUtilities.filter((u) => u.projectId === project.id), [allUtilities, project.id]);

  const model = useFinancialModel(project.id);
  const currentRegion = useFinancialStore((st) => st.region);
  const siteData = useSiteData(project.id);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [showVariantConfig, setShowVariantConfig] = useState(false);
  const [variantProjectType, setVariantProjectType] = useState('');
  const [variantMissionFocus, setVariantMissionFocus] = useState<MissionFocus>('balanced');

  // Comparison state (up to 2 scenarios selected for design diff)
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Export stub state
  const [exportState, setExportState] = useState<ExportState>('idle');

  // Assessment scores for recommended scenario
  const siteScores = useMemo(() => {
    if (!siteData?.layers) return [];
    return computeAssessmentScores(siteData.layers, project.acreage);
  }, [siteData, project.acreage]);

  const handleCreate = () => {
    if (!name.trim() || !model) return;

    // Build AllFeaturesInput for mission re-scoring with variant weights
    const featureInput: AllFeaturesInput = {
      zones: zones.map(({ id, projectId, name: n, category, areaM2 }) => ({
        id, projectId, name: n, category, areaM2,
      })),
      structures: structures.map(({ id, projectId, name: n, type, phase }) => ({
        id, projectId, name: n, type, phase,
      })),
      paddocks: paddocks.map(({ id, projectId, name: n, areaM2, fencing, species, phase }) => ({
        id, projectId, name: n, areaM2, fencing, species, phase,
      })),
      paths: paths.map(({ id, projectId, name: n, type, lengthM, phase }) => ({
        id, projectId, name: n, type, lengthM, phase,
      })),
      utilities: utilities.map(({ id, projectId, name: n, type, phase }) => ({
        id, projectId, name: n, type, phase,
      })),
      crops: crops.map(({ id, projectId, name: n, type, areaM2, phase }) => ({
        id, projectId, name: n, type, areaM2, phase,
      })),
    };

    // Re-compute mission score with variant weights
    const variantWeights = MISSION_WEIGHT_PRESETS[variantMissionFocus];
    const effectiveMission: MissionScore = computeMissionScore(
      featureInput,
      model.breakEven,
      variantWeights,
    );

    // Build zone/structure detail maps for design diff
    const zoneCategories: Record<string, number> = {};
    for (const z of zones) {
      zoneCategories[z.category] = (zoneCategories[z.category] ?? 0) + 1;
    }
    const structureTypes: Record<string, number> = {};
    for (const st of structures) {
      structureTypes[st.type] = (structureTypes[st.type] ?? 0) + 1;
    }

    const scenario: Scenario = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: name.trim(),
      description: desc.trim(),
      isBaseline: scenarios.length === 0,
      createdAt: new Date().toISOString(),
      variantConfig: {
        projectType: variantProjectType || null,
        region: currentRegion,
        missionFocus: variantMissionFocus,
      },
      zoneCount: zones.length,
      structureCount: structures.length,
      paddockCount: paddocks.length,
      cropCount: crops.length,
      zoneCategories,
      structureTypes,
      enterprises: model.enterprises,
      totalCapitalMid: model.totalInvestment.mid,
      breakEvenYear: model.breakEven.breakEvenYear.mid,
      year5Cashflow: model.cashflow[5]?.cumulativeCashflow.mid ?? 0,
      year10Cashflow: model.cashflow[10]?.cumulativeCashflow.mid ?? 0,
      tenYearROI: model.breakEven.tenYearROI.mid,
      annualRevenueMid: model.annualRevenueAtMaturity.mid,
      missionScore: effectiveMission,
    };

    addScenario(scenario);
    setName('');
    setDesc('');
    setShowForm(false);
    setShowVariantConfig(false);
    setVariantProjectType('');
    setVariantMissionFocus('balanced');
  };

  const handleToggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 2
          ? [...prev, id]
          : [prev[1]!, id],
    );
  };

  const handleExport = () => {
    setExportState('loading');
    setTimeout(() => setExportState('done'), 900);
  };

  // Recommended scenario
  const recommended = useMemo(() => getRecommendedScenario(scenarios), [scenarios]);
  const recommendedText = useMemo(() => {
    if (!recommended) return null;
    const effectiveType = recommended.variantConfig.projectType ?? project.projectType;
    const fits = siteScores.length > 0 && effectiveType
      ? computeVisionFit(effectiveType, siteScores)
      : [];
    return buildRecommendationText(recommended, fits);
  }, [recommended, project.projectType, siteScores]);

  // Design diff (when exactly 2 selected)
  const diffScenarios = useMemo(() => {
    if (compareIds.length !== 2) return null;
    const a = scenarios.find((sc) => sc.id === compareIds[0]);
    const b = scenarios.find((sc) => sc.id === compareIds[1]);
    if (!a || !b) return null;
    return { a, b, diff: computeDesignDiff(a, b) };
  }, [compareIds, scenarios]);

  return (
    <div className={p.container}>
      <h2 className={`${p.title} ${p.mb8}`}>Scenario Modeling</h2>
      <p className={s.subtitle}>
        Snapshot your current design and compare alternatives side by side.
        Financial values are always from the engine — never hardcoded.
      </p>

      {/* ── Create scenario ──────────────────────────────────────────── */}
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className={s.createBtn}>
          + Save Current Design as Scenario
        </button>
      ) : (
        <div className={s.formCard}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            autoFocus
            className={s.formInput}
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className={`${s.formInput} ${s.formTextarea}`}
          />

          {/* Variant config toggle */}
          <button
            onClick={() => setShowVariantConfig((v) => !v)}
            className={s.variantToggle}
          >
            {showVariantConfig ? '\u25BE' : '\u25B8'} Variant Settings
          </button>

          {showVariantConfig && (
            <div className={s.variantSection}>
              {/* Project type override */}
              <div className={s.variantRow}>
                <label className={s.variantLabel}>Project Type</label>
                <select
                  value={variantProjectType}
                  onChange={(e) => setVariantProjectType(e.target.value)}
                  className={s.variantSelect}
                >
                  {PROJECT_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Region info (read-only — shows current) */}
              <div className={s.variantRow}>
                <label className={s.variantLabel}>Region</label>
                <span className={s.variantInfo}>
                  {REGION_LABELS[currentRegion as CostRegion] ?? currentRegion} (current)
                </span>
              </div>

              {/* Mission focus preset */}
              <div className={s.variantRow}>
                <label className={s.variantLabel}>Mission Focus</label>
              </div>
              <div className={s.missionFocusBtns}>
                {(['balanced', 'financial', 'ecological', 'spiritual'] as MissionFocus[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setVariantMissionFocus(f)}
                    className={`${s.missionFocusBtn} ${variantMissionFocus === f ? s.missionFocusBtnActive : ''}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className={s.variantHint}>
                {describeMissionFocus(variantMissionFocus)}
              </div>
            </div>
          )}

          <div className={s.formActions}>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || !model}
              className={`${s.saveBtn} ${name.trim() && model ? s.saveBtnEnabled : s.saveBtnDisabled}`}
            >
              {model ? 'Save Scenario' : 'No features to snapshot'}
            </button>
            <button onClick={() => setShowForm(false)} className={s.cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Current design summary ───────────────────────────────────── */}
      <SectionLabel>Current Design</SectionLabel>
      <div className={s.statGrid}>
        <StatCard label="Zones" value={zones.length} />
        <StatCard label="Structures" value={structures.length} />
        <StatCard label="Paddocks" value={paddocks.length} />
        <StatCard label="Crop Areas" value={crops.length} />
      </div>

      {model && (
        <div className={s.statGrid} style={{ marginTop: 8 }}>
          <StatCard
            label="Capital (est.)"
            value={formatKRange(model.totalInvestment.low, model.totalInvestment.high)}
            isText
          />
          <StatCard
            label="Break-Even (est.)"
            value={model.breakEven.breakEvenYear.mid != null ? `Year ${model.breakEven.breakEvenYear.mid}` : '10+'}
            isText
          />
          <StatCard
            label="Year 5 (est.)"
            value={fmtK(model.cashflow[5]?.cumulativeCashflow.mid ?? 0)}
            isText
          />
          <StatCard
            label="Year 10 (est.)"
            value={fmtK(model.cashflow[10]?.cumulativeCashflow.mid ?? 0)}
            isText
          />
        </div>
      )}

      {/* ── Best / Base / Worst Case ─────────────────────────────────── */}
      <BestBaseWorstCaseCard model={model} />

      {/* ── Saved scenarios ──────────────────────────────────────────── */}
      {scenarios.length > 0 && (
        <>
          <SectionLabel>Saved Scenarios ({scenarios.length})</SectionLabel>
          {scenarios.length >= 2 && (
            <div className={s.compareHint}>
              Select 2 scenarios to see a design diff.
            </div>
          )}
          <div className={`${p.section} ${p.sectionGapLg}`}>
            {scenarios.map((sc) => (
              <ScenarioCard
                key={sc.id}
                scenario={sc}
                isSelected={compareIds.includes(sc.id)}
                isRecommended={recommended?.id === sc.id}
                onToggleSelect={() => handleToggleCompare(sc.id)}
                onDelete={() => {
                  deleteScenario(sc.id);
                  setCompareIds((ids) => ids.filter((id) => id !== sc.id));
                }}
              />
            ))}
          </div>
        </>
      )}

      {scenarios.length === 0 && (
        <div className={p.empty}>
          No scenarios saved yet. Create one to start comparing design alternatives.
        </div>
      )}

      {/* ── Recommended scenario ─────────────────────────────────────── */}
      {recommended && recommendedText && (
        <>
          <SectionLabel>Recommended Scenario</SectionLabel>
          <div className={s.recommendedCard}>
            <div className={s.recommendedIcon}>\u2605</div>
            <div>
              <div className={s.recommendedName}>{recommended.name}</div>
              <div className={s.recommendedText}>{recommendedText}</div>
            </div>
          </div>
        </>
      )}

      {/* ── Design diff ──────────────────────────────────────────────── */}
      {diffScenarios && (
        <>
          <SectionLabel>Design Diff</SectionLabel>
          <DesignDiffView
            a={diffScenarios.a}
            b={diffScenarios.b}
            diff={diffScenarios.diff}
          />
        </>
      )}

      {/* ── Comparison table ─────────────────────────────────────────── */}
      {scenarios.length >= 2 && (
        <>
          <SectionLabel>Financial Comparison (est.)</SectionLabel>
          <ComparisonTable scenarios={scenarios.slice(0, 3)} />
          <div className={s.disclaimer}>
            All values are engine estimates from regional benchmarks and placed features. Not financial advice.
          </div>
        </>
      )}

      {/* ── Export ───────────────────────────────────────────────────── */}
      {scenarios.length >= 1 && (
        <>
          <SectionLabel>Export</SectionLabel>
          {exportState === 'done' ? (
            <div className={s.exportSuccess}>
              <span className={s.exportSuccessIcon}>\u2713</span>
              Export queued. PDF generation is available in Sprint 10.
              <button onClick={() => setExportState('idle')} className={s.exportResetBtn}>Dismiss</button>
            </div>
          ) : (
            <button
              onClick={handleExport}
              disabled={exportState === 'loading'}
              className={s.exportBtn}
            >
              {exportState === 'loading' ? 'Preparing\u2026' : '\u21AF Export Scenario Comparison PDF'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function StatCard({ label, value, isText }: { label: string; value: number | string; isText?: boolean }) {
  return (
    <div className={s.statCard}>
      <div className={s.statValue} style={isText ? { fontSize: 12 } : undefined}>{value}</div>
      <div className={s.statLabel}>{label}</div>
    </div>
  );
}

function ScenarioCard({
  scenario, isSelected, isRecommended, onToggleSelect, onDelete,
}: {
  scenario: Scenario;
  isSelected: boolean;
  isRecommended: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`${s.scenarioCard} ${isSelected ? s.scenarioCardSelected : s.scenarioCardInactive}`}
      onClick={onToggleSelect}
    >
      <div className={s.scenarioHeader}>
        <div className={s.scenarioHeaderLeft}>
          <div className={s.scenarioBadges}>
            {scenario.isBaseline && <span className={s.baselineBadge}>Baseline</span>}
            {isRecommended && <span className={s.recommendedBadge}>\u2605 Best</span>}
            {scenario.variantConfig.missionFocus && scenario.variantConfig.missionFocus !== 'balanced' && (
              <span className={s.variantBadge}>{scenario.variantConfig.missionFocus}</span>
            )}
          </div>
          <div className={s.scenarioName}>{scenario.name}</div>
          {scenario.description && <div className={s.scenarioDesc}>{scenario.description}</div>}
        </div>
        <div className={s.scenarioHeaderRight}>
          <DelayedTooltip label="Select for design diff">
            <div
              tabIndex={0}
              className={`${s.compareCheckbox} ${isSelected ? s.compareCheckboxSelected : ''}`}
            >
              {isSelected ? '\u2713' : ''}
            </div>
          </DelayedTooltip>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={s.deleteBtn}
          >
            \u00D7
          </button>
        </div>
      </div>
      <div className={s.scenarioMeta}>
        <span>{scenario.zoneCount} zones</span>
        <span>{scenario.structureCount} structures</span>
        <span>{fmtK(scenario.totalCapitalMid)} capital</span>
        <span>
          {scenario.breakEvenYear != null ? `BE Y${scenario.breakEvenYear}` : 'BE 10+'}
        </span>
      </div>
      {scenario.enterprises.length > 0 && (
        <div className={s.scenarioEnterprises}>
          {scenario.enterprises.map((e) => (
            <span key={e} className={s.enterpriseTag}>{humanize(e)}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ComparisonTable({ scenarios }: { scenarios: Scenario[] }) {
  const rows: Array<{
    label: string;
    getValue: (sc: Scenario) => string;
    highlight?: (sc: Scenario, all: Scenario[]) => 'best' | 'worst' | null;
  }> = [
    {
      label: 'Total Capital',
      getValue: (sc) => fmtK(sc.totalCapitalMid),
      highlight: (sc, all) => {
        const vals = all.map((a) => a.totalCapitalMid);
        if (sc.totalCapitalMid === Math.min(...vals)) return 'best';
        if (sc.totalCapitalMid === Math.max(...vals)) return 'worst';
        return null;
      },
    },
    {
      label: 'Break-Even',
      getValue: (sc) => sc.breakEvenYear != null ? `Year ${sc.breakEvenYear}` : '10+',
      highlight: (sc, all) => {
        const vals = all.map((a) => a.breakEvenYear ?? 11);
        const v = sc.breakEvenYear ?? 11;
        if (v === Math.min(...vals)) return 'best';
        if (v === Math.max(...vals)) return 'worst';
        return null;
      },
    },
    {
      label: 'Year 5 Cashflow',
      getValue: (sc) => fmtK(sc.year5Cashflow),
      highlight: (sc, all) => {
        const vals = all.map((a) => a.year5Cashflow);
        if (sc.year5Cashflow === Math.max(...vals)) return 'best';
        if (sc.year5Cashflow === Math.min(...vals)) return 'worst';
        return null;
      },
    },
    {
      label: 'Year 10 Cashflow',
      getValue: (sc) => fmtK(sc.year10Cashflow),
      highlight: (sc, all) => {
        const vals = all.map((a) => a.year10Cashflow);
        if (sc.year10Cashflow === Math.max(...vals)) return 'best';
        if (sc.year10Cashflow === Math.min(...vals)) return 'worst';
        return null;
      },
    },
    {
      label: '10-Year ROI',
      getValue: (sc) => `${sc.tenYearROI ?? 0}%`,
      highlight: (sc, all) => {
        const vals = all.map((a) => a.tenYearROI ?? 0);
        if ((sc.tenYearROI ?? 0) === Math.max(...vals)) return 'best';
        if ((sc.tenYearROI ?? 0) === Math.min(...vals)) return 'worst';
        return null;
      },
    },
    {
      label: 'Annual Revenue',
      getValue: (sc) => fmtK(sc.annualRevenueMid) + '/yr',
      highlight: (sc, all) => {
        const vals = all.map((a) => a.annualRevenueMid);
        if (sc.annualRevenueMid === Math.max(...vals)) return 'best';
        if (sc.annualRevenueMid === Math.min(...vals)) return 'worst';
        return null;
      },
    },
    {
      label: 'Mission Score',
      getValue: (sc) => String(sc.missionScore?.overall ?? 0),
      highlight: (sc, all) => {
        const vals = all.map((a) => a.missionScore?.overall ?? 0);
        const v = sc.missionScore?.overall ?? 0;
        if (v === Math.max(...vals)) return 'best';
        if (v === Math.min(...vals)) return 'worst';
        return null;
      },
    },
  ];

  return (
    <div className={s.tableWrap}>
      <table className={s.comparisonTable}>
        <thead>
          <tr>
            <th className={s.thMetric}>Metric</th>
            {scenarios.map((sc) => (
              <th key={sc.id} className={s.thScenario}>
                {sc.name}
                {sc.variantConfig.missionFocus && sc.variantConfig.missionFocus !== 'balanced' && (
                  <span className={s.thFocusTag}> ({sc.variantConfig.missionFocus})</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className={s.tdLabel}>{row.label}</td>
              {scenarios.map((sc) => {
                const h = row.highlight ? row.highlight(sc, scenarios) : null;
                return (
                  <td
                    key={sc.id}
                    className={`${s.tdValue} ${h === 'best' ? s.tdBest : h === 'worst' ? s.tdWorst : ''}`}
                  >
                    {row.getValue(sc)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface DesignDiff {
  zoneDiff: Array<{ category: string; aCount: number; bCount: number }>;
  structureDiff: Array<{ type: string; aCount: number; bCount: number }>;
  enterprisesAdded: string[];
  enterprisesRemoved: string[];
}

function DesignDiffView({ a, b, diff }: { a: Scenario; b: Scenario; diff: DesignDiff }) {
  const hasChanges =
    diff.zoneDiff.length > 0 ||
    diff.structureDiff.length > 0 ||
    diff.enterprisesAdded.length > 0 ||
    diff.enterprisesRemoved.length > 0;

  return (
    <div className={s.diffSection}>
      <div className={s.diffHeader}>
        <span className={s.diffColLabel}>{a.name}</span>
        <span className={s.diffArrow}>\u2192</span>
        <span className={s.diffColLabel}>{b.name}</span>
      </div>

      {!hasChanges && (
        <div className={s.diffNoChange}>No design differences detected between these snapshots.</div>
      )}

      {diff.zoneDiff.length > 0 && (
        <div className={s.diffGroup}>
          <div className={s.diffGroupLabel}>Zones</div>
          {diff.zoneDiff.map(({ category, aCount, bCount }) => {
            const delta = bCount - aCount;
            return (
              <div key={category} className={s.diffRow}>
                <span className={s.diffRowName}>{humanize(category)}</span>
                <span className={s.diffRowValues}>
                  {aCount} \u2192 {bCount}
                  <span className={`${s.diffDelta} ${delta > 0 ? s.diffAdd : s.diffRemove}`}>
                    {delta > 0 ? `+${delta}` : String(delta)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {diff.structureDiff.length > 0 && (
        <div className={s.diffGroup}>
          <div className={s.diffGroupLabel}>Structures</div>
          {diff.structureDiff.map(({ type, aCount, bCount }) => {
            const delta = bCount - aCount;
            return (
              <div key={type} className={s.diffRow}>
                <span className={s.diffRowName}>{humanize(type)}</span>
                <span className={s.diffRowValues}>
                  {aCount} \u2192 {bCount}
                  <span className={`${s.diffDelta} ${delta > 0 ? s.diffAdd : s.diffRemove}`}>
                    {delta > 0 ? `+${delta}` : String(delta)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {(diff.enterprisesAdded.length > 0 || diff.enterprisesRemoved.length > 0) && (
        <div className={s.diffGroup}>
          <div className={s.diffGroupLabel}>Enterprise Mix</div>
          {diff.enterprisesAdded.map((e) => (
            <div key={e} className={`${s.diffRow} ${s.diffAdd}`}>
              + {humanize(e)}
            </div>
          ))}
          {diff.enterprisesRemoved.map((e) => (
            <div key={e} className={`${s.diffRow} ${s.diffRemove}`}>
              \u2212 {humanize(e)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className={p.sectionLabel}>{children}</h3>;
}

// ── Logic ─────────────────────────────────────────────────────────────

function computeDesignDiff(a: Scenario, b: Scenario): DesignDiff {
  const zoneDiff: DesignDiff['zoneDiff'] = [];
  const allZoneCats = new Set([
    ...Object.keys(a.zoneCategories ?? {}),
    ...Object.keys(b.zoneCategories ?? {}),
  ]);
  for (const cat of allZoneCats) {
    const aCount = (a.zoneCategories ?? {})[cat] ?? 0;
    const bCount = (b.zoneCategories ?? {})[cat] ?? 0;
    if (aCount !== bCount) zoneDiff.push({ category: cat, aCount, bCount });
  }

  const structureDiff: DesignDiff['structureDiff'] = [];
  const allStructTypes = new Set([
    ...Object.keys(a.structureTypes ?? {}),
    ...Object.keys(b.structureTypes ?? {}),
  ]);
  for (const type of allStructTypes) {
    const aCount = (a.structureTypes ?? {})[type] ?? 0;
    const bCount = (b.structureTypes ?? {})[type] ?? 0;
    if (aCount !== bCount) structureDiff.push({ type, aCount, bCount });
  }

  const aEnterprises = new Set(a.enterprises ?? []);
  const bEnterprises = new Set(b.enterprises ?? []);
  const enterprisesAdded = [...bEnterprises].filter((e) => !aEnterprises.has(e));
  const enterprisesRemoved = [...aEnterprises].filter((e) => !bEnterprises.has(e));

  return { zoneDiff, structureDiff, enterprisesAdded, enterprisesRemoved };
}

function scoreScenario(sc: Scenario): number {
  const be = sc.breakEvenYear ?? 11;
  const beScore = be <= 5 ? 30 : be <= 8 ? 15 : 5;
  const roiScore = Math.max(0, Math.min(40, (sc.tenYearROI ?? 0) * 0.4));
  const missionScore = ((sc.missionScore?.overall ?? 50) / 100) * 30;
  return beScore + roiScore + missionScore;
}

function getRecommendedScenario(scenarios: Scenario[]): Scenario | null {
  if (scenarios.length < 2) return null;
  return scenarios.reduce((best, sc) =>
    scoreScenario(sc) > scoreScenario(best) ? sc : best,
  );
}

function buildRecommendationText(
  sc: Scenario,
  fits: ReturnType<typeof computeVisionFit>,
): string {
  const be = sc.breakEvenYear;
  const roi = sc.tenYearROI ?? 0;
  const mission = sc.missionScore?.overall ?? 50;
  const strongFits = fits.filter((f) => f.status === 'strong').length;
  const challenges = fits.filter((f) => f.status === 'challenge' && f.weight === 'critical').length;

  let text = `"${sc.name}" scores highest overall.`;

  if (be != null && be <= 5) {
    text += ` Achieves break-even by Year ${be} with ${roi}% 10-year ROI — strongest financial case.`;
  } else if (roi > 40) {
    text += ` Delivers ${roi}% ROI over 10 years — best long-term return among your scenarios.`;
  }

  if (mission >= 70) {
    text += ` Mission alignment is strong (${mission}/100).`;
  }

  if (strongFits > 0 && challenges === 0) {
    text += ` Land suitability aligns well with the ${sc.variantConfig.projectType ? humanize(sc.variantConfig.projectType) : 'planned'} project type.`;
  } else if (challenges > 0) {
    text += ` Note: ${challenges} critical land suitability challenge${challenges > 1 ? 's' : ''} detected for this project type.`;
  }

  return text;
}

function describeMissionFocus(focus: MissionFocus): string {
  switch (focus) {
    case 'balanced':   return 'Equal weight across financial returns, ecology, spirituality, and community.';
    case 'financial':  return 'Prioritises break-even speed and ROI. Best for capital-intensive projects.';
    case 'ecological': return 'Emphasises conservation, habitat, and regenerative outcomes over returns.';
    case 'spiritual':  return 'Weights spiritual zones, prayer spaces, and retreat capacity most heavily.';
  }
}
