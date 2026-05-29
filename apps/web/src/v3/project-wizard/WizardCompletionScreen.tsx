/**
 * WizardCompletionScreen — Phase 2 / Slice 2.3.
 *
 * Reached by tapping Finish (or Skip) on Step 3. Full-bleed DiagnoseMap
 * fitted to the parcel boundary, project name overlaid, and an under-map
 * panel with:
 *
 *   - "N of M Tier-0 checklist items are already filled in" — derived
 *     from the visionProfileToChecklist bridge so the count matches
 *     what Tier 0 will show when the steward lands there.
 *   - Next Up: the first not-yet-complete T0 objective, with its
 *     focused question. Falls back to "Open Tier 0" if all T0 items
 *     happen to be derived-complete.
 *   - Two CTAs:
 *       Go to my project          → /v3/project/$id/home   (Slice 5.4 repoint)
 *       Continue setup in Plan    → /v3/project/$id/plan?highlightIncomplete=t0
 *
 * Per spec sec 5.3: NO checklists rendered here, NO generic congrats,
 * NO upsells, NO progress bars. The completion screen is a hand-off
 * surface, not a celebration.
 */

import { useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  PLAN_TIER_OBJECTIVES,
  type PlanTierObjective,
} from '@ogden/shared';
import { useProjectStore } from '../../store/projectStore.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import { deriveTier0EvidenceMap } from '../plan/tiers/visionProfileToChecklist.js';
import styles from './WizardCompletionScreen.module.css';

interface WizardCompletionScreenProps {
  projectId: string;
}

const US_CENTROID: [number, number] = [-98.5795, 39.8283];

function firstPolygon(
  fc: GeoJSON.FeatureCollection | null,
): GeoJSON.Polygon | undefined {
  if (!fc) return undefined;
  for (const feature of fc.features) {
    const geom = feature.geometry;
    if (geom.type === 'Polygon') return geom as GeoJSON.Polygon;
    if (geom.type === 'MultiPolygon') {
      const first = (geom as GeoJSON.MultiPolygon).coordinates[0];
      if (first) return { type: 'Polygon', coordinates: first };
    }
  }
  return undefined;
}

const T0_OBJECTIVES: readonly PlanTierObjective[] = PLAN_TIER_OBJECTIVES.filter(
  (o) => o.tierId === 't0-project-foundation',
);

const T0_CHECKLIST_TOTAL = T0_OBJECTIVES.reduce(
  (acc, obj) => acc + obj.checklist.length,
  0,
);

export default function WizardCompletionScreen({
  projectId,
}: WizardCompletionScreenProps) {
  const navigate = useNavigate();
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );

  const derivedMap = useMemo(
    () => deriveTier0EvidenceMap(project?.metadata?.visionProfile),
    [project?.metadata?.visionProfile],
  );

  const derivedCount = useMemo(
    () =>
      Object.values(derivedMap).filter((item) => item.isComplete).length,
    [derivedMap],
  );

  // Next Up: first T0 objective whose checklist still has items that are
  // NOT derived-complete. Slice 2.3 only sees `t0-vision-*` derivations
  // (Slice 2.4 adds stewardship); that's fine — this hand-off only needs
  // a sane default, not full status fidelity.
  const nextUp = useMemo<PlanTierObjective | undefined>(() => {
    return T0_OBJECTIVES.find((obj) =>
      obj.checklist.some((item) => !derivedMap[item.id]?.isComplete),
    );
  }, [derivedMap]);

  const polygon = useMemo(
    () => firstPolygon(project?.parcelBoundaryGeojson ?? null),
    [project?.parcelBoundaryGeojson],
  );

  if (!project) {
    return (
      <div className={styles.empty}>
        <p>Project not found.</p>
      </div>
    );
  }

  const goToProject = () => {
    navigate({
      to: '/v3/project/$projectId/home',
      params: { projectId: project.id },
    });
  };

  const continueInPlan = () => {
    navigate({
      to: '/v3/project/$projectId/plan',
      params: { projectId: project.id },
      search: { highlightIncomplete: 't0' },
    });
  };

  return (
    <section
      className={styles.screen}
      aria-label="Wizard completion summary"
    >
      <div className={styles.mapHost}>
        <div className={styles.mapInner}>
          <DiagnoseMap centroid={US_CENTROID} zoom={4} boundary={polygon} />
        </div>
        <div className={styles.nameOverlay}>
          <span className={styles.eyebrow}>Project</span>
          <span className={styles.projectName}>{project.name}</span>
        </div>
      </div>

      <div className={styles.panel}>
        <h1 className={styles.headline}>You&rsquo;re set up.</h1>
        <p className={styles.summary}>
          {derivedCount} of {T0_CHECKLIST_TOTAL} Tier&nbsp;0 checklist
          items are already filled in from what you just entered. Pick up
          from here whenever you&rsquo;re ready.
        </p>

        {nextUp && (
          <div className={styles.nextUp}>
            <span className={styles.nextUpLabel}>Next up</span>
            <p className={styles.nextUpTitle}>{nextUp.title}</p>
            <p className={styles.nextUpQuestion}>{nextUp.focusedQuestion}</p>
          </div>
        )}

        <div className={styles.ctaRow}>
          <button
            type="button"
            className={styles.primaryCta}
            onClick={goToProject}
          >
            Go to my project
          </button>
          <button
            type="button"
            className={styles.secondaryCta}
            onClick={continueInPlan}
          >
            Continue setup in Plan
          </button>
        </div>
      </div>
    </section>
  );
}
