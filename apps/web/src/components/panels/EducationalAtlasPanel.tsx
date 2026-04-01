/**
 * EducationalAtlasPanel — learning hotspots organized by domain.
 * Each hotspot is a clickable card with title and description.
 * Designed to teach visitors and stakeholders about the land design.
 */

import { useState } from 'react';
import AdvancedEducationPanel from '../../features/education/AdvancedEducationPanel.js';
import p from '../../styles/panel.module.css';
import s from './EducationalAtlasPanel.module.css';

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
    color: '#5b9db8',
    hotspots: [
      {
        title: 'Keyline Water Design',
        description: 'Keyline design harvests rainfall across the landscape by reading the natural water lines of the land.',
        detail: 'Developed by P.A. Yeomans in 1954, keyline design identifies the "keyline point" where valleys transition to ridges. Plowing parallel to contour but slightly off-angle moves water from valleys (where it concentrates) to ridges (where it disperses), creating even moisture across the entire property. A keyline pond at this transition point captures valley water for gravity-fed irrigation.',
      },
      {
        title: 'Swale & Infiltration Systems',
        description: 'On-contour earthworks that slow, spread, and sink water into the soil rather than letting it run off.',
        detail: 'Swales are shallow trenches dug along contour lines. Water flowing downhill is intercepted, slowed, and given time to infiltrate into the soil profile. Over 3-5 years, the soil downstream of a swale develops dramatically deeper topsoil and higher organic matter. Trees planted on the downhill berm of a swale grow 2-3x faster than unirrigated trees.',
      },
    ],
  },
  {
    label: 'Livestock',
    color: '#c4a265',
    hotspots: [
      {
        title: 'Rotational Grazing System',
        description: 'Managed rotational grazing mimics wild herbivore movement patterns, regenerating grassland rather than degrading it.',
        detail: 'Animals are concentrated on small paddocks for short periods (1-3 days), then moved. The previously grazed paddock rests for 30-90 days, allowing deep root recovery and soil biology regeneration. This "mob grazing" approach builds topsoil, sequesters carbon, and produces healthier animals on less total acreage than continuous grazing.',
      },
    ],
  },
  {
    label: 'Spiritual',
    color: '#9a8a74',
    hotspots: [
      {
        title: 'Prayer Pavilion \u2014 Signs of Creation',
        description: 'A place designed not for productivity, but for presence \u2014 witnessing the signs of the Creator in land, water, and sky.',
        detail: 'Sited on the highest overlook point with qibla alignment, the prayer pavilion faces the morning sun and overlooks the full property. The design draws from Islamic garden traditions \u2014 water, shade, geometry, and silence. The surrounding contemplation garden uses native plants arranged in mathematical patterns found in nature: Fibonacci spirals, golden ratios, and fractal branching.',
      },
    ],
  },
  {
    label: 'Agroforestry',
    color: '#2d7a4f',
    hotspots: [
      {
        title: 'Food Forest Design',
        description: 'A multi-layer food forest mimics the structure and abundance of natural forest while producing food, medicine, and habitat.',
        detail: 'Seven layers of productivity: canopy trees (walnut, chestnut), understory trees (apple, pear, plum), shrubs (blueberry, hazelnut, currant), herbaceous (comfrey, mint, rhubarb), groundcover (strawberry, clover), vines (grape, kiwi), and root crops (Jerusalem artichoke, horseradish). Once established (3-7 years), a food forest requires minimal inputs and produces for decades.',
      },
      {
        title: 'Silvopasture Integration',
        description: 'Trees and livestock sharing the same land \u2014 shade for animals, fertility from animals, timber and fruit from trees.',
        detail: 'Wide-spaced trees (12-15m apart) allow enough light for grass growth while providing crucial shade. Livestock reduce mowing needs and fertilize tree roots. The tree canopy moderates temperature extremes, reducing animal stress and increasing weight gain. Net productivity per acre increases 20-40% compared to trees-only or pasture-only systems.',
      },
    ],
  },
  {
    label: 'Community',
    color: '#7d6140',
    hotspots: [
      {
        title: 'Community Commons & Hospitality',
        description: "The heart of OGDEN's hospitality \u2014 where visitors, community, and family gather in the spirit of adab.",
        detail: 'The commons area is designed around the Islamic concept of adab (gracious conduct and hospitality). An outdoor kitchen, fire circle, and covered gathering space accommodate 30-50 guests. Sightlines are carefully managed \u2014 the sacred/prayer zone is visually and acoustically buffered from the social zone. Guest cabins face the landscape, not each other, honoring privacy while fostering community.',
      },
      {
        title: 'Educational Farm Trail',
        description: 'A self-guided walking path through the property with interpretive stations explaining each land system.',
        detail: 'The 2km trail connects all major zones in a logical sequence: water source \u2192 food production \u2192 livestock \u2192 forest \u2192 contemplation. Each station has a weatherproof sign explaining what the visitor is seeing, why it was designed this way, and what problem it solves. QR codes link to deeper digital content. The trail serves as both a teaching tool and a marketing asset for educational programs.',
      },
    ],
  },
  {
    label: 'Ecology',
    color: '#6b8f6b',
    hotspots: [
      {
        title: 'Carolinian Forest Restoration',
        description: "Rebuilding Ontario's endangered Carolinian forest ecosystem \u2014 the most biodiverse terrestrial habitat in Canada.",
        detail: 'The Carolinian zone covers less than 1% of Canada but contains 25% of the country\'s rare species. Restoration focuses on native canopy species (tulip tree, sassafras, black walnut, bur oak), understory (pawpaw, spicebush, witch hazel), and ground layer (trillium, bloodroot, wild ginger). Invasive removal (buckthorn, dog-strangling vine) must precede planting. Full canopy closure takes 15-20 years.',
      },
      {
        title: 'Wildlife Corridor Design',
        description: 'Connected habitat strips that allow wildlife to move safely between forest patches, wetlands, and water.',
        detail: 'Minimum corridor width of 30m (100ft) connects the property\'s forest fragments to the regional Sixteen Mile Creek valley system. The corridor provides habitat for area-sensitive species (wood thrush, red-shouldered hawk) and movement pathways for mammals (deer, fox, coyote). Dense native shrub planting along corridor edges creates "soft edges" that maximize biodiversity.',
      },
    ],
  },
];

