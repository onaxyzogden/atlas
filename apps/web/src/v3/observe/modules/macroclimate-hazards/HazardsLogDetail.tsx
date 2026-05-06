import {
  ArrowRight,
  Download,
  Droplet,
  Flame,
  Plus,
  ShieldCheck,
  Sun,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, ProgressRing, SurfaceCard } from '../../_shared/components/index.js';
import riskMatrix from '../../assets/hazards-log/risk-matrix.png';
import hazardHotspots from '../../assets/hazards-log/hazard-hotspots.png';
import hazardTimeline from '../../assets/hazards-log/hazard-timeline.png';

export default function HazardsLogDetail() {
  return (
    <div className="detail-page hazards-log-page">
      <HazardsHeader />
      <HazardKpis />
      <section className="hazards-top-grid">
        <HazardsOverview />
        <RiskMatrixPanel />
        <HotspotsPanel />
      </section>
      <section className="hazards-bottom-grid">
        <MitigationActions />
        <TimelinePanel />
        <RecentIncidents />
        <PriorityActions />
      </section>
    </div>
  );
}

function HazardsHeader() {
  return (
    <header className="hazards-header">
      <div>
        <div className="hazards-title-row">
          <TriangleAlert aria-hidden="true" />
          <div>
            <h1>Hazards log</h1>
            <p>
              Track site risks, seasonal threats and mitigation readiness. Use this log to
              prioritize actions, reduce losses and build resilience across your design zones.
            </p>
          </div>
        </div>
      </div>
      <div className="hazards-header-actions">
        <button className="green-button" type="button">
          <Plus aria-hidden="true" /> Add hazard
        </button>
        <button className="outlined-button" type="button">
          <Download aria-hidden="true" /> Export log
        </button>
        <button className="outlined-button" type="button">
          Open risk report
        </button>
      </div>
    </header>
  );
}

function HazardKpis() {
  const items: Array<[LucideIcon, string, string, string, string]> = [
    [ShieldCheck, 'Logged hazards', '3', 'Across all zones', 'green'],
    [TriangleAlert, 'High priority', '1', 'Requires attention', 'red'],
    [TriangleAlert, 'Medium priority', '2', 'Monitor & manage', 'gold'],
    [ShieldCheck, 'Mitigations active', '5', 'Across all hazards', 'green'],
    [Download, 'Review due', '14 days', 'Next review: 26 Apr 2025', 'dim'],
  ];

  return (
    <section className="hazard-kpi-grid">
      {items.map(([Icon, label, value, note, tone]) => (
        <SurfaceCard className={`hazard-kpi ${tone}`} key={label}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </SurfaceCard>
      ))}
    </section>
  );
}

