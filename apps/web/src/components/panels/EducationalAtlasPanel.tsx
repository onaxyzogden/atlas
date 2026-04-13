/**
 * EducationalAtlasPanel — learning hotspots, education center, and data explorer.
 * Data Explorer tab provides interactive explanations of all 11 data layers,
 * 7 assessment scores, a searchable glossary, and data gap guidance.
 */

import { useState, useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayer } from '../../store/siteDataStore.js';
import { computeAssessmentScores } from '../../lib/computeScores.js';
import type { ScoredResult } from '../../lib/computeScores.js';
import AdvancedEducationPanel from '../../features/education/AdvancedEducationPanel.js';
import { water, semantic, confidence } from '../../lib/tokens.js';
import p from '../../styles/panel.module.css';
import s from './EducationalAtlasPanel.module.css';

interface EducationalAtlasPanelProps {
  project: LocalProject;
}

// ── Hotspot data ─────────────────────────────────────────────────────────

interface Hotspot {
  title: string;
  description: string;
  detail: string;
}

interface HotspotCategory {
  label: string;
  color: string;
  hotspots: Hotspot[];
}

const CATEGORIES: HotspotCategory[] = [
  {
    label: 'Water',
    color: water[400],
    hotspots: [
      {
        title: 'Keyline Water Design',
        description: 'Keyline design harvests rainfall across the landscape by reading the natural water lines of the land.',
        detail: 'Developed by P.A. Yeomans in 1954, keyline design identifies the "keyline point" where valleys transition to ridges. Plowing parallel to contour but slightly off-angle moves water from valleys (where it concentrates) to ridges (where it disperses), creating even moisture across the entire property.',
      },
      {
        title: 'Swale & Infiltration Systems',
        description: 'On-contour earthworks that slow, spread, and sink water into the soil rather than letting it run off.',
        detail: 'Swales are shallow trenches dug along contour lines. Water flowing downhill is intercepted, slowed, and given time to infiltrate into the soil profile. Over 3-5 years, the soil downstream develops dramatically deeper topsoil and higher organic matter.',
      },
    ],
  },
  {
    label: 'Livestock',
    color: semantic.sidebarActive,
    hotspots: [
      {
        title: 'Rotational Grazing System',
        description: 'Managed rotational grazing mimics wild herbivore movement patterns, regenerating grassland rather than degrading it.',
        detail: 'Animals are concentrated on small paddocks for short periods (1-3 days), then moved. The previously grazed paddock rests for 30-90 days, allowing deep root recovery and soil biology regeneration.',
      },
    ],
  },
  {
    label: 'Spiritual',
    color: semantic.textSubtle,
    hotspots: [
      {
        title: 'Prayer Pavilion \u2014 Signs of Creation',
        description: 'A place designed not for productivity, but for presence \u2014 witnessing the signs of the Creator in land, water, and sky.',
        detail: 'Sited on the highest overlook point with qibla alignment, the prayer pavilion faces the morning sun and overlooks the full property. The design draws from Islamic garden traditions \u2014 water, shade, geometry, and silence.',
      },
    ],
  },
  {
    label: 'Agroforestry',
    color: confidence.high,
    hotspots: [
      {
        title: 'Food Forest Design',
        description: 'A multi-layer food forest mimics the structure and abundance of natural forest while producing food, medicine, and habitat.',
        detail: 'Seven layers of productivity: canopy trees, understory trees, shrubs, herbaceous, groundcover, vines, and root crops. Once established (3-7 years), a food forest requires minimal inputs and produces for decades.',
      },
      {
        title: 'Silvopasture Integration',
        description: 'Trees and livestock sharing the same land \u2014 shade for animals, fertility from animals, timber and fruit from trees.',
        detail: 'Wide-spaced trees (12-15m apart) allow enough light for grass growth while providing crucial shade. Net productivity per acre increases 20-40% compared to trees-only or pasture-only systems.',
      },
    ],
  },
  {
    label: 'Community',
    color: semantic.primary,
    hotspots: [
      {
        title: 'Community Commons & Hospitality',
        description: "The heart of OGDEN's hospitality \u2014 where visitors, community, and family gather in the spirit of adab.",
        detail: 'The commons area is designed around the Islamic concept of adab (gracious conduct and hospitality). An outdoor kitchen, fire circle, and covered gathering space accommodate 30-50 guests.',
      },
    ],
  },
  {
    label: 'Ecology',
    color: '#6b8f6b',
    hotspots: [
      {
        title: 'Wildlife Corridor Design',
        description: 'Connected habitat strips that allow wildlife to move safely between forest patches, wetlands, and water.',
        detail: 'Minimum corridor width of 30m connects forest fragments to regional valley systems. Dense native shrub planting along corridor edges creates "soft edges" that maximize biodiversity.',
      },
    ],
  },
];

