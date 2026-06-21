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
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';
import { useVegetationStore } from '../../../../store/vegetationStore.js';
import { resolveZoneVegetation } from '../../engine/vegetationResolver.js';
import { usePhaseStore } from '../../../../store/phaseStore.js';
import { useGeneratorDraftStore } from '../../../../store/generatorDraftStore.js';
import { useRegenerationPlanStore } from '../../../../store/regenerationPlanStore.js';
import { pushGoalCompassToSpine } from '../../engine/goalCompass/goalCompassSpineSync.js';
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
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const vegetationPatches = useVegetationStore((s) => s.patches);
  const replaceGoalCompassRows = usePhaseStore((s) => s.replaceGoalCompassRows);
  const discard = useGeneratorDraftStore((s) => s.discard);
  const allPlans = useRegenerationPlanStore((s) => s.plans);

  const [startDate, setStartDate] = useState('2026-06-01');
  const [status, setStatus] = useState<string | null>(null);

  const projectZones = zones.filter((z) => z.projectId === project.id);
  // Adoption seam: a zone carrying a steward-authored RegenerationPlan has an
  // explicit pathway, so the auto-designer's forced-barren assignment gate
  // releases for it (no double-modeling — the plan never writes BuildPhase).
  const acknowledgedRegenerationZoneIds = Array.from(
    new Set(
      allPlans
        .filter((pl) => pl.projectId === project.id)
        .map((pl) => pl.zoneId),
    ),
  );
  const missing: string[] = [];
  if (goalTree === null) missing.push('Goal tree (set targets in Goal Compass)');
  if (siteProfile === null)
    missing.push('Site profile (complete the Site profile step)');
  if (projectZones.length === 0)
    missing.push(
      '≥1 land zone (draw one with the Zone tool in the Plan map’s ' +
        'Zone & Circulation tools)',
    );
  const canGenerate = missing.length === 0;

  const generate = () => {
    if (!goalTree || !siteProfile) return;
    const generationId = `gen-${Date.now()}`;
    const projectPatches = vegetationPatches.filter(
      (p) => p.projectId === project.id,
    );
    const allocatorZones: AllocatorZone[] = projectZones.map((z) => {
      const veg = resolveZoneVegetation(z, projectPatches);
      return {
        id: z.id,
        category: z.category,
        successionStage: veg.successionStage,
        groundCover: veg.groundCover,
        permacultureZone: z.permacultureZone,
        suitableForLivestock: z.suitableForLivestock,
        geometry: z.geometry,
        areaM2: z.areaM2,
      };
    });

    const result = runAutoDesign({
      projectId: project.id,
      generationId,
      goalTree,
      siteProfile,
      zones: allocatorZones,
      startDate: startDate || null,
      acknowledgedRegenerationZoneIds,
      parcelBoundary: project.parcelBoundaryGeojson ?? null,
    });

    const counts = commitDrafts(project.id, result);
    replaceGoalCompassRows(
      project.id,
      result.generatedPhases,
      result.scheduledTasks,
    );
    pushGoalCompassToSpine(
      project.id,
      result.generatedPhases,
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

  const seedZonesFromRings = () => {
    // Seeding now requires the steward to pick the ring origin. Arm the
    // Plan-map point tool; the click there seeds Z0–Z3 around that point.
    setActiveTool('plan.zone-circulation.zone-seed-anchor');
    setStatus(
      'Switch to the Plan map and click where the home centre sits — ' +
        'Z0–Z3 rings seed from there. Then return here to Generate.',
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
        {projectZones.length === 0 ? (
          <button
            type="button"
            className={styles.btn}
            onClick={seedZonesFromRings}
          >
            Seed zones from home
          </button>
        ) : null}
        {!canGenerate ? (
          <span className={styles.hint}>
            Still needed: {missing.join('; ')}.
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
