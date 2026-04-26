/**
 * SitingPanel — Design Intelligence rule evaluation UI.
 *
 * Tabs: Alerts (violations), Weights (priority sliders), Catalog (all rules).
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSitingWeightStore } from '../../store/sitingWeightStore.js';
import {
  useSitingEvaluation,
  type WeightedViolation,
  type EffectiveSeverity,
} from '../../hooks/useSitingEvaluation.js';
import {
  RULE_CATALOG,
  type RuleWeightCategory,
  type RuleCatalogEntry,
} from './SitingRules.js';
import p from '../../styles/panel.module.css';
import s from './SitingPanel.module.css';
import ConflictDensityRollupCard from './ConflictDensityRollupCard.js';

/* ------------------------------------------------------------------ */
/*  Props & tab type                                                   */
/* ------------------------------------------------------------------ */

interface SitingPanelProps {
  project: LocalProject;
}

type SitingTab = 'alerts' | 'weights' | 'catalog';

/* ------------------------------------------------------------------ */
/*  Severity config                                                    */
/* ------------------------------------------------------------------ */

const SEVERITY_CFG: Record<EffectiveSeverity, { icon: string; label: string; cardClass: string; suggClass: string; badgeClass: string }> = {
  blocking: { icon: '\u274C', label: 'Blocking', cardClass: s.cardBlocking!, suggClass: s.suggestionBlocking!, badgeClass: s.badgeBlocking! },
  warning:  { icon: '\u26A0\uFE0F', label: 'Warning', cardClass: s.cardWarning!, suggClass: s.suggestionWarning!, badgeClass: s.badgeWarning! },
  advisory: { icon: '\u{1F4A1}', label: 'Advisory', cardClass: s.cardAdvisory!, suggClass: s.suggestionAdvisory!, badgeClass: s.badgeAdvisory! },
};

/* ------------------------------------------------------------------ */
/*  Weight category display names                                      */
/* ------------------------------------------------------------------ */

const WEIGHT_LABELS: Record<RuleWeightCategory, string> = {
  ecological: 'Ecological',
  hydrological: 'Hydrological',
  structural: 'Structural',
  agricultural: 'Agricultural',
  experiential: 'Experiential',
  spiritual: 'Spiritual',
};

