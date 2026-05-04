// Builtin "351 House — Atlas Sample" view-models.
//
// All hardcoded demo content for the OBSERVE pages flows through this file.
// When the unauth `GET /api/v1/projects/builtins` endpoint lands (per ADR
// 2026-05-01-atlas-builtin-sample-project on `main`), replace each literal
// export with a derivation off the fetched project + its layer summaries.
// Pages import named view-models, not raw schema fields, so the swap is
// one-file-only.
//
// Shape alignment:
//   - `project`           tracks @ogden/shared ProjectSummary (id/name/...)
//   - `projectMetadata`   tracks ProjectMetadata (bioregion/county/...)
//   - `steward`           tracks the Steward Survey form payload
//   - `observe*`          pre-derived view-models for OBSERVE surfaces
//
// Sentinel UUID matches the planned builtin so the eventual swap-in is a
// no-op for any code that already keys off it.

export const BUILTIN_PROJECT_ID = "00000000-0000-0000-0000-0000005a3791";

export const project = {
  id: BUILTIN_PROJECT_ID,
  name: "351 House — Atlas Sample",
  description: "Built-in sample project demonstrating the OBSERVE pillar.",
  country: "CA",
  provinceState: "ON",
  units: "metric",
  status: "active",
  isBuiltin: true
};

export const projectMetadata = {
  bioregion: "Carolinian",
  county: "Halton",
  climateRegion: "Humid continental — 5b",
  mapProjection: "EPSG:3979"
};

export const steward = {
  name: "Yousef Abdelsalam",
  age: "34",
  occupation: "Software / regenerative design",
  lifestyle: "Active",
  updatedRelative: "43 min ago",
  updatedAbsolute: "Today, 11:18 AM",
  initials: "Yousef A."
};

// Shared site banner used in detail-page footers + breadcrumb stems.
// Aligns the prototype's hardcoded "Green Valley Homestead / Nimbin, NSW"
// strings with the actual 351 House — Halton, ON sample project.
export const siteBanner = {
  siteName: project.name,
  location: "Halton, ON, Canada",
  elevationRange: "240-268 m",
  projectStart: "12 Apr 2026",
  lastUpdatedAbsolute: "Today, 9:42 AM",
  lastUpdatedBy: steward.initials,
  syncStatus: "Synced"
};

// Breadcrumb stem reused across module + sub-pages.
export const breadcrumbStem = ["Projects", project.name, "Roots & Diagnosis"];

// View-models for ObservePage (`/observe`) — stage hero metrics + module list
// rendered on the homepage.
export const observeStageMetrics = {
  modulesProgressPct: 36,
  modulesComplete: 2,
  modulesTotal: 6,
  nextModule: "Earth, Water & Ecology",
  observationCoveragePct: 58,
  siteAreaHa: 25.7,
  diagnosticsLogged: 14,
  diagnosticsTotal: 22
};

export const observeModules = [
  { number: "1", title: "Human Context", status: "In progress", active: true, art: "people", to: "/observe/human-context" },
  { number: "2", title: "Macroclimate &\nHazards", status: "In progress", active: true, art: "weather", to: "/observe/macroclimate-hazards" },
  { number: "3", title: "Topography &\nBase Map", status: "In progress", active: true, art: "topo", to: "/observe/topography" },
  { number: "4", title: "Earth, Water &\nEcology Diagnostics", status: "Not started", active: false, art: "soil", to: "/observe/earth-water-ecology" },
  { number: "5", title: "Sectors, Microclimates\n& Zones", status: "Not started", active: false, art: "sector" },
  { number: "6", title: "SWOT\nSynthesis", status: "Not started", active: false, art: "swot" }
];

// View-models for ObserveDashboardPage (`/observe/dashboard`).
export const observeStageProgress = {
  totalTasks: 28,
  doneTasks: 18,
  inProgressTasks: 7,
  needsInputTasks: 10,
  journalEntriesThisWeek: 8,
  lastUpdatedAbsolute: "Today, 9:42 AM",
  lastUpdatedBy: steward.initials,
  progressPct: 63,
  taskBarPct: 74
};

// One row per module on the dashboard. `facts` is the dl rendered by
// FactList; `badges` is the BadgeRow chip strip.
export const observeDashboardModules = {
  humanContext: {
    facts: [
      ["Steward", steward.name],
      ["Vision phases captured", "3 / 3"],
      ["Milestones", "0"],
      ["Regional context", "11 captured"]
    ],
    miniStats: ["People 5", "Stakeholders 8", "Sources 11"]
  },
  macroclimate: {
    facts: [
      ["Hardiness zone", "5b"],
      ["Annual precip", "870 mm"],
      ["Logged hazards", "3"]
    ],
    badges: ["Bushfire Medium", "Flooding Low", "Wind Medium"],
    monthlyRainPct: [18, 36, 55, 78, 90, 75, 48, 28, 38, 55, 72, 52]
  },
  topography: {
    facts: [
      ["Mean slope", "4.2°"],
      ["Elevation range", "240–268 m"],
      ["A–B transects", "1"]
    ],
    badges: ["Slope map", "Contours 10 m", "Aspect map", "Base map Satellite"]
  },
  earthWaterEcology: {
    facts: [
      ["Latest soil pH", "6.8"],
      ["Groundwater", "—"],
      ["Ecology obs.", "4"],
      ["Water points", "2"],
      ["Soil tests", "2"]
    ],
    badges: ["Riparian corridor", "Frog habitat", "Erosion rill", "Weed patch"],
    scores: [
      { label: "Soil Health", band: "Good" },
      { label: "Biodiversity", band: "Moderate" },
      { label: "Water Security", band: "Low" }
    ]
  },
  sectors: {
    facts: [
      ["Sector arrows", "4"],
      ["Microclimates", "3"],
      ["Zones defined", "4"]
    ],
    badges: ["Winter sun 31°", "Summer sun 78°", "Prevailing wind SW", "Cold winds SE"]
  },
  swot: {
    quadrants: {
      strengths: "Natural water access",
      weaknesses: "Shallow soils on ridge",
      opportunities: "Diverse habitat potential",
      threats: "Bushfire exposure"
    },
    badges: ["Entries 4", "Last updated Today", "Journals 8"]
  }
};

