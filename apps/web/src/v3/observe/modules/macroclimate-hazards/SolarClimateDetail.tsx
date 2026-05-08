import {
  ArrowRight,
  Download,
  Droplet,
  ExternalLink,
  Leaf,
  Plus,
  Snowflake,
  Sprout,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import heroSunscape from '../../assets/solar-climate-detail/hero-sunscape.png';
import monthlyClimate from '../../assets/solar-climate-detail/monthly-climate-overview.png';
import solarPath from '../../assets/solar-climate-detail/solar-path-angles.png';
import windRose from '../../assets/solar-climate-detail/wind-rose.png';

export default function SolarClimateDetail() {
  return (
    <div className="detail-page solar-detail-page">
      <section className="solar-detail-layout">
        <div className="solar-detail-main">
          <SolarHero />
          <SolarKpis />
          <section className="solar-chart-grid">
            <ClimateOverviewCard />
            <SolarPathCard />
          </section>
          <section className="solar-bottom-grid">
            <WindExposureCard />
            <ExposureShelterCard />
            <ClimateOpportunitiesCard />
          </section>
          <SeasonalSummary />
        </div>
        <SolarActionRail />
      </section>
    </div>
  );
}

function SolarHero() {
  return (
    <header className="solar-hero">
      <div>
        <h1>Solar &amp; Climate detail</h1>
        <p>
          Understand sunlight, seasonal rhythms, rainfall, and wind patterns to design with
          climate, not against it. These insights help you place elements, time actions, and build
          resilience.
        </p>
        <div className="solar-hero-actions">
          <button className="green-button" type="button">
            <Download aria-hidden="true" /> Export climate report
          </button>
          <button className="outlined-button" type="button">
            Compare seasons
          </button>
          <button className="outlined-button" type="button">
            <ExternalLink aria-hidden="true" /> Open climate sources
          </button>
        </div>
      </div>
      <CroppedArt src={heroSunscape} className="solar-hero-art" />
    </header>
  );
}

function SolarKpis() {
  const items: Array<[LucideIcon, string, string, string, string]> = [
    [Sun, 'Hardiness zone', '5b', 'Cool temperate', 'gold'],
    [Droplet, 'Annual precip.', '870 mm', 'Moderate', 'blue'],
    [Leaf, 'Frost-free days', '168', 'Apr 30 - Oct 14', 'green'],
    [Sun, 'Avg daily solar', '4.2 kWh/m2/day', 'Good exposure', 'gold'],
    [Wind, 'Prevailing wind', 'W / SW', '10-18 km/h', 'green'],
    [Sun, 'Last spring frost', 'May 3', '10% risk', 'dim'],
    [Snowflake, 'First fall frost', 'Oct 18', '10% risk', 'blue'],
  ];
  return (
    <section className="solar-kpi-grid">
      {items.map(([Icon, label, value, note, tone]) => (
        <SurfaceCard className={`solar-kpi ${tone}`} key={label}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </SurfaceCard>
      ))}
    </section>
  );
}

function ClimateOverviewCard() {
  return (
    <SurfaceCard className="solar-panel climate-overview-panel">
      <header>
        <h2>Monthly climate overview</h2>
        <button type="button">Monthly</button>
      </header>
      <CroppedArt src={monthlyClimate} className="climate-overview-image" />
    </SurfaceCard>
  );
}

function SolarPathCard() {
  return (
    <SurfaceCard className="solar-panel solar-path-panel">
      <h2>Solar path &amp; seasonal sun angles</h2>
      <div className="solar-path-content">
        <CroppedArt src={solarPath} className="solar-path-image" />
        <SurfaceCard className="daylight-hours">
          <h3>Daylight hours</h3>
          {[
            ['Jun', '15.2'],
            ['Mar', '12.1'],
            ['Sep', '12.0'],
            ['Dec', '8.6'],
          ].map(([month, hours]) => (
            <p key={month}>
              <Sun aria-hidden="true" />
              <span>{month}</span>
              <b>{hours}</b>
            </p>
          ))}
          <strong>
            11.9 hrs <small>Annual avg daylight</small>
          </strong>
        </SurfaceCard>
      </div>
    </SurfaceCard>
  );
}

function WindExposureCard() {
  return (
    <SurfaceCard className="solar-panel wind-panel">
      <h2>Wind &amp; exposure</h2>
      <CroppedArt src={windRose} className="wind-rose-image" />
    </SurfaceCard>
  );
}

function ExposureShelterCard() {
  const items: Array<[string, string, string]> = [
    ['Cold winds', 'Place wind protection from W-NW in winter months.', 'High'],
    ['Sheltered zones', 'SE slopes and tree lines offer best protection.', 'Good'],
    ['Storm exposure', 'Occasional strong SW storms in late fall and winter.', 'Moderate'],
  ];
  return (
    <SurfaceCard className="solar-panel exposure-panel">
      <h2>Exposure &amp; shelter</h2>
      {items.map(([title, text, rating]) => (
        <p key={title}>
          <Wind aria-hidden="true" />
          <b>
            {title}
            <small>{text}</small>
          </b>
          <em>{rating}</em>
        </p>
      ))}
    </SurfaceCard>
  );
}

function ClimateOpportunitiesCard() {
  const items: Array<[string, string]> = [
    [
      'Greenhouse siting',
      'Place on south-facing slope for maximum winter sun and protection from cold winds.',
    ],
    [
      'Orchard placement',
      'South to southwest aspects provide best flowering conditions and fruit quality.',
    ],
    [
      'Water capture timing',
      'Design systems to capture Nov-Mar rainfall; prioritize storage for dry summer months.',
    ],
    [
      'Windbreak opportunities',
      'Plant dense evergreens on W/NW edges to reduce wind speed and evapotranspiration.',
    ],
    [
      'Passive solar buildings',
      'Orient long axis E-W with south-facing glazing and thermal mass for heating.',
    ],
  ];
  return (
    <SurfaceCard className="solar-panel opportunities-panel">
      <h2>Climate opportunities &amp; site implications</h2>
      {items.map(([title, text]) => (
        <p key={title}>
          <Sprout aria-hidden="true" />
          <b>{title}</b>
          <span>{text}</span>
        </p>
      ))}
    </SurfaceCard>
  );
}

function SeasonalSummary() {
  const items: Array<[LucideIcon, string, string, string]> = [
    [Leaf, 'Growing season', '168 days', 'Apr 30 - Oct 14'],
    [Snowflake, 'Freeze window', 'Oct 18 - May 3', '~ 29 weeks'],
    [Sun, 'Heat stress days', '12 days', '> 30 degrees C'],
    [Droplet, 'Dry season (deficit)', 'Jun - Aug', '-96 mm avg'],
    [Droplet, 'Irrigation pressure', 'Moderate', 'Plan storage'],
    [Snowflake, 'Snowfall (avg)', '54 cm', 'Dec - Mar'],
    [Sun, 'Extreme events', 'Moderate', 'Wind / freeze risk'],
  ];
  return (
    <SurfaceCard className="seasonal-summary-strip">
      {items.map(([Icon, label, value, note]) => (
        <div key={label}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </div>
      ))}
    </SurfaceCard>
  );
}

function SolarActionRail() {
  const priorities: Array<[string, string]> = [
    [
      'Maximize passive solar gain',
      'Long winter nights and good solar exposure support passive heating and greenhouse siting.',
    ],
    [
      'Capture winter & spring water',
      'Most rain falls Nov-Mar. Design swales, ponds, and tanks to store off-peak rainfall.',
    ],
    [
      'Shelter from cold & dry winds',
      'Prevailing W-SW winds carry winter cold. Use windbreaks and landform to create calm growing zones.',
    ],
    [
      'Plan around frost windows',
      '168 frost-free days. Protect tender plants early spring and late fall.',
    ],
  ];
  const actions: Array<[string, string]> = [
    ['Site greenhouse on south slope with morning sun', 'High'],
    ['Map windbreak locations for W-SW winter winds', 'High'],
    ['Design rainwater capture for Nov-Mar rainfall', 'Medium'],
    ['Plan orchard on south/southwest facing terraces', 'Medium'],
    ['Use thermal mass & insulation for passive solar buildings', 'Low'],
  ];
  return (
    <aside className="solar-action-rail">
      <SurfaceCard className="climate-priorities-card">
        <h2>Climate insights &amp; next actions</h2>
        <h3>Top priorities</h3>
        {priorities.map(([title, text], index) => (
          <p key={title}>
            <b>{index + 1}</b>
            <span>
              {title}
              <small>{text}</small>
            </span>
            <ArrowRight aria-hidden="true" />
          </p>
        ))}
      </SurfaceCard>
      <SurfaceCard className="recommended-climate-actions">
        <h2>Recommended next actions</h2>
        {actions.map(([title, priority]) => (
          <p key={title}>
            <Sun aria-hidden="true" />
            <span>{title}</span>
            <em>{priority}</em>
          </p>
        ))}
        <button className="green-button" type="button">
          Add to design plan <Plus aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
