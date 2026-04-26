/**
 * Educational Booklet PDF — plain-language property guide for non-technical landowners.
 * Explains data layers, scores, and ecological findings in accessible terms.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtNumber, scoreColor, notAvailable } from './baseLayout.js';

const LAYER_EXPLANATIONS: Record<string, { title: string; whatItIs: string; whyItMatters: string }> = {
  elevation: {
    title: 'Elevation & Terrain',
    whatItIs: 'A map of how high or low different parts of your property are above sea level, and how steep the slopes are.',
    whyItMatters: 'Elevation affects water drainage, frost pockets, wind exposure, and where buildings can go. Steep slopes may need terracing or erosion control.',
  },
  soils: {
    title: 'Soil Types & Quality',
    whatItIs: 'Information about what kinds of soil are on your property — clay, sand, loam — and how well they drain, hold nutrients, and support plant growth.',
    whyItMatters: 'Soil is the foundation of everything. Good soil means healthier plants, better water absorption, and less need for inputs. Different areas may need different management.',
  },
  watershed: {
    title: 'Watershed & Drainage',
    whatItIs: 'How water flows across and around your property — which streams, rivers, or basins your land drains into.',
    whyItMatters: 'Understanding water flow helps you plan ponds, swales, irrigation, and avoid building in areas that flood. Your land is part of a larger water system.',
  },
  wetlands: {
    title: 'Wetlands & Flood Zones',
    whatItIs: 'Areas that are seasonally or permanently wet, and zones where flooding has been recorded or predicted.',
    whyItMatters: 'Wetlands are ecologically valuable and often legally protected. Flood zones affect where you can build and may require insurance or setbacks.',
  },
  land_cover: {
    title: 'Land Cover',
    whatItIs: 'What\'s currently growing on or covering your land — forest, grassland, cropland, bare soil, or developed areas.',
    whyItMatters: 'Existing land cover tells you what the land has been used for and what ecosystems are already established. Clearing forest has different implications than converting cropland.',
  },
  climate: {
    title: 'Climate & Growing Season',
    whatItIs: 'Local weather patterns including temperature ranges, rainfall, frost dates, and growing season length.',
    whyItMatters: 'Climate determines what crops and trees will thrive, when to plant and harvest, and how to design buildings for comfort and energy efficiency.',
  },
  zoning: {
    title: 'Zoning & Regulations',
    whatItIs: 'Local government rules about what you can build and do on your land — agricultural zoning, building setbacks, environmental restrictions.',
    whyItMatters: 'Zoning determines your options. Some activities need permits, and some areas have conservation easements or agricultural exemptions that affect your plans.',
  },
};

/**
 * Plain-language explanations keyed by ScoredResult.label exactly as emitted
 * by @ogden/shared/scoring (see packages/shared/src/scoring/computeScores.ts
 * — the `buildResult(<label>, …)` call sites). Covers all 10 labels the US
 * pipeline emits plus the CA-only "Canada Soil Capability" and the
 * denormalised "Overall".
 *
 * Orientation: most labels are "higher score = better outcome". `Design
 * Complexity` is inverted — its raw score reports complexity level (higher =
 * more difficult site), and computeOverallScore(...) flips it via
 * `100 - score` before aggregating. For inverted labels we flag `inverted:
 * true` so the booklet picks `good` vs `poor` against the flipped threshold
 * instead of the default `>= 60`.
 */
