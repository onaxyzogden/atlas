import { useMemo } from 'react';
import {
  Cable,
  CheckCircle2,
  DoorOpen,
  Droplet,
  Fence,
  Home,
  Map as MapIcon,
  Recycle,
  Route,
  ShieldAlert,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { ProgressRing, SurfaceCard } from '../../_shared/components/index.js';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import { useBuiltEnvironmentStore } from '../../../../store/builtEnvironmentStore.js';
import {
  builtEnvironmentKpis,
  featureCounts,
  formatLength,
  healthLabel,
  moduleHealthPct,
  totalLengthM,
  type BuiltKpiItem,
} from './derivations.js';

const ICON_MAP: Record<BuiltKpiItem['iconKey'], LucideIcon> = {
  home: Home,
  droplet: Droplet,
  recycle: Recycle,
  zap: Zap,
  cable: Cable,
  fence: Fence,
  'door-open': DoorOpen,
  route: Route,
};

export default function BuiltEnvironmentDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const allBuildings = useBuiltEnvironmentStore((s) => s.buildings);
  const allWells = useBuiltEnvironmentStore((s) => s.wells);
  const allSeptics = useBuiltEnvironmentStore((s) => s.septics);
  const allPowerLines = useBuiltEnvironmentStore((s) => s.powerLines);
  const allBuriedUtilities = useBuiltEnvironmentStore((s) => s.buriedUtilities);
  const allFences = useBuiltEnvironmentStore((s) => s.fences);
  const allGates = useBuiltEnvironmentStore((s) => s.gates);
  const allDriveways = useBuiltEnvironmentStore((s) => s.existingDriveways);

  const buildings = useMemo(
    () => allBuildings.filter((b) => b.projectId === id),
    [allBuildings, id],
  );
  const wells = useMemo(
    () => allWells.filter((w) => w.projectId === id),
    [allWells, id],
  );
  const septics = useMemo(
    () => allSeptics.filter((sp) => sp.projectId === id),
    [allSeptics, id],
  );
  const powerLines = useMemo(
    () => allPowerLines.filter((p) => p.projectId === id),
    [allPowerLines, id],
  );
  const buriedUtilities = useMemo(
    () => allBuriedUtilities.filter((u) => u.projectId === id),
    [allBuriedUtilities, id],
  );
  const fences = useMemo(
    () => allFences.filter((f) => f.projectId === id),
    [allFences, id],
  );
  const gates = useMemo(
    () => allGates.filter((g) => g.projectId === id),
    [allGates, id],
  );
  const existingDriveways = useMemo(
    () => allDriveways.filter((d) => d.projectId === id),
    [allDriveways, id],
  );

  const args = {
    buildings,
    wells,
    septics,
    powerLines,
    buriedUtilities,
    fences,
    gates,
    existingDriveways,
  };
  const counts = featureCounts(args);
  const kpis = builtEnvironmentKpis(args);
  const healthPct = moduleHealthPct(counts);

  const overheadPower = powerLines.filter((p) => p.placement === 'overhead');
  const utilityKm = totalLengthM(powerLines) + totalLengthM(buriedUtilities);
  const accessKm = totalLengthM(existingDriveways) + totalLengthM(fences);

  const synopsis =
    counts.total === 0
      ? 'No built-environment assets traced yet — start with the buildings you can see, then wells, then walk the fence lines.'
      : `${counts.total} asset${counts.total === 1 ? '' : 's'} traced; ${formatLength(
          utilityKm,
        )} of utilities and ${formatLength(accessKm)} of access infrastructure mapped.`;

  const synthesisHeadline =
    counts.total === 0
      ? 'Built environment synthesis pending'
      : `${counts.total} on-site asset${counts.total === 1 ? '' : 's'} shape what's possible.`;

  const synthArticles: Array<[LucideIcon, string, string]> = [
    [
      Droplet,
      'Water & utilities',
      wells.length > 0
        ? `${wells.length} well${wells.length === 1 ? '' : 's'} pinned — record flow before sizing irrigation.`
        : buriedUtilities.length > 0
          ? `${buriedUtilities.length} buried line${buriedUtilities.length === 1 ? '' : 's'} mapped — they veto earthworks across them.`
          : 'Pin wells and buried utilities first — they cap what water systems are even possible.',
    ],
    [
      Route,
      'Access & circulation',
      existingDriveways.length > 0 || gates.length > 0
        ? `${formatLength(totalLengthM(existingDriveways))} of driveway and ${gates.length} gate${gates.length === 1 ? '' : 's'} on record.`
        : 'Trace driveways and drop gate pins to plan circulation and emergency access.',
    ],
    [
      ShieldAlert,
      'Hazards & easements',
      overheadPower.length > 0
        ? `${overheadPower.length} overhead power run${overheadPower.length === 1 ? '' : 's'} — keep tall trees and structures clear of fall zones.`
        : buriedUtilities.length > 0
          ? 'Buried lines on record — show on Plan layer to keep earthworks out.'
          : 'No hazard corridors mapped yet — overhead power and buried lines belong here.',
    ],
  ];

  const implications: Array<[LucideIcon, string, string]> = [];
  if (buriedUtilities.length > 0) {
    implications.push([
      ShieldAlert,
      'Buried lines mapped',
      `${buriedUtilities.length} run${buriedUtilities.length === 1 ? '' : 's'} — vetoes earthworks across them; show on Plan layer.`,
    ]);
  }
  if (overheadPower.length > 0) {
    implications.push([
      Zap,
      'Overhead corridor',
      'Keep tall trees and structures clear of the fall zone.',
    ]);
  }
  if (wells.length > 0) {
    implications.push([
      Droplet,
      'Well capacity sets budget',
      'Record flow and depth before sizing irrigation systems.',
    ]);
  }
  if (implications.length === 0) {
    implications.push([
      Wrench,
      'Trace what is there first',
      'The design starts from existing assets — buildings, utilities, fences, gates.',
    ]);
  }

  const features: Array<[string, number]> = [
    ['Buildings', counts.buildings],
    ['Wells', counts.wells],
    ['Septic', counts.septics],
    ['Power lines', counts.powerLines],
    ['Buried utilities', counts.buriedUtilities],
    ['Fences', counts.fences],
    ['Gates', counts.gates],
    ['Driveways', counts.existingDriveways],
  ];

  const actions: Array<[string, string]> = [
    [
      counts.buildings === 0 ? 'Trace existing buildings' : 'Verify building footprints',
      'High',
    ],
    [
      counts.wells === 0 ? 'Pin wells and record flow' : 'Record well depths and flow',
      'High',
    ],
    [
      counts.buriedUtilities === 0
        ? 'Mark buried-utility easements'
        : 'Cross-check easements on Plan layer',
      'High',
    ],
    [counts.fences === 0 ? 'Walk fence lines' : 'Note fence condition', 'Medium'],
    [counts.gates === 0 ? 'Drop gate pins' : 'Confirm gate access widths', 'Low'],
  ];

  return (
    <div className="detail-page built-environment-page">
      <section className="built-environment-layout">
        <div className="built-environment-main">
          <header className="built-environment-header">
            <div className="module-title-row">
              <b>2</b>
              <div>
                <h1>Built Environment</h1>
                <p>
                  Existing buildings, utilities, and access infrastructure shape what design
                  moves are even possible. Trace what&apos;s there before you plan what&apos;s
                  next.
                </p>
              </div>
            </div>
          </header>

          <section className="built-environment-metric-grid">
            {kpis.map((item) => {
              const Icon = ICON_MAP[item.iconKey];
              return (
                <SurfaceCard
                  key={item.label}
                  className={`built-environment-metric-card tone-${item.tone}`}
                >
                  <Icon aria-hidden="true" />
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                    {item.pill ? <em>{item.pill}</em> : null}
                  </div>
                  <p>{item.note}</p>
                </SurfaceCard>
              );
            })}
          </section>

          <SurfaceCard className="built-environment-synthesis">
            <div className="built-environment-synthesis-copy">
              <span>Built environment synthesis</span>
              <h2>{synthesisHeadline}</h2>
              <p>{synopsis}</p>
            </div>
            {synthArticles.map(([Icon, title, text]) => (
              <article key={title}>
                <Icon aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </SurfaceCard>

          <AnnotationListCard
            title="Field annotations"
            projectId={projectId ?? null}
            kinds={[
              'building',
              'well',
              'septic',
              'powerLine',
              'buriedUtility',
              'fence',
              'gate',
              'existingDriveway',
            ]}
            emptyHint="No buildings, utilities, or fences yet — trace one with the tools panel."
          />
        </div>

        <aside className="built-environment-sidebar">
          <SurfaceCard className="built-environment-side-card implications">
            <h2>Design implications</h2>
            {implications.map(([Icon, title, text]) => (
              <p key={title}>
                <Icon aria-hidden="true" />
                <b>{title}</b>
                <span>{text}</span>
              </p>
            ))}
          </SurfaceCard>

          <SurfaceCard className="built-environment-side-card feature-list">
            <h2>
              Detected built features <b>{counts.total}</b>
            </h2>
            {features.map(([label, value]) => (
              <p key={label}>
                <MapIcon aria-hidden="true" />
                <span>{label}</span>
                <b>{value}</b>
              </p>
            ))}
          </SurfaceCard>

          <SurfaceCard className="built-environment-side-card actions-list">
            <h2>Recommended next actions</h2>
            {actions.map(([label, priority]) => (
              <p key={label}>
                <CheckCircle2 aria-hidden="true" />
                <span>{label}</span>
                <em>{priority}</em>
              </p>
            ))}
          </SurfaceCard>

          <SurfaceCard className="built-environment-health-card">
            <h2>
              Module health <strong>{healthLabel(healthPct)}</strong>
            </h2>
            <i>
              <b />
            </i>
            <p>
              {healthPct >= 70
                ? 'Built-environment captured. Ready to feed Plan-stage decisions.'
                : healthPct >= 40
                  ? 'Some assets traced. Add more kinds to deepen the picture.'
                  : 'Trace buildings, wells, and utilities to start a base inventory.'}
            </p>
            <ProgressRing value={healthPct} label={`${healthPct}%`} />
          </SurfaceCard>
        </aside>
      </section>
    </div>
  );
}