// HumanContextDashboardPage (`/observe/human-context`) — module 1 dashboard.
export const humanContextDashboard = {
  breadcrumb: [...breadcrumbStem, "Human Context"],
  saveStatus: "All changes saved",
  hero: {
    moduleNumber: "Module 1",
    progressPct: 78,
    progressLabel: "Well on your way",
    progressNote: "9 of 11 areas captured",
    metrics: [
      { iconKey: "eye", label: "Vision phases", value: "3 / 3", note: "Captured" },
      { iconKey: "flag", label: "Milestones", value: "0", note: "Defined" },
      { iconKey: "mapPin", label: "Regional context", value: "11", note: "Captured" }
    ]
  },
  steward: {
    profilePct: 78,
    profileNote: "6 of 8 areas filled",
    archetype: "Practical Builder",
    archetypeNote: "Hands-on, skilled, and ready to implement.",
    capacityHrs: "28",
    capacityNote: "hrs / week total",
    chips: ["Active Halton Hills agricultural community", "Conservation mindset", "Long-term stewardship"],
    tabs: ["Profile insights", "Capacity & resources", "Local network"]
  },
  regional: {
    facts: [
      ["Indigenous place-names", "3"],
      ["Cultural challenges", "3"],
      ["Cultural strengths", "3"],
      ["Local contacts", "3"],
      ["Warnings", "2"]
    ],
    chips: ["Land acknowledgement", "Sacred site care", "Stewardship partnerships"],
    tabs: ["Place-names", "Cultural challenges", "Cultural strengths", "Local network"]
  },
  vision: {
    quote:
      "A small Carolinian homestead that produces food, hosts learning, and integrates daily prayer with regenerative care of land - modest scale, long horizon.",
    themes: ["Food production", "Learning & community", "Spiritual practice", "Regenerative care", "Long-term stewardship"],
    counts: [
      ["6", "Core Functions"],
      ["5", "Success Metrics"],
      ["6", "Moodboard Images"]
    ],
    tabs: ["Vision concept", "Success metrics", "Moodboard", "Core functions"]
  },
  health: {
    summary: "Strong foundation with clear direction.",
    strips: [
      ["People & Capacity", "Strong"],
      ["Place & Culture", "Strong"],
      ["Vision & Purpose", "Strong"],
      ["Risks to Address", "2"]
    ],
    lastUpdated: "Today, 10:24 AM"
  },
  synthesis: {
    alignmentPct: 82,
    alignmentNote: "Strong foundation across people, place, and purpose.",
    keyInsights: [
      "Strong stewardship capacity and clear intention to build a resilient homestead.",
      "Deep local roots and cultural strengths provide a solid foundation.",
      "Long-term vision is coherent and grounded in care for land and people."
    ],
    designImplications: [
      "Leverage community network for shared infrastructure and knowledge.",
      "Address land acknowledgement and sacred site care in early designs.",
      "Plan for water resilience and soil health to support long-term food production.",
      "Build flexible spaces for learning, retreat, and community gatherings."
    ],
    nextSteps: [
      "Finalize land acknowledgement and cultural consultation.",
      "Co-develop stewardship goals with local partners.",
      "Use vision themes to prioritize design zones and sequences."
    ]
  }
};

// StewardSurveyPage (`/observe/human-context/steward-survey`).
export const stewardSurvey = {
  breadcrumb: [...breadcrumbStem, "Human Context", "Steward Survey"],
  hero: {
    kicker: "Module 1 · Human Context",
    title: "Steward Survey",
    copy:
      "A protracted observation begins with the people. Capture who is stewarding this land, what they bring, and what they hope to grow. All fields optional - fill in what you have."
  },
  identity: {
    name: steward.name,
    age: steward.age,
    occupation: steward.occupation,
    lifestyle: steward.lifestyle,
    lifestyleOptions: ["Quiet", "Seasonal"]
  },
  capacity: {
    initialHrs: "20",
    ongoingHrs: "8",
    totalHrs: "28",
    budget: "$15k/yr establishment, $3k/yr ongoing",
    establishmentLine: "$15k / yr",
    establishmentPct: 83,
    ongoingLine: "$3k / yr",
    ongoingPct: 17,
    skills: ["carpentry (intermediate)", "orcharding", "gardening", "CAD/GIS"]
  },
  vision: {
    statement:
      "A small Carolinian homestead that produces food, hosts learning, and integrates daily prayer with regenerative care of land - modest scale, long horizon.",
    themes: [
      { label: "Food production", iconKey: "leaf" },
      { label: "Learning & community", iconKey: "users" },
      "Spiritual practice",
      { label: "Regenerative care", iconKey: "leaf" },
      { label: "Long-term stewardship", iconKey: "clock" }
    ]
  },
  snapshot: {
    profilePct: 78,
    profileNote: "6 of 8 areas filled",
    archetype: "Practical Builder",
    archetypeNote: "Hands-on, skilled, and ready to implement.",
    capacityHrs: "28 hrs / wk",
    capacityNote: "Strong capacity for both build and maintenance.",
    implications: [
      "You have strong implementation capacity - designs can be more build-intensive.",
      "Skills in carpentry, orcharding and CAD/GIS support infrastructure, planting systems, and mapping.",
      "Budget supports a modest, phased build - prioritize durable, multi-functional elements.",
      "Active lifestyle suggests energy for regular maintenance and physical work."
    ],
    designTip:
      "Focus on resilient, low-maintenance systems that compound over time. Your capacity and skills are ideal for a phased, skillfully built homestead."
  }
};

