import { generatedScreenCatalog } from "./screenCatalog.generated.js";

export const screenCatalog = [
  {
    id: "observe-homepage",
    route: "/observe",
    title: "Observe Homepage",
    reference: "olos-observe-homepage.png",
    viewport: { width: 1293, height: 963 },
    pageType: "stage landing",
    complexity: "medium",
    status: "prototype-built",
    majorRegions: [
      "single-frame stage hero",
      "summary metrics band",
      "six module cards",
      "bottom action/tip cards",
      "dev QA overlay"
    ],
    interactions: ["module navigation", "open dashboard", "view guide", "QA overlay toggle"],
    cropCategories: ["hero landscape", "module illustrations", "small decorative icons"],
    dependencies: ["design tokens", "action cards", "module card grid", "QA overlay"]
  },
  {
    id: "observe-dashboard",
    route: "/observe/dashboard",
    title: "Observe Dashboard",
    reference: "observe-dashboard.png",
    viewport: { width: 1448, height: 1086 },
    pageType: "stage dashboard",
    complexity: "high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "top stage tracker",
      "hero and project overview",
      "stage progress metrics",
      "six dense module summary cards"
    ],
    interactions: ["settings", "continue", "stage guide", "site map", "module CTAs"],
    cropCategories: ["hero landscape", "site satellite map", "topography map", "sector compass map"],
    dependencies: ["app shell", "stage tracker", "metric strip", "dashboard module card"]
  },
  {
    id: "observe-m1-steward-survey",
    route: "/observe/human-context/steward-survey",
    title: "Steward Survey",
    reference: "observe-m1-steward-survey.png",
    viewport: { width: 1448, height: 1086 },
    pageType: "module form",
    complexity: "high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "breadcrumb/action topbar",
      "hero banner",
      "identity form",
      "capacity and resources form",
      "vision textarea",
      "right steward snapshot sidebar"
    ],
    interactions: ["save draft", "save", "form inputs", "select", "skill chips", "add skill", "design implications"],
    cropCategories: ["hero landscape", "capacity orbit diagram", "sidebar archetype icons"],
    dependencies: ["app shell", "breadcrumbs", "form controls", "insight sidebar", "chip inputs"]
  },
  {
    id: "observe-m1-human-context",
    route: "/observe/human-context",
    title: "Human Context",
    reference: "OLOS_OBSERVE_M1_HumanContext.png",
    viewport: { width: 1672, height: 941 },
    pageType: "module dashboard",
    complexity: "high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "breadcrumb/save topbar",
      "large module hero",
      "three detail summary cards",
      "right synthesis sidebar",
      "module health strip"
    ],
    interactions: ["save", "open steward survey", "open regional context", "open vision detail", "view design implications"],
    cropCategories: ["hero landscape", "regional snapshot map"],
    dependencies: ["app shell", "module cards", "progress rings", "synthesis sidebar"]
  },
  {
    id: "observe-m1-indigenous-regional-context",
    route: "/observe/human-context/indigenous-regional-context",
    title: "Indigenous & Regional Context",
    reference: "observe-m1-indigenous-regional-context.png",
    viewport: { width: 1448, height: 1086 },
    pageType: "module content and network",
    complexity: "high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "stage tracker",
      "hero banner",
      "place-name chips",
      "challenge/strength cards",
      "local network table",
      "regional snapshot sidebar"
    ],
    interactions: ["add place-name", "guidance links", "add contact", "row actions", "toolkit CTA"],
    cropCategories: ["hero terrain", "regional map overlay"],
    dependencies: ["app shell", "stage tracker", "content card", "data table", "sidebar map panel"]
  },
  {
    id: "observe-m1-vision",
    route: "/observe/human-context/vision",
    title: "Vision",
    reference: "observe-m1-vision.png",
    viewport: { width: 1448, height: 1086 },
    pageType: "module vision board",
    complexity: "very high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "stage tracker",
      "vision intro card",
      "vision statement",
      "annotated vision concept landscape",
      "function/goals/aspiration/success panels",
      "principles/values/constraints panels",
      "moodboard grid"
    ],
    interactions: ["project settings", "edit vision statement", "explore map", "define success metrics", "open inspiration library"],
    cropCategories: ["annotated landscape", "moodboard thumbnails", "leaf background art"],
    dependencies: ["app shell", "stage tracker", "large media panel", "list panels", "moodboard grid"]
  },
  {
    id: "observe-m4-earth-water-ecology-diagnostics",
    route: "/observe/earth-water-ecology",
    title: "Earth, Water & Ecology Diagnostics",
    reference: "observe-m4-earth-water-ecology-diagnostics.png",
    viewport: { width: 1448, height: 1086 },
    pageType: "diagnostic dashboard",
    complexity: "very high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "module stage header",
      "module progress card",
      "diagnostic KPI strip",
      "tab bar and filters",
      "site map observations",
      "soil diagnostics",
      "hydrology overview",
      "ecology observations",
      "recent observations timeline",
      "recommended actions",
      "footer status bar"
    ],
    interactions: ["module settings", "module guide", "tabs", "export report", "season filter", "map controls", "view details", "add observation", "prioritize"],
    cropCategories: ["satellite observation map", "hydrology contour map", "species thumbnails"],
    dependencies: ["app shell", "module header", "KPI strip", "tabs", "map panel", "timeline", "task list", "status footer"]
  },
  {
    id: "observe-m3-cross-section-tool",
    route: "/observe/topography/cross-section-tool",
    title: "Cross-section Tool",
    reference: "OLOS_OBSERVE_M1_CST.png",
    viewport: { width: 1448, height: 1086 },
    pageType: "terrain tool",
    complexity: "very high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "top stage tracker",
      "module tool header",
      "transect KPI strip",
      "large cross-section chart",
      "right overlay/tools sidebar",
      "observations/library/seasonal panels",
      "bottom action bar"
    ],
    interactions: ["project settings", "overlay toggles", "fit view", "add observation", "new transect", "save transect"],
    cropCategories: ["cross-section chart", "transect map", "seasonal chart"],
    dependencies: ["app shell", "stage tracker", "KPI strip", "tool panels", "action bar"]
  },
  {
    id: "observe-m3-topography-dashboard",
    route: "/observe/topography",
    title: "Topography & Base Map",
    reference: "OLOS_OBSERVE_M3_TBM.png",
    viewport: { width: 1586, height: 992 },
    pageType: "module dashboard",
    complexity: "very high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "top stage tracker",
      "module header with terrain art",
      "topography metric cards",
      "synthesis panel",
      "terrain detail tool card",
      "cross-section tool card",
      "right diagnostic sidebar",
      "footer status bar"
    ],
    interactions: ["project settings", "open terrain detail", "open cross-section tool", "recommended actions"],
    cropCategories: ["hero terrain texture", "terrain detail preview", "cross-section preview"],
    dependencies: ["app shell", "stage tracker", "metric cards", "tool cards", "diagnostic sidebar"]
  },
  {
    id: "observe-m3-terrain-detail",
    route: "/observe/topography/terrain-detail",
    title: "Terrain Detail",
    reference: "OLOS_OBSERVE_M1_TerrainDetail.png",
    viewport: { width: 1448, height: 1086 },
    pageType: "terrain analysis",
    complexity: "very high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "top stage tracker",
      "terrain header and actions",
      "five topography metric cards",
      "large layered terrain map",
      "slope map and elevation distribution sidebar",
      "elevation profile",
      "detected features",
      "recommended actions",
      "footer status bar"
    ],
    interactions: ["project settings", "create transect", "export terrain report", "compare layers", "map controls", "reset view", "view on map"],
    cropCategories: ["large terrain map", "slope map", "elevation histogram", "elevation profile"],
    dependencies: ["app shell", "stage tracker", "metric cards", "map panel", "diagnostic sidebar", "status footer"]
  },
  {
    id: "observe-m2-macroclimate-dashboard",
    route: "/observe/macroclimate-hazards",
    title: "Macroclimate & Hazards",
    reference: "OLOS_OBSERVE_M2_Dashboard.png",
    viewport: { width: 1672, height: 941 },
    pageType: "module dashboard",
    complexity: "very high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "top stage tracker",
      "module hero header",
      "seven climate and hazard KPI cards",
      "solar and climate detail preview",
      "hazards log preview",
      "right design insights sidebar"
    ],
    interactions: ["open solar climate detail", "open hazards log", "full climate analysis", "full hazards log", "next module"],
    cropCategories: ["monthly climate chart", "sun path chart", "hazard risk matrix", "hazard hotspot map"],
    dependencies: ["app shell", "stage tracker", "KPI cards", "preview panels", "insight sidebar"]
  },
  {
    id: "observe-m2-solar-climate-detail",
    route: "/observe/macroclimate-hazards/solar-climate",
    title: "Solar & Climate Detail",
    reference: "OLOS_OBSERVE_M2_SolarClimate.png",
    viewport: { width: 1448, height: 1086 },
    pageType: "climate analysis",
    complexity: "very high",
    status: "reviewed",
    majorRegions: [
      "left app rail",
      "top stage tracker",
      "solar and climate hero",
      "climate KPI strip",
      "monthly climate chart",
      "solar path chart",
      "wind and exposure panels",
      "climate opportunities",
      "right priorities and next actions rail",
      "seasonal summary strip",
      "footer status bar"
    ],
    interactions: ["export climate report", "compare seasons", "open climate sources", "add to design plan"],
    cropCategories: ["hero sunscape", "monthly climate chart", "solar path chart", "wind rose"],
    dependencies: ["app shell", "stage tracker", "KPI cards", "chart panels", "priority sidebar", "status footer"]
  }
];

export const allScreenCatalog = generatedScreenCatalog;

export const implementationOrder = [
  "shared-shell-and-tokens",
  "observe-dashboard",
  "observe-m1-steward-survey",
  "observe-m1-indigenous-regional-context",
  "observe-m1-vision",
  "observe-m4-earth-water-ecology-diagnostics"
];