// ── Layer explanations ───────────────────────────────────────────────────

interface LayerExplanation {
  id: string;
  name: string;
  tier: 1 | 3;
  whatItMeasures: string;
  dataSource: string;
  whyItMatters: string;
}

const LAYER_EXPLANATIONS: LayerExplanation[] = [
  { id: 'elevation', name: 'Elevation & Terrain', tier: 1, whatItMeasures: 'Ground elevation, slope angle, aspect direction, and Topographic Position Index (TPI).', dataSource: 'USGS 3DEP (US) or CDEM (Canada) digital elevation models at 10-30m resolution.', whyItMatters: 'Slope and aspect determine water flow direction, sun exposure, and buildability. TPI reveals ridges, valleys, and flat areas for design placement.' },
  { id: 'soils', name: 'Soil Properties', tier: 1, whatItMeasures: 'Organic matter %, pH range, drainage class, texture, hydrologic group, depth to bedrock, and farmland classification.', dataSource: 'USDA SSURGO (US) or Canadian Soil Landscapes of Canada (SLC). Map unit level data.', whyItMatters: 'Soil properties control what can grow, how water moves underground, building foundation requirements, and carbon sequestration potential.' },
  { id: 'watershed', name: 'Watershed & Hydrology', tier: 1, whatItMeasures: 'Flow accumulation, upstream contributing area, proximity to water bodies, and stream network.', dataSource: 'USGS NHD (National Hydrography Dataset) or NHN (National Hydro Network, Canada).', whyItMatters: 'Understanding water flow patterns is essential for pond placement, swale design, flood risk assessment, and riparian buffer planning.' },
  { id: 'wetlands_flood', name: 'Wetlands & Flood Zones', tier: 1, whatItMeasures: 'Wetland presence and type, flood zone classification, riparian buffer width, and regulated area percentage.', dataSource: 'US NWI (National Wetland Inventory) or CNWI. FEMA flood maps (US) or provincial floodplain mapping (Canada).', whyItMatters: 'Wetlands are legally protected in most jurisdictions. Flood zones restrict building. PSW (Provincially Significant Wetland) designation in Ontario carries strict development controls.' },
  { id: 'land_cover', name: 'Land Cover', tier: 1, whatItMeasures: 'Vegetation classification by type, tree canopy percentage, impervious surface percentage, and primary land cover class.', dataSource: 'USGS NLCD (National Land Cover Database, US) or AAFC Annual Crop Inventory (Canada). 30m resolution.', whyItMatters: 'Land cover reveals current ecosystem state \u2014 forest vs. cropland vs. developed \u2014 and drives habitat and regenerative potential calculations.' },
  { id: 'climate', name: 'Climate Normals', tier: 1, whatItMeasures: 'Annual precipitation, mean temperature, growing season length, frost dates, hardiness zone, growing degree days, and sunshine hours.', dataSource: 'NOAA Climate Normals (US) or ECCC Canadian Climate Normals. 30-year averages.', whyItMatters: 'Climate data determines what species thrive, irrigation needs, frost risk for structures, and overall agricultural/forestry viability.' },
  { id: 'zoning', name: 'Zoning & Land Use', tier: 1, whatItMeasures: 'Municipal zoning designation, permitted land uses, setback requirements, and development restrictions.', dataSource: 'Municipal open data portals. Coverage and format vary widely by jurisdiction.', whyItMatters: 'Zoning determines what you can legally build and operate. Agricultural zoning may restrict subdivision. Conservation zoning limits clearing.' },
  { id: 'terrain_analysis', name: 'Terrain Analysis', tier: 3, whatItMeasures: 'Derived TPI classification (ridge/valley/slope/flat), TWI (Topographic Wetness Index), curvature analysis, and viewshed.', dataSource: 'Computed from elevation DEM. Derived in-browser from Tier 1 elevation data.', whyItMatters: 'TWI predicts where water naturally accumulates. TPI reveals micro-landforms invisible on a standard map. Together they guide water harvesting and building placement.' },
  { id: 'watershed_derived', name: 'Watershed Analysis', tier: 3, whatItMeasures: 'Subcatchment boundaries, pour points, flow direction grids, and drainage density.', dataSource: 'Computed from elevation + watershed Tier 1 layers. D8 flow direction algorithm.', whyItMatters: 'Subcatchment delineation shows exactly which areas drain to which points \u2014 essential for pond sizing, dam placement, and erosion control planning.' },
  { id: 'microclimate', name: 'Microclimate Zones', tier: 3, whatItMeasures: 'Sun traps, frost pockets, wind shelter zones, moisture gradient areas, and outdoor comfort rating.', dataSource: 'Computed from elevation aspect/slope + climate normals + wind data. Heuristic model.', whyItMatters: 'Microclimates can vary by 5-10\u00B0C within a single property. Sun traps extend growing seasons. Frost pockets kill sensitive plantings. Design must account for these micro-variations.' },
  { id: 'soil_regeneration', name: 'Soil Regeneration', tier: 3, whatItMeasures: 'SOC (Soil Organic Carbon) stocks, sequestration potential, restoration priority zones, recommended interventions, and regeneration sequence.', dataSource: 'Computed from soils + land cover + climate layers. RothC-based carbon modeling.', whyItMatters: 'Identifies which areas have the highest potential for carbon sequestration and soil health improvement, guiding where to invest regenerative effort first.' },
];

