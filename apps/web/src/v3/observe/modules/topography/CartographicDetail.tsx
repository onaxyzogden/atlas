import { useMemo } from 'react';
import {
  ArrowRight,
  Camera,
  Compass,
  Download,
  Droplet,
  Eye,
  Leaf,
  Map as MapIcon,
  Mountain,
  Route,
  SlidersHorizontal,
  Sun,
  Triangle,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useParams } from '@tanstack/react-router';
import { useSiteDataStore } from '../../../../store/siteDataStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import SlopeLegendStrip from './SlopeLegendStrip.js';
import TerrainSnapshot from './TerrainSnapshot.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import obsx from '../../../_shared/stageCard/observeExtras.module.css';
import {
  featureCounts,
  getElevationLayer,
  slopeBand,
} from './derivations.js';

export default function CartographicDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);
  const layers = useSiteDataStore((s) => s.dataByProject[id]?.layers);
  const allTransects = useTopographyStore((s) => s.transects);
  const allContours = useTopographyStore((s) => s.contours);
  const allHighPoints = useTopographyStore((s) => s.highPoints);
  const allDrainageLines = useTopographyStore((s) => s.drainageLines);
  const transects = useMemo(
    () => allTransects.filter((t) => t.projectId === id),
    [allTransects, id],
  );
  const contours = useMemo(
    () => allContours.filter((c) => c.projectId === id),
    [allContours, id],
  );
  const highPoints = useMemo(
    () => allHighPoints.filter((h) => h.projectId === id),
    [allHighPoints, id],
  );
  const drainageLines = useMemo(
    () => allDrainageLines.filter((d) => d.projectId === id),
    [allDrainageLines, id],
  );
  const counts = featureCounts({ contours, highPoints, drainageLines, transects });
  const elevation = getElevationLayer(layers)?.summary;
  const aspect = elevation?.predominant_aspect ?? null;
  const meanSlope = elevation?.mean_slope_deg ?? null;
  const slope = slopeBand(meanSlope);

  const kpis: Array<[LucideIcon, string, string, string]> = [
    [Wind, 'Sectors mapped', '—', 'Wired in module 5'],
    [Triangle, 'Microclimate areas', '—', 'Wired in module 4'],
    [Leaf, 'Zone allocations', '—', 'Wired in design phase'],
    [Route, 'Circulation routes', '—', 'Wired in design phase'],
    [Mountain, 'Topo annotations', String(counts.total), 'Contours, points, drainage'],
  ];

  const layerRows: Array<[LucideIcon, string, string, boolean]> = [
    [MapIcon, 'Contours', `${counts.contours} traced`, counts.contours > 0],
    [Waves, 'Drainage', `${counts.drainageLines} traced`, counts.drainageLines > 0],
    [Mountain, 'Elevation points', `${counts.highPoints} pinned`, counts.highPoints > 0],
    [Compass, 'Transects', `${counts.transects} drawn`, counts.transects > 0],
    [Wind, 'Sectors', 'Module 5', false],
    [Triangle, 'Microclimates', 'Module 4', false],
    [Leaf, 'Vegetation', 'Module 4', false],
    [Droplet, 'Water features', 'Module 4', false],
    [SlidersHorizontal, 'Soils', 'Module 4', false],
    [Camera, 'Photos & notes', 'Field tools', false],
  ];

  const patterns: Array<[string, string]> = [];
  if (aspect) {
    patterns.push([
      `${aspect} aspect`,
      `Slopes face ${aspect} — useful for siting passive-solar elements and sun-loving plants.`,
    ]);
  }
  if (meanSlope != null) {
    patterns.push([
      `${slope.label.toLowerCase()} mean slope`,
      `Mean ${meanSlope.toFixed(1)}° — design swales and access along this grade.`,
    ]);
  }
  if (counts.drainageLines > 0) {
    patterns.push([
      'Drainage paths',
      `${counts.drainageLines} traced — converge points are good infiltration sites.`,
    ]);
  }
  if (counts.highPoints > 0) {
    patterns.push([
      'Elevation anchors',
      `${counts.highPoints} pinned — useful for zone, building or storage placement.`,
    ]);
  }
  if (patterns.length === 0) {
    patterns.push([
      'No patterns yet',
      'Add elevation data and trace topographic features to surface site patterns.',
    ]);
  }

  const recommendations: string[] = [];
  if (counts.contours === 0) recommendations.push('Trace contours along the slope.');
  if (counts.drainageLines === 0) recommendations.push('Mark seasonal drainage paths.');
  if (counts.highPoints === 0) recommendations.push('Pin high and low points as anchors.');
  if (counts.transects === 0) recommendations.push('Draw at least one A–B transect.');
  if (recommendations.length === 0) {
    recommendations.push('Topography baseline is solid — move into module 4 (Earth, Water & Ecology).');
  }

  return (
    <div className={card.page}>
      <div className={card.hero} data-stage="observe">
        <div className={obsx.heroRow}>
          <div>
            <p className={card.lede}>
              Explore the full spatial context of your site. Toggle layers, interrogate patterns,
              and understand how sectors, microclimates and zones work together.
            </p>
            <div className={card.btnRow}>
              <button type="button" className={card.btn}>Project settings</button>
            </div>
          </div>
        </div>
      </div>

      <section className={card.section}>
        <p className={card.sectionBody}>
          Cartographic overlays surface here as you build out later modules. Currently showing
          topography only.
        </p>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Spatial KPIs</h2>
        <div className={obsx.kpiGrid}>
          {kpis.map(([Icon, label, value, note]) => (
            <div key={label} className={obsx.kpiBlock}>
              <span className={obsx.label}>
                <Icon aria-hidden="true" size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {label}
              </span>
              <span className={obsx.value}>{value}</span>
              <span className={obsx.note}>{note}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Site map</h2>
        <TerrainSnapshot
          boundary={project?.location?.boundary}
          caption={project?.name}
          width={520}
          height={320}
          overlays={['contours', 'elevation', 'slope']}
          contours={contours}
          highPoints={highPoints}
          drainageLines={drainageLines}
        />
        <div className={card.btnRow} style={{ marginTop: 12 }}>
          <button type="button" className={card.btn}>
            Open map workspace <ArrowRight aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
          </button>
        </div>
        <p className={card.hint} style={{ marginTop: 6 }}>Advanced editing &amp; analysis</p>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Slope legend</h2>
        <SlopeLegendStrip />
        <div className={card.btnRow} style={{ marginTop: 12 }}>
          <button type="button" className={card.btn}>
            <Download aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Download legend
          </button>
        </div>
      </section>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Map layers</h2>
        {layerRows.map(([Icon, title, note, active]) => (
          <div key={title} className={card.statRow}>
            <span>
              <Icon aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {title}
              <span className={card.hint} style={{ marginLeft: 8 }}>{note}</span>
            </span>
            <span className={`${card.pill} ${active ? card.pillMet : ''}`}>
              <Eye aria-hidden="true" size={12} style={{ verticalAlign: 'middle' }} />{' '}
              {active ? 'On' : 'Off'}
            </span>
          </div>
        ))}
      </section>

      <div className={card.grid}>
        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            Detected patterns <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8 }}>{patterns.length}</span>
          </h2>
          <div className={obsx.synthesisBlock}>
            {patterns.map(([title, note]) => (
              <p key={title}>
                <Sun aria-hidden="true" size={14} />
                <span><b style={{ display: 'inline', background: 'transparent', width: 'auto', height: 'auto', color: 'rgba(232,220,200,0.95)' }}>{title}.</b> {note}</span>
              </p>
            ))}
          </div>
        </section>

        <section className={card.section}>
          <h2 className={card.sectionTitle}>
            Recommended next actions <span style={{ color: 'rgba(var(--color-gold-rgb), 0.95)', marginLeft: 8 }}>{recommendations.length}</span>
          </h2>
          {recommendations.map((item) => (
            <div key={item} className={card.statRow}>
              <span><Leaf aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} /> {item}</span>
            </div>
          ))}
        </section>
      </div>

      <section className={card.section}>
        <h2 className={card.sectionTitle}>Map information</h2>
        <div className={card.statRow}><span>Projection</span><span>WGS 84</span></div>
        <div className={card.statRow}><span>Annotations</span><span>{counts.total}</span></div>
        <div className={card.statRow}><span>Aspect</span><span>{aspect ?? '—'}</span></div>
        <div className={card.statRow}><span>Mean slope</span><span>{meanSlope != null ? `${meanSlope.toFixed(1)}°` : '—'}</span></div>
        <div className={card.btnRow} style={{ marginTop: 12 }}>
          <button type="button" className={card.btn}>
            <Download aria-hidden="true" size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Export map
          </button>
        </div>
      </section>
    </div>
  );
}