// IndigenousRegionalContextPage (`/observe/human-context/indigenous-regional-context`).
export const indigenousRegionalContext = {
  hero: {
    kicker: "Module 1 · Human Context",
    title: "Indigenous & Regional Context",
    copy:
      "Honour the land's longer story. Capture indigenous place-names, cultural challenges and strengths in this region, and the local network you can lean on for stewardship.",
    chips: [
      { label: "Consult before earthworks", iconKey: "alert", tone: "gold" },
      { label: "Stage 1 archaeology recommended", iconKey: "check", tone: "orange" },
      { label: "Cultural strengths identified", iconKey: "network" }
    ]
  },
  placeNames: [
    "Mississaugas of the Credit First Nation - Treaty 19 (1818) lands",
    "Haudenosaunee Confederacy - historical territory under the Dish With One Spoon wampum",
    "Anishinaabe / Wendat - pre-contact seasonal use of the Sixteen Mile Creek corridor"
  ],
  challenges: {
    subtitle: "Key considerations and risks to address with care.",
    bullets: [
      "Land-acknowledgement protocols still maturing in rural Halton; consult Mississaugas of the Credit Department of Consultation & Accommodation before any earthworks",
      "Seasonal creek setback corridor overlaps with potentially significant pre-contact archaeological sites - Stage 1 archaeological assessment recommended before excavation"
    ],
    action: "View guidance & resources"
  },
  strengths: {
    subtitle: "Assets and relationships to build upon.",
    bullets: [
      "Active Halton Hills agricultural community - long-running farmer cooperatives and seed exchanges",
      "Conservation Halton stewardship programs with riparian planting and well-decommissioning grants",
      "Active Muslim community in Mississauga / Brampton supports retreat hosting and weekend gatherings"
    ],
    action: "Explore stewardship opportunities"
  },
  localNetwork: [
    { org: "Conservation Halton - Stewardship Services", type: "regulator", contact: "stewardship@hrca.on.ca" },
    { org: "Mississaugas of the Credit - Department of Consultation & Accommodation", type: "first_nation", contact: "consultation@mncfn.ca" },
    { org: "Halton Region Federation of Agriculture", type: "community", contact: "info@haltonfa.com" }
  ],
  sidebar: {
    stats: [
      { iconKey: "alert", value: "2", label: "Key Warnings" },
      { iconKey: "sprout", value: "3", label: "Cultural Strengths" },
      { iconKey: "users", value: "3", label: "Local Contacts" }
    ],
    nextSteps: [
      "Consult Mississaugas of the Credit Department of Consultation & Accommodation before any earthworks.",
      "Complete a Stage 1 archaeological assessment for areas near the creek corridor.",
      "Reach out to local partners to co-develop stewardship goals and opportunities."
    ]
  }
};

// VisionPage (`/observe/human-context/vision`).
export const visionPage = {
  intro: {
    kicker: "Module 1 · Human Context",
    title: "Vision",
    copy:
      "Translate intention into a long-horizon direction. Clarify what this land is for, how it should feel, what functions it must support, and what success looks like over time."
  },
  oneSentence:
    "A small Carolinian homestead that produces food, hosts learning, and integrates daily prayer with regenerative care of land - modest scale, long horizon.",
  coreFunctions: [
    ["sprout", "Food production", "Feed the household and share surplus through regenerative systems."],
    ["users", "Learning & hosting", "Welcome learners, friends, and neighbours to study, work, and grow together."],
    ["leaf", "Prayer & retreat", "Create space for daily prayer, reflection, and spiritual renewal."],
    ["droplet", "Regeneration", "Restore soil, water, biodiversity, and resilience through living systems."],
    ["heart", "Long-horizon stewardship", "Build for the next 50-100+ years with wisdom, patience, and care."]
  ],
  experienceGoals: ["Calm", "Productive", "Reverent", "Communal", "Grounded"],
  experienceTagline: "A place that restores people and land.",
  phases: [
    ["Near term (1-2 yrs)", "Build soil, water systems, and core infrastructure. Establish food staples."],
    ["Mid term (3-7 yrs)", "Expand food forests, host learning programs, and deepen habitat."],
    ["Long term (8+ yrs)", "A resilient, self-sustaining homestead that inspires and regenerates."]
  ],
  successItems: [
    "80%+ of food needs grown on-site.",
    "Regular learners and guests hosted year-round.",
    "Daily rhythms of prayer and work are sustained.",
    "Measurable gains in soil organic matter, water retention, and biodiversity.",
    "A place that can be stewarded well into the next generation."
  ],
  designPrinciples: [
    ["Observe & interact", "Work with nature and local conditions."],
    ["Catch & store energy", "Capture sunlight, water, and nutrients."],
    ["Obtain a yield", "Produce food, learning, and community."],
    ["Apply self-regulation", "Use feedback and adaptive management."],
    ["Use & value diversity", "Plant, people, and systems diversity."],
    ["Produce no waste", "Cycle resources and close the loop."]
  ],
  guidingValues: [
    ["Faith", "Daily prayer and reliance on God."],
    ["Stewardship", "Care for creation with gratitude."],
    ["Hospitality", "Welcome others with generosity."],
    ["Simplicity", "Live simply, focus on what matters."],
    ["Perseverance", "Stay faithful for the long horizon."]
  ],
  keyConstraints: [
    ["Modest budget", "Phased investments and low-cost solutions."],
    ["Labour capacity", "Mostly part-time, family-supported."],
    ["Climate variability", "Droughts, heavy rain, and cold winters."],
    ["Regulatory requirements", "Permits, setbacks, and stewardship rules."],
    ["Scale", "Small homestead; limited mechanization."]
  ],
  proverb: "We don't inherit the land from our ancestors; we borrow it from our children."
};