// ── Score explanations ───────────────────────────────────────────────────

interface ScoreExplanation {
  label: string;
  description: string;
  weight: string;
  howToImprove: string;
}

const SCORE_EXPLANATIONS: ScoreExplanation[] = [
  { label: 'Water Resilience', description: 'How well the site manages water \u2014 precipitation adequacy, drainage capacity, flood risk, and water harvesting potential.', weight: '15%', howToImprove: 'Install swales, improve drainage infrastructure, create rain gardens, or add water storage.' },
  { label: 'Agricultural Suitability', description: 'The site\'s capacity for food production based on soil quality, climate, slope, and growing season.', weight: '15%', howToImprove: 'Amend soil pH, improve drainage, add organic matter, select appropriate crop varieties for the climate.' },
  { label: 'Regenerative Potential', description: 'Potential for ecological regeneration based on current land cover, soil organic matter, and biodiversity indicators.', weight: '15%', howToImprove: 'Plant native species, reduce impervious surfaces, implement cover cropping, establish wildlife corridors.' },
  { label: 'Buildability', description: 'Physical suitability for structures based on slope, soil bearing capacity, flood risk, and terrain stability.', weight: '12%', howToImprove: 'Address drainage issues, select appropriate foundation types, avoid steep slopes and flood zones.' },
  { label: 'Habitat Sensitivity', description: 'Ecological sensitivity of existing habitats \u2014 wetland presence, forest maturity, species-at-risk potential.', weight: '10%', howToImprove: 'This score reflects existing ecological value. Higher = more sensitive = more design constraints, but also greater conservation opportunity.' },
  { label: 'Stewardship Readiness', description: 'Overall readiness for regenerative land management based on soil health, water systems, habitat connectivity, and management infrastructure.', weight: '18%', howToImprove: 'Develop a comprehensive land management plan, install monitoring infrastructure, establish baseline measurements.' },
  { label: 'Design Complexity', description: 'How many constraints the designer must navigate \u2014 steep terrain, flood zones, zoning restrictions, wetland setbacks. Higher = more complex. This score is inverted in the overall calculation (high complexity reduces the overall score).', weight: '15% (inverted)', howToImprove: 'Complexity is inherent to the site. Embrace constraints as design opportunities rather than obstacles.' },
];

