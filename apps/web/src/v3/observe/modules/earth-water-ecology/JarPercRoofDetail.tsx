import { useMemo } from 'react';
import {
  ArrowRight,
  Beaker,
  Binoculars,
  Download,
  Droplet,
  FlaskConical,
  Leaf,
  NotebookText,
  Plus,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { SurfaceCard } from '../../_shared/components/index.js';
import { useSoilSampleStore, TEXTURE_LABELS, DEPTH_LABELS, BIO_ACTIVITY_LABELS } from '../../../../store/soilSampleStore.js';
import SoilProfileBar from './SoilProfileBar.js';
import PercGauge from './PercGauge.js';
import WaterBalanceBar from './WaterBalanceBar.js';
import {
  jprKpis,
  soilStats,
  percRating,
  roofAnnualCaptureL,
  type KpiIconKey,
} from './derivations.js';

const ICON_MAP: Record<KpiIconKey, LucideIcon> = {
  droplet: Droplet,
  leaf: Leaf,
  layers: Beaker,
  beaker: FlaskConical,
  mountain: Binoculars,
  waves: Waves,
};

export default function JarPercRoofDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const allSamples = useSoilSampleStore((s) => s.samples);
  const samples = useMemo(
    () => allSamples.filter((s) => s.projectId === id),
    [allSamples, id],
  );

  const kpis = jprKpis(samples);
  const stats = soilStats(samples);
  const latest = stats.latestSample;

  return (
    <div className="detail-page jpr-page">
      <section className="jpr-layout">
        <div className="jpr-main">
          <JprHeader />
          <SurfaceCard className="jpr-kpi-strip">
            {kpis.map((item) => {
              const Icon = ICON_MAP[item.iconKey];
              return (
                <div className={`diagnostic-kpi tone-${item.tone}`} key={item.label}>
                  <Icon aria-hidden="true" />
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.note}</small>
                </div>
              );
            })}
          </SurfaceCard>
          <section className="jpr-result-grid">
            <JarTestCard latest={latest} />
            <PercTestCard latest={latest} />
            <RoofCatchmentCard latest={latest} />
          </section>
          <section className="jpr-bottom-grid">
            <AssumptionsCard latest={latest} />
            <RecentTestsCard samples={samples} stats={stats} />
            <NotesCard samples={samples} />
            <NextActionsCard stats={stats} />
          </section>
        </div>
        <JprSidebar stats={stats} />
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

type LatestSample = ReturnType<typeof soilStats>['latestSample'];

interface JarTestCardProps {
  latest: LatestSample;
}

function JarTestCard({ latest }: JarTestCardProps) {
  const jar = latest?.jarTest;
  const layers: Array<[string, string]> = jar
    ? [
        ['Sand', `${jar.sandPct}%`],
        ['Silt', `${jar.siltPct}%`],
        ['Clay', `${jar.clayPct}%`],
      ]
    : [];

  return (
    <SurfaceCard className="jpr-card jar-card">
      <CardHeader number="1" title="Jar test results" />
      <p className="jpr-subtitle">Soil texture by volume (jar settling method)</p>
      <div className="jar-content">
        <SoilProfileBar jarTest={jar ?? null} className="jar-layers-image" />
        <div className="jar-layer-list">
          {layers.length === 0 ? (
            <p className="empty-note">No jar test — fill a jar with soil and water, shake, and record the settled layers.</p>
          ) : (
            layers.map(([label, value]) => (
              <p key={label}>
                <span />
                {label}
                <b>{value}</b>
              </p>
            ))
          )}
        </div>
      </div>
      {latest?.texture && (
        <p className="jpr-interpretation">
          <Leaf aria-hidden="true" /> <b>Texture: {TEXTURE_LABELS[latest.texture]}</b> — balanced mix supports water holding and infiltration.
        </p>
      )}
    </SurfaceCard>
  );
}

interface PercTestCardProps {
  latest: LatestSample;
}

function PercTestCard({ latest }: PercTestCardProps) {
  const percVal = latest?.percolationInPerHr;
  const band = percVal != null ? percRating(percVal) : null;

  return (
    <SurfaceCard className="jpr-card perc-card">
      <CardHeader number="2" title="Percolation test (infiltration)" />
      <p className="jpr-subtitle">Infiltration rate</p>
      <div className="perc-content">
        <PercGauge inPerHr={percVal ?? null} className="perc-gauge-image" />
        <dl>
          <div>
            <dt>Sample label</dt>
            <dd>{latest?.label ?? '—'}</dd>
          </div>
          <div>
            <dt>Sample depth</dt>
            <dd>{latest?.depth ? DEPTH_LABELS[latest.depth] : '—'}</dd>
          </div>
          <div>
            <dt>Percolation rate</dt>
            <dd>{percVal != null ? `${percVal} in/hr` : '—'}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>{band?.label ?? '—'}</dd>
          </div>
          <div>
            <dt>Bulk density</dt>
            <dd>{latest?.bulkDensityGCm3 != null ? `${latest.bulkDensityGCm3} g/cm³` : '—'}</dd>
          </div>
        </dl>
      </div>
      {band && (
        <p className={`jpr-interpretation ${band.tone === 'green' ? '' : 'blue'}`}>
          <Droplet aria-hidden="true" /> <b>Suitability:</b> {band.label} — {band.rating === 'ideal' ? 'Good for soakage pits and sub-surface irrigation.' : band.rating === 'fast' ? 'Rapid drainage — check for soil structure issues.' : 'Slow drainage — may need aeration or organic matter addition.'}
        </p>
      )}
    </SurfaceCard>
  );
}

interface RoofCatchmentCardProps {
  latest: LatestSample;
}

function RoofCatchmentCard({ latest }: RoofCatchmentCardProps) {
  const roof = latest?.roofCatchment ?? null;
  const annualL = roof
    ? roofAnnualCaptureL(roof.roofAreaM2, roof.annualPrecipMm ?? 800, roof.runoffCoeff ?? 0.85)
    : null;

  return (
    <SurfaceCard className="jpr-card roof-card">
      <CardHeader number="3" title="Roof catchment analysis" />
      <div className="roof-grid">
        <div>
          <p className="jpr-subtitle">Monthly capture estimate</p>
          <WaterBalanceBar roofCatchment={roof} variant="capture" className="seasonal-capture-image" />
        </div>
        <dl className="catchment-calc">
          <div>
            <dt>Annual precipitation</dt>
            <dd>{roof?.annualPrecipMm != null ? `${roof.annualPrecipMm} mm` : '—'}</dd>
          </div>
          <div>
            <dt>Effective roof area</dt>
            <dd>{roof?.roofAreaM2 != null ? `${roof.roofAreaM2} m²` : '—'}</dd>
          </div>
          <div>
            <dt>Runoff coefficient</dt>
            <dd>{roof?.runoffCoeff != null ? roof.runoffCoeff.toFixed(2) : '—'}</dd>
          </div>
          <div>
            <dt>Annual potential</dt>
            <dd>{annualL != null ? `${Math.round(annualL).toLocaleString()} L/yr` : '—'}</dd>
          </div>
        </dl>
      </div>
      {annualL != null && (
        <p className="jpr-interpretation blue">
          <Droplet aria-hidden="true" /> <b>Overflow consideration:</b> Install overflow to swale or rain garden. Keep first-flush diverter and leaf screen clean.
        </p>
      )}
    </SurfaceCard>
  );
}

interface AssumptionsCardProps {
  latest: LatestSample;
}

function AssumptionsCard({ latest }: AssumptionsCardProps) {
  const roof = latest?.roofCatchment;
  const rows: Array<[string, string]> = [
    ['Annual rainfall', roof?.annualPrecipMm != null ? `${roof.annualPrecipMm} mm/yr` : '—'],
    ['Roof runoff coefficient', roof?.runoffCoeff != null ? `${roof.runoffCoeff} (metal roof)` : '—'],
    ['Effective roof area', roof?.roofAreaM2 != null ? `${roof.roofAreaM2} m²` : '—'],
    ['Percolation rate', latest?.percolationInPerHr != null ? `${latest.percolationInPerHr} in/hr` : '—'],
    ['Biological activity', latest?.biologicalActivity ? BIO_ACTIVITY_LABELS[latest.biologicalActivity] : '—'],
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

interface RecentTestsCardProps {
  samples: ReturnType<typeof useSoilSampleStore.getState>['samples'];
  stats: ReturnType<typeof soilStats>;
}

function RecentTestsCard({ samples }: RecentTestsCardProps) {
  const recent = [...samples]
    .sort((a, b) => b.sampleDate.localeCompare(a.sampleDate))
    .slice(0, 5);
  return (
    <SurfaceCard className="jpr-small-card recent-tests-card">
      <header>
        <h2>Recent tests</h2>
        <button type="button">
          View all <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {recent.length === 0 ? (
        <p className="empty-note">No samples yet — add a sample via the tools panel.</p>
      ) : (
        recent.map((s) => (
          <p key={s.id}>
            <span>{s.sampleDate}</span>
            <b>{s.label}</b>
            <em>{s.ph != null ? `pH ${s.ph}` : s.texture ? TEXTURE_LABELS[s.texture] : '—'}</em>
            <small>{s.percolationInPerHr != null ? `${s.percolationInPerHr} in/hr` : ''}</small>
          </p>
        ))
      )}
    </SurfaceCard>
  );
}

interface NotesCardProps {
  samples: ReturnType<typeof useSoilSampleStore.getState>['samples'];
}

function NotesCard({ samples }: NotesCardProps) {
  const notes = samples
    .filter((s) => s.notes && s.notes.trim().length > 0)
    .slice(0, 5)
    .map((s) => s.notes as string);
  return (
    <SurfaceCard className="jpr-small-card notes-card">
      <header>
        <h2>Notes</h2>
        <button type="button">
          Add note <Plus aria-hidden="true" />
        </button>
      </header>
      {notes.length === 0 ? (
        <p className="empty-note">No notes — add observations to samples via the tools panel.</p>
      ) : (
        notes.map((note, i) => (
          <p key={i}>{note}</p>
        ))
      )}
    </SurfaceCard>
  );
}

interface NextActionsCardProps {
  stats: ReturnType<typeof soilStats>;
}

function NextActionsCard({ stats }: NextActionsCardProps) {
  const rows: Array<[string, string]> = [];
  if (!stats.hasJar) rows.push(['Run a jar test', 'High']);
  if (!stats.hasPerc) rows.push(['Run a percolation test', 'High']);
  if (!stats.hasRoof) rows.push(['Record roof catchment data', 'Medium']);
  if (stats.avgPh != null && stats.avgPh < 6) rows.push(['Amend soil pH (add lime)', 'Medium']);
  if (stats.avgOm != null && stats.avgOm < 2) rows.push(['Increase organic matter', 'Medium']);
  if (rows.length === 0) {
    rows.push(['Install rainwater tank system', 'Medium']);
    rows.push(['Re-test after wet season', 'Low']);
  }
  return (
    <SurfaceCard className="jpr-small-card jpr-actions-card">
      <header>
        <h2>Recommended next actions</h2>
        <button type="button">
          Prioritize <ArrowRight aria-hidden="true" />
        </button>
      </header>
      {rows.map(([title, level], index) => (
        <p key={title}>
          <b>{index + 1}</b>
          <span>{title}</span>
          <em>{level}</em>
        </p>
      ))}
    </SurfaceCard>
  );
}

interface JprSidebarProps {
  stats: ReturnType<typeof soilStats>;
}

function JprSidebar({ stats }: JprSidebarProps) {
  const latest = stats.latestSample;
  const percVal = latest?.percolationInPerHr;
  const band = percVal != null ? percRating(percVal) : null;
  const annualL = latest?.roofCatchment
    ? roofAnnualCaptureL(
        latest.roofCatchment.roofAreaM2,
        latest.roofCatchment.annualPrecipMm ?? 800,
        latest.roofCatchment.runoffCoeff ?? 0.85,
      )
    : null;

  return (
    <aside className="jpr-sidebar">
      <SurfaceCard className="jpr-guidance-card">
        <h2>
          <Leaf aria-hidden="true" /> Summary &amp; guidance
        </h2>
        {stats.count === 0 ? (
          <p>No soil samples yet. Run a jar test, percolation test, and record roof catchment data to unlock water management insights.</p>
        ) : (
          <>
            {latest?.texture && (
              <p>Your soil texture is <b>{TEXTURE_LABELS[latest.texture]}</b> — {latest.texture.includes('clay') ? 'higher clay content means slower infiltration but good water retention.' : 'balanced structure supports both drainage and moisture retention.'}</p>
            )}
            {band && (
              <p>Infiltration rate is <b>{band.label}</b> — {band.rating === 'ideal' ? 'well-suited for on-site soakage systems.' : band.rating === 'fast' ? 'may need organic matter to improve water retention.' : 'consider aerating and adding compost to improve drainage.'}</p>
            )}
            {annualL != null && (
              <p>Your roof has a potential annual harvest of <b>{Math.round(annualL / 1000)} m³</b> — consider tank sizing to capture peak seasonal flows.</p>
            )}
          </>
        )}
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