// MacroclimateDashboardPage (`/observe/macroclimate-hazards`).
export const macroclimateDashboard = {
  hero: {
    moduleNumber: "Module 2",
    title: "Macroclimate & Hazards",
    copy:
      "Understand the big-picture climate patterns and natural hazards that shape your site. Use this foundation to design resilient systems that work with your environment, not against it.",
    badge: "Data complete"
  },
  kpis: [
    ["snowflake", "Hardiness zone", "5b", "USDA", "blue"],
    ["droplet", "Annual precip", "870 mm", "Average", "blue"],
    ["alert", "Logged hazards", "3", "Active", "gold"],
    ["calendar", "Frost-free days", "155", "Average", "green"],
    ["sun", "Avg. solar exposure", "5.4 kWh/m2/day", "Annual average", "gold"],
    ["wind", "Prevailing wind", "NW", "12 km/h avg.", "green"],
    ["droplet", "Seasonal water stress", "Low-Moderate", "Jun-Aug", "green"]
  ],
  opportunities: [
    ["Passive solar gain", "High in winter"],
    ["Shade for cooling", "Important Jun-Aug"],
    ["Rainwater harvesting", "High yield potential"],
    ["Wind protection", "NW winds in winter"],
    ["Season extension", "Long shoulder seasons"]
  ],
  hazards: [
    ["Late spring frost", "High", "Up", "In progress", "60%"],
    ["Intense storm / wind", "High", "Right", "Planned", "25%"],
    ["Summer drought", "Moderate", "Up", "Monitoring", "40%"]
  ],
  insights: {
    keyTakeaways: [
      "Cool temperate climate with strong seasonality and good precipitation.",
      "High winter solar access - design for passive solar gain.",
      "NW winds and late frosts are primary design constraints.",
      "Low-moderate summer water stress - prioritize water storage and soil moisture."
    ],
    nextActions: [
      "Review Solar & Climate detail for passive design opportunities.",
      "Open Hazards log to refine mitigation strategies and track progress.",
      "Integrate climate insights into Zone & Sector planning."
    ],
    riskPriorities: ["Late spring frost", "Intense storm / wind", "Summer drought"]
  }
};

// SolarClimateDetailPage (`/observe/macroclimate-hazards/solar-climate`).
export const solarClimateDetail = {
  hero: {
    title: "Solar & Climate detail",
    copy:
      "Understand sunlight, seasonal rhythms, rainfall, and wind patterns to design with climate, not against it. These insights help you place elements, time actions, and build resilience."
  },
  kpis: [
    ["sun", "Hardiness zone", "5b", "Cool temperate", "gold"],
    ["droplet", "Annual precip.", "870 mm", "Moderate", "blue"],
    ["leaf", "Frost-free days", "168", "Apr 30 - Oct 14", "green"],
    ["sun", "Avg daily solar", "4.2 kWh/m2/day", "Good exposure", "gold"],
    ["wind", "Prevailing wind", "W / SW", "10-18 km/h", "green"],
    ["sun", "Last spring frost", "May 3", "10% risk", "dim"],
    ["snowflake", "First fall frost", "Oct 18", "10% risk", "blue"]
  ],
  daylight: [
    ["Jun", "15.2"],
    ["Mar", "12.1"],
    ["Sep", "12.0"],
    ["Dec", "8.6"]
  ],
  daylightAnnualAvg: "11.9 hrs",
  exposure: [
    ["Cold winds", "Place wind protection from W-NW in winter months.", "High"],
    ["Sheltered zones", "SE slopes and tree lines offer best protection.", "Good"],
    ["Storm exposure", "Occasional strong SW storms in late fall and winter.", "Moderate"]
  ],
  opportunities: [
    ["Greenhouse siting", "Place on south-facing slope for maximum winter sun and protection from cold winds."],
    ["Orchard placement", "South to southwest aspects provide best flowering conditions and fruit quality."],
    ["Water capture timing", "Design systems to capture Nov-Mar rainfall; prioritize storage for dry summer months."],
    ["Windbreak opportunities", "Plant dense evergreens on W/NW edges to reduce wind speed and evapotranspiration."],
    ["Passive solar buildings", "Orient long axis E-W with south-facing glazing and thermal mass for heating."]
  ],
  seasonal: [
    ["leaf", "Growing season", "168 days", "Apr 30 - Oct 14"],
    ["snowflake", "Freeze window", "Oct 18 - May 3", "~ 29 weeks"],
    ["sun", "Heat stress days", "12 days", "> 30 degrees C"],
    ["droplet", "Dry season (deficit)", "Jun - Aug", "-96 mm avg"],
    ["droplet", "Irrigation pressure", "Moderate", "Plan storage"],
    ["snowflake", "Snowfall (avg)", "54 cm", "Dec - Mar"],
    ["sun", "Extreme events", "Moderate", "Wind / freeze risk"]
  ],
  topPriorities: [
    ["Maximize passive solar gain", "Long winter nights and good solar exposure support passive heating and greenhouse siting."],
    ["Capture winter & spring water", "Most rain falls Nov-Mar. Design swales, ponds, and tanks to store off-peak rainfall."],
    ["Shelter from cold & dry winds", "Prevailing W-SW winds carry winter cold. Use windbreaks and landform to create calm growing zones."],
    ["Plan around frost windows", "168 frost-free days. Protect tender plants early spring and late fall."]
  ],
  recommendedActions: [
    ["Site greenhouse on south slope with morning sun", "High"],
    ["Map windbreak locations for W-SW winter winds", "High"],
    ["Design rainwater capture for Nov-Mar rainfall", "Medium"],
    ["Plan orchard on south/southwest facing terraces", "Medium"],
    ["Use thermal mass & insulation for passive solar buildings", "Low"]
  ]
};

