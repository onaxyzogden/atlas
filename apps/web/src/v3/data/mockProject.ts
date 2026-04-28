/**
 * MTC Teaching Center fixture — drives every /v3/project/mtc/* page.
 * Mirrors the seven reference screens. No external data, no API calls.
 */

import type { Project } from "../types.js";

export const MTC_PROJECT: Project = {
  id: "mtc",
  name: "MTC Teaching Farm",
  shortLabel: "MTC",
  stage: "diagnose",
  location: {
    region: "Ontario, Canada",
    country: "CA",
    acreage: 128,
    acreageUnit: "ha",
    // Hand-drawn rectangular polygon centered near [-78.20, 44.50], sized to
    // ~128 ha (~1.6 km E-W × ~0.8 km N-S). Real cadastral geometry lands in
    // v3.2; this mock is enough to drive DiagnoseMap.fitBounds + outline.
    boundary: {
      type: "Polygon",
      coordinates: [
        [
          [-78.211, 44.4965],
          [-78.189, 44.4965],
          [-78.189, 44.5035],
          [-78.211, 44.5035],
          [-78.211, 44.4965],
        ],
      ],
    },
  },

  verdict: {
    status: "supported-with-fixes",
    label: "Supported with Required Fixes",
    score: 80,
    scoreLabel: "Vision Fit",
    summary:
      "The design vision is well aligned with site conditions and educational goals. Water access and regulatory items need attention before moving forward.",
  },
  summary:
    "Multi-Enterprise Teaching Center on a 128 ha parcel in Ontario. Regenerative farm with educational and conservation enterprises layered on a moderate-water, conditional-access site.",

  scores: {
    landFit: {
      category: "Land Fit",
      value: 86,
      label: "Strong",
      meaning: "Soils, terrain, and ecology support the intended uses with minor adjustments.",
      confidence: "high",
    },
    water: {
      category: "Water",
      value: 42,
      label: "Needs improvement",
      meaning: "Stocked paddocks lack a placed water source. A tank or well is required before grazing.",
      confidence: "good",
    },
    regulation: {
      category: "Regulation",
      value: 64,
      label: "Workable",
      meaning: "Wetland setbacks and floodplain rules constrain footprint but do not block the vision.",
      confidence: "good",
    },
    access: {
      category: "Access",
      value: 71,
      label: "Workable",
      meaning: "Primary road access is good; internal access paths are not yet drawn.",
      confidence: "mixed",
    },
    financial: {
      category: "Financial Reality",
      value: 63,
      label: "Moderate",
      meaning: "Capital intensity is moderate; break-even is reachable around year 7.",
      confidence: "mixed",
    },
    designCompleteness: {
      category: "Design Completeness",
      value: 56,
      label: "Incomplete",
      meaning: "Zones and water systems are not yet defined; design logic cannot be evaluated cleanly.",
      confidence: "good",
    },
  },

  blockers: [
    {
      id: "b1",
      title: "No livestock water source",
      severity: "blocking",
      description: "Paddocks are stocked but no water point is placed.",
      recommendedAction: "Add a water tank or well to paddocks.",
      actionLabel: "Fix on Map",
    },
    {
      id: "b2",
      title: "Missing water infrastructure",
      severity: "blocking",
      description: "Water systems cannot be validated yet.",
      recommendedAction: "Add a primary water system to the design.",
      actionLabel: "Add Water System",
    },
    {
      id: "b3",
      title: "No access paths drawn",
      severity: "warning",
      description: "Operations and guest movement cannot be tested.",
      recommendedAction: "Draw the primary access path.",
      actionLabel: "Draw Access",
    },
    {
      id: "b4",
      title: "Zones not fully defined",
      severity: "incomplete",
      description: "Design logic cannot be evaluated cleanly.",
      recommendedAction: "Assign land zones to remaining areas.",
      actionLabel: "Define Zones",
    },
  ],

  actions: [
    {
      id: "a1",
      title: "Add water tank or well to paddocks",
      type: "design",
      status: "todo",
      impact: "high",
      dueLabel: "Due in 2 days",
    },
    {
      id: "a2",
      title: "Draw primary access path",
      type: "design",
      status: "todo",
      impact: "high",
      dueLabel: "Due in 3 days",
    },
    {
      id: "a3",
      title: "Assign land zones",
      type: "design",
      status: "todo",
      impact: "medium",
      dueLabel: "Due in 5 days",
    },
    {
      id: "a4",
      title: "Define paddock layout",
      type: "design",
      status: "todo",
      impact: "medium",
      dueLabel: "Due in 1 week",
    },
    {
      id: "a5",
      title: "Review floodplain limits",
      type: "investigation",
      status: "todo",
      impact: "low",
      dueLabel: "Due in 2 weeks",
    },
    {
      id: "d1",
      title: "Choose primary water source: well vs. rainwater capture",
      type: "decision",
      status: "todo",
      impact: "high",
      dueLabel: "Decide this week",
    },
    {
      id: "d2",
      title: "Approve final paddock count (3, 4, or 5)",
      type: "decision",
      status: "todo",
      impact: "high",
      dueLabel: "Decide this week",
    },
    {
      id: "d3",
      title: "Confirm enterprise mix with stakeholders",
      type: "decision",
      status: "todo",
      impact: "medium",
      dueLabel: "Decide next week",
    },
  ],

  activity: [
    {
      id: "act1",
      title: "Water system updated",
      detail: "Added rainwater collection tank",
      timestamp: "2h ago",
      category: "water",
    },
    {
      id: "act2",
      title: "Access path drawn",
      detail: "Primary access path validated",
      timestamp: "4h ago",
      category: "access",
    },
    {
      id: "act3",
      title: "Soil tests uploaded",
      detail: "12 samples from field survey",
      timestamp: "1d ago",
      category: "soil",
    },
    {
      id: "act4",
      title: "Feasibility brief generated",
      detail: "AI brief generated for review",
      timestamp: "1d ago",
      category: "feasibility",
    },
    {
      id: "act5",
      title: "Regulation check completed",
      detail: "Wetland setback updated",
      timestamp: "2d ago",
      category: "regulation",
    },
  ],

  readiness: {
    landFit: "high",
    designCompleteness: "low",
    opsBurden: "light",
    capitalBurden: "moderate",
    confidence: "mixed",
  },

  diagnose: {
    verdict: {
      status: "conditional",
      label: "Conditional Opportunity",
      score: 72,
      scoreLabel: "Land Brief",
      summary:
        "This 128 ha parcel is suitable for the proposed teaching farm with several conditions. Soils, terrain, and climate are well matched; water reliability and wetland setbacks are the load-bearing constraints.",
    },
    parcelCaption: "Lot 42 · Wellington County · 128 ha",
    categories: [
      {
        id: "regulatory",
        title: "Regulatory",
        status: "conditional",
        statusLabel: "Conditional",
        summary:
          "Conservation Authority jurisdiction covers 14% of the parcel. A wetland-setback variance will be required for any structure within 30 m of the south marsh.",
        meaning: "Most of the design footprint is buildable, but the south marsh edge will need permits before any construction.",
        metric: { label: "CA jurisdiction", value: "14%" },
      },
      {
        id: "soil",
        title: "Soil",
        status: "strong",
        statusLabel: "Strong",
        summary:
          "Predominantly Guelph loam (62%) with a band of Burford sandy loam to the north. Drainage is good; pH 6.4–6.9; organic matter 4.1%.",
        meaning: "Soils support the full crop and pasture mix in the design without major amendment.",
        metric: { label: "Tilth", value: "Loam, OM 4.1%" },
      },
      {
        id: "water",
        title: "Water",
        status: "at-risk",
        statusLabel: "At Risk",
        summary:
          "Seasonal stream on the east boundary; groundwater test well yields 4 gpm — below the 8 gpm needed for full livestock load. No surface storage.",
        meaning: "Reliable year-round water for the planned herd is not yet proven; storage or a deeper well will be required.",
        metric: { label: "Well yield", value: "4 gpm" },
      },
      {
        id: "terrain",
        title: "Terrain",
        status: "workable",
        statusLabel: "Workable",
        summary:
          "Gentle 2–6% slope across the central plateau, opening to a 9% south-facing slope ideal for orchard and solar siting.",
        meaning: "Terrain is friendly to grazing rotation and passive design; no slope work needed for primary uses.",
        metric: { label: "Slope range", value: "2–9%" },
      },
      {
        id: "ecology",
        title: "Ecology",
        status: "workable",
        statusLabel: "Workable",
        summary:
          "Mixed deciduous edge along the north and west boundaries provides shelter and biodiversity. Two SAR-listed bird species observed seasonally.",
        meaning: "Ecology is a net asset — preserve the hedgerows and stagger grazing to avoid disturbing nesting windows.",
        metric: { label: "Hedgerow", value: "1.4 km" },
      },
      {
        id: "climate",
        title: "Climate",
        status: "strong",
        statusLabel: "Strong",
        summary:
          "USDA zone 5b. 165-day growing season, 870 mm annual precipitation evenly distributed. Late-spring frost risk is moderate.",
        meaning: "Climate fully supports the planned mix; only frost-sensitive species need siting consideration.",
        metric: { label: "Growing days", value: "165" },
      },
      {
        id: "infrastructure",
        title: "Infrastructure",
        status: "conditional",
        statusLabel: "Conditional",
        summary:
          "Paved road frontage on the west; three-phase power within 200 m. No on-parcel septic or potable supply; cell signal weak in the south basin.",
        meaning: "Connection costs are reasonable for the main building zone; remote ops will need satellite or fixed-wireless backup.",
        metric: { label: "Power", value: "3-phase, 200 m" },
      },
    ],
    insights: [
      {
        id: "r1",
        kind: "risk",
        title: "Water yield insufficient for full herd",
        detail: "Existing well delivers 4 gpm; full livestock plan needs 8 gpm. Without storage or a second well, summer drawdown will throttle stocking.",
        categoryIds: ["water"],
      },
      {
        id: "r2",
        kind: "risk",
        title: "Wetland setback compresses south footprint",
        detail: "30 m no-build buffer along the south marsh removes ~3 ha from the usable building zone and shifts the planned barn north.",
        categoryIds: ["regulatory"],
      },
      {
        id: "r3",
        kind: "risk",
        title: "Late-spring frost on south slope",
        detail: "Cold-air drainage onto the lower south slope risks orchard bud loss in 2 of 5 years; consider higher placement or wind machines.",
        categoryIds: ["terrain", "climate"],
      },
      {
        id: "o1",
        kind: "opportunity",
        title: "South-facing slope ideal for orchard + solar",
        detail: "9% south slope is uncommon at this latitude — strong fit for fruit, nuts, and a 30 kW solar array sharing the same aspect.",
        categoryIds: ["terrain"],
      },
      {
        id: "o2",
        kind: "opportunity",
        title: "Hedgerows already provide shelter belts",
        detail: "1.4 km of established mixed-deciduous edge cuts the cost of windbreak planting and accelerates biodiversity targets.",
        categoryIds: ["ecology"],
      },
      {
        id: "o3",
        kind: "opportunity",
        title: "Conservation programs cosign wetland stewardship",
        detail: "South marsh enrollment in the provincial wetland program qualifies for 60% setback-restoration cost share.",
        categoryIds: ["water"],
      },
      {
        id: "l1",
        kind: "limitation",
        title: "No on-parcel potable supply",
        detail: "Drinking water for the teaching center will require either a deeper well or trucked supply until municipal connection is feasible.",
        categoryIds: ["water"],
      },
      {
        id: "l2",
        kind: "limitation",
        title: "Cell coverage weak in south basin",
        detail: "Field-staff comms and IoT sensors in the south third will need satellite or fixed-wireless backhaul.",
        categoryIds: ["infrastructure"],
      },
      {
        id: "l3",
        kind: "limitation",
        title: "Seasonal access on east two-track",
        detail: "Spring thaw renders the east access two-track impassable for 3–5 weeks; rotation plans must avoid east-only stocking in March.",
        categoryIds: ["terrain"],
      },
    ],
    categoryDetails: {
      water: {
        whatsHappening:
          "A seasonal stream traces the east boundary, and one test well on the central plateau yields 4 gpm. There is no surface storage on the parcel, and no rainwater capture is currently designed.",
        whatsWrong:
          "The full grazing plan needs ~8 gpm to stock four paddocks year-round; the well alone is half that. Drinking water for the teaching center is not yet sourced at all.",
        whatNext:
          "Either deepen the existing well, drill a second, or pair the well with a 20–40 m³ rainwater + tank system. Confirm potable plan before any built structures are sited.",
        metrics: [
          { label: "Well yield", value: "4 gpm", hint: "tested Mar 2026" },
          { label: "Required for full herd", value: "8 gpm", hint: "1.2 AU/ha × 4 paddocks" },
          { label: "Surface storage", value: "0 m³", hint: "no ponds or tanks" },
          { label: "Annual precipitation", value: "870 mm", hint: "evenly distributed" },
        ],
        mapHint:
          "On the site map, the seasonal stream sits along the east boundary line; the test well marker is near the central plateau.",
      },
      terrain: {
        whatsHappening:
          "Slope ranges from 2–6% across the central plateau and opens to a 9% south-facing slope on the southern third. Aspect is broadly south to south-southwest. The south basin shows mild cold-air drainage on still nights.",
        whatsWrong:
          "The 9% south slope is a strong solar/orchard asset, but the lower band is a frost pocket two springs in five. East two-track is seasonally impassable through spring thaw.",
        whatNext:
          "Place orchard and solar on the upper south slope (above the frost band); preserve the central plateau for buildings and rotational grazing. Plan rotations to avoid east-only stocking in March.",
        metrics: [
          { label: "Plateau slope", value: "2–6%", hint: "central footprint" },
          { label: "South slope", value: "9%", hint: "orchard + solar candidate" },
          { label: "Aspect", value: "S / SSW", hint: "ideal for sun-loving systems" },
          { label: "Frost risk band", value: "Lower south", hint: "2 of 5 years" },
        ],
        mapHint:
          "On the site map, the topography overlay shows the gentle plateau in the north and the steeper south slope opening toward the parcel boundary.",
      },
      soil: {
        whatsHappening:
          "Predominantly Guelph loam (62%) across the central plateau and southern slope, with a band of Burford sandy loam tracing the north third. Drainage is good across both. Sample pH ranges 6.4–6.9 with 4.1% organic matter parcel-wide.",
        whatsWrong:
          "Nothing load-bearing. The Burford band drains faster and dries out earlier in summer, so any annuals planted there will need either irrigation or a drought-tolerant rotation.",
        whatNext:
          "Treat the Guelph loam plateau as the primary cropping + intensive grazing footprint. Reserve the Burford band for perennial pasture or windbreak species that tolerate sandier soils. No amendment is required before year 1.",
        metrics: [
          { label: "Dominant soil", value: "Guelph loam", hint: "62% of parcel" },
          { label: "Secondary band", value: "Burford sandy loam", hint: "north third" },
          { label: "pH range", value: "6.4 – 6.9", hint: "near-ideal for the planned mix" },
          { label: "Organic matter", value: "4.1%", hint: "above 3% baseline" },
        ],
        mapHint:
          "On the site map, the loam-to-sandy-loam transition runs roughly along the north edge of the central plateau.",
      },
      climate: {
        whatsHappening:
          "USDA hardiness zone 5b. ~165-day growing season with 870 mm annual precipitation evenly spread through the year. Late-spring frost remains a moderate risk on the lower south slope two years in five.",
        whatsWrong:
          "The frost-pocket risk on the south basin is the only climate constraint that bites the design — frost-sensitive species (early-flowering fruit, tender annuals) shouldn't sit in the lower band.",
        whatNext:
          "Plant frost-sensitive perennials on the upper south slope above the cold-air drainage; reserve the basin for cold-tolerant rotations. Budget for frost cover or wind machines in years where bud-break tracks early.",
        metrics: [
          { label: "Hardiness zone", value: "5b", hint: "USDA reference" },
          { label: "Growing days", value: "165", hint: "annual avg" },
          { label: "Precipitation", value: "870 mm/yr", hint: "evenly distributed" },
          { label: "Late-frost risk", value: "Moderate", hint: "lower south slope, 2 of 5 years" },
        ],
        mapHint:
          "On the site map, the frost-risk band aligns with the lower south slope visible under the topography overlay.",
      },
      regulatory: {
        whatsHappening:
          "The Conservation Authority claims jurisdiction over 14% of the parcel — the south marsh and a 30 m buffer ring around it. The remaining 86% sits under standard rural-zoning rules with no overlay constraints.",
        whatsWrong:
          "The proposed barn footprint sits 22 m from the marsh edge, inside the 30 m no-build buffer. Any structure within the buffer requires a setback variance, and the variance process adds 8–14 weeks before ground can be broken.",
        whatNext:
          "Either shift the barn 8 m north of the buffer line (cleanest path) or file the variance early so the permit clock runs in parallel with detailed design. Confirm wetland-program enrolment in the same filing — it qualifies the parcel for restoration cost-share.",
        metrics: [
          { label: "CA jurisdiction", value: "14%", hint: "south marsh + 30 m buffer" },
          { label: "Wetland setback", value: "30 m", hint: "no-build buffer" },
          { label: "Current barn offset", value: "22 m", hint: "8 m short of rule" },
          { label: "Variance lead time", value: "8–14 weeks", hint: "if filed" },
        ],
        mapHint:
          "On the site map, the regulated band traces the south marsh; the planned barn marker sits inside the buffer ring.",
      },
      ecology: {
        whatsHappening:
          "1.4 km of mixed-deciduous hedgerow runs along the north and west boundaries, with a smaller patch along the east two-track. Two species-at-risk birds (Bobolink, Eastern Meadowlark) have been observed nesting in the central plateau grasses between mid-May and late July.",
        whatsWrong:
          "Nothing structural — the ecology is a net asset. The only watch-out is grazing schedule: a tight rotation that hits the central plateau in June would disturb active nests and put SAR compliance at risk.",
        whatNext:
          "Preserve the existing hedgerows as windbreaks (no clearing required). Stagger the rotation so the central plateau is not grazed mid-May through late July, or fence a 4 ha nesting refuge inside that window. Document the SAR observation in the operations plan for traceability.",
        metrics: [
          { label: "Hedgerow length", value: "1.4 km", hint: "north + west boundaries" },
          { label: "SAR species", value: "2", hint: "Bobolink, Eastern Meadowlark" },
          { label: "Nesting window", value: "Mid-May – Late July", hint: "avoid central-plateau grazing" },
          { label: "Refuge needed", value: "~4 ha", hint: "if rotation cannot shift" },
        ],
        mapHint:
          "On the site map, the hedgerow polygons trace the north and west boundary; the SAR observation pins cluster on the central plateau.",
      },
      infrastructure: {
        whatsHappening:
          "Paved road frontage runs the full length of the west boundary. Three-phase power sits within 200 m of the planned building zone. There is no on-parcel septic, no potable supply, and cell signal drops to one bar in the south basin.",
        whatsWrong:
          "Servicing is workable but not free. Power extension and a Class 4 septic together run $35–55K, and remote ops in the south basin will not have reliable cell — staff comms and IoT sensors there need a fallback link.",
        whatNext:
          "Budget the power extension and septic in the year-1 capital plan. Confirm a fixed-wireless or satellite backhaul for the south basin before placing field-staff stations there. Drinking water depends on the well decision in the Water category — keep the two plans in sync.",
        metrics: [
          { label: "Power", value: "3-phase, 200 m", hint: "extension required" },
          { label: "Road frontage", value: "Paved, west", hint: "no upgrade needed" },
          { label: "On-parcel septic", value: "None", hint: "Class 4 system needed" },
          { label: "Cell coverage", value: "Weak (south basin)", hint: "satellite/fixed-wireless backup" },
        ],
        mapHint:
          "On the site map, the power extension would run east from the west road frontage; the south basin (cell-weak zone) sits below the frost band.",
      },
    },
  },

  prove: {
    blockers: [
      {
        id: "pb1",
        title: "Livestock water source not placed",
        severity: "blocking",
        description: "All four paddocks are stocked at 1.2 AU/ha but no water point is on the design.",
        recommendedAction: "Place at least one trough or pond per paddock with a max walk of 200 m.",
        actionLabel: "Fix on Map",
      },
      {
        id: "pb2",
        title: "Cash flow turns negative in year 3",
        severity: "blocking",
        description: "Year-3 peak cash deficit is $480K against a $250K reserve.",
        recommendedAction: "Phase the orchard or reduce staff onboarding pace before year 3.",
        actionLabel: "Adjust Phasing",
      },
      {
        id: "pb3",
        title: "South building zone violates wetland setback",
        severity: "warning",
        description: "Proposed barn footprint sits 22 m from the south marsh; rule is 30 m.",
        recommendedAction: "Shift the barn 8 m north or apply for a 22 m setback variance.",
        actionLabel: "Move on Map",
      },
      {
        id: "pb4",
        title: "Education program staffing undefined",
        severity: "incomplete",
        description: "Teaching FTE counts are not yet entered for years 2–5.",
        recommendedAction: "Add teaching staff to the operations plan to size labor reality.",
        actionLabel: "Add Roles",
      },
    ],

    bestUses: [
      {
        id: "u1",
        useType: "Educational Farm + Teaching Center",
        visionFit: 92,
        fitQuality: "excellent",
        note: "Anchor use — full alignment with vision, terrain, and ecology.",
      },
      {
        id: "u2",
        useType: "Rotational Grazing (Cattle + Sheep)",
        visionFit: 84,
        fitQuality: "excellent",
        note: "Soils and slope support the rotation; needs water placement to unlock.",
      },
      {
        id: "u3",
        useType: "Mixed Orchard + Solar Array",
        visionFit: 76,
        fitQuality: "good",
        note: "9% south slope is a strong fit; mind late-spring frost on lower band.",
      },
      {
        id: "u4",
        useType: "Conservation & Wetland Restoration",
        visionFit: 71,
        fitQuality: "good",
        note: "South marsh enrolment qualifies for 60% cost-share on stewardship.",
      },
      {
        id: "u5",
        useType: "Annual Cash Crops",
        visionFit: 48,
        fitQuality: "moderate",
        note: "Possible on the central plateau but conflicts with rotational grazing plan.",
      },
      {
        id: "u6",
        useType: "Industrial Greenhouse",
        visionFit: 22,
        fitQuality: "poor",
        note: "Off-vision; capital intensity and water demand exceed parcel capacity.",
      },
    ],

    visionFit: [
      { category: "Educational Goals", value: 92, benchmark: 75, note: "Curriculum + parcel are well matched." },
      { category: "Regenerative Practices", value: 88, benchmark: 70, note: "Rotation + perennials drive soil health." },
      { category: "Ecological Integrity", value: 84, benchmark: 70, note: "Hedgerows + setbacks preserve habitat." },
      { category: "Community & Cultural Fit", value: 79, benchmark: 70, note: "Public events fit county zoning." },
      { category: "Economic Viability", value: 63, benchmark: 70, note: "Year-3 cash gap is the headline risk." },
      { category: "Operational Realism", value: 58, benchmark: 70, note: "FTE plan is incomplete; rework required." },
    ],

    execution: [
      { id: "e1", label: "Annual Labor", value: "$680K", hint: "incl. seasonal", tone: "watch" },
      { id: "e2", label: "Full-Time Equivalents", value: "4.2 FTE", hint: "stable yr 4+", tone: "neutral" },
      { id: "e3", label: "Total Investment", value: "$3.1M", hint: "phased over 5 yr", tone: "watch" },
      { id: "e4", label: "Peak Cash Need", value: "$480K", hint: "year 3", tone: "warning" },
      { id: "e5", label: "Capital & Ops Intensity", value: "Moderate", hint: "manageable with phasing", tone: "good" },
    ],

    designRules: [
      {
        id: "dr1",
        rule: "Livestock water within 200 m of every paddock",
        status: "blocked",
        detail: "Paddocks A, B, C, D are stocked but no water point is placed.",
      },
      {
        id: "dr2",
        rule: "30 m wetland setback on all structures",
        status: "warning",
        detail: "Barn sits 22 m from south marsh — needs variance or relocation.",
      },
      {
        id: "dr3",
        rule: "Maximum 12% slope under buildings",
        status: "pass",
        detail: "All structures sit on the 2–6% central plateau.",
      },
      {
        id: "dr4",
        rule: "Hedgerow buffer preserved on north & west boundaries",
        status: "pass",
        detail: "Existing 1.4 km hedgerow is fully retained in the design.",
      },
      {
        id: "dr5",
        rule: "Emergency egress within 300 m of every occupied building",
        status: "warning",
        detail: "Cabin cluster is 380 m from the secondary access path.",
      },
      {
        id: "dr6",
        rule: "Rotational grazing maintains 30-day rest minimum",
        status: "pass",
        detail: "4-paddock rotation plan delivers 36-day average rest.",
      },
    ],
  },

  operate: {
    today: [
      {
        id: "t1",
        title: "Livestock Rotation",
        headline: "Paddock B → C",
        detail: "Move 24 head at first feed. Rest period for B begins today.",
        status: { label: "On schedule", tone: "good" },
        due: "By 09:00",
      },
      {
        id: "t2",
        title: "Water Checks",
        headline: "2 of 4 tanks",
        detail: "Tank 2 at 35% — refill before the afternoon shift.",
        status: { label: "Action", tone: "warning" },
        due: "Before 14:00",
      },
      {
        id: "t3",
        title: "Pasture Recovery",
        headline: "Paddock A · Day 14",
        detail: "On track for 30-day rest. Re-test sward height on day 21.",
        status: { label: "Healthy", tone: "good" },
      },
      {
        id: "t4",
        title: "Planting / Harvest",
        headline: "Orchard pruning",
        detail: "Block 1 pruning continues. Block 2 starts Thursday.",
        status: { label: "In progress", tone: "neutral" },
        due: "All day",
      },
      {
        id: "t5",
        title: "Maintenance",
        headline: "East fence inspection",
        detail: "Two posts loose near gate 3 — schedule reseat.",
        status: { label: "Watch", tone: "watch" },
        due: "By end of week",
      },
      {
        id: "t6",
        title: "Weather-Sensitive",
        headline: "Frost risk · Tue night",
        detail: "Lower south slope vulnerable. Ready frost cover for orchard block 2.",
        status: { label: "Risk", tone: "warning" },
        due: "Prep Mon",
      },
      {
        id: "t7",
        title: "Team Assignments",
        headline: "4 of 5 staffed",
        detail: "Saturday education shift unfilled — confirm volunteer by Friday.",
        status: { label: "Watch", tone: "watch" },
      },
    ],

    alerts: [
      {
        id: "al1",
        title: "Tank 2 at 35%",
        detail: "Below the 40% reorder threshold. Refill window: 11:00–14:00.",
        tone: "warning",
      },
      {
        id: "al2",
        title: "Heifer #14 due for vet check",
        detail: "Routine pregnancy check overdue by 2 days.",
        tone: "watch",
      },
      {
        id: "al3",
        title: "Soil moisture sensors offline (Block 3)",
        detail: "Last reading 38h ago — battery or signal issue likely.",
        tone: "watch",
      },
    ],

    upcoming: [
      { id: "ev1", title: "Frost cover deployment", when: "Tue 19:00", category: "weather" },
      { id: "ev2", title: "Conservation Authority site visit", when: "Wed 10:00", category: "regulation" },
      { id: "ev3", title: "Education group — soil workshop", when: "Sat 09:30", category: "education" },
      { id: "ev4", title: "Hay delivery", when: "Mon 14:00", category: "ops" },
    ],

    fieldFlags: [
      { id: "f1", kind: "livestock", x: 38, y: 42, label: "Herd · Paddock B", tone: "good" },
      { id: "f2", kind: "water", x: 22, y: 65, label: "Tank 2 · low", tone: "warning" },
      { id: "f3", kind: "fence", x: 78, y: 30, label: "East fence · maint.", tone: "watch" },
      { id: "f4", kind: "weather", x: 64, y: 78, label: "Frost zone", tone: "warning" },
      { id: "f5", kind: "team", x: 50, y: 22, label: "Crew · Orchard", tone: "neutral" },
    ],
  },

  build: {
    phases: [
      {
        id: "p1",
        number: 1,
        title: "Site Preparation & Water Infrastructure",
        summary: "Clear access, install primary water lines, establish staging yard.",
        status: "in-progress",
        window: "Q3 2026",
        blockerCount: 2,
        tasks: [
          { id: "p1t1", title: "Conservation Authority permit (wetland buffer)", status: "blocked", owner: "Yousef", dueLabel: "Due Wed" },
          { id: "p1t2", title: "Survey & flag access road centerline", status: "in-progress", owner: "Crew A", dueLabel: "This week" },
          { id: "p1t3", title: "Trench primary water main to Paddock B", status: "in-progress", owner: "Contractor", dueLabel: "Next week" },
          { id: "p1t4", title: "Install 5,000 L holding tank", status: "todo", owner: "Contractor", dueLabel: "Aug 12" },
          { id: "p1t5", title: "Sediment & erosion control plan filed", status: "done", owner: "Yousef" },
          { id: "p1t6", title: "Re-route eastern runoff swale", status: "blocked", owner: "TBD", dueLabel: "Pending permit" },
        ],
      },
      {
        id: "p2",
        number: 2,
        title: "Structures & Paddock Buildout",
        summary: "Erect barn, fence rotation paddocks, install perimeter gates.",
        status: "upcoming",
        window: "Q4 2026",
        blockerCount: 1,
        tasks: [
          { id: "p2t1", title: "Barn foundation pour", status: "todo", dueLabel: "Oct" },
          { id: "p2t2", title: "Fence Paddocks A–D (4-strand high-tensile)", status: "todo", dueLabel: "Oct" },
          { id: "p2t3", title: "Pre-fab teaching shelter delivery", status: "todo", dueLabel: "Nov" },
          { id: "p2t4", title: "Cabin cluster — access path approval", status: "blocked", dueLabel: "Pending §3.2 review" },
        ],
      },
      {
        id: "p3",
        number: 3,
        title: "Programs & Operations Launch",
        summary: "Onboard livestock, open education program, first cohort intake.",
        status: "upcoming",
        window: "Q1–Q2 2027",
        blockerCount: 0,
        tasks: [
          { id: "p3t1", title: "Initial herd procurement (24 head)", status: "todo", dueLabel: "Spring 2027" },
          { id: "p3t2", title: "Education curriculum — Year 1 modules", status: "todo", dueLabel: "Mar 2027" },
          { id: "p3t3", title: "Open day & community launch", status: "todo", dueLabel: "May 2027" },
        ],
      },
    ],
  },
};