function HazardsOverview() {
  const rows: Array<[LucideIcon, string, string, string, string, string, string, number]> = [
    [
      Sun,
      'Drought stress',
      'Prolonged dry periods impacting water availability and plant health.',
      'High (4/5)',
      'High (4/5)',
      'Nov - Mar',
      'High',
      60,
    ],
    [
      Droplet,
      'Heavy rainfall & erosion',
      'Intense rain events causing soil loss, gullying and infrastructure damage.',
      'Medium (3/5)',
      'Medium (3/5)',
      'May - Aug',
      'Medium',
      75,
    ],
    [
      Flame,
      'Wildfire / windstorm / flooding',
      'Extreme weather events increasing fire risk, wind damage and flash flooding.',
      'High (5/5)',
      'Low-Med (2/5)',
      'Oct - Feb',
      'High',
      50,
    ],
  ];

  return (
    <SurfaceCard className="hazard-panel hazards-overview-panel">
      <h2>Hazards overview</h2>
      <div className="hazards-table-head">
        <span>Hazard</span>
        <span>Severity</span>
        <span>Probability</span>
        <span>Seasonal window</span>
        <span>Status</span>
        <span>Coverage</span>
      </div>
      {rows.map(([Icon, hazard, desc, severity, probability, window, status, progress], index) => (
        <article className="hazard-row" key={hazard}>
          <Icon aria-hidden="true" />
          <b>{index + 1}</b>
          <div>
            <strong>{hazard}</strong>
            <small>{desc}</small>
          </div>
          <em>{severity}</em>
          <em>{probability}</em>
          <span>{window}</span>
          <i>
            {status}
            <small>Active</small>
          </i>
          <ProgressRing value={progress} label={`${progress}%`} />
        </article>
      ))}
      <button className="outlined-button" type="button">
        View all hazards <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function RiskMatrixPanel() {
  return (
    <SurfaceCard className="hazard-panel risk-matrix-panel">
      <h2>Risk matrix</h2>
      <CroppedArt src={riskMatrix} className="risk-matrix-image" />
    </SurfaceCard>
  );
}

function HotspotsPanel() {
  return (
    <SurfaceCard className="hazard-panel hotspots-panel">
      <h2>Hazard hotspots</h2>
      <CroppedArt src={hazardHotspots} className="hotspots-image" />
      <button className="outlined-button" type="button">
        Open map view
      </button>
    </SurfaceCard>
  );
}

function MitigationActions() {
  const rows: Array<[string, string, string, string, string]> = [
    ['Keyline swales & water spreading', 'Slow runoff, increase infiltration', '1 2', 'Active', '80%'],
    ['Mulch & drought buffers', 'Reduce evaporation, support soil moisture', '1', 'Active', '70%'],
    ['Spillways & overflow routing', 'Safe excess water movement', '2 3', 'Active', '75%'],
    ['Firebreak maintenance', 'Limit fire spread through site', '3', 'Active', '60%'],
    ['Shelterbelt planting', 'Reduce wind impact, erosion & fire risk', '1 3', 'In progress', '40%'],
    ['Emergency water storage', 'Backup supply for drought & fire', '1 3', 'Planned', '20%'],
  ];
  return (
    <SurfaceCard className="hazard-panel mitigation-panel">
      <h2>Mitigation actions</h2>
      {rows.map(([action, target, hazards, status, coverage]) => (
        <p key={action}>
          <ShieldCheck aria-hidden="true" />
          <b>
            {action}
            <small>{target}</small>
          </b>
          <span>{hazards}</span>
          <em>{status}</em>
          <i>{coverage}</i>
        </p>
      ))}
      <button className="outlined-button" type="button">
        Manage all actions <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function TimelinePanel() {
  return (
    <SurfaceCard className="hazard-panel timeline-panel">
      <h2>
        Hazard timeline <small>(Seasonal risk window)</small>
      </h2>
      <CroppedArt src={hazardTimeline} className="hazard-timeline-image" />
    </SurfaceCard>
  );
}

function RecentIncidents() {
  const rows: Array<[string, string, string]> = [
    [
      '10 Apr 2025',
      'Soil moisture probes show low levels in Zone 2',
      'Consider increasing mulch thickness.',
    ],
    ['06 Apr 2025', 'Minor gully formation observed near access track', '48 mm rain event.'],
    ['28 Mar 2025', 'Strong NW winds recorded', 'Reduced exposure in Zone 5.'],
  ];
  return (
    <SurfaceCard className="hazard-panel incidents-panel">
      <h2>Recent observations &amp; incidents</h2>
      {rows.map(([date, title, note]) => (
        <p key={title}>
          <b>{date}</b>
          <span>
            {title}
            <small>{note}</small>
          </span>
        </p>
      ))}
      <button className="outlined-button" type="button">
        View full journal
      </button>
    </SurfaceCard>
  );
}

function PriorityActions() {
  const rows: Array<[string, string, string, string]> = [
    [
      'Reinforce drought resilience',
      'Expand mulching in Zones 2 & 4. Check storage levels',
      'High',
      'Due: 18 Apr',
    ],
    [
      'Maintain drainage lines',
      'Clear silt, check swale integrity before winter rains',
      'Medium',
      'Due: 22 Apr',
    ],
    [
      'Fire season preparation',
      'Inspect firebreaks & access routes. Update water points',
      'High',
      'Due: 25 Apr',
    ],
  ];
  return (
    <SurfaceCard className="hazard-panel priority-panel">
      <h2>Priority next actions</h2>
      {rows.map(([title, note, priority, due], index) => (
        <p key={title}>
          <b>{index + 1}</b>
          <span>
            {title}
            <small>{note}</small>
          </span>
          <em>
            {priority}
            <small>{due}</small>
          </em>
        </p>
      ))}
      <button className="outlined-button" type="button">
        View all recommendations <ArrowRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}
