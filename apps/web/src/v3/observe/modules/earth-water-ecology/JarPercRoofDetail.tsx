import {
  ArrowRight,
  CloudRain,
  Download,
  Droplet,
  Home,
  Leaf,
  NotebookText,
  Plus,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { CroppedArt, SurfaceCard } from '../../_shared/components/index.js';
import jarLayers from '../../assets/jar-perc-roof/jar-layers.png';
import percGauge from '../../assets/jar-perc-roof/perc-gauge.png';
import roofDiagram from '../../assets/jar-perc-roof/roof-diagram.png';
import storageCapacity from '../../assets/jar-perc-roof/storage-capacity.png';
import seasonalCapture from '../../assets/jar-perc-roof/seasonal-capture.png';

export default function JarPercRoofDetail() {
  return (
    <div className="detail-page jpr-page">
      <section className="jpr-layout">
        <div className="jpr-main">
          <JprHeader />
          <JprKpis />
          <section className="jpr-result-grid">
            <JarTestCard />
            <PercTestCard />
            <RoofCatchmentCard />
          </section>
          <section className="jpr-bottom-grid">
            <AssumptionsCard />
            <RecentTestsCard />
            <NotesCard />
            <NextActionsCard />
          </section>
        </div>
        <JprSidebar />
      </section>
    </div>
  );
}

function JprHeader() {
  return (
    <header className="jpr-header">
      <div className="jpr-title-row">
        <span>4</span>
        <div>
          <h1>Jar / Perc / Roof</h1>
          <p>
            Soil texture testing, water infiltration testing, and roof runoff estimation to inform
            practical water management.
          </p>
        </div>
      </div>
    </header>
  );
}

function JprKpis() {
  const items: Array<[LucideIcon, string, string, string]> = [
    [Leaf, 'Soil texture class', 'Loam', 'Balanced'],
    [Droplet, 'Percolation rate', '24 mm/hr', 'Moderate'],
    [Waves, 'Infiltration rating', 'Good', 'Suitable for soakage'],
    [CloudRain, 'Roof catchment (annual)', '74,300 L/yr', 'High potential'],
    [Home, 'Effective roof area', '128 m2', 'After deductions'],
    [NotebookText, 'Storage recommendation', '8,000-10,000 L', 'To reduce overflow'],
  ];
  return (
    <SurfaceCard className="jpr-kpi-strip">
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

interface CardHeaderProps {
  number: string;
  title: string;
}

function CardHeader({ number, title }: CardHeaderProps) {
  return (
    <header className="jpr-card-header">
      <h2>
        <span>{number}</span>
        {title}
      </h2>
      <button type="button">
        Details <ArrowRight aria-hidden="true" />
      </button>
    </header>
  );
}

function JarTestCard() {
  const layers: Array<[string, string]> = [
    ['Organic matter', '5%'],
    ['Clay', '18%'],
    ['Silt', '37%'],
    ['Sand', '40%'],
  ];
  return (
    <SurfaceCard className="jpr-card jar-card">
      <CardHeader number="1" title="Jar test results" />
      <p className="jpr-subtitle">Soil texture by volume (jar settling method)</p>
      <div className="jar-content">
        <CroppedArt src={jarLayers} className="jar-layers-image" />
        <div className="jar-layer-list">
          {layers.map(([label, value]) => (
            <p key={label}>
              <span />
              {label}
              <b>{value}</b>
            </p>
          ))}
        </div>
      </div>
      <p className="jpr-interpretation">
        <Leaf aria-hidden="true" /> <b>Interpretation: Loam</b> - balanced mix of sand, silt &amp;
        clay. Good for water holding and infiltration with structure support.
      </p>
    </SurfaceCard>
  );
}

function PercTestCard() {
  return (
    <SurfaceCard className="jpr-card perc-card">
      <CardHeader number="2" title="Percolation test (infiltration)" />
      <p className="jpr-subtitle">Infiltration rate</p>
      <div className="perc-content">
        <CroppedArt src={percGauge} className="perc-gauge-image" />
        <dl>
          <div>
            <dt>Hole diameter</dt>
            <dd>300 mm</dd>
          </div>
          <div>
            <dt>Hole depth</dt>
            <dd>600 mm</dd>
          </div>
          <div>
            <dt>Test duration</dt>
            <dd>60 min</dd>
          </div>
          <div>
            <dt>Start time</dt>
            <dd>9:15 AM</dd>
          </div>
          <div>
            <dt>End time</dt>
            <dd>10:15 AM</dd>
          </div>
          <div>
            <dt>Final water drop</dt>
            <dd>60 mm</dd>
          </div>
          <div>
            <dt>Infiltration rate</dt>
            <dd>24 mm/hr</dd>
          </div>
        </dl>
      </div>
      <p className="jpr-interpretation blue">
        <Droplet aria-hidden="true" /> <b>Suitability:</b> Good for soakage pits, trenching and
        sub-surface irrigation. Avoid heavy compaction.
      </p>
    </SurfaceCard>
  );
}

function RoofCatchmentCard() {
  return (
    <SurfaceCard className="jpr-card roof-card">
      <CardHeader number="3" title="Roof catchment analysis" />
      <div className="roof-grid">
        <div>
          <p className="jpr-subtitle">Roof diagram</p>
          <CroppedArt src={roofDiagram} className="roof-diagram-image" />
        </div>
        <dl className="catchment-calc">
          <div>
            <dt>Annual rainfall</dt>
            <dd>1,050 mm</dd>
          </div>
          <div>
            <dt>Effective roof area</dt>
            <dd>128 m2</dd>
          </div>
          <div>
            <dt>Runoff coefficient</dt>
            <dd>0.85</dd>
          </div>
          <div>
            <dt>Annual potential</dt>
            <dd>74,300 L/yr</dd>
          </div>
        </dl>
        <CroppedArt src={storageCapacity} className="storage-capacity-image" />
        <CroppedArt src={seasonalCapture} className="seasonal-capture-image" />
      </div>
      <p className="jpr-interpretation blue">
        <Droplet aria-hidden="true" /> <b>Overflow consideration:</b> Install overflow to swale or
        rain garden. Keep first-flush diverter and leaf screen clean.
      </p>
    </SurfaceCard>
  );
}

function AssumptionsCard() {
  const rows: Array<[string, string]> = [
    ['Annual rainfall', '1,050 mm/yr'],
    ['Roof runoff coefficient', '0.85 (metal roof)'],
    ['First flush loss', '1 mm'],
    ['Evaporation loss', '10%'],
    ['Storage days target', '30 days'],
  ];
  return (
    <SurfaceCard className="jpr-small-card">
      <header>
        <h2>Assumptions &amp; inputs</h2>
        <button type="button">
          Edit <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {rows.map(([label, value]) => (
        <p key={label}>
          <Waves aria-hidden="true" />
          <span>{label}</span>
          <b>{value}</b>
        </p>
      ))}
    </SurfaceCard>
  );
}

function RecentTestsCard() {
  const rows: Array<[string, string, string, string]> = [
    ['Today, 9:15 AM', 'Percolation test #2', '24 mm/hr', 'Good'],
    ['2 days ago', 'Jar test #2', 'Loam', ''],
    ['2 days ago', 'Roof survey update', '128 m2', ''],
    ['7 days ago', 'Percolation test #1', '18 mm/hr', 'Moderate'],
    ['7 days ago', 'Jar test #1', 'Sandy loam', ''],
  ];
  return (
    <SurfaceCard className="jpr-small-card recent-tests-card">
      <header>
        <h2>Recent tests</h2>
        <button type="button">
          View all <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {rows.map(([time, test, value, status]) => (
        <p key={`${time}-${test}`}>
          <span>{time}</span>
          <b>{test}</b>
          <em>{value}</em>
          <small>{status}</small>
        </p>
      ))}
    </SurfaceCard>
  );
}

function NotesCard() {
  const notes = [
    'Site recently mulched; expect improved infiltration over time.',
    'Roof is metal with gutter screens installed.',
    'Consider additional shade over tanks.',
    'Topsoil depth ~150 mm in most areas.',
    'Avoid heavy machinery near test holes.',
  ];
  return (
    <SurfaceCard className="jpr-small-card notes-card">
      <header>
        <h2>Notes</h2>
        <button type="button">
          Add note <Plus aria-hidden="true" />
        </button>
      </header>
      {notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
    </SurfaceCard>
  );
}

function NextActionsCard() {
  const rows: Array<[string, string, string]> = [
    ['Install 10kL rainwater tank system', 'High', 'Due in 7 days'],
    ['Build swale overflow & rain garden', 'High', 'Due in 14 days'],
    ['Install sub-surface irrigation lines', 'Medium', 'Due in 14 days'],
    ['Add compost & mulch to planting zones', 'Medium', 'Due in 30 days'],
    ['Re-test infiltration after wet season', 'Low', 'Due in 60 days'],
  ];
  return (
    <SurfaceCard className="jpr-small-card jpr-actions-card">
      <header>
        <h2>Recommended next actions</h2>
        <button type="button">
          Prioritize <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {rows.map(([title, level, due], index) => (
        <p key={title}>
          <b>{index + 1}</b>
          <span>{title}</span>
          <em>{level}</em>
          <small>{due}</small>
        </p>
      ))}
    </SurfaceCard>
  );
}

function JprSidebar() {
  return (
    <aside className="jpr-sidebar">
      <SurfaceCard className="jpr-guidance-card">
        <h2>
          <Leaf aria-hidden="true" /> Summary &amp; guidance
        </h2>
        <p>
          Your soil is a loam with good structure, offering balanced water holding and
          infiltration.
        </p>
        <p>Infiltration rate is good for on-site soakage solutions.</p>
        <p>
          Your roof has high rainfall capture potential. Capturing ~75-90% of annual rainfall will
          significantly reduce mains use and site runoff.
        </p>
        <section>
          <h3>Next step</h3>
          <p>Use these results to size irrigation, soakage, and storage in your Water Plan.</p>
          <button className="green-button" type="button">
            Use in water plan <ArrowRight aria-hidden="true" />
          </button>
          <button type="button">
            <Download aria-hidden="true" /> Download summary PDF
          </button>
        </section>
      </SurfaceCard>
      <SurfaceCard className="jpr-help-card">
        <h2>
          <NotebookText aria-hidden="true" /> Need help?
        </h2>
        <p>Learn how to run tests and interpret results.</p>
        <button type="button">
          View guide <ArrowRight aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}