// TopographyDashboardPage (`/observe/topography`).
export const topographyDashboard = {
  header: {
    title: "Topography & Base Map",
    copy:
      "Understand the shape of the land. Explore elevation, slope, aspect and cross-sections to design with the terrain, not against it."
  },
  metrics: [
    ["triangle", "Mean slope", "4.2 degrees", "Gentle", "Predominantly gentle slopes."],
    ["mountain", "Elevation range", "240-268 m", "28 m total range", "Lowest to highest point on site."],
    ["ruler", "A-B transects", "1", "Mapped", "Cross-sections mapped across site."],
    ["sliders", "Aspect tendency", "SE", "135 degrees", "Slopes face mainly SE."],
    ["layers", "Dominant landforms", "Mid-slopes & lower rises", "", "Rolling terrain with gentle benches."]
  ],
  synthesis: {
    kicker: "Topography synthesis",
    headline:
      "A gentle, south-easterly facing landscape with useful water harvesting opportunities.",
    body:
      "The site is characterised by gentle mid-slopes and lower rises with a 28 m elevation range. Southeast aspect and natural swales create excellent conditions for capturing and infiltrating water while offering multiple options for access, building, and productive zones.",
    items: [
      ["droplet", "Water", "Natural swales and gentle fall lines support harvesting, infiltration and ponding."],
      ["leaf", "Soil & stability", "Mostly stable slopes with low erosion risk. Protect exposed ridge lines and swales."],
      ["home", "Access & zones", "Multiple access points with buildable benches and productive lower slope zones."]
    ]
  },
  terrainTool: {
    rows: [
      ["Contour interval", "2 m"],
      ["Slope range", "0-25 %"],
      ["Elevation range", "240-268 m"],
      ["Parcel boundary", "On"]
    ]
  },
  crossSectionTool: {
    rows: [
      ["Active transect", "A to B"],
      ["Length", "612 m"],
      ["Elevation drop", "27.8 m"],
      ["Mean slope", "4.2 degrees"],
      ["Solar exposure", "62 %"]
    ]
  },
  implications: [
    ["droplet", "Prime water harvesting potential", "Swales and lower slopes are ideal for capturing and slowing water."],
    ["shield", "Low erosion risk overall", "Most slopes are gentle; protect exposed ridges and swale entry points."],
    ["sun", "Good solar access", "Southeast aspect provides strong morning sun and winter warmth."],
    ["home", "Multiple buildable options", "Benches and lower rises offer flexible locations for buildings and zones."]
  ],
  detectedFeatures: [
    ["Ridges", "1"],
    ["Swales / Drainage lines", "3"],
    ["Gentle benches", "4"],
    ["Steeper slopes (> 15%)", "2"],
    ["Potential water collection zones", "2"]
  ],
  nextActions: [
    ["Map keyline candidates", "High"],
    ["Design water harvesting system", "High"],
    ["Identify building sites", "Medium"],
    ["Plan access & internal routes", "Medium"],
    ["Estimate earthworks (cut/fill)", "Low"]
  ],
  modulePct: 88
};

// TerrainDetailPage (`/observe/topography/terrain-detail`).
export const terrainDetail = {
  header: {
    title: "Terrain detail",
    copy:
      "Read the shape of the land. Understand elevation, slope, aspect and water movement so you can design with the land, not against it."
  },
  metrics: [
    ["triangle", "Mean slope", "4.2 degrees", "Gentle", "Predominantly gentle slopes."],
    ["mountain", "Elevation range", "240-268 m", "28 m total range", "Lowest to highest point on site."],
    ["sliders", "Aspect tendency", "SE", "135 degrees", "Slopes face mainly SE."],
    ["waves", "Dominant landforms", "Mid-slopes & lower rises", "", "Rolling terrain with gentle benches."],
    ["mapPin", "A-B transects", "1", "Mapped", "Cross-sections mapped across site."]
  ],
  layers: [
    ["Slope", "On", true],
    ["Contours (2 m)", "On", true],
    ["Hillshade", "On", true],
    ["Aspect", "Off", false],
    ["Elevation", "On", true],
    ["Parcel boundary", "On", true]
  ],
  legendSlopes: ["> 25", "15-25", "8-15", "4-8", "0-4"],
  detected: [
    ["Ridgeline", "1", "High spine running N-S"],
    ["Valley line / Drainage", "2", "Concentration zones"],
    ["Keypoint candidates", "4", "Potential design anchors"],
    ["Erosion-prone zones", "1", "Steeper slopes, exposed soil"],
    ["Access-friendly route", "1", "Contours < 8% slope"]
  ],
  insights: [
    "Ridge line runs north-south through the centre of the site.",
    "Mid-slopes on the east face offer good water harvesting opportunities.",
    "Drainage concentrates in the eastern gully system.",
    "Gentle bench areas in the southwest are suitable for dwellings or productive zones."
  ],
  nextActions: [
    ["Create swale test line on mid-slope", "High", "Capture and infiltrate seasonal runoff."],
    ["Add additional transect", "Medium", "Map another cross-section across the eastern gully."],
    ["Verify runoff paths in field", "Medium", "Confirm drainage lines and pond opportunities."],
    ["Evaluate access route", "Low", "Walk the suggested route and note constraints."]
  ],
  transectLength: "412 m"
};

