/**
 * SpiritualPanel — right-panel intelligence surface for spiritual design.
 * Tabs: Qibla (compass + prayer alignment), Spaces (quiet zones + moontrance), Signs (solar events + ecological signs).
 */

import { useState, useMemo } from 'react';
import { computeQibla } from '../../lib/qibla.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { type LocalProject } from '../../store/projectStore.js';
import { useVisionStore } from '../../store/visionStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import QiblaDisplay from './QiblaDisplay.js';
import PrayerSpaceAlignment from './PrayerSpaceAlignment.js';
import SolarEvents from './SolarEvents.js';
import QuietZonePlanning from './QuietZonePlanning.js';
import PrayerZoneReadinessCard from './PrayerZoneReadinessCard.js';
import MoontranceSpiritual from './MoontranceSpiritual.js';
import SignsInCreation from './SignsInCreation.js';
import p from '../../styles/panel.module.css';

interface SpiritualPanelProps {
  project: LocalProject;
}

type SpiritualTab = 'qibla' | 'spaces' | 'signs';

export default function SpiritualPanel({ project }: SpiritualPanelProps) {
  const [activeTab, setActiveTab] = useState<SpiritualTab>('qibla');

  // Derive center from boundary
  const center: [number, number] | null = useMemo(() => {
    if (!project.parcelBoundaryGeojson) return null;
    try {
      const fc = project.parcelBoundaryGeojson as GeoJSON.FeatureCollection;
      if (!fc.features?.length) return null;
      let sumLng = 0, sumLat = 0, count = 0;
      function visitCoords(coords: unknown): void {
        if (!Array.isArray(coords)) return;
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
          sumLng += coords[0] as number;
          sumLat += coords[1] as number;
          count++;
          return;
        }
        for (const item of coords) visitCoords(item);
      }
      for (const f of fc.features) visitCoords((f.geometry as { coordinates: unknown }).coordinates);
      if (count === 0) return null;
      return [sumLng / count, sumLat / count];
    } catch { return null; }
  }, [project.parcelBoundaryGeojson]);

  const qibla = useMemo(() => center ? computeQibla(center[1], center[0]) : null, [center]);

  // Store subscriptions
  const allStructures = useStructureStore((st) => st.structures);
  const structures = useMemo(() => allStructures.filter((st) => st.projectId === project.id), [allStructures, project.id]);

  const allZones = useZoneStore((st) => st.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const spiritualZones = useMemo(() => zones.filter((z) => z.category === 'spiritual'), [zones]);
  const infrastructureZones = useMemo(() => zones.filter((z) => z.category === 'infrastructure'), [zones]);

  const allPaths = usePathStore((st) => st.paths);
  const paths = useMemo(() => allPaths.filter((pa) => pa.projectId === project.id), [allPaths, project.id]);
  const vehiclePaths = useMemo(() => paths.filter((pa) => ['main_road', 'secondary_road', 'service_road'].includes(pa.type)), [paths]);

  const siteData = useSiteData(project.id);
  const visionData = useVisionStore((st) => st.getVisionData(project.id));

  return (
    <div className={p.container}>
      <h2 className={p.title}>Spiritual Intelligence</h2>

      <div className={p.tabBar}>
        <button className={`${p.tabBtn} ${activeTab === 'qibla' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('qibla')}>Qibla</button>
        <button className={`${p.tabBtn} ${activeTab === 'spaces' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('spaces')}>Spaces</button>
        <button className={`${p.tabBtn} ${activeTab === 'signs' ? p.tabBtnActive : ''}`} onClick={() => setActiveTab('signs')}>Signs</button>
      </div>

      {activeTab === 'qibla' && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <QiblaDisplay center={center} />
          <PrayerSpaceAlignment structures={structures} qiblaBearing={qibla?.bearing ?? null} />
        </div>
      )}

      {activeTab === 'spaces' && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* §6 per-spiritual-zone prayer-readiness audit */}
          <PrayerZoneReadinessCard project={project} />
          <QuietZonePlanning spiritualZones={spiritualZones} infrastructureZones={infrastructureZones} vehiclePaths={vehiclePaths} />
          <MoontranceSpiritual identity={visionData?.moontranceIdentity ?? null} projectType={project.projectType ?? ''} />
        </div>
      )}

      {activeTab === 'signs' && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SolarEvents center={center} />
          <SignsInCreation siteData={siteData} />
        </div>
      )}
    </div>
  );
}
