/**
 * FeasibilityCommandCenter — full-width Feasibility view for the
 * Dashboard route. Replaces the single-column DecisionSupportPanel
 * with a verdict-first cockpit:
 *
 *   Header → Verdict Hero → Blockers Strip → 2-col body (Fit | Execution)
 *   sticky Decision Rail · Design Rules · Methodology drawer
 *
 * The narrow MapView right-rail still uses DecisionSupportPanel — this
 * page-level view is rendered by DashboardRouter for the 'feasibility'
 * section only.
 */

import { lazy, Suspense, useCallback, useRef } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import FeasibilityVerdictHero from './FeasibilityVerdictHero.js';
import BlockingIssuesStrip from './BlockingIssuesStrip.js';
import FeasibilityDecisionRail from './FeasibilityDecisionRail.js';
import { useFeasibilityBriefDownloader } from './lib/exportFeasibilityBrief.js';
import css from './FeasibilityCommandCenter.module.css';

const BestUseSummaryCard = lazy(() => import('./BestUseSummaryCard.js'));
const DomainFeasibilityCard = lazy(() => import('./DomainFeasibilityCard.js'));
const VisionFitAnalysisCard = lazy(() => import('./VisionFitAnalysisCard.js'));
const CapitalIntensityCard = lazy(() => import('./CapitalIntensityCard.js'));
const MaintenanceComplexityCard = lazy(() => import('./MaintenanceComplexityCard.js'));
const SeasonalRealismCard = lazy(() => import('./SeasonalRealismCard.js'));
const TerrainConstructionDifficultyCard = lazy(() => import('./TerrainConstructionDifficultyCard.js'));
const HospitalityEducationEnergyCard = lazy(() => import('./HospitalityEducationEnergyCard.js'));
const MissingInformationChecklistCard = lazy(() => import('./MissingInformationChecklistCard.js'));
const WhatMustBeSolvedFirstCard = lazy(() => import('./WhatMustBeSolvedFirstCard.js'));
const AccessEfficiencyCard = lazy(() => import('../rules/AccessEfficiencyCard.js'));
const SafetyBufferRulesCard = lazy(() => import('../rules/SafetyBufferRulesCard.js'));
const GuestPrivacyCard = lazy(() => import('../rules/GuestPrivacyCard.js'));
const RulesPanel = lazy(() => import('../rules/RulesPanel.js'));

interface Props {
  project: LocalProject;
  onSwitchToMap?: () => void;
  onGenerateBrief?: () => void;
}

export default function FeasibilityCommandCenter({ project, onSwitchToMap, onGenerateBrief }: Props) {
  const blockersRef = useRef<HTMLDivElement | null>(null);

  const scrollToBlockers = useCallback(() => {
    blockersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Default brief handler — caller can override via prop, otherwise
  // wire the local markdown downloader.
  const localGenerateBrief = useFeasibilityBriefDownloader(project);
  const handleGenerateBrief = onGenerateBrief ?? localGenerateBrief;

  return (
    <div className={css.page}>
      <header className={css.pageHeader}>
        <div>
          <h1 className={css.pageTitle}>Feasibility Command Center</h1>
          <p className={css.pageSubtitle}>
            Evaluate whether the current land design can support the intended vision.
          </p>
        </div>
      </header>

      <FeasibilityVerdictHero
        project={project}
        onFixBlockers={scrollToBlockers}
        onOpenDesignMap={onSwitchToMap}
        onGenerateBrief={handleGenerateBrief}
      />

      <div ref={blockersRef}>
        <BlockingIssuesStrip project={project} onFixOnMap={onSwitchToMap} />
      </div>

      <div className={css.layout}>
        <div className={css.body}>
          <div className={css.bodyGrid}>
            <section className={css.column}>
              <h2 className={css.columnTitle}>Fit &amp; Readiness</h2>
              <p className={css.columnHint}>Does the land match the chosen vision?</p>
              <Suspense fallback={null}>
                <BestUseSummaryCard project={project} />
                <VisionFitAnalysisCard project={project} />
                <DomainFeasibilityCard project={project} />
              </Suspense>
            </section>

            <section className={css.column}>
              <h2 className={css.columnTitle}>Execution Reality</h2>
              <p className={css.columnHint}>What will it take to build and operate?</p>
              <Suspense fallback={null}>
                <CapitalIntensityCard project={project} />
                <MaintenanceComplexityCard project={project} />
                <SeasonalRealismCard project={project} />
                <TerrainConstructionDifficultyCard project={project} />
                <HospitalityEducationEnergyCard project={project} />
              </Suspense>
            </section>
          </div>

          <section className={css.section}>
            <h2 className={css.sectionTitle}>Design Rules &amp; Safety</h2>
            <p className={css.sectionHint}>Pre-flight checklist — siting buffers, access efficiency, guest privacy.</p>
            <Suspense fallback={null}>
              <AccessEfficiencyCard project={project} />
              <SafetyBufferRulesCard project={project} />
              <GuestPrivacyCard project={project} />
              <RulesPanel project={project} />
            </Suspense>
          </section>

          <details className={css.methodology}>
            <summary className={css.methodologySummary}>Methodology &amp; Evidence</summary>
            <div className={css.methodologyBody}>
              <Suspense fallback={null}>
                <WhatMustBeSolvedFirstCard project={project} />
                <MissingInformationChecklistCard project={project} />
              </Suspense>
            </div>
          </details>
        </div>

        <div className={css.railWrap}>
          <FeasibilityDecisionRail
            project={project}
            onFixOnMap={onSwitchToMap}
            onGenerateBrief={handleGenerateBrief}
            onScrollToBlockers={scrollToBlockers}
          />
        </div>
      </div>
    </div>
  );
}