// CrossSectionToolPage (`/observe/topography/cross-section-tool`).
export const crossSectionTool = {
  header: {
    title: "Cross-section tool",
    copy:
      "Analyze terrain profiles along transects to understand land form, place design elements, evaluate solar geometry, and test section-based interventions with confidence."
  },
  kpis: [
    ["ruler", "Transect length", "612 m", "A to B"],
    ["mountain", "Elevation change", "27.8 m", "High to low"],
    ["triangle", "Average slope", "4.2°", "Overall grade"],
    ["sun", "Solar exposure (ann.)", "62%", "Good exposure"],
    ["trees", "Vertical elements", "32", "Trees & structures"]
  ],
  segments: [
    ["1", "0-132 m", "Slope 5.6°", "Drop 7.4 m"],
    ["2", "132-286 m", "Slope 3.1°", "Drop 4.8 m"],
    ["3", "286-452 m", "Slope 2.2°", "Drop 3.6 m"],
    ["4", "452-612 m", "Slope 3.8°", "Drop 12.0 m"]
  ],
  observations: [
    ["Ideal swale zone", "A swale at 140-180 m will capture runoff from 5.2 ha.", "green"],
    ["Best tree belt zone", "Plant a windbreak between 80-120 m on the ridge.", "green"],
    ["Frost pocket risk", "Low basin near 540-590 m may collect cold air.", "blue"],
    ["Access path option", "Gentle grade between 250-320 m is ideal for access.", "green"]
  ],
  library: [
    ["1", "A-B Main Transect", "612 m · 27.8 m drop · Today", "Active"],
    ["2", "C-D Upper Ridge", "498 m · 18.1 m drop · 2 days ago", ""],
    ["3", "E-F Lower Valley", "723 m · 35.6 m drop · 5 days ago", ""]
  ],
  seasons: ["Jun 21", "Sep 21", "Dec 21", "Mar 21"],
  overlays: [
    ["sun", "Sun path", "Show solar geometry"],
    ["triangle", "Slope segments", "Color by slope grade"],
    ["droplet", "Water flow", "Flow direction & pathways"],
    ["layers", "Soil horizons", "Soil depth & layers"],
    ["trees", "Vegetation", "Existing & proposed"],
    ["eye", "Structures & elements", "Design features"],
    ["beaker", "Cut / fill estimate", "Volume & balance"]
  ],
  earthworks: [
    ["Cut", "82.4 m³"],
    ["Fill", "61.7 m³"],
    ["Net", "20.7 m³ cut"]
  ]
};

// EarthWaterEcologyPage (`/observe/earth-water-ecology`).
export const earthWaterEcologyPage = {
  header: {
    title: "Earth, Water & Ecology Diagnostics",
    copy:
      "Understand the living systems of your site. Diagnose soils, hydrology and ecology to reveal opportunities, risks and patterns that inform wise design.",
    statusPill: "In progress",
    progressLine: "18 of 28 tasks complete",
    progressPct: 63
  },
  kpis: [
    ["sprout", "Latest soil pH", "6.8", "Slightly acidic", "green"],
    ["settings", "Soil health score", "65 /100", "Moderate", "gold"],
    ["leaf", "Biodiversity score", "62 /100", "Moderate", "gold"],
    ["droplet", "Water security", "Low", "Improve capture", "blue"],
    ["binoculars", "Field observations", "24", "This season", "gold"],
    ["flask", "Tests & samples", "11", "Across site", "gold"]
  ],
  tabs: ["Overview", "Soil", "Water", "Ecology", "Lab Results", "Trends"],
  soilRows: [
    ["pH (H2O)", "6.8", "Slightly acidic", "Good", 72],
    ["Infiltration rate", "15 mm/hr", "Moderate infiltration", "Moderate", 55],
    ["Compaction", "320 kPa", "Moderate compaction", "Moderate", 68],
    ["Organic matter", "3.2%", "Moderate", "Moderate", 58],
    ["Soil texture", "Loam", "Balanced", "Good", 64]
  ],
  soilInterpretation:
    "Good pH and OM for soil life. Moderate infiltration and compaction - consider biological aeration and organic amendments.",
  hydrologyFacts: [
    ["Runoff direction", "SE (125°)", "Primary flow path"],
    ["Water points", "3", "Perennial & seasonal"],
    ["Drainage pattern", "Dendritic", "Good landscape flow"],
    ["Capture opportunities", "4", "Swales, ponds, keylines"]
  ],
  hydrologyInsight:
    "Possible erosion risk on lower slope. Prioritize slow, spread, sink strategies and protect riparian corridor.",
  ecologyTabs: ["All", "Flora", "Fauna", "Fungi"],
  biodiversityInsight:
    "Moderate diversity for this landscape. Riparian corridor supports valuable habitat - worth protecting and enhancing.",
  recentObservations: [
    ["Today, 9:42 AM", "Soil test: pH 6.8, infiltration 15 mm/hr", "Soil"],
    ["Yesterday, 4:15 PM", "Noted surface runoff after 18mm rain.", "Water"],
    ["2 days ago, 11:08 AM", "Observed Kangaroo Grass in upper paddock.", "Ecology"],
    ["3 days ago, 2:34 PM", "Soil sample collected - Lab test submitted.", "Lab"],
    ["5 days ago, 8:10 AM", "Erosion rill forming on lower slope.", "Note"]
  ],
  recommendedActions: [
    ["Install contour swale on mid-slope", "Capture runoff and reduce erosion risk.", "High", "Due in 7 days"],
    ["Apply compost + mulch to garden beds", "Build organic matter and soil biology.", "Medium", "Due in 14 days"],
    ["Protect riparian corridor", "Fence and revegetate with natives.", "High", "Due in 21 days"],
    ["Conduct biological aeration", "Reduce compaction, improve infiltration.", "Medium", "Due in 30 days"]
  ]
};

