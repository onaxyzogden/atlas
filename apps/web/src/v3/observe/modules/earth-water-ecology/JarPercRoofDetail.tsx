import { useMemo } from 'react';
import {
  Beaker,
  Binoculars,
  CheckCircle2,
  Droplet,
  FlaskConical,
  Leaf,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import {
  useSoilSampleStore,
  TEXTURE_LABELS,
  DEPTH_LABELS,
  BIO_ACTIVITY_LABELS,
} from '../../../../store/soilSampleStore.js';
import SoilProfileBar from './SoilProfileBar.js';
import PercGauge from './PercGauge.js';
import WaterBalanceBar from './WaterBalanceBar.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import ObserveHero from '../../components/ObserveHero.js';
import Ring from '../../../_shared/stageCard/Ring.js';
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
  const samples = useMemo(() => allSamples.filter((s) => s.projectId === id), [allSamples, id]);

  const kpis = jprKpis(samples);
  const stats = soilStats(samples);
  const latest = stats.latestSample;

  const completedTests =
    (stats.hasJar ? 1 : 0) + (stats.hasPerc ? 1 : 0) + (stats.hasRoof ? 1 : 0);
  const completenessPct = Math.round((completedTests / 3) * 100);

  const jar = latest?.jarTest;
  const percVal = latest?.percolationInPerHr;
  const band = percVal != null ? percRating(percVal) : null;
  const roof = latest?.roofCatchment ?? null;
  const annualL = roof
    ? roofAnnualCaptureL(roof.roofAreaM2, roof.annualPrecipMm ?? 800, roof.runoffCoeff ?? 0.85)
    : null;

  const assumptions: Array<[string, string]> = [
    ['Annual rainfall', roof?.annualPrecipMm != null ? `${roof.annualPrecipMm} mm/yr` : 'â€”'],
    ['Roof runoff coefficient', roof?.runoffCoeff != null ? `${roof.runoffCoeff}` : 'â€”'],
    ['Effective roof area', roof?.roofAreaM2 != null ? `${roof.roofAreaM2} mÂ²` : 'â€”'],
    ['Percolation rate', percVal != null ? `${percVal} in/hr` : 'â€”'],
    [
      'Biological activity',
      latest?.biologicalActivity ? BIO_ACTIVITY_LABELS[latest.biologicalActivity] : 'â€”',
    ],
  ];

  const recent = [...samples].sort((a, b) => b.sampleDate.localeCompare(a.sampleDate)).slice(0, 5);
  const notes = samples
    .filter((s) => s.notes && s.notes.trim().length > 0)
    .slice(0, 5)
    .map((s) => s.notes as string);

  const actions: Array<[string, string]> = [];
  if (!stats.hasJar) actions.push(['Run a jar test', 'High']);
  if (!stats.hasPerc) actions.push(['Run a percolation test', 'High']);
  if (!stats.hasRoof) actions.push(['Record roof catchment data', 'Medium']);
  if (stats.avgPh != null && stats.avgPh < 6) actions.push(['Amend soil pH (add lime)', 'Medium']);
  if (stats.avgOm != null && stats.avgOm < 2) actions.push(['Increase organic matter', 'Medium']);
  if (actions.length === 0) {
    actions.push(['Install rainwater tank system', 'Medium']);
    actions.push(['Re-test after wet season', 'Low']);
  }

  return (
    <div className={card.page}>
      <ObserveHero
        sectionId="observe-earth-water-ecology-jar-perc-roof"
        lede="Soil texture testing, water infiltration testing, and roof runoff estimation to inform practical water management."
      />

      <section className={card.section}>
        <div className={obsx.kpiGrid}>
          <div className={`${obsx.kpiBlock} ${obsx.kpiBlockWithRing}`}>
            <Ring value={completenessPct} />
            <span className={obsx.label}>Tests captured</span>
            <span className={obsx.value}>{completedTests} / 3</span>
            <span className={obsx.note}>Jar Â· Perc Â· Roof</span>
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

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Jar test results</h2>
        <p className={card.sectionBody} style={{ marginBottom: 12 }}>
          Soil texture by volume (jar settling method).
        </p>
        <SoilProfileBar jarTest={jar ?? null} />
        {jar ? (
          <>
            <div className={card.statRow}>
              <span>Sand</span>
              <span>{jar.sandPct}%</span>
            </div>
            <div className={card.statRow}>
              <span>Silt</span>
              <span>{jar.siltPct}%</span>
            </div>
            <div className={card.statRow}>
              <span>Clay</span>
              <span>{jar.clayPct}%</span>
            </div>
          </>
        ) : (
          <p className={card.empty}>
            No jar test â€” fill a jar with soil and water, shake, and record the settled layers.
          </p>
        )}
        {latest?.texture ? (
          <p className={card.hint}>
            <Leaf aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Texture: <b>{TEXTURE_LABELS[latest.texture]}</b> â€” balanced mix supports water holding
            and infiltration.
          </p>
        ) : null}
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Percolation test</h2>
          <PercGauge inPerHr={percVal ?? null} />
          <div className={card.statRow}>
            <span>Sample label</span>
            <span>{latest?.label ?? 'â€”'}</span>
          </div>
          <div className={card.statRow}>
            <span>Depth</span>
            <span>{latest?.depth ? DEPTH_LABELS[latest.depth] : 'â€”'}</span>
          </div>
          <div className={card.statRow}>
            <span>Rate</span>
            <span>{percVal != null ? `${percVal} in/hr` : 'â€”'}</span>
          </div>
          <div className={card.statRow}>
            <span>Rating</span>
            <span>{band?.label ?? 'â€”'}</span>
          </div>
          <div className={card.statRow}>
            <span>Bulk density</span>
            <span>
              {latest?.bulkDensityGCm3 != null ? `${latest.bulkDensityGCm3} g/cmÂ³` : 'â€”'}
            </span>
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Roof catchment</h2>
          <WaterBalanceBar roofCatchment={roof} variant="capture" />
          <div className={card.statRow}>
            <span>Annual precipitation</span>
            <span>{roof?.annualPrecipMm != null ? `${roof.annualPrecipMm} mm` : 'â€”'}</span>
          </div>
          <div className={card.statRow}>
            <span>Effective roof area</span>
            <span>{roof?.roofAreaM2 != null ? `${roof.roofAreaM2} mÂ²` : 'â€”'}</span>
          </div>
          <div className={card.statRow}>
            <span>Runoff coefficient</span>
            <span>{roof?.runoffCoeff != null ? roof.runoffCoeff.toFixed(2) : 'â€”'}</span>
          </div>
          <div className={card.statRow}>
            <span>Annual potential</span>
            <span>{annualL != null ? `${Math.round(annualL).toLocaleString()} L/yr` : 'â€”'}</span>
          </div>
        </section>
      </div>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>Assumptions &amp; inputs</h2>
          {assumptions.map(([label, value]) => (
            <div key={label} className={card.statRow}>
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>Recent tests</h2>
          {recent.length === 0 ? (
            <p className={card.empty}>No samples yet â€” add a sample via the tools panel.</p>
          ) : (
            recent.map((s) => (
              <div key={s.id} className={card.statRow}>
                <span>
                  {s.sampleDate} Â· {s.label}
                </span>
                <span>
                  {s.ph != null ? `pH ${s.ph}` : s.texture ? TEXTURE_LABELS[s.texture] : 'â€”'}
                </span>
              </div>
            ))
          )}
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Notes</h2>
        {notes.length === 0 ? (
          <p className={card.empty}>No notes â€” add observations to samples via the tools panel.</p>
        ) : (
          <ul className={card.list}>
            {notes.map((n, i) => (
              <li key={i} className={card.listRow}>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Summary &amp; guidance</h2>
        {stats.count === 0 ? (
          <p className={card.sectionBody}>
            No soil samples yet. Run a jar test, percolation test, and record roof catchment data
            to unlock water management insights.
          </p>
        ) : (
          <div className={obsx.synthesisBlock}>
            {latest?.texture ? (
              <p>
                <Leaf aria-hidden="true" size={14} />
                <span>
                  Soil texture is <b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{TEXTURE_LABELS[latest.texture]}</b>
                  {latest.texture.includes('clay')
                    ? ' â€” higher clay content means slower infiltration but good water retention.'
                    : ' â€” balanced structure supports both drainage and moisture retention.'}
                </span>
              </p>
            ) : null}
            {band ? (
              <p>
                <Droplet aria-hidden="true" size={14} />
                <span>
                  Infiltration rate is <b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{band.label}</b>
                  {band.rating === 'ideal'
                    ? ' â€” well-suited for on-site soakage systems.'
                    : band.rating === 'fast'
                      ? ' â€” may need organic matter to improve water retention.'
                      : ' â€” consider aerating and adding compost to improve drainage.'}
                </span>
              </p>
            ) : null}
            {annualL != null ? (
              <p>
                <Waves aria-hidden="true" size={14} />
                <span>
                  Roof has a potential annual harvest of <b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{Math.round(annualL / 1000)} mÂ³</b> â€” size tanks for peak seasonal flows.
                </span>
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Recommended next actions</h2>
        {actions.map(([label, priority]) => (
          <div key={label} className={card.statRow}>
            <span>
              <CheckCircle2 aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {label}
            </span>
            <span
              className={`${card.pill} ${
                priority === 'High' ? card.pillFail : priority === 'Medium' ? card.pillPartial : card.pillMet
              }`}
            >
              {priority}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