const PRESETS: { key: string; label: string }[] = [
  { key: 'conservation', label: 'Conservation' },
  { key: 'regenerative_farm', label: 'Regenerative' },
  { key: 'retreat_center', label: 'Retreat' },
  { key: 'moontrance', label: 'Moontrance' },
  { key: 'homestead', label: 'Homestead' },
  { key: 'educational_farm', label: 'Educational' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SitingPanel({ project }: SitingPanelProps) {
  const [activeTab, setActiveTab] = useState<SitingTab>('alerts');
  const evaluation = useSitingEvaluation(project);

  return (
    <div className={p.container}>
      <h2 className={p.title} style={{ marginBottom: 4 }}>Siting Rules</h2>
      <div className={s.subtitle}>
        {evaluation.featureCount} features evaluated &middot; {evaluation.totalCount} alerts
      </div>

      {/* §17 Per-feature conflict density rollup with explainable chains */}
      <ConflictDensityRollupCard project={project} />

      <div className={p.tabBar}>
        <button className={`${p.tabBtn} ${activeTab === 'alerts' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('alerts')}>
          Alerts{evaluation.totalCount > 0 ? ` (${evaluation.totalCount})` : ''}
        </button>
        <button className={`${p.tabBtn} ${activeTab === 'weights' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('weights')}>Weights</button>
        <button className={`${p.tabBtn} ${activeTab === 'catalog' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('catalog')}>Catalog</button>
      </div>

      {activeTab === 'alerts' && <AlertsTab evaluation={evaluation} />}
      {activeTab === 'weights' && <WeightsTab />}
      {activeTab === 'catalog' && <CatalogTab />}
    </div>
  );
}

/* ================================================================== */
/*  TAB 1 — Alerts                                                     */
/* ================================================================== */

function AlertsTab({ evaluation }: { evaluation: ReturnType<typeof useSitingEvaluation> }) {
  const { violations, blocking, warnings, advisories, featureCount, hasSiteData } = evaluation;

  return (
    <div style={{ marginTop: 8 }}>
      {/* No site data note */}
      {!hasSiteData && (
        <div className={s.noDataNote}>
          Fetch site data in Site Intelligence to enable environmental siting checks (slope, flood, frost, drainage, wind).
        </div>
      )}

      {/* Empty state */}
      {violations.length === 0 && (
        <div className={s.emptyState}>
          <span className={s.emptyIcon}>{'\u2705'}</span>
          <div>
            <div className={`${p.text12} ${p.fontMedium}`} style={{ color: 'var(--color-panel-text)' }}>
              No siting violations detected
            </div>
            <div className={`${p.text10} ${p.muted}`}>
              {featureCount} features checked against all active rules
            </div>
          </div>
        </div>
      )}

      {/* Summary bar */}
      {violations.length > 0 && (
        <>
          <div className={s.summaryBar}>
            {blocking.length > 0 && (
              <span className={`${s.severityBadge} ${s.badgeBlocking}`}>
                {blocking.length} Blocking
              </span>
            )}
            {warnings.length > 0 && (
              <span className={`${s.severityBadge} ${s.badgeWarning}`}>
                {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}
              </span>
            )}
            {advisories.length > 0 && (
              <span className={`${s.severityBadge} ${s.badgeAdvisory}`}>
                {advisories.length} Advisory
              </span>
            )}
          </div>

          {/* Violation cards */}
          <div className={p.section}>
            {violations.map((v) => (
              <ViolationCard key={`${v.ruleId}-${v.affectedElementId}`} violation={v} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ViolationCard({ violation: v }: { violation: WeightedViolation }) {
  const cfg = SEVERITY_CFG[v.effectiveSeverity];

  return (
    <div className={`${s.violationCard} ${cfg.cardClass}`}>
      <span className={s.cardIcon}>{cfg.icon}</span>
      <div className={s.cardBody}>
        <div className={s.cardTitle}>
          {v.title}
          {v.needsSiteVisit && <span className={s.siteVisitBadge}>Site Visit</span>}
        </div>
        <div className={s.cardDescription}>{v.description}</div>
        <div className={`${s.cardSuggestion} ${cfg.suggClass}`}>
          {'\u2192'} {v.suggestion}
        </div>
        <span className={s.dataSourceTag}>{v.dataSource}</span>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  TAB 2 — Weights                                                    */
/* ================================================================== */

function WeightsTab() {
  const weights = useSitingWeightStore((st) => st.weights);
  const setWeight = useSitingWeightStore((st) => st.setWeight);
  const resetDefaults = useSitingWeightStore((st) => st.resetDefaults);
  const applyPreset = useSitingWeightStore((st) => st.applyPreset);

  const categories = Object.keys(WEIGHT_LABELS) as RuleWeightCategory[];

  return (
    <div style={{ marginTop: 8 }}>
      {/* Presets */}
      <div className={s.presetBar}>
        {PRESETS.map((pr) => (
          <button key={pr.key} className={s.presetBtn} onClick={() => applyPreset(pr.key)}>
            {pr.label}
          </button>
        ))}
        <button className={s.resetBtn} onClick={resetDefaults}>Reset</button>
      </div>

      {/* Sliders */}
      <div className={p.section}>
        {categories.map((cat) => (
          <div key={cat} className={s.weightRow}>
            <span className={s.weightLabel}>{WEIGHT_LABELS[cat]}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[cat]}
              onChange={(e) => setWeight(cat, Number(e.target.value))}
              className={s.weightSlider}
            />
            <span className={s.weightValue}>{weights[cat]}</span>
          </div>
        ))}
      </div>

      {/* Help text */}
      <div className={s.weightHelp}>
        Weights control how violations are prioritized.
        High weights (&ge;70) escalate violations one severity level;
        low weights (&le;30) de-escalate them.
        Use presets to quickly adjust weights for common project types.
      </div>
    </div>
  );
}

/* ================================================================== */
/*  TAB 3 — Catalog                                                    */
/* ================================================================== */

const SEVERITY_BADGE: Record<string, string> = {
  error: s.severityError!,
  warning: s.severityWarning!,
  info: s.severityInfo!,
};

function CatalogTab() {
  // Group by weightCategory
  const groups = new Map<RuleWeightCategory, RuleCatalogEntry[]>();
  for (const entry of RULE_CATALOG) {
    const list = groups.get(entry.weightCategory) ?? [];
    list.push(entry);
    groups.set(entry.weightCategory, list);
  }

  return (
    <div style={{ marginTop: 8 }}>
      {Array.from(groups.entries()).map(([category, entries]) => (
        <div key={category} className={s.catalogGroup}>
          <div className={s.catalogGroupHeader}>{WEIGHT_LABELS[category]}</div>
          <div className={p.section}>
            {entries.map((entry) => (
              <div key={entry.ruleId} className={s.catalogEntry}>
                <div className={s.catalogTitle}>{entry.title}</div>
                <div className={s.catalogDesc}>{entry.description}</div>
                <div className={s.catalogMeta}>
                  <span className={`${s.catalogBadge} ${SEVERITY_BADGE[entry.defaultSeverity] ?? ''}`}>
                    {entry.defaultSeverity}
                  </span>
                  <span className={s.dataSourceTag}>{entry.dataSource}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