const SCORE_EXPLANATIONS: Record<string, {
  plain: string;
  good: string;
  poor: string;
  /** If true, the "good" verdict fires when score < 40 (inverted). Default: score >= 60. */
  inverted?: boolean;
}> = {
  Overall: {
    plain: 'An overall rating of how well-suited your property is for your intended use, considering all factors together.',
    good: 'Your property has strong fundamentals across multiple categories.',
    poor: 'Several factors may need attention or creative solutions to achieve your goals.',
  },
  'Agricultural Suitability': {
    plain: 'How well your property matches typical requirements for this type of project — considering soil, terrain, water, and access.',
    good: 'The natural characteristics of your land align well with your project type.',
    poor: 'Your land may need significant modification or a different approach to work well for this project type.',
  },
  Buildability: {
    plain: 'How easy or challenging it would be to construct buildings and infrastructure on your property.',
    good: 'Your terrain and soil conditions are favorable for construction.',
    poor: 'Construction may require extra engineering, foundations, or site preparation.',
  },
  'Water Resilience': {
    plain: 'How well your property handles water — both having enough and managing excess. This includes drainage, flood risk, and water availability.',
    good: 'Your property has good water management potential with low flood risk.',
    poor: 'Water challenges may need creative solutions like swales, ponds, or drainage improvements.',
  },
  'Regenerative Potential': {
    plain: 'How productive your land could be for growing food, raising livestock, or other agricultural uses over the long term — with a focus on soil health and ecosystem resilience.',
    good: 'Your soil, climate, and terrain are favorable for regenerative agricultural production.',
    poor: 'Regenerative farming may require soil improvement, cover cropping, or careful species selection.',
  },
  'Habitat Sensitivity': {
    plain: 'How much ecological value your land already holds — wetlands, protected species habitat, intact forest, riparian buffers, and proximity to conservation areas. A higher score means more of the native ecosystem is still present and worth protecting.',
    good: 'Your land carries meaningful ecological value. This is an asset for conservation-minded design — and also something to respect, since some of these features may be regulated or require setbacks.',
    poor: 'Your land has been significantly disturbed or cleared. This gives you more design freedom, but also an opportunity: restoring habitat can be one of the highest-leverage moves you make.',
  },
  'Stewardship Readiness': {
    plain: 'How ready your land is for active stewardship work — soil health, erosion control, solar and wind potential, proximity to community resources, and readiness for regenerative practices like cover cropping and rotational grazing.',
    good: 'Conditions favor hands-on stewardship. Soil, climate, and infrastructure align well for the day-to-day work of caring for the land.',
    poor: 'Stewardship will take more upfront investment — soil amendments, erosion control, or infrastructure additions — before the land is ready to return the effort.',
  },
  'Community Suitability': {
    plain: 'How well the surrounding community can support a Community-Supported Regenerative Agriculture (CSRA) project — looking at population density, incomes, education levels, homeownership, and how active the local area feels.',
    good: 'Your surrounding area has the demographic fundamentals to support a community-based agricultural project.',
    poor: 'You may need to invest more in outreach, education, and relationship-building to grow a local community around this land.',
  },
  'Design Complexity': {
    inverted: true,
    plain: 'How complicated your land is to design around — slope variability, flood-zone constraints, zoning restrictions, regulated wetlands, and terrain variation. Unlike the other scores, LOWER is easier here: a low score means a simpler site to plan; a high score means more constraints to work with.',
    good: 'Your site is relatively simple to design. Fewer terrain surprises, fewer regulatory overlays, more freedom in where things can go.',
    poor: 'Your site has real design complexity — steep variability, flood constraints, protected features, or tight zoning. A good design is still possible, but expect more iterations, more professional input, and more careful phasing.',
  },
  'FAO Land Suitability': {
    plain: 'An international standard from the UN Food and Agriculture Organization that rates land for crop production on a scale from S1 (Highly Suitable) through S2, S3 (marginally suitable) to N1, N2 (not suitable). This score translates the classification into 0–100 for comparison.',
    good: 'By FAO standards, your land is well-suited for crop production without major limitations.',
    poor: 'By FAO standards, your land has limitations for typical crop production. Specialist crops, modified management, or non-crop uses may fit better.',
  },
  'USDA Land Capability': {
    plain: 'The US Department of Agriculture classifies land into Classes I–VIII based on how severe its limitations are for cultivation. Classes I–IV can be cultivated with increasing management needs; Classes V–VIII are better suited to pasture, forestry, or wildlife. This score translates the classification into 0–100.',
    good: 'By USDA standards, your land is in the cultivable range with manageable limitations.',
    poor: 'By USDA standards, your land has significant limitations for cultivation. It may be better suited to grazing, forestry, wildlife habitat, or perennial systems.',
  },
  'Canada Soil Capability': {
    plain: 'Agriculture and Agri-Food Canada\u2019s 1\u20137 Soil Capability classification: Class 1 is prime farmland with no significant limitations; Class 7 has limitations severe enough to preclude agriculture. The subclass letter (W/D/E/F/M/R) identifies the dominant limitation. This score translates the class into 0\u2013100.',
    good: 'By Canadian standards, your land is in the agriculturally capable range with manageable limitations.',
    poor: 'By Canadian standards, your land has substantial limitations for agriculture. Non-agricultural stewardship uses may be a better fit.',
  },
};