// ── Glossary ─────────────────────────────────────────────────────────────

interface GlossaryEntry {
  term: string;
  definition: string;
}

const GLOSSARY: GlossaryEntry[] = [
  { term: 'TPI', definition: 'Topographic Position Index \u2014 classifies each point as ridge, upper slope, mid-slope, lower slope, valley, or flat based on elevation relative to neighbors.' },
  { term: 'TWI', definition: 'Topographic Wetness Index \u2014 predicts soil moisture from slope and upstream contributing area. Higher TWI = wetter conditions.' },
  { term: 'SSURGO', definition: 'Soil Survey Geographic Database \u2014 USDA detailed soil map units with physical and chemical properties.' },
  { term: 'SLC', definition: 'Soil Landscapes of Canada \u2014 national soil database used for Canadian sites.' },
  { term: 'PSW', definition: 'Provincially Significant Wetland \u2014 Ontario designation for wetlands meeting specific ecological criteria. Strict development controls apply.' },
  { term: 'CLI', definition: 'Canada Land Inventory \u2014 classification of agricultural capability from Class 1 (best) to Class 7 (unsuitable).' },
  { term: 'NHD', definition: 'National Hydrography Dataset \u2014 USGS comprehensive mapping of surface water features across the US.' },
  { term: 'NHN', definition: 'National Hydro Network \u2014 Canadian equivalent of NHD, mapping rivers, lakes, and drainage areas.' },
  { term: 'CGVD2013', definition: 'Canadian Geodetic Vertical Datum 2013 \u2014 the reference surface for elevation measurements in Canada.' },
  { term: 'GDD', definition: 'Growing Degree Days \u2014 accumulated heat units above a base temperature (usually 10\u00B0C) that predict crop maturity timing.' },
  { term: 'SOC', definition: 'Soil Organic Carbon \u2014 carbon stored in soil organic matter. A key indicator of soil health and climate mitigation potential.' },
  { term: 'NLCD', definition: 'National Land Cover Database \u2014 USGS satellite-derived land cover classification at 30m resolution, updated every 2-3 years.' },
  { term: 'AAFC', definition: 'Agriculture and Agri-Food Canada \u2014 provides annual crop inventory and agricultural land use data for Canada.' },
  { term: 'DEM', definition: 'Digital Elevation Model \u2014 a raster grid where each cell contains the ground surface elevation. Foundation for all terrain analysis.' },
  { term: 'NWI', definition: 'National Wetland Inventory \u2014 US Fish & Wildlife Service mapping of wetland extent and type across the US.' },
  { term: 'CNWI', definition: 'Canadian National Wetland Inventory \u2014 mapping of wetlands across Canada by type and extent.' },
  { term: 'FEMA', definition: 'Federal Emergency Management Agency \u2014 produces flood insurance rate maps defining Special Flood Hazard Areas.' },
  { term: 'RothC', definition: 'Rothamsted Carbon Model \u2014 mathematical model predicting soil organic carbon turnover based on climate, soil, and land management inputs.' },
];

// ── Main component ───────────────────────────────────────────────────────

