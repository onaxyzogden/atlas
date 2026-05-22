/**
 * HabitatAllocationCard — PLAN · Habitat Allocation (Sub-project A2).
 *
 * A design-time spatial area-budget: does the project's drawn zones set
 * aside enough land to undisturbed habitat / biological corridors? Sums
 * the habitat-category zones from `zoneStore` against the parcel area
 * and charts the share against the goal tree's `regen-habitat-pct`
 * target (the Apricot Lane ~10% set-aside). Pure client-side — no DB
 * migration, no new endpoint.
 */

import { useEffect, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useGoalTreeStore } from '../../store/goalTreeStore.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';
import {
  computeAllocation,
  resolveHabitatTargetPct,
  acresToM2,
} from './habitatAllocation/allocate.js';
import AllocationGauge from './habitatAllocation/AllocationGauge.js';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function HabitatAllocationCard({ project, onSwitchToMap }: Props) {
  const zones = useZoneStore((s) => s.zones);
  const ensureDefault = useGoalTreeStore((s) => s.ensureDefault);
  const goalTree = useGoalTreeStore(
    (s) => s.goalTreesByProject[project.id] ?? null,
  );

  useEffect(() => {
    ensureDefault(project.id, project.projectType);
  }, [ensureDefault, project.id, project.projectType]);

  const projectZones = useMemo(
    () => zones.filter((z) => z.projectId === project.id),
    [zones, project.id],
  );

  const targetPct = useMemo(() => {
    const criteria = goalTree
      ? goalTree.subGoals.flatMap((sg) => sg.criteria)
      : [];
    return resolveHabitatTargetPct(criteria);
  }, [goalTree]);

  const parcelM2 =
    project.acreage != null && project.acreage > 0
      ? acresToM2(project.acreage)
      : null;

  const allocation = useMemo(
    () => computeAllocation(projectZones, parcelM2, targetPct),
    [projectZones, parcelM2, targetPct],
  );

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Habitat Allocation</span>
        <h1 className={styles.title}>Habitat allocation</h1>
        <p className={styles.lede}>
          Apricot Lane treats habitat as a primary biological tool, not
          philanthropy: ~10% of the land is deliberately set aside as
          undisturbed wildlife habitat and biological corridors. This
          dashboard sums your conservation, buffer, and water-retention
          zones against the parcel and checks the share against the goal
          tree.
        </p>
      </header>

      <section className={styles.section}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
            Land set aside
          </h2>
          <button
            type="button"
            onClick={onSwitchToMap}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.16)',
              background: 'transparent',
              color: 'rgba(232,220,200,0.8)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            View on map
          </button>
        </div>
        {projectZones.length === 0 ? (
          <p className={styles.empty}>
            No zones drawn yet. Draw conservation, buffer, or
            water-retention zones on the map — their area counts toward
            the habitat set-aside.
          </p>
        ) : (
          <AllocationGauge a={allocation} />
        )}
      </section>
    </div>
  );
}
