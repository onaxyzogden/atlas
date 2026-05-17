/**
 * RegenerationGateBanner — non-blocking, design-time awareness that some
 * zones in this project are still under an unconfirmed regeneration plan
 * (iḥyāʾ al-mawāt — troubled land being revived under stewardship).
 *
 * This NEVER blocks anything. The hard interception lives in
 * LivestockPanel's save path via `findBlockingRegenerationPlan`; this banner
 * only tells the steward, while they design, which zones will ask for a
 * recorded override until recovery is confirmed. The decisive rule is the
 * shared evaluator's (`ready === !!stewardReadinessConfirmedAt`); a plan
 * still "under revival" here means exactly: not yet steward-confirmed (a
 * recorded override does not clear it). Self-gating: renders null when the
 * project has no unconfirmed plans.
 */

import { useMemo } from 'react';
import { useZoneStore } from '../../store/zoneStore.js';
import { useRegenerationPlanStore } from '../../store/regenerationPlanStore.js';
import { selectActivePlans } from '../../features/livestock/regenerationGate.js';
import p from '../../styles/panel.module.css';

export interface RegenerationGateBannerProps {
  projectId: string;
}

export default function RegenerationGateBanner({
  projectId,
}: RegenerationGateBannerProps) {
  const allZones = useZoneStore((s) => s.zones);
  const allPlans = useRegenerationPlanStore((s) => s.plans);
  const activePlanIdByZone = useRegenerationPlanStore(
    (s) => s.activePlanIdByZone,
  );

  const zoneNames = useMemo(() => {
    const nameById = new Map<string, string>();
    for (const z of allZones) {
      if (z.projectId === projectId) nameById.set(z.id, z.name);
    }
    // Only the active plan per zone gates — scenario plans are excluded so
    // the banner naturally dedupes one entry per troubled zone.
    const active = selectActivePlans(
      allPlans.filter((pl) => pl.projectId === projectId),
      activePlanIdByZone,
    );
    const names: string[] = [];
    for (const plan of active) {
      if (plan.stewardReadinessConfirmedAt) continue; // gate open — recovered
      const name = nameById.get(plan.zoneId);
      if (name) names.push(name);
    }
    return names;
  }, [allZones, allPlans, activePlanIdByZone, projectId]);

  if (zoneNames.length === 0) return null;

  return (
    <div className={p.infoCard} style={{ marginBottom: 16 }}>
      <div className={p.infoCardTitle}>Zones still under revival</div>
      <div className={p.infoCardText}>
        {zoneNames.join(', ')}{' '}
        {zoneNames.length === 1 ? 'is' : 'are'} being revived and not yet
        confirmed recovered. Placing livestock there will ask for a recorded
        override until you confirm the land has healed.
      </div>
    </div>
  );
}
