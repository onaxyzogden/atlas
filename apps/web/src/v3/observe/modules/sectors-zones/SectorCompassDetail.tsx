import { useMemo, useState } from 'react';
import {
  Check,
  Compass,
  Flame,
  Layers,
  Mountain,
  Shield,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useExternalForcesStore, type SectorArrow } from '../../../../store/externalForcesStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import SectorCompassDiagram from './SectorCompassDiagram.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
import { compassKpis, computedSectorRows, type KpiIconKey } from './derivations.js';
import { polygonCentroid } from '../macroclimate-hazards/derivations.js';

type SectorTypeKey = SectorArrow['type'];
type SectorIntensityKey = NonNullable<SectorArrow['intensity']>;

const ICON_MAP: Record<KpiIconKey, LucideIcon> = {
  compass: Compass,
  layers: Layers,
  wind: Wind,
  sun: Sun,
  flame: Flame,
  mountain: Mountain,
  shield: Shield,
};

const SECTOR_TYPE_LABELS: Record<SectorTypeKey, string> = {
  sun_summer: 'Summer sun',
  sun_winter: 'Winter sun',
  wind_prevailing: 'Prevailing wind',
  wind_storm: 'Storm wind',
  fire: 'Wildfire / hazard',
  noise: 'Road & noise',
  wildlife: 'Wildlife corridor',
  view: 'Views',
};

const INTENSITY_LABELS: Record<SectorIntensityKey, string> = {
  high: 'High',
  med: 'Medium',
  low: 'Low',
};

const SECTOR_TYPE_ENTRIES = Object.entries(SECTOR_TYPE_LABELS) as Array<[SectorTypeKey, string]>;
const INTENSITY_ENTRIES = Object.entries(INTENSITY_LABELS) as Array<[SectorIntensityKey, string]>;

// Compact, theme-matching inline controls so editable cells fit the table.
const cellControlStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.25)',
  color: 'inherit',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 12,
};

const bearingInputStyle: React.CSSProperties = {
  ...cellControlStyle,
  width: 64,
  marginRight: 4,
};

const removeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(232,220,200,0.55)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: '0 4px',
};

// Auto-derived climate layers (wind rose + solar arcs) — listed read-only so the
// table mirrors the compass diagram. Muted to read as context, not steward input.
const computedDividerStyle: React.CSSProperties = {
  color: 'rgba(232,220,200,0.5)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  paddingTop: 12,
};

const computedRowStyle: React.CSSProperties = {
  color: 'rgba(232,220,200,0.55)',
};

