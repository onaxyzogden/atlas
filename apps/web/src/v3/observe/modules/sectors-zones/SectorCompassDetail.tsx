import { useMemo } from 'react';
import {
  ArrowRight,
  Check,
  Compass,
  Flame,
  Mountain,
  Plus,
  Settings,
  Shield,
  Sun,
  Wind,
  Layers,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import { useExternalForcesStore, type SectorArrow } from '../../../../store/externalForcesStore.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import TerrainSnapshot from '../topography/TerrainSnapshot.js';
import SectorCompassDiagram from './SectorCompassDiagram.js';
import { compassKpis, type KpiIconKey, type KpiItem } from './derivations.js';
import { polygonCentroid } from '../macroclimate-hazards/derivations.js';

const ICON_MAP: Record<KpiIconKey, LucideIcon> = {
  compass: Compass,
  layers: Layers,
  wind: Wind,
  sun: Sun,
  flame: Flame,
  mountain: Mountain,
  shield: Shield,
};

const SECTOR_TYPE_LABELS: Record<SectorArrow['type'], string> = {
  sun_summer: 'Summer sun',
  sun_winter: 'Winter sun',
  wind_prevailing: 'Prevailing wind',
  wind_storm: 'Storm wind',
  fire: 'Wildfire / hazard',
  noise: 'Road & noise',
  wildlife: 'Wildlife corridor',
  view: 'Views',
};

const INTENSITY_LABELS: Record<NonNullable<SectorArrow['intensity']>, string> = {
  high: 'High',
  med: 'Medium',
  low: 'Low',
};

export default function SectorCompassDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);

  const allSectors = useExternalForcesStore((s) => s.sectors);
  const sectors = useMemo(() => allSectors.filter((s) => s.projectId === id), [allSectors, id]);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);

  const centroid = polygonCentroid(project?.location?.boundary);
  const centroidTuple: [number, number] | null = centroid
    ? [centroid.lng, centroid.lat]
    : null;

  const kpis = compassKpis(sectors, layers);

  const sortedSectors = useMemo(() => {
    const order: Record<string, number> = { high: 3, med: 2, low: 1 };
    return [...sectors].sort(
      (a, b) => (order[b.intensity ?? 'low'] ?? 0) - (order[a.intensity ?? 'low'] ?? 0),
    );
  }, [sectors]);

  return (
    <div className="detail-page sector-compass-page">
      <SectorCompassTop />
      <header className="sector-compass-header">
        <p>
          Module 5 <span>Sectors, Microclimates &amp; Zones</span>
        </p>
        <div>
          <h1>Sector compass</h1>
          <p>Map and analyse the external energies and influences shaping your site.</p>
        </div>
      </header>
      <SectorCompassKpis kpis={kpis} />
      <section className="sector-compass-layout">
        <div className="sector-compass-main">
          <section className="sector-compass-workspace">
            <SurfaceCard className="sector-compass-chart-card">
              <h2>Sector compass</h2>
              <SectorCompassDiagram
                sectors={sectors}
                centroid={centroidTuple}
                className="sector-compass-main-image"
              />
              <div className="sector-compass-legend">
                {[
                  'Wind & Air',
                  'Sun & Light',
                  'Hazards',
                  'Access & Noise',
                  'Views & Neighbours',
                  'Cold air flow',
                ].map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </SurfaceCard>
            <SurfaceCard className="sector-context-card">
              <header>
                <h2>Site context</h2>
                <button type="button" aria-label="Settings">
                  <Settings aria-hidden="true" />
                </button>
              </header>
              <TerrainSnapshot
                boundary={project?.location?.boundary}
                caption={project?.name}
                width={280}
                height={200}
                className="sector-context-image"
              />
              <p>
                Arrows indicate the direction of external influences. Use this to guide placement
                and protection.
              </p>
              <button type="button">
                <Compass aria-hidden="true" /> Calibrate compass
              </button>
            </SurfaceCard>
          </section>
          <section className="sector-bottom-grid">
            <PlacementsCard />
            <DesignResponses />
          </section>
        </div>
        <aside className="sector-compass-rail">
          <SectorObservations sectors={sortedSectors} />
          <PriorityActions />
        </aside>
      </section>
    </div>
  );
}