export default function EducationalAtlasPanel({ project }: EducationalAtlasPanelProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [tab, setTab] = useState<'hotspots' | 'learning' | 'explorer'>('hotspots');
  const [expandedLayer, setExpandedLayer] = useState<string | null>(null);
  const [expandedScore, setExpandedScore] = useState<string | null>(null);
  const [glossaryFilter, setGlossaryFilter] = useState('');

  const siteData = useSiteData(project.id);

  // Compute scores for the score explanation section
  const scores = useMemo((): ScoredResult[] => {
    if (!siteData?.layers?.length) return [];
    return computeAssessmentScores(siteData.layers, project.acreage ?? null);
  }, [siteData, project.acreage]);

  // Layer statuses for data gap guidance
  const layerStatuses = useMemo(() => {
    return LAYER_EXPLANATIONS.map((le) => {
      const layer = siteData ? getLayer(siteData, le.id) : undefined;
      return {
        ...le,
        status: layer?.fetchStatus ?? 'unavailable',
        confidence: layer?.confidence,
      };
    });
  }, [siteData]);

  const missingLayers = layerStatuses.filter((l) => l.status !== 'complete');

  const filteredGlossary = glossaryFilter
    ? GLOSSARY.filter((g) => g.term.toLowerCase().includes(glossaryFilter.toLowerCase()) || g.definition.toLowerCase().includes(glossaryFilter.toLowerCase()))
    : GLOSSARY;

  const totalHotspots = CATEGORIES.reduce((sum, c) => sum + c.hotspots.length, 0);

  return (
    <div className={p.container}>
      <h2 className={p.title} style={{ marginBottom: 4 }}>Educational Atlas</h2>

      {/* Tab switcher */}
      <div className={s.tabRow}>
        {(['hotspots', 'learning', 'explorer'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`${s.tabBtn} ${tab === t ? s.tabBtnActive : ''}`}
          >
            {t === 'hotspots' ? `Hotspots (${totalHotspots})` : t === 'learning' ? 'Learning Center' : 'Data Explorer'}
          </button>
        ))}
      </div>

      {/* ── Hotspots tab ──────────────────────────────────────── */}
      {tab === 'hotspots' && (
        <>
          <p className={s.introText}>
            {totalHotspots} learning hotspots on the map. Click any &ldquo;i&rdquo; marker or select below.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {CATEGORIES.map((cat) => (
              <div key={cat.label}>
                <h3 className={s.catLabel} style={{ color: cat.color }}>{cat.label}</h3>
                <div className={p.section}>
                  {cat.hotspots.map((hotspot) => {
                    const isExpanded = expandedCard === hotspot.title;
                    return (
                      <button
                        key={hotspot.title}
                        onClick={() => setExpandedCard(isExpanded ? null : hotspot.title)}
                        className={`${s.hotspotBtn} ${isExpanded ? s.hotspotBtnExpanded : ''}`}
                        style={{ borderColor: isExpanded ? `${cat.color}40` : undefined }}
                      >
                        <div className={s.hotspotInner}>
                          <div className={s.hotspotIcon} style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}40`, color: cat.color }}>i</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className={s.hotspotTitle}>{hotspot.title}</div>
                            <div className={s.hotspotDesc}>{hotspot.description}</div>
                            {isExpanded && <div className={s.hotspotDetail}>{hotspot.detail}</div>}
                          </div>
                          <span className={s.hotspotChevron}>{isExpanded ? '\u25BE' : '\u203A'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Learning Center tab ───────────────────────────────── */}
      {tab === 'learning' && <AdvancedEducationPanel />}

      {/* ── Data Explorer tab ─────────────────────────────────── */}
      {tab === 'explorer' && (
        <div className={s.explorerWrap}>
          {/* Data Layers */}
          <div className={s.explorerSection}>
            <h3 className={s.explorerSectionTitle}>Data Layers ({LAYER_EXPLANATIONS.length})</h3>
            <div className={s.accordionList}>
              {layerStatuses.map((layer) => {
                const isExpanded = expandedLayer === layer.id;
                return (
                  <div key={layer.id} className={s.accordionItem}>
                    <button
                      className={s.accordionHeader}
                      onClick={() => setExpandedLayer(isExpanded ? null : layer.id)}
                    >
                      <span className={s.accordionTierBadge} data-tier={layer.tier}>T{layer.tier}</span>
                      <span className={s.accordionName}>{layer.name}</span>
                      <span className={`${s.accordionStatus} ${s[`status_${layer.status}`] ?? ''}`}>
                        {layer.status === 'complete' ? '\u2713' : layer.status === 'pending' ? '\u23F3' : '\u2014'}
                      </span>
                      <span className={s.accordionChevron}>{isExpanded ? '\u25B4' : '\u25BE'}</span>
                    </button>
                    {isExpanded && (
                      <div className={s.accordionBody}>
                        <div className={s.explainRow}><span className={s.explainLabel}>Measures:</span> {layer.whatItMeasures}</div>
                        <div className={s.explainRow}><span className={s.explainLabel}>Source:</span> {layer.dataSource}</div>
                        <div className={s.explainRow}><span className={s.explainLabel}>Why it matters:</span> {layer.whyItMatters}</div>
                        {layer.confidence && (
                          <div className={s.explainRow}><span className={s.explainLabel}>Confidence:</span> {layer.confidence}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assessment Scores */}
          <div className={s.explorerSection}>
            <h3 className={s.explorerSectionTitle}>Assessment Scores (7)</h3>
            <div className={s.accordionList}>
              {SCORE_EXPLANATIONS.map((se) => {
                const isExpanded = expandedScore === se.label;
                const liveScore = scores.find((sc) => sc.label === se.label);
                return (
                  <div key={se.label} className={s.accordionItem}>
                    <button
                      className={s.accordionHeader}
                      onClick={() => setExpandedScore(isExpanded ? null : se.label)}
                    >
                      <span className={s.accordionName}>{se.label}</span>
                      {liveScore && <span className={s.accordionScoreValue}>{liveScore.score}/100</span>}
                      <span className={s.accordionWeight}>{se.weight}</span>
                      <span className={s.accordionChevron}>{isExpanded ? '\u25B4' : '\u25BE'}</span>
                    </button>
                    {isExpanded && (
                      <div className={s.accordionBody}>
                        <div className={s.explainRow}>{se.description}</div>
                        <div className={s.explainRow}><span className={s.explainLabel}>Weight in overall:</span> {se.weight}</div>
                        <div className={s.explainRow}><span className={s.explainLabel}>How to improve:</span> {se.howToImprove}</div>
                        {liveScore && liveScore.score_breakdown.length > 0 && (
                          <div className={s.breakdownSection}>
                            <span className={s.explainLabel}>Contributing factors:</span>
                            {liveScore.score_breakdown.map((comp) => (
                              <div key={comp.name} className={s.breakdownRow}>
                                <span className={s.breakdownName}>{comp.name.replace(/_/g, ' ')}</span>
                                <span className={s.breakdownVal}>{comp.value}/{comp.maxPossible}</span>
                                <span className={s.breakdownSource}>{comp.sourceLayer}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Gap Guidance */}
          {missingLayers.length > 0 && (
            <div className={s.explorerSection}>
              <h3 className={s.explorerSectionTitle}>Data Gaps ({missingLayers.length})</h3>
              <div className={s.gapList}>
                {missingLayers.map((layer) => (
                  <div key={layer.id} className={s.gapCard}>
                    <div className={s.gapName}>{layer.name}</div>
                    <div className={s.gapStatus}>
                      Status: {layer.status === 'pending' ? 'Fetching...' : layer.status === 'failed' ? 'Failed to fetch' : 'Not yet requested'}
                    </div>
                    <div className={s.gapImpact}>Adding this data would improve: {layer.whyItMatters.split('.')[0]}.</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Glossary */}
          <div className={s.explorerSection}>
            <h3 className={s.explorerSectionTitle}>Glossary ({GLOSSARY.length} terms)</h3>
            <input
              type="text"
              className={s.glossarySearch}
              placeholder="Search terms..."
              value={glossaryFilter}
              onChange={(e) => setGlossaryFilter(e.target.value)}
            />
            <div className={s.glossaryList}>
              {filteredGlossary.map((g) => (
                <div key={g.term} className={s.glossaryItem}>
                  <span className={s.glossaryTerm}>{g.term}</span>
                  <span className={s.glossaryDef}>{g.definition}</span>
                </div>
              ))}
              {filteredGlossary.length === 0 && (
                <div className={s.glossaryEmpty}>No terms matching &ldquo;{glossaryFilter}&rdquo;</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
