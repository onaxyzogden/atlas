/**
 * PermanenceScalesCard — PLAN Module 1.
 *
 * Read-only banner ranking the Scales of Landscape Permanence (Yeomans /
 * Holmgren) and counting how many on-project elements presently anchor
 * each scale. The intent is *prompting*, not scoring: see if the design
 * has paid attention to the long-lived scales (climate, landform, water)
 * before sweating the short-lived ones (vegetation, fauna, subsystems).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { useEcologyStore } from '../../store/ecologyStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useTopographyStore } from '../../store/topographyStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface Scale {
  rank: number;
  name: string;
  prompt: string;
  count: number;
  countLabel: string;
}

export default function PermanenceScalesCard({ project }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allTransects = useTopographyStore((s) => s.transects);
  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);
  const allStorage = useWaterSystemsStore((s) => s.storageInfra);
  const allFertility = useClosedLoopStore((s) => s.fertilityInfra);
  const allEcology = useEcologyStore((s) => s.ecology);
  const allGuilds = usePolycultureStore((s) => s.guilds);

  const scales: Scale[] = useMemo(() => {
    const pId = project.id;
    const zones = allZones.filter((z) => z.projectId === pId);
    const paths = allPaths.filter((p) => p.projectId === pId);
    const structures = allStructures.filter((s) => s.projectId === pId);
    const crops = allCrops.filter((c) => c.projectId === pId);
    const transects = allTransects.filter((t) => t.projectId === pId);
    const earthworks = allEarthworks.filter((e) => e.projectId === pId);
    const storage = allStorage.filter((s) => s.projectId === pId);
    const fertility = allFertility.filter((f) => f.projectId === pId);
    const ecology = allEcology.filter((e) => e.projectId === pId);
    const guilds = allGuilds.filter((g) => g.projectId === pId);

    return [
      { rank: 1, name: 'Climate',     prompt: 'Hardiness, precip, season — captured in Observe.', count: 1, countLabel: 'site-level' },
      { rank: 2, name: 'Landform',    prompt: 'Slope, aspect, profiles — read from terrain layer.', count: transects.length, countLabel: `${transects.length} transect(s)` },
      { rank: 3, name: 'Water',       prompt: 'Swales, storage, drainage corridors.',               count: earthworks.length + storage.length, countLabel: `${earthworks.length} earthworks · ${storage.length} storage` },
      { rank: 4, name: 'Access',      prompt: 'Roads, paths, animal corridors.',                    count: paths.length, countLabel: `${paths.length} path(s)` },
      { rank: 5, name: 'Structures',  prompt: 'Buildings, fences, infrastructure.',                 count: structures.length, countLabel: `${structures.length} structure(s)` },
      { rank: 6, name: 'Subsystems',  prompt: 'Composters, energy, waste loops.',                   count: fertility.length, countLabel: `${fertility.length} fertility unit(s)` },
      { rank: 7, name: 'Soil',        prompt: 'Beds, mulch, soil-fertility plan.',                  count: zones.filter((z) => z.category === 'food_production').length, countLabel: 'food-production zones' },
      { rank: 8, name: 'Vegetation',  prompt: 'Crops, orchard, guilds, polycultures.',              count: crops.length + guilds.length, countLabel: `${crops.length} crop area(s) · ${guilds.length} guild(s)` },
      { rank: 9, name: 'Fauna',       prompt: 'Livestock paddocks, wildlife corridors, ecology obs.', count: ecology.length, countLabel: `${ecology.length} ecology observation(s)` },
    ];
  }, [project.id, allZones, allPaths, allStructures, allCrops, allTransects, allEarthworks, allStorage, allFertility, allEcology, allGuilds]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 1 · Layering</span>
        <h1 className={styles.title}>Scales of Landscape Permanence</h1>
        <p className={styles.lede}>
          Yeomans&rsquo; ranking from longest-lived to shortest-lived. Design
          the high ranks first; the low ranks adjust to fit, not the other
          way around. The counts below are a prompt, not a scorecard.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Permanence rollup</h2>
        <ul className={styles.list}>
          {scales.map((s) => (
            <li key={s.rank} className={styles.listRow}>
              <div>
                <strong>{s.rank}. {s.name}</strong>
                <div className={styles.listMeta}>{s.prompt}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{s.count}</strong>
                <div className={styles.listMeta}>{s.countLabel}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