// CartographicDetailPage (`/observe/sectors-zones/cartographic-detail`).
export const cartographicDetailPage = {
  hero: {
    title: "Cartographic detail",
    copy: "Explore the full spatial survey of your site. Toggle layers, interrogate patterns, and understand how sectors, microclimates and zones work together.",
  },
  kpis: [
    { label: "Sectors mapped",       value: "5",  note: "Of 8 directions",    tone: "green", iconKey: "compass" },
    { label: "Zones defined",        value: "5",  note: "Across site",         tone: "gold",  iconKey: "map"     },
    { label: "Zone allocations",     value: "12", note: "Design elements",     tone: "green", iconKey: "sprout"  },
    { label: "Identified features",  value: "9",  note: "Points of interest",  tone: "gold",  iconKey: "mapPin"  },
    { label: "Observation progress", value: "4/4",note: "All zones visited",   tone: "cream", iconKey: "check"   },
  ],
  mapLayers: [
    { key: "sectors",      label: "Sectors",       color: "#b7832d", active: true,  sub: []                                      },
    { key: "microclimates",label: "Microclimates", color: "#6ab4d4", active: true,  sub: ["Frost pockets","Wind shadows","Solar traps"] },
    { key: "zones",        label: "Zones",         color: "#a5c736", active: true,
      sub: ["Zone 1 — Home","Zone 2 — Productive","Zone 3 — Orchard","Zone 4 — Semi-wild","Zone 5 — Wilderness"] },
    { key: "circulation",  label: "Circulation",   color: "#e8c87a", active: true,  sub: ["Paths, tracks & access points"]       },
    { key: "contours",     label: "Contours",      color: "#6a8a6a", active: false, sub: []                                      },
    { key: "water",        label: "Water features",color: "#4a9ad4", active: true,
      sub: ["Ponds & streams","Drainage & storage","Seasonal overflow"]                                                          },
  ],
  zones: [
    { id: "1", label: "Zone 1",    detail: "Home & intensive",   color: "#c9902a", fillOp: 0.28 },
    { id: "2", label: "Zone 2",    detail: "Productive",          color: "#7aaa30", fillOp: 0.22 },
    { id: "3", label: "Zone 3",    detail: "Orchard",             color: "#6ab4d4", fillOp: 0.18 },
    { id: "4", label: "Zone 4",    detail: "Semi-wild",           color: "#8a7a3a", fillOp: 0.18 },
    { id: "5", label: "Zone 5",    detail: "Wilderness margin",   color: "#3a5a2a", fillOp: 0.22 },
  ],
  detectedPatterns: [
    { title: "Solar gradient",         body: "Strong SE-to-NW gradient. Buildings on SE bench receive full winter insolation, NW remains shaded." },
    { title: "Shelter zones",          body: "Tanh of N creates natural windbreak acting against dominant W-SW wind flow across zone 2 and 3." },
    { title: "Water flow convergence", body: "Multiple surface flows converge toward the pond. Ideal placement for primary water harvesting system." },
    { title: "Access efficiency",      body: "S-entry corridor allows direct access to zones 1–3 without crossing productive planting areas." },
    { title: "Ridge lines",            body: "Two parallel ridges create rain shadow on leeward side. Plan water-retentive species in these corridors." },
  ],
  nextActions: [
    "Finalise Zone 1 footprint and building setback from zone boundary",
    "Design water systems along SW-NE contour alignment",
    "Set northern boundary plantings on zone 3-4 edge",
    "Add biodiversity corridors at zone 2-3 interface",
    "Validate species placement for zone 5 wilderness pathways",
  ],
  mapInfo: {
    area: "2.4 ha (5.9 acres)",
    projection: "UTM Zone 17N",
    mapDate: "15 Apr 2026",
    dataSource: "LIDAR + Field Survey",
  },
};

