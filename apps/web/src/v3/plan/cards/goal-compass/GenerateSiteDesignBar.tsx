/**
 * GenerateSiteDesignBar — Goal Compass surface for the Observe-driven
 * whole-site generator. Pick a project start date, click Generate, and
 * `runAutoDesign` stamps draft features into the canvas + schedules the
 * Act calendar. The `DraftReviewBar` (rendered here when a generation is
 * live) carries the Accept / Discard / Regenerate verbs.
 *
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md (Phase 5).
 */

import { useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useGoalTreeStore } from '../../../../store/goalTreeStore.js';
import { useSiteProfileStore } from '../../../../store/siteProfileStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { usePhaseStore } from '../../../../store/phaseStore.js';
import { useGeneratorDraftStore } from '../../../../store/generatorDraftStore.js';
import { runAutoDesign } from '../../engine/autoDesign/runAutoDesign.js';
import { commitDrafts } from '../../engine/autoDesign/commitDrafts.js';
import type { AllocatorZone } from '../../engine/autoDesign/types.js';
import DraftReviewBar from '../../draw/DraftReviewBar.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
}

export default function GenerateSiteDesignBar({ project }: Props) {
  const goalTree = useGoalTreeStore(
    (s) => s.goalTreesByProject[project.id] ?? null,
  );
  const siteProfile = useSiteProfileStore(
    (s) => s.profilesByProject[project.id] ?? null,
  );
  const zones = useZoneStore((s) => s.zones);
  const replaceGoalCompassRows = usePhaseStore((s) => s.replaceGoalCompassRows);
  const discard = useGeneratorDraftStore((s) => s.discard);

  const [startDate, setStartDate] = useState('2026-06-01');
  const [status, setStatus] = useState<string | null>(null);

  const projectZones = zones.filter((z) => z.projectId === project.id);
  const canGenerate =
    goalTree !== null && siteProfile !== null && projectZones.length > 0;

  const generate = () => {
    if (!goalTree || !siteProfile) return;
    const generationId = `gen-${Date.now()}`;
    const allocatorZones: AllocatorZone[] = projectZones.map((z) => ({
      id: z.id,
      category: z.category,
      successionStage: z.successionStage ?? null,
      groundCover: z.groundCover ?? null,
      geometry: z.geometry,
      areaM2: z.areaM2,
    }));

    const result = runAutoDesign({
      projectId: project.id,
      generationId,
      goalTree,
      siteProfile,
      zones: allocatorZones,
      startDate: startDate || null,
    });

    const counts = commitDrafts(project.id, result);
    replaceGoalCompassRows(
      project.id,
      result.sequencing.generatedPhases,
      result.scheduledTasks,
    );

    const totalFeatures = counts.elements + counts.paddocks + counts.fences;
    if (result.sequencing.selected.length === 0) {
      setStatus(
        'Sequencer selected no interventions — refine the Goal tree (add ' +
          'criteria/targets) or restore excluded interventions, then retry.',
      );
      return;
    }
    const empties = result.emptyGeometryInterventionIds.length;
    setStatus(
      totalFeatures === 0
        ? `Sequenced ${result.sequencing.selected.length} intervention(s) but ` +
            `none matched a mapped zone — paint zone categories/ground-cover ` +
            `in Observe so features can be placed.`
        : `Generated ${counts.elements} features, ${counts.paddocks} paddocks, ` +
            `${counts.fences} fences · ${result.scheduledTasks.length} tasks scheduled` +
            (empties ? ` · ${empties} intervention(s) emitted no geometry` : ''),
    );
  };

  const handleRegenerate = (prevGenerationId: string) => {
    discard(prevGenerationId);
    generate();
  };

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Auto-design from Observe</h3>
      <p className={styles.lede}>
        Stamps draft features into the zones whose mapped conditions match
        each intervention, and schedules the Act calendar from the chosen
        start date. Drafts stay dashed until you Accept them.
      </p>
      <div className={styles.btnRow}>
        <label className={styles.hint} style={{ display: 'flex', gap: 6 }}>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              background: 'rgba(0,0,0,0.3)',
              color: 'inherit',
              border: '1px solid rgba(212,182,99,0.4)',
              borderRadius: 4,
              padding: '2px 6px',
            }}
          />
        </label>
        <button
          type="button"
          className={styles.btn}
          disabled={!canGenerate}
          onClick={generate}
        >
          Generate site design
        </button>
        {!canGenerate ? (
          <span className={styles.hint}>
            Need Goal tree, Site profile, and ≥1 Observe zone.
          </span>
        ) : null}
      </div>
      {status ? <p className={styles.hint}>{status}</p> : null}
      <DraftReviewBar
        projectId={project.id}
        onRegenerate={handleRegenerate}
      />
    </section>
  );
}