export default function SectorCompassDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);

  const allSectors = useExternalForcesStore((s) => s.sectors);
  const addSector = useExternalForcesStore((s) => s.addSector);
  const updateSector = useExternalForcesStore((s) => s.updateSector);
  const removeSector = useExternalForcesStore((s) => s.removeSector);
  const sectors = useMemo(() => allSectors.filter((s) => s.projectId === id), [allSectors, id]);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);

  const [draftType, setDraftType] = useState<SectorTypeKey>('wind_prevailing');

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

  const computedRows = useMemo(() => computedSectorRows(centroidTuple), [centroidTuple]);

  const coveragePct = Math.min(100, sectors.length * 12);

  const handleAddSector = () => {
    addSector({
      id: newAnnotationId('sec'),
      projectId: id,
      type: draftType,
      bearingDeg: 270,
      arcDeg: 60,
      intensity: 'med',
    });
  };

  const designResponses: Array<[string, 'High' | 'Medium' | 'Low', string]> = [
    ['Establish windbreak on NW boundary', 'High', 'Pending'],
    ['Create fire buffer on SW boundary', 'High', 'Planned'],
    ['Site outdoor living in E-SE quadrant', 'High', 'Planned'],
    ['Plant shade trees for summer sun (S)', 'Medium', 'Planned'],
    ['Use berms or vegetation to screen road', 'Medium', 'In progress'],
    ['Enhance view corridor to NE', 'Low', 'Planned'],
  ];

  const priorityActions: Array<[string, string, 'High' | 'Medium' | 'Low']> = [
    ['Clear fire buffer (20 m) on SW boundary', 'Due in 1–2 weeks', 'High'],
    ['Plant windbreak (NW) — 3-row shelterbelt', 'Due in 2–4 weeks', 'High'],
    ['Identify orchard zone & soil prep', 'Due in 1 month', 'Medium'],
    ['Plan seating area & sun/shade strategy', 'Due in 1–2 months', 'Medium'],
    ['Install pond & swale to SE', 'Due in 2–3 months', 'Low'],
  ];

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-sectors-zones-sector-compass"
        lede={'Map and analyse the external energies and influences shaping your site — wind, sun, fire, noise, wildlife, and views. Arrows reveal direction and intensity so you can place, protect, and buffer with confidence.'}
      />

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={coveragePct} />
            <span className={obsx.label}>Sector coverage</span>
            <span className={obsx.value}>
              {coveragePct >= 70 ? 'Well-mapped' : coveragePct >= 30 ? 'Forming' : 'Sparse'}
            </span>
            <span className={obsx.note}>{sectors.length} arrows placed</span>
          </div>
          {kpis.slice(0, 3).map((item) => {
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

      {kpis.length > 3 ? (
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Additional signals</h2>
          <div className={obsx.kpiGrid}>
            {kpis.slice(3).map((item) => {
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
        <h2 className={card.sectionTitle}>
          <Compass aria-hidden="true" size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Sector compass
        </h2>
        <p className={card.sectionBody} style={{ marginBottom: 12 }}>
          Arrows indicate the direction of external influences. Use this to guide placement
          and protection.
        </p>
        <SectorCompassDiagram
          sectors={sectors}
          centroid={centroidTuple}
        />
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>
          Sector observations
          {sectors.length > 0 ? (
            <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8 }}>{sectors.length}</span>
          ) : null}
        </h2>
        {sortedSectors.length === 0 ? (
          <p className={card.empty}>No sectors logged yet — add one below or from the map toolbar.</p>
        ) : null}
        {sortedSectors.length > 0 || computedRows.length > 0 ? (
          <table className={card.table}>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Bearing</th>
                <th>Sector</th>
                <th>Intensity</th>
                <th aria-label="Remove" />
              </tr>
            </thead>
            <tbody>
              {sortedSectors.map((s, index) => {
                const intensity = s.intensity ?? 'low';
                return (
                  <tr key={s.id}>
                    <td>{index + 1}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        max={359}
                        value={s.bearingDeg}
                        aria-label="Bearing in degrees"
                        style={bearingInputStyle}
                        onChange={(e) =>
                          updateSector(s.id, {
                            bearingDeg: Math.max(0, Math.min(359, Number(e.target.value) || 0)),
                          })
                        }
                      />
                      {'°'}
                    </td>
                    <td>
                      <select
                        value={s.type}
                        aria-label="Sector type"
                        style={cellControlStyle}
                        onChange={(e) =>
                          updateSector(s.id, { type: e.target.value as SectorTypeKey })
                        }
                      >
                        {SECTOR_TYPE_ENTRIES.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={intensity}
                        aria-label="Intensity"
                        style={cellControlStyle}
                        onChange={(e) =>
                          updateSector(s.id, { intensity: e.target.value as SectorIntensityKey })
                        }
                      >
                        {INTENSITY_ENTRIES.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        style={removeBtnStyle}
                        aria-label="Remove sector"
                        title="Remove sector"
                        onClick={() => removeSector(s.id)}
                      >
                        {'×'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {computedRows.length > 0 ? (
                <>
                  <tr>
                    <td colSpan={5} style={computedDividerStyle}>
                      Computed climate layers · auto-derived, read-only
                    </td>
                  </tr>
                  {computedRows.map((row) => (
                    <tr key={row.id} style={computedRowStyle}>
                      <td>{'—'}</td>
                      <td>{row.bearing}</td>
                      <td>{row.label}</td>
                      <td>{row.strength}</td>
                      <td />
                    </tr>
                  ))}
                </>
              ) : null}
            </tbody>
          </table>
        ) : null}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
          <select
            value={draftType}
            aria-label="New sector type"
            style={{ ...cellControlStyle, width: 'auto', flex: '0 1 200px' }}
            onChange={(e) => setDraftType(e.target.value as SectorTypeKey)}
          >
            {SECTOR_TYPE_ENTRIES.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button type="button" className={card.btn} onClick={handleAddSector}>
            + Add sector
          </button>
        </div>
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Design responses</h2>
          {designResponses.map(([title, priority, status]) => {
            const pillClass =
              priority === 'High'
                ? card.pillFail
                : priority === 'Medium'
                  ? card.pillPartial
                  : card.pillMet;
            return (
              <div key={title} className={card.statRow}>
                <span>
                  <Check aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                  {title}
                  <span style={{ marginLeft: 8, color: 'rgba(232,220,200,0.55)', fontSize: 11 }}>{status}</span>
                </span>
                <span className={`${card.pill} ${pillClass}`}>{priority}</span>
              </div>
            );
          })}
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Priority actions</h2>
          <div className={obsx.synthesisBlock}>
            {priorityActions.map(([title, due, priority], index) => (
              <p key={title}>
                <b>{index + 1}</b>
                <span>
                  {title}
                  <span style={{ display: 'block', marginTop: 2, color: 'rgba(232,220,200,0.55)', fontSize: 11 }}>
                    {due}{' · '}{priority} priority
                  </span>
                </span>
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