// SectorCompassPage (`/observe/sectors-zones/sector-compass`).
export const sectorCompassPage = {
  hero: {
    title: "Sector compass",
    copy: "Explore the full spatial survey of your site. Toggle layers, interrogate patterns, and understand how sectors, microclimates and zones work together.",
  },
  kpis: [
    { label: "Best sun sector",    value: "E–SE",  note: "Primary insolation",   tone: "gold",  iconKey: "sun"     },
    { label: "Dominant wind",      value: "SW",    note: "Prevailing",           tone: "blue",  iconKey: "wind"    },
    { label: "High-risk sector",   value: "NW",    note: "Frost / cold pocket",  tone: "dim",   iconKey: "alert"   },
    { label: "Beneficial eco zone",value: "SE",    note: "Riparian corridor",    tone: "green", iconKey: "leaf"    },
    { label: "Sectors active",     value: "5",     note: "Of 8 mapped",          tone: "cream", iconKey: "compass" },
  ],
  sectors: [
    { dir: "N",  label: "Cold exposure",   subLabel: "Minimal activity",   tone: "dim",   forces: ["cold"],         arrowLen: 0.35 },
    { dir: "NE", label: "Morning sun",     subLabel: "Seasonal warmth",    tone: "gold",  forces: ["solar"],        arrowLen: 0.55 },
    { dir: "E",  label: "Shelter belt",    subLabel: "Tree windbreak",     tone: "green", forces: ["shelter"],      arrowLen: 0.50 },
    { dir: "SE", label: "Prime solar",     subLabel: "Summer / winter sun",tone: "gold",  forces: ["solar","warm"], arrowLen: 0.80 },
    { dir: "S",  label: "Main access",     subLabel: "Entry & circulation",tone: "green", forces: ["access"],       arrowLen: 0.60 },
    { dir: "SW", label: "Prevailing wind", subLabel: "W-SW cold wind flow",tone: "blue",  forces: ["wind","cold"],  arrowLen: 0.70 },
    { dir: "W",  label: "Winter wind",     subLabel: "Cold & dry sector",  tone: "blue",  forces: ["wind"],         arrowLen: 0.60 },
    { dir: "NW", label: "Frost pocket",    subLabel: "Avoid frost-sens.",  tone: "dim",   forces: ["frost","cold"], arrowLen: 0.40 },
  ],
  observations: [
    { icon: "sun",     label: "Peak solar window",       value: "9.2 hrs/day",   tone: "gold",  score: 88 },
    { icon: "wind",    label: "SW wind frequency",        value: "68% of days",   tone: "blue",  score: 68 },
    { icon: "droplet", label: "Prevailing rain bearing",  value: "W-SW",          tone: "blue",  score: null },
    { icon: "leaf",    label: "Frost-free SE microclimate",value: "152 days/yr",  tone: "green", score: 76 },
    { icon: "alert",   label: "NW frost risk",            value: "High",          tone: "dim",   score: 34 },
    { icon: "sprout",  label: "Biodiversity corridor",    value: "E boundary",    tone: "green", score: 72 },
  ],
  placements: [
    { icon: "home",    title: "Main dwelling",      zone: "Zone 1 — SE bench",   note: "Max solar + sheltered from SW wind" },
    { icon: "sprout",  title: "Orchard rows",       zone: "Zone 2 — N slope",    note: "E-SE orientation captures full sun arc" },
    { icon: "leaf",    title: "Annual garden",      zone: "Zone 1 — S front",    note: "South-facing, sheltered, close access" },
    { icon: "wind",    title: "Windbreak planting", zone: "Zone 3 — W boundary", note: "Mixed native hedge deflects SW cold wind" },
    { icon: "droplet", title: "Water harvesting",   zone: "Zone 2 — SW swale",   note: "Intercepts W-SW runoff from slope" },
    { icon: "sun",     title: "Solar infrastructure",zone: "Zone 1 — E-SE roof", note: "Unobstructed E-SE exposure, 9+ hrs sun" },
  ],
  designAlignment: [
    { label: "Dwelling oriented to E-SE solar corridor",  status: "done"    },
    { label: "Windbreak buffer on W boundary planned",    status: "done"    },
    { label: "Water features intercept SW runoff",        status: "in-progress" },
    { label: "NW frost pocket excluded from planting",    status: "done"    },
    { label: "Access corridor from S entry confirmed",    status: "pending" },
  ],
  priorityActions: [
    "Finalise windbreak species selection for W-SW boundary",
    "Place Zone 1 dwelling footprint on SE bench using solar overlay",
    "Install contour swale across SW sector for water harvesting",
    "Validate NW frost pocket boundary with winter observation data",
  ],
};

// SectorsMicroclimatesDashboardPage (`/observe/sectors-zones`).
export const sectorsMicroclimatesDashboard = {
  hero: {
    moduleNumber: "MODULE 5 · SECTORS, MICROCLIMATES & ZONES",
    title: "Sectors, Microclimates & Zones",
    copy: "Map the zones and sectors that inform where and why design elements belong on the land.",
  },
  kpis: {
    sectorAnalysisPlans: 4,
    microclimates: 6,
    zonesOutlined: 5,
    observationDepth: 72,
  },
  synthesis: "We identified the forces and influences acting on your site. Microclimates that these forces shape are mapped across the landscape. Sun, wind, water and terrain work together to create distinct growing conditions in each zone — understanding these is the foundation of good placement.",
  sectorCompassSectors: [
    { dir: "N",  label: "Cold exposure",    tone: "dim",  deg: 0   },
    { dir: "NE", label: "Morning sun",      tone: "gold", deg: 45  },
    { dir: "E",  label: "Shelter",          tone: "green",deg: 90  },
    { dir: "SE", label: "Prime solar",      tone: "gold", deg: 135 },
    { dir: "S",  label: "Main access",      tone: "green",deg: 180 },
    { dir: "SW", label: "Prevailing wind",  tone: "blue", deg: 225 },
    { dir: "W",  label: "Cold wind",        tone: "blue", deg: 270 },
    { dir: "NW", label: "Frost pocket",     tone: "dim",  deg: 315 },
  ],
  cartographicZones: [
    { id: "1", label: "Zone 1 — Home",         color: "gold"  },
    { id: "2", label: "Zone 2 — Productive",   color: "green" },
    { id: "3", label: "Zone 3 — Orchard",      color: "sage"  },
    { id: "4", label: "Zone 4 — Semi-wild",    color: "moss"  },
    { id: "5", label: "Zone 5 — Wilderness",   color: "dim"   },
  ],
  designImplications: [
    "N-slope buildings capture morning sun and avoid southern competition",
    "Dense canopy sectors planned for windbreak along western boundary",
    "Water features positioned to intercept W-SW runoff flow paths",
    "SE-facing microclimate ideal for warm-season annual production",
  ],
  detectedOpportunities: [
    "Solar access corridor open on SE slope for winter passive gain",
    "Strong windbreak opportunity along W boundary using sector analysis",
    "Zoning allows productive zone 2 to expand toward northern swale",
    "Identified four distinct microclimate niches for species diversification",
  ],
  nextActions: [
    "Place key structures using zone map and sector overlays",
    "Finalise tree placement using windbreak sector analysis",
    "Develop access and circulation plan between zones 1–3",
    "Plan water system routes across zones using sector flow data",
  ],
};
