/**
 * ZoneLevelLayer — PLAN Module 3.
 *
 * Tags every existing LandZone polygon with a permaculture zone level
 * (Z0–Z5). The picker writes through `zoneStore.updateZone` so the new
 * field flows to map renderers without a separate layer wiring.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore, type LandZone } from '../../store/zoneStore.js';
import {
  PERMACULTURE_ZONE_LABEL,
  type PermacultureZoneLevel,
} from '../../lib/zones/permacultureLabels.js';
import styles from '../../v3/_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const ZONE_LEVELS: Array<{ value: PermacultureZoneLevel; label: string }> = (
  [0, 1, 2, 3, 4, 5] as const
).map((value) => ({ value, label: PERMACULTURE_ZONE_LABEL[value] }));

export default function ZoneLevelLayer({ project }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const updateZone = useZoneStore((s) => s.updateZone);

  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);

  const counts = useMemo(() => {
    const c: Record<number, number> = {};
    for (const z of zones) {
      const lvl = z.permacultureZone;
      if (typeof lvl === 'number') c[lvl] = (c[lvl] ?? 0) + 1;
    }
    return c;
  }, [zones]);

  function setLevel(zone: LandZone, value: string) {
    if (value === '') {
      updateZone(zone.id, { permacultureZone: undefined });
    } else {
      const n = Number(value) as 0 | 1 | 2 | 3 | 4 | 5;
      updateZone(zone.id, { permacultureZone: n });
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 3 · Zone &amp; Circulation</span>
        <h1 className={styles.title}>Permaculture zone levels</h1>
        <p className={styles.lede}>
          Holmgren / Mollison Z0–Z5: how often do you visit each zone? The
          design rule is simple — stuff you touch daily belongs close,
          wilderness belongs far. Tag each polygon to drive future
          zone-coloured map layers.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Coverage</h2>
        {ZONE_LEVELS.map((l) => (
          <div key={l.value} className={styles.statRow}>
            <span>{l.label}</span>
            <span>{counts[l.value] ?? 0}</span>
          </div>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Assign zone level</h2>
        {zones.length === 0 ? (
          <p className={styles.empty}>No zones drawn for this project yet — head to the zone tool.</p>
        ) : (
          <ul className={styles.list}>
            {zones.map((z) => (
              <li key={z.id} className={styles.listRow}>
                <div>
                  <strong>{z.name || z.category}</strong>
                  <div className={styles.listMeta}>
                    {z.category} · {(z.areaM2 / 10000).toFixed(2)} ha
                  </div>
                </div>
                <select
                  value={z.permacultureZone ?? ''}
                  onChange={(e) => setLevel(z, e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(232,220,200,0.92)',
                    padding: '6px 8px',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                >
                  <option value="">— unassigned —</option>
                  {ZONE_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>Z{l.value}</option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
