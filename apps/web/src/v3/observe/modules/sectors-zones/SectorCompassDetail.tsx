import {
  ArrowRight,
  Check,
  Compass,
  Flame,
  Mountain,
  Plus,
  Settings,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import compassMain from '../../assets/sector-compass-detail/compass-main.png';
import siteContext from '../../assets/sector-compass-detail/site-context.png';
import placementsStrip from '../../assets/sector-compass-detail/placements-strip.png';

export default function SectorCompassDetail() {
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
      <SectorCompassKpis />
      <section className="sector-compass-layout">
        <div className="sector-compass-main">
          <section className="sector-compass-workspace">
            <SurfaceCard className="sector-compass-chart-card">
              <h2>Sector compass</h2>
              <CroppedArt src={compassMain} className="sector-compass-main-image" />
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
              <CroppedArt src={siteContext} className="sector-context-image" />
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
            <SurfaceCard className="placements-card">
              <h2>Recommended placements &amp; interventions</h2>
              <CroppedArt src={placementsStrip} className="placements-strip-image" />
              <button type="button">
                <Compass aria-hidden="true" /> Generate design overlay
              </button>
            </SurfaceCard>
            <DesignResponses />
          </section>
        </div>
        <aside className="sector-compass-rail">
          <SectorObservations />
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

function SectorCompassKpis() {
  const items: Array<[LucideIcon, string, string, string]> = [
    [Wind, 'Dominant wind', 'NW', '12 km/h avg'],
    [Sun, 'Morning sun sector', 'E-SE', '74 degrees'],
    [Flame, 'High-risk sector', 'SW', 'Wildfire risk'],
    [Mountain, 'Beneficial view sector', 'NE', 'Ridge & valley'],
    [Compass, 'Sector arrows placed', '5', 'Active'],
  ];
  return (
    <section className="sector-compass-kpis">
      {items.map(([Icon, label, value, note]) => (
        <SurfaceCard key={label} className="sector-compass-kpi">
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </SurfaceCard>
      ))}
    </section>
  );
}

function SectorObservations() {
  const rows: Array<[string, string, string]> = [
    ['SW (225)', 'Wildfire risk', 'High'],
    ['NW (315)', 'Winter wind', 'High'],
    ['W (270)', 'Road & noise', 'Medium'],
    ['E-SE (74)', 'Morning sun', 'High'],
    ['S (180)', 'Summer sun', 'High'],
    ['NE (45)', 'Views', 'High'],
    ['N (0)', 'Cold air', 'Medium'],
  ];
  return (
    <SurfaceCard className="sector-observations-card">
      <h2>
        Sector observations <b>5</b>
      </h2>
      <div className="sector-observation-head">
        <span>Priority</span>
        <span>Sector</span>
        <span>Influence</span>
        <span>Impact</span>
      </div>
      {rows.map(([sector, influence, impact], index) => (
        <p key={`${sector}-${influence}`}>
          <b>{index + 1}</b>
          <span>{sector}</span>
          <em>{influence}</em>
          <strong>{impact}</strong>
        </p>
      ))}
      <button type="button">Edit sector arrows</button>
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
