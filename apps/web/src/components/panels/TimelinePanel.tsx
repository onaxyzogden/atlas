/**
 * TimelinePanel — dynamic phased development timeline.
 * Tabs: Phases (dynamic cards + milestones), Features (assignment + build order), Complexity (assessment scores).
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useVisionStore } from '../../store/visionStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useMapStore } from '../../store/mapStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import { computeAssessmentScores, computeOverallScore } from '../../lib/computeScores.js';
import { aggregatePhaseFeatures } from './timeline/timelineHelpers.js';
import PhaseTimeline from './timeline/PhaseTimeline.js';
import FeatureAssignment from './timeline/FeatureAssignment.js';
import BuildOrderLogic from './timeline/BuildOrderLogic.js';
import ComplexityScore from './timeline/ComplexityScore.js';
import MilestoneMarkers from './timeline/MilestoneMarkers.js';
import p from '../../styles/panel.module.css';
import s from './TimelinePanel.module.css';

interface TimelinePanelProps {
  project: LocalProject;
}

type TimelineTab = 'phases' | 'features' | 'complexity';

export default function TimelinePanel({ project }: TimelinePanelProps) {
  const [activeTab, setActiveTab] = useState<TimelineTab>('phases');

  // Store subscriptions
  const phases = usePhaseStore((st) => st.getProjectPhases(project.id));
  const setActivePhaseFilter = useMapStore((ms) => ms.setActivePhaseFilter);

  const visionData = useVisionStore((st) => st.getVisionData(project.id));
  const addMilestone = useVisionStore((st) => st.addMilestone);
  const updateMilestone = useVisionStore((st) => st.updateMilestone);
  const deleteMilestone = useVisionStore((st) => st.deleteMilestone);

  // Ensure defaults exist
  usePhaseStore.getState().ensureDefaults(project.id);
  useVisionStore.getState().ensureDefaults(project.id);

  const allStructures = useStructureStore((st) => st.structures);
  const structures = useMemo(() => allStructures.filter((st) => st.projectId === project.id), [allStructures, project.id]);

  const allPaths = usePathStore((st) => st.paths);
  const paths = useMemo(() => allPaths.filter((pa) => pa.projectId === project.id), [allPaths, project.id]);

  const allUtilities = useUtilityStore((st) => st.utilities);
  const utilities = useMemo(() => allUtilities.filter((u) => u.projectId === project.id), [allUtilities, project.id]);

  // Aggregate features by phase
  const phaseSummaries = useMemo(
    () => aggregatePhaseFeatures(structures, paths, utilities),
    [structures, paths, utilities],
  );

  const totalFeatures = structures.length + paths.length + utilities.length;

  // Assessment scores for complexity tab
  const siteData = useSiteData(project.id);
  const scores = useMemo(() => {
    if (!siteData || siteData.status !== 'complete') return null;
    return computeAssessmentScores(siteData.layers, project.acreage ?? null);
  }, [siteData, project.acreage]);
  const overallScore = useMemo(() => scores ? computeOverallScore(scores) : null, [scores]);

  const handleFilterPhase = (phaseName: string) => {
    setActivePhaseFilter(phaseName);
  };

  return (
    <div className={p.container}>
      <h2 className={p.title} style={{ marginBottom: 4 }}>Timeline & Phasing</h2>
      <div className={s.subtitle}>
        {totalFeatures} features across {phases.length} phases
      </div>

      <div className={p.tabBar}>
        <button className={`${p.tabBtn} ${activeTab === 'phases' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('phases')}>Phases</button>
        <button className={`${p.tabBtn} ${activeTab === 'features' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('features')}>Features</button>
        <button className={`${p.tabBtn} ${activeTab === 'complexity' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('complexity')}>Complexity</button>
      </div>

      {activeTab === 'phases' && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PhaseTimeline
            phases={phases}
            phaseNotes={visionData?.phaseNotes ?? []}
            phaseSummaries={phaseSummaries}
            onFilterPhase={handleFilterPhase}
          />
          <MilestoneMarkers
            milestones={visionData?.milestones ?? []}
            phases={phases}
            onAdd={(m) => addMilestone(project.id, m)}
            onUpdate={(id, updates) => updateMilestone(project.id, id, updates)}
            onDelete={(id) => deleteMilestone(project.id, id)}
          />
        </div>
      )}

      {activeTab === 'features' && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FeatureAssignment phaseSummaries={phaseSummaries} totalFeatures={totalFeatures} />
          <BuildOrderLogic utilities={utilities} />
        </div>
      )}

      {activeTab === 'complexity' && (
        <div style={{ marginTop: 8 }}>
          <ComplexityScore scores={scores} overallScore={overallScore} />
        </div>
      )}
    </div>
  );
}
