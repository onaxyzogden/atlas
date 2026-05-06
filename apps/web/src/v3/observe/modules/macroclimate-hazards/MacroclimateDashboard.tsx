import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Droplet,
  Leaf,
  Snowflake,
  Sun,
  TriangleAlert,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import { useDetailNav } from '../../components/ModuleSlideUp.js';
import monthlyClimate from '../../assets/macroclimate-dashboard/monthly-climate.png';
import sunPath from '../../assets/macroclimate-dashboard/sun-path.png';
import hazardMatrix from '../../assets/macroclimate-dashboard/hazard-risk-matrix.png';
import hazardHotspots from '../../assets/macroclimate-dashboard/hazard-hotspots.png';

export default function MacroclimateDashboard() {
  return (
    <div className="detail-page macroclimate-page">
      <section className="macroclimate-layout">
        <div className="macroclimate-main">
          <MacroHeader />
          <MacroKpis />
          <SolarClimateCard />
          <HazardsCard />
        </div>
        <MacroSidebar />
      </section>
    </div>
  );
}

function MacroHeader() {
  return (
    <header className="macro-header">
      <span>Module 2</span>
      <h1>Macroclimate &amp; Hazards</h1>
      <p>
        Understand the big-picture climate patterns and natural hazards that shape your site. Use
        this foundation to design resilient systems that work with your environment, not against
        it.
      </p>
      <b>Data complete</b>
    </header>
  );
}

function MacroKpis() {
  const items: Array<[LucideIcon, string, string, string, string]> = [
    [Snowflake, 'Hardiness zone', '5b', 'USDA', 'blue'],
    [Droplet, 'Annual precip', '870 mm', 'Average', 'blue'],
    [TriangleAlert, 'Logged hazards', '3', 'Active', 'gold'],
    [CalendarDays, 'Frost-free days', '155', 'Average', 'green'],
    [Sun, 'Avg. solar exposure', '5.4 kWh/m2/day', 'Annual average', 'gold'],
    [Wind, 'Prevailing wind', 'NW', '12 km/h avg.', 'green'],
    [Droplet, 'Seasonal water stress', 'Low-Moderate', 'Jun-Aug', 'green'],
  ];

  return (
    <section className="macro-kpi-grid">
      {items.map(([Icon, label, value, note, tone]) => (
        <SurfaceCard className={`macro-kpi-card ${tone}`} key={label}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </SurfaceCard>
      ))}
    </section>
  );
}

function SolarClimateCard() {
  const nav = useDetailNav();
  const opportunities: Array<[string, string]> = [
    ['Passive solar gain', 'High in winter'],
    ['Shade for cooling', 'Important Jun-Aug'],
    ['Rainwater harvesting', 'High yield potential'],
    ['Wind protection', 'NW winds in winter'],
    ['Season extension', 'Long shoulder seasons'],
  ];

  return (
    <SurfaceCard className="macro-section-card solar-card">
      <header>
        <div>
          <h2>
            <Sun aria-hidden="true" /> Solar &amp; Climate detail
          </h2>
          <p>
            Deep dive into sun, temperature, precipitation, and seasonality to identify
            opportunities for passive design and productivity.
          </p>
        </div>
        <button
          className="green-button"
          type="button"
          onClick={() => nav.push('solar-climate')}
        >
          Open page <ArrowRight aria-hidden="true" />
        </button>
      </header>
      <div className="solar-grid">
        <div>
          <h3>Average Monthly Climate</h3>
          <CroppedArt src={monthlyClimate} className="macro-chart monthly-chart" />
        </div>
        <div>
          <h3>Sun path (Summer solstice)</h3>
          <CroppedArt src={sunPath} className="macro-chart sun-chart" />
        </div>
        <SurfaceCard className="climate-opportunities">
          <h3>Climate opportunities</h3>
          {opportunities.map(([label, value]) => (
            <p key={label}>
              <Leaf aria-hidden="true" />
              <span>{label}</span>
              <b>{value}</b>
            </p>
          ))}
        </SurfaceCard>
      </div>
      <button
        className="outlined-button section-link"
        type="button"
        onClick={() => nav.push('solar-climate')}
      >
        See full climate analysis <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function HazardsCard() {
  const nav = useDetailNav();
  const rows: Array<[string, string, string, string, string]> = [
    ['Late spring frost', 'High', 'Up', 'In progress', '60%'],
    ['Intense storm / wind', 'High', 'Right', 'Planned', '25%'],
    ['Summer drought', 'Moderate', 'Up', 'Monitoring', '40%'],
  ];

  return (
    <SurfaceCard className="macro-section-card hazards-card">
      <header>
        <div>
          <h2>
            <TriangleAlert aria-hidden="true" /> Hazards log
          </h2>
          <p>Review natural hazards, risk levels, and mitigation strategies for your site.</p>
        </div>
        <button
          className="green-button"
          type="button"
          onClick={() => nav.push('hazards-log')}
        >
          Open page <ArrowRight aria-hidden="true" />
        </button>
      </header>
      <div className="hazards-grid">
        <div>
          <h3>Hazard risk matrix</h3>
          <CroppedArt src={hazardMatrix} className="macro-chart hazard-matrix-image" />
        </div>
        <div>
          <h3>Hazard hotspots</h3>
          <CroppedArt src={hazardHotspots} className="macro-chart hazard-hotspots-image" />
        </div>
        <SurfaceCard className="active-hazards-table">
          <h3>Active hazards</h3>
          {rows.map(([hazard, risk, trend, mitigation, status], index) => (
            <p key={hazard}>
              <b>{index + 1}</b>
              <span>
                {hazard}
                <small>{risk} risk</small>
              </span>
              <em>{trend}</em>
              <strong>{mitigation}</strong>
              <i>{status}</i>
            </p>
          ))}
        </SurfaceCard>
      </div>
      <button
        className="outlined-button section-link"
        type="button"
        onClick={() => nav.push('hazards-log')}
      >
        See full hazards log <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function MacroSidebar() {
  return (
    <aside className="macro-sidebar">
      <SurfaceCard className="macro-insights-card">
        <h2>Design insights &amp; recommendations</h2>
        <h3>Key takeaways</h3>
        {[
          'Cool temperate climate with strong seasonality and good precipitation.',
          'High winter solar access - design for passive solar gain.',
          'NW winds and late frosts are primary design constraints.',
          'Low-moderate summer water stress - prioritize water storage and soil moisture.',
        ].map((item) => (
          <p key={item}>
            <CheckCircle2 aria-hidden="true" />
            {item}
          </p>
        ))}
        <h3>Next actions</h3>
        {[
          'Review Solar & Climate detail for passive design opportunities.',
          'Open Hazards log to refine mitigation strategies and track progress.',
          'Integrate climate insights into Zone & Sector planning.',
        ].map((item, index) => (
          <p className="numbered" key={item}>
            <b>{index + 1}</b>
            {item}
          </p>
        ))}
        <section className="risk-priorities">
          <h3>Top risk priorities</h3>
          <ol>
            <li>Late spring frost</li>
            <li>Intense storm / wind</li>
            <li>Summer drought</li>
          </ol>
        </section>
        <button className="green-button" type="button">
          Go to next: Site Analysis <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