function SectorCompassTop() {
  const steps = ['Site & Context', 'Microclimate & Hazards', 'Site Analysis', 'Design', 'Implementation'];
  return (
    <nav className="sector-compass-top" aria-label="Design process">
      {steps.map((item, index) => (
        <span className={index === 1 ? 'is-active' : ''} key={item}>
          <b>{index + 1}</b>
          {item}
          <ArrowRight aria-hidden="true" />
        </span>
      ))}
      <button type="button">Project settings</button>
      <button type="button">Data complete</button>
    </nav>
  );
}

interface SectorCompassKpisProps {
  kpis: KpiItem[];
}

function SectorCompassKpis({ kpis }: SectorCompassKpisProps) {
  return (
    <section className="sector-compass-kpis">
      {kpis.map((item) => {
        const Icon = ICON_MAP[item.iconKey];
        return (
          <SurfaceCard key={item.label} className={`sector-compass-kpi ${item.tone}`}>
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.note}</small>
          </SurfaceCard>
        );
      })}
    </section>
  );
}

interface SectorObservationsProps {
  sectors: SectorArrow[];
}

function SectorObservations({ sectors }: SectorObservationsProps) {
  return (
    <SurfaceCard className="sector-observations-card">
      <h2>
        Sector observations{' '}
        {sectors.length > 0 && <b>{sectors.length}</b>}
      </h2>
      {sectors.length === 0 ? (
        <p className="empty-note">No sectors logged yet — add one from the toolbar.</p>
      ) : (
        <>
          <div className="sector-observation-head">
            <span>Priority</span>
            <span>Sector</span>
            <span>Influence</span>
            <span>Impact</span>
          </div>
          {sectors.map((s, index) => (
            <p key={s.id}>
              <b>{index + 1}</b>
              <span>{s.bearingDeg}°</span>
              <em>{SECTOR_TYPE_LABELS[s.type]}</em>
              <strong>{INTENSITY_LABELS[s.intensity ?? 'low']}</strong>
            </p>
          ))}
        </>
      )}
      <button type="button">Edit sector arrows</button>
    </SurfaceCard>
  );
}

function PlacementsCard() {
  return (
    <SurfaceCard className="placements-card">
      <h2>Recommended placements &amp; interventions</h2>
      <p className="empty-note">
        Placements generate as you add sector arrows from the toolbar.
      </p>
      <button type="button">
        <Compass aria-hidden="true" /> Generate design overlay
      </button>
    </SurfaceCard>
  );
}

function DesignResponses() {
  const rows: Array<[string, string, string]> = [
    ['Establish windbreak on NW boundary', 'High', 'Pending'],
    ['Create fire buffer on SW boundary', 'High', 'Planned'],
    ['Site outdoor living in E-SE quadrant', 'High', 'Planned'],
    ['Plant shade trees for summer sun (S)', 'Medium', 'Planned'],
    ['Use berms or vegetation to screen road', 'Medium', 'In progress'],
    ['Enhance view corridor to NE', 'Low', 'Planned'],
  ];
  return (
    <SurfaceCard className="design-responses-card">
      <h2>Design responses</h2>
      {rows.map(([title, priority, status]) => (
        <p key={title}>
          <Check aria-hidden="true" />
          {title}
          <b>{priority}</b>
          <span>{status}</span>
        </p>
      ))}
      <button type="button">Manage responses</button>
    </SurfaceCard>
  );
}

function PriorityActions() {
  const rows: Array<[string, string, string]> = [
    ['Clear fire buffer (20 m) on SW boundary', 'Due in 1-2 weeks', 'High'],
    ['Plant windbreak (NW) - 3 row shelterbelt', 'Due in 2-4 weeks', 'High'],
    ['Identify orchard zone & soil prep', 'Due in 1 month', 'Medium'],
    ['Plan seating area & sun/shade strategy', 'Due in 1-2 months', 'Medium'],
    ['Install pond & swale to SE', 'Due in 2-3 months', 'Low'],
  ];
  return (
    <SurfaceCard className="sector-priority-card">
      <h2>Priority actions</h2>
      {rows.map(([title, due, priority], index) => (
        <p key={title}>
          <b>{index + 1}</b>
          <span>{title}</span>
          <small>{due}</small>
          <em>{priority}</em>
        </p>
      ))}
      <button className="green-button" type="button">
        <Plus aria-hidden="true" /> Add to design plan
      </button>
    </SurfaceCard>
  );
}