export function renderEducationalBooklet(data: ExportDataBag): string {
  const { project: p, assessment: a, layers } = data;

  // ─── Your Land at a Glance ────────────────────────────────────
  const overviewSection = `
    <div class="section">
      <h2>Your Land at a Glance</h2>
      <p>This booklet explains what we know about your property at <strong>${esc(p.address ?? p.name)}</strong>
      and what the data means in plain language. It is designed to help you understand your land's
      strengths, challenges, and potential — no technical expertise required.</p>
      <div class="card-grid-2">
        <div class="card">
          <div class="card-header">Property</div>
          <table>
            <tbody>
              <tr><td>Name</td><td><strong>${esc(p.name)}</strong></td></tr>
              <tr><td>Size</td><td>${p.acreage ? fmtNumber(p.acreage, 2) + ' acres' : 'Not measured yet'}</td></tr>
              <tr><td>Location</td><td>${esc(p.address ?? '—')}</td></tr>
              <tr><td>Project Type</td><td>${esc(p.project_type?.replace(/_/g, ' ') ?? '—')}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card">
          <div class="card-header">What We Looked At</div>
          <p style="font-size:9.5pt">We gathered data about your land from public databases and satellite
          imagery. This includes soil maps, elevation data, water features, land cover, climate records,
          and zoning information.</p>
          <p style="font-size:9.5pt">
            <strong>Data sources used:</strong> ${a?.data_sources_used?.length
              ? a.data_sources_used.map((s) => esc(s)).join(', ')
              : 'Assessment not yet completed'}
          </p>
        </div>
      </div>
    </div>`;

  // ─── Data Layer Explanations ──────────────────────────────────
  let layerSection = '';
  const completeLayers = layers.filter((l) => l.fetch_status === 'complete');

  if (completeLayers.length > 0) {
    const layerCards = completeLayers.map((l) => {
      const info = LAYER_EXPLANATIONS[l.layer_type];
      if (!info) return '';
      return `
        <div class="card" style="break-inside:avoid">
          <h3>${info.title}</h3>
          <h4>What is this?</h4>
          <p>${info.whatItIs}</p>
          <h4>Why does it matter?</h4>
          <p>${info.whyItMatters}</p>
          <p style="font-size:8pt;color:var(--text-muted)">
            Source: ${esc(l.source_api ?? 'Public database')}
            ${l.attribution_text ? ` — ${esc(l.attribution_text)}` : ''}
            &bull; Confidence: ${esc(l.confidence)}
          </p>
        </div>`;
    }).join('');

    layerSection = `
      <div class="section">
        <h2>Understanding Your Data</h2>
        <p>Here is what each type of data tells us about your property:</p>
        ${layerCards}
      </div>`;
  } else {
    layerSection = notAvailable('Data Layers — No data has been collected yet. Once the site assessment runs, this section will explain each data layer in detail.');
  }

  // ─── Score Explanations ───────────────────────────────────────
  // Shape note (post migration 009): iterate the canonical ScoredResult[]
  // in `a.score_breakdown`. For labels we have plain-language copy (see
  // SCORE_EXPLANATIONS above), render the rich card; for the rest, render
  // a minimal card with score + generic verdict (graceful degradation).
  let scoreSection = '';
  if (a) {
    const breakdownArr = Array.isArray(a.score_breakdown) ? a.score_breakdown : [];

    type Entry = { label: string; value: number | null };
    const scores: Entry[] = [
      { label: 'Overall', value: a.overall_score },
      ...breakdownArr.map((r) => ({ label: r.label, value: r.score })),
    ];

    const scoreCards = scores.map((s) => {
      if (s.value == null) return '';
      const color = scoreColor(s.value);
      const info = SCORE_EXPLANATIONS[s.label];
      if (info) {
        // Design Complexity (and any other `inverted` entry) reads backwards:
        // high score = high complexity = harder to design. Flip the threshold
        // so `good` copy surfaces on low scores for those labels.
        const goodThresholdMet = info.inverted ? s.value < 40 : s.value >= 60;
        const verdict = goodThresholdMet ? info.good : info.poor;
        return `
          <div class="card" style="break-inside:avoid;border-left:4px solid ${color}">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <h3 style="margin:0">${esc(s.label)}</h3>
              <span style="font-family:'Fira Code',monospace;font-size:18pt;font-weight:700;color:${color}">${Math.round(s.value)}<span style="font-size:10pt">/100</span></span>
            </div>
            <p style="margin-top:8px">${info.plain}</p>
            <p><strong>What this means for you:</strong> ${verdict}</p>
          </div>`;
      }
      // Graceful degradation — label without copy yet. Still useful for the
      // reader: score + generic verdict. Follow-up sprint adds the copy.
      const verdict = s.value >= 60
        ? 'This score suggests favourable conditions in this category.'
        : 'This score suggests challenges worth investigating further.';
      return `
        <div class="card" style="break-inside:avoid;border-left:4px solid ${color}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">${esc(s.label)}</h3>
            <span style="font-family:'Fira Code',monospace;font-size:18pt;font-weight:700;color:${color}">${Math.round(s.value)}<span style="font-size:10pt">/100</span></span>
          </div>
          <p><strong>What this means for you:</strong> ${verdict}</p>
        </div>`;
    }).join('');

    scoreSection = `
      <div class="section">
        <h2>Your Property Scores — Explained</h2>
        <p>Each score is out of 100. Higher is better. These scores are based on the data collected
        so far and may change as more information becomes available.</p>
        ${scoreCards}
      </div>`;
  } else {
    scoreSection = notAvailable('Property Scores — The site assessment has not been run yet. Scores will appear here once data collection is complete.');
  }

  // ─── Key Findings ─────────────────────────────────────────────
  let findingsSection = '';
  if (a?.flags && a.flags.length > 0) {
    const opportunities = a.flags.filter((f) => f.type === 'opportunity');
    const risks = a.flags.filter((f) => f.type === 'risk' || f.type === 'limitation');

    const oppList = opportunities.length > 0
      ? `<h3 style="color:var(--earth-green)">Opportunities</h3>
         <ul>${opportunities.map((f) => `<li>${esc(f.message)}</li>`).join('')}</ul>`
      : '';

    const riskList = risks.length > 0
      ? `<h3 style="color:var(--warning)">Things to Watch</h3>
         <ul>${risks.map((f) => `<li>${esc(f.message)}</li>`).join('')}</ul>`
      : '';

    const visitNote = a.needs_site_visit
      ? `<div class="card" style="border-left:4px solid var(--harvest-gold)">
           <p><strong>We recommend a site visit.</strong> Some data has low confidence or covers
           areas that need to be verified in person before making major decisions.</p>
         </div>`
      : '';

    findingsSection = `
      <div class="section">
        <h2>Key Findings</h2>
        <p>Based on the data analysis, here are the most important things to know:</p>
        ${oppList}${riskList}${visitNote}
      </div>`;
  }

  // ─── Glossary ─────────────────────────────────────────────────
  const glossarySection = `
    <div class="section">
      <h2>Glossary</h2>
      <dl class="glossary">
        <dt>Acreage</dt>
        <dd>The total area of your property in acres (1 acre ≈ 4,047 square meters, roughly the size of a football field).</dd>

        <dt>Bioregion</dt>
        <dd>A geographic area defined by natural features — climate, terrain, soil, plants, and animals — rather than political boundaries.</dd>

        <dt>Break-Even</dt>
        <dd>The point where total revenue equals total investment. Before break-even, you are spending more than earning; after, the project is generating returns.</dd>

        <dt>Confidence Level</dt>
        <dd>How reliable the data is: <strong>High</strong> = verified, multiple sources; <strong>Medium</strong> = single reliable source; <strong>Low</strong> = estimated or incomplete data.</dd>

        <dt>Drainage Class</dt>
        <dd>How quickly water moves through the soil. "Well-drained" soils let water pass through; "poorly drained" soils hold water and may become waterlogged.</dd>

        <dt>Growing Season</dt>
        <dd>The number of frost-free days per year when crops can grow. Longer growing seasons mean more planting options.</dd>

        <dt>Hardiness Zone</dt>
        <dd>A geographic zone that tells you which plants can survive the winter in your area. Higher numbers mean milder winters.</dd>

        <dt>Regenerative</dt>
        <dd>Land management that improves soil health, biodiversity, and ecosystem function over time — going beyond sustainability to actively restore the land.</dd>

        <dt>Setback</dt>
        <dd>The minimum distance a building or structure must be from a property line, road, water feature, or other boundary.</dd>

        <dt>Swale</dt>
        <dd>A shallow channel dug along the contour of a slope to capture and slow rainwater, allowing it to soak into the ground rather than running off.</dd>

        <dt>Watershed</dt>
        <dd>The entire area of land that drains water to a single point — like a funnel for rainfall. Your property is part of a larger watershed.</dd>
      </dl>
    </div>`;

  // ─── Next Steps ───────────────────────────────────────────────
  const nextStepsSection = `
    <div class="section">
      <h2>Suggested Next Steps</h2>
      <ol style="padding-left:20px">
        <li><strong>Walk your land.</strong> Data gives us a picture, but nothing replaces being on the ground. Note what you see, hear, and feel.</li>
        <li><strong>Take soil samples.</strong> Send 3–5 samples from different areas to a lab for detailed analysis of nutrients, pH, and organic matter.</li>
        <li><strong>Talk to neighbors.</strong> Long-time residents know the land's history — flooding patterns, wildlife corridors, old wells, and property disputes.</li>
        <li><strong>Check with local authorities.</strong> Visit your municipal planning office to confirm zoning, setbacks, and any active development plans nearby.</li>
        <li><strong>Start small.</strong> Begin with one area or one project phase. Observe how the land responds before committing to large-scale changes.</li>
      </ol>
    </div>`;

  return baseLayout('Educational Booklet', p.name,
    overviewSection + layerSection + scoreSection + findingsSection +
    glossarySection + nextStepsSection);
}
