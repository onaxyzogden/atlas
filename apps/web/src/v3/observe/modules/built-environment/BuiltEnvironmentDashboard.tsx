import { useMemo, useState } from 'react';
import {
  Cable,
  CheckCircle2,
  DoorOpen,
  Download,
  Droplet,
  Fence,
  Flame,
  Home,
  Map as MapIcon,
  Recycle,
  Route,
  ShieldAlert,
  Sprout,
  Square,
  Tent,
  Truck,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { pickTruthy } from '@ogden/shared';
import AnnotationListCard from '../../components/AnnotationListCard.js';
import { api } from '../../../../lib/apiClient.js';
import { DEMO_OFFLINE_ENABLED } from '../../../../app/demoSession.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';
import {
  useBuildingsForProject,
  useWellsForProject,
  useSepticsForProject,
  usePowerLinesForProject,
  useBuriedUtilitiesForProject,
  useFencesForProject,
  useGatesForProject,
  useExistingDrivewaysForProject,
} from '../../../../store/builtEnvironmentSelectors.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
import {
  builtEnvironmentKpis,
  builtEnvironmentV2CategoryKpis,
  builtV2Counts,
  builtV2EntitiesForExport,
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
  tent: Tent,
  sprout: Sprout,
  truck: Truck,
  flame: Flame,
  square: Square,
};

export default function BuiltEnvironmentDashboard() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  // Phase 6.B: read built-environment slices direct from V2 via the typed
  // selector hooks. Each hook subscribes to V2 `entities`, applies the
  // shared projection, filters by project, and memoizes so identity is
  // stable when nothing in this project's slice changed.
  const buildings = useBuildingsForProject(id);
  const wells = useWellsForProject(id);
  const septics = useSepticsForProject(id);
  const powerLines = usePowerLinesForProject(id);
  const buriedUtilities = useBuriedUtilitiesForProject(id);
  const fences = useFencesForProject(id);
  const gates = useGatesForProject(id);
  const existingDriveways = useExistingDrivewaysForProject(id);

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
  const v2Entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const v2Kpis = useMemo(
    () => builtEnvironmentV2CategoryKpis({ entities: v2Entities, projectId: id }),
    [v2Entities, id],
  );
  // Phase 5.4: feed V2 entity totals into the health bar so a project that
  // has only V2-class entities (no legacy buildings / wells / etc.) still
  // moves the dial. `kindsPresent` is the count of distinct registry
  // categories occupied — keeps the per-slot weight comparable to the
  // legacy 8-slot calc (which weights each of its 8 slots by 4 points).
  const v2CountsByCategory = useMemo(
    () => builtV2Counts(v2Entities, id),
    [v2Entities, id],
  );
  const healthPct = moduleHealthPct(counts, {
    entityCount: v2CountsByCategory.total,
    kindsPresent: Object.keys(v2CountsByCategory.byCategory).length,
  });

  const overheadPower = powerLines.filter((p) => p.placement === 'overhead');
  const utilityKm = totalLengthM(powerLines) + totalLengthM(buriedUtilities);
  const accessKm = totalLengthM(existingDriveways) + totalLengthM(fences);

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const buildingAreaM2 = buildings.reduce((acc, b) => acc + (b.areaM2 ?? 0), 0);
      const septicAreaM2 = septics.reduce((acc, s) => acc + (s.areaM2 ?? 0), 0);
      const wellsWithDepth = wells.filter((w) => typeof w.depthM === 'number');
      const meanWellDepthM =
        wellsWithDepth.length > 0
          ? wellsWithDepth.reduce((acc, w) => acc + (w.depthM ?? 0), 0) / wellsWithDepth.length
          : null;
      const { data } = await api.exports.generate(id, {
        exportType: 'built_environment_report',
        payload: {
          builtEnvironment: {
            buildings: buildings.map((b) => ({
              id: b.id,
              subtype: b.subtype,
              createdAt: b.createdAt,
              ...pickTruthy(b, ['label', 'notes']),
              ...(b.areaM2 != null ? { areaM2: b.areaM2 } : {}),
            })),
            wells: wells.map((w) => ({
              id: w.id,
              kind: w.kind,
              position: w.position,
              createdAt: w.createdAt,
              ...pickTruthy(w, ['label', 'notes']),
              ...(w.depthM != null ? { depthM: w.depthM } : {}),
              ...(w.flowLpm != null ? { flowLpm: w.flowLpm } : {}),
            })),
            septics: septics.map((s) => ({
              id: s.id,
              kind: s.kind,
              createdAt: s.createdAt,
              ...pickTruthy(s, ['label', 'notes']),
              ...(s.areaM2 != null ? { areaM2: s.areaM2 } : {}),
            })),
            powerLines: powerLines.map((p) => ({
              id: p.id,
              placement: p.placement,
              lengthM: p.lengthM,
              createdAt: p.createdAt,
              ...pickTruthy(p, ['label', 'notes']),
            })),
            buriedUtilities: buriedUtilities.map((u) => ({
              id: u.id,
              kind: u.kind,
              lengthM: u.lengthM,
              createdAt: u.createdAt,
              ...pickTruthy(u, ['label', 'notes']),
            })),
            fences: fences.map((f) => ({
              id: f.id,
              kind: f.kind,
              lengthM: f.lengthM,
              createdAt: f.createdAt,
              ...pickTruthy(f, ['label', 'notes']),
            })),
            gates: gates.map((g) => ({
              id: g.id,
              position: g.position,
              createdAt: g.createdAt,
              ...pickTruthy(g, ['label', 'notes']),
            })),
            existingDriveways: existingDriveways.map((d) => ({
              id: d.id,
              surface: d.surface,
              lengthM: d.lengthM,
              createdAt: d.createdAt,
              ...pickTruthy(d, ['label', 'notes']),
            })),
            counts: {
              total: counts.total,
              buildings: counts.buildings,
              wells: counts.wells,
              septics: counts.septics,
              powerLines: counts.powerLines,
              buriedUtilities: counts.buriedUtilities,
              fences: counts.fences,
              gates: counts.gates,
              existingDriveways: counts.existingDriveways,
            },
            v2Entities: builtV2EntitiesForExport(v2Entities, id),
            v2: builtV2Counts(v2Entities, id),
            totals: {
              buildingAreaM2,
              septicAreaM2,
              powerLineLengthM: totalLengthM(powerLines),
              buriedUtilityLengthM: totalLengthM(buriedUtilities),
              fenceLengthM: totalLengthM(fences),
              drivewayLengthM: totalLengthM(existingDriveways),
              meanWellDepthM,
              overheadPowerCount: overheadPower.length,
            },
            healthPct,
          },
        },
      });
      window.open(data.storageUrl, '_blank');
    } catch (err) {
      console.error('Built Environment report export failed', err);
    } finally {
      setExporting(false);
    }
  };

  const synopsis =
    counts.total === 0
      ? 'No built-environment assets traced yet — start with the buildings you can see, then wells, then walk the fence lines.'
      : `${counts.total} asset${counts.total === 1 ? '' : 's'} traced; ${formatLength(
          utilityKm,
        )} of utilities and ${formatLength(accessKm)} of access infrastructure mapped.`;

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
      `${buriedUtilities.length} run${buriedUtilities.length === 1 ? '' : 's'} — vetoes earthworks across them.`,
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

  const allKpis = [...kpis, ...v2Kpis];

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-built-environment-dashboard"
        lede="Existing buildings, utilities, and access infrastructure shape what design moves are even possible. Trace what's there before you plan what's next."
      />
      <div className={card.btnRow} style={{ marginBottom: 24 }}>
        <button
          type="button"
          className={card.btn}
          onClick={handleExport}
          disabled={exporting || DEMO_OFFLINE_ENABLED}
        >
          <Download aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {exporting ? 'Generating…' : 'Export built-environment report'}
        </button>
      </div>

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={healthPct} />
            <span className={obsx.label}>Module health</span>
            <span className={obsx.value}>{healthLabel(healthPct)}</span>
            <span className={obsx.note}>{counts.total} assets traced</span>
          </div>
          {allKpis.slice(0, 3).map((item) => {
            const Icon = ICON_MAP[item.iconKey];
            return (
              <div key={item.label} className={obsx.kpiBlock}>
                <span className={obsx.label}>
                  {Icon ? <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : null}
                  {item.label}
                </span>
                <span className={obsx.value}>{item.value}</span>
                <span className={obsx.note}>{item.note}</span>
              </div>
            );
          })}
        </div>
      </section>

      {allKpis.length > 3 ? (
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Asset categories</h2>
          <div className={obsx.kpiGrid}>
            {allKpis.slice(3).map((item) => {
              const Icon = ICON_MAP[item.iconKey];
              return (
                <div key={item.label} className={obsx.kpiBlock}>
                  <span className={obsx.label}>
                    {Icon ? <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} /> : null}
                    {item.label}
                  </span>
                  <span className={obsx.value}>{item.value}</span>
                  <span className={obsx.note}>{item.note}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Built environment synthesis</h2>
        <p className={card.sectionBody} style={{ marginBottom: 14 }}>{synopsis}</p>
        <div className={obsx.synthesisGrid}>
          {synthArticles.map(([Icon, title, text]) => (
            <div key={title} className={obsx.synthesisBlock}>
              <h3>{title}</h3>
              <p>
                <Icon aria-hidden="true" size={14} />
                <span>{text}</span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Design implications</h2>
          <div className={obsx.synthesisBlock}>
            {implications.map(([Icon, title, text]) => (
              <p key={title}>
                <Icon aria-hidden="true" size={14} />
                <span><b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{title}.</b> {text}</span>
              </p>
            ))}
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            Detected built features <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8 }}>{counts.total}</span>
          </h2>
          {features.map(([label, value]) => (
            <div key={label} className={card.statRow}>
              <span><MapIcon aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {label}</span>
              <span>{value}</span>
            </div>
          ))}
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Recommended next actions</h2>
        {actions.map(([label, priority]) => (
          <div key={label} className={card.statRow}>
            <span><CheckCircle2 aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {label}</span>
            <span className={`${card.pill} ${priority === 'High' ? card.pillFail : priority === 'Medium' ? card.pillPartial : card.pillMet}`}>{priority}</span>
          </div>
        ))}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Field annotations</h2>
        <AnnotationListCard
          title=""
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
      </section>
    </div>
  );
}
