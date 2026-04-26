import { Droplet, Sprout, CloudSun, Sun, Map, Mountain, Gauge } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from './PillarsBento.module.css';

interface Pillar {
  key: string;
  name: string;
  blurb: string;
  layers: string;
  icon: LucideIcon;
  tileClass?: string;
}

const PILLARS: Pillar[] = [
  {
    key: 'hydrology',
    name: 'Hydrology & Water',
    blurb: 'Flow accumulation, watershed boundaries, and seasonal wet patches at parcel scale.',
    layers: '5 data layers',
    icon: Droplet,
    tileClass: 'hydrology',
  },
  { key: 'soil', name: 'Soil', blurb: 'SSURGO series, drainage, and productivity.', layers: '3 data layers', icon: Sprout },
  { key: 'climate', name: 'Climate', blurb: '30-year normals, comfort calendar.', layers: '4 data layers', icon: CloudSun },
  {
    key: 'solar',
    name: 'Solar & Exposure',
    blurb: 'Sun-path, shade, and aspect across seasons.',
    layers: '3 data layers',
    icon: Sun,
    tileClass: 'solar',
  },
  { key: 'zoning', name: 'Zoning', blurb: 'Parcel boundaries and use restrictions.', layers: '2 data layers', icon: Map },
  {
    key: 'scoring',
    name: 'Scoring & Flags',
    blurb: 'Rule-based suitability you can audit, not a black box.',
    layers: 'Auditable rules',
    icon: Gauge,
    tileClass: 'scoring',
  },
  { key: 'viewshed', name: 'Viewshed', blurb: 'What you can see — and what sees you.', layers: '2 data layers', icon: Mountain },
];

export default function PillarsBento() {
  return (
    <section id="pillars" className={styles.section} aria-labelledby="pillars-heading">
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>The framework</p>
          <h2 id="pillars-heading" className={styles.heading}>
            One map. Seven dimensions of land truth.
          </h2>
          <p className={styles.sub}>
            Every Atlas evaluation runs through the same auditable stack — so decisions are comparable across parcels, seasons, and teams.
          </p>
        </header>

        <div className={styles.grid} role="list">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            const tile = p.tileClass ? `${styles.tile} ${styles[p.tileClass]}` : styles.tile;
            return (
              <article key={p.key} className={tile} role="listitem">
                <span className={styles.icon} aria-hidden="true">
                  <Icon size={16} />
                </span>
                <h3 className={styles.name}>{p.name}</h3>
                <p className={styles.blurb}>{p.blurb}</p>
                <p className={styles.layers}>{p.layers}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