export default function EducationalAtlasPanel() {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [tab, setTab] = useState<'hotspots' | 'learning'>('hotspots');

  const totalHotspots = CATEGORIES.reduce((sum, c) => sum + c.hotspots.length, 0);

  return (
    <div className={p.container}>
      <h2 className={p.title} style={{ marginBottom: 4 }}>Educational Atlas</h2>

      {/* Tab switcher */}
      <div className={s.tabRow}>
        {(['hotspots', 'learning'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`${s.tabBtn} ${tab === t ? s.tabBtnActive : ''}`}
          >
            {t === 'hotspots' ? `Hotspots (${totalHotspots})` : 'Learning Center'}
          </button>
        ))}
      </div>

      {tab === 'learning' && <AdvancedEducationPanel />}

      {tab === 'hotspots' && (
      <>
      <p className={s.introText}>
        {totalHotspots} learning hotspots on the map. Click any &ldquo;i&rdquo; marker or select below.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {CATEGORIES.map((cat) => (
          <div key={cat.label}>
            <h3 className={s.catLabel} style={{ color: cat.color }}>
              {cat.label}
            </h3>

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
                      {/* Info icon */}
                      <div
                        className={s.hotspotIcon}
                        style={{
                          background: `${cat.color}18`,
                          border: `1px solid ${cat.color}40`,
                          color: cat.color,
                        }}
                      >
                        i
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={s.hotspotTitle}>
                          {hotspot.title}
                        </div>
                        <div className={s.hotspotDesc}>
                          {hotspot.description}
                        </div>

                        {isExpanded && (
                          <div className={s.hotspotDetail}>
                            {hotspot.detail}
                          </div>
                        )}
                      </div>

                      <span className={s.hotspotChevron}>
                        {isExpanded ? '\u25BE' : '\u203A'}
                      </span>
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
    </div>
  );
}
