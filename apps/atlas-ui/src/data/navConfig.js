// Sidebar nav for AppShell. Groups give progressive disclosure
// instead of a flat 18-item dump.

export const observeNav = [
  { key: "dashboard", icon: "home", label: "Dashboard", to: "/observe/dashboard" },
  { key: "observe", icon: "binoculars", label: "Observe", to: "/observe" },
  {
    key: "human-context",
    icon: "users",
    label: "Human Context",
    children: [
      { key: "hc-overview", label: "Overview", to: "/observe/human-context" },
      { key: "hc-steward", label: "Steward Survey", to: "/observe/human-context/steward-survey" },
      { key: "hc-region", label: "Indigenous & Regional", to: "/observe/human-context/indigenous-regional-context" },
      { key: "hc-vision", label: "Vision", to: "/observe/human-context/vision" },
    ],
  },
  {
    key: "macroclimate",
    icon: "sun",
    label: "Macroclimate & Hazards",
    children: [
      { key: "mc-overview", label: "Overview", to: "/observe/macroclimate-hazards" },
      { key: "mc-solar", label: "Solar & Climate", to: "/observe/macroclimate-hazards/solar-climate" },
    ],
  },
  {
    key: "topography",
    icon: "mountain",
    label: "Topography",
    children: [
      { key: "topo-overview", label: "Overview", to: "/observe/topography" },
      { key: "topo-terrain", label: "Terrain Detail", to: "/observe/topography/terrain-detail" },
      { key: "topo-cross", label: "Cross-section Tool", to: "/observe/topography/cross-section-tool" },
    ],
  },
  { key: "ewe", icon: "droplet", label: "Earth, Water & Ecology", to: "/observe/earth-water-ecology" },
  {
    key: "sectors",
    icon: "compass",
    label: "Sectors & Zones",
    children: [
      { key: "sec-overview", label: "Overview", to: "/observe/sectors-zones" },
      { key: "sec-compass", label: "Sector Compass", to: "/observe/sectors-zones/sector-compass" },
      { key: "sec-carto", label: "Cartographic Detail", to: "/observe/sectors-zones/cartographic-detail" },
    ],
  },
  {
    key: "swot",
    icon: "target",
    label: "SWOT Synthesis",
    children: [
      { key: "swot-overview", label: "Dashboard", to: "/observe/swot" },
      { key: "swot-journal", label: "Journal", to: "/observe/swot/journal" },
      { key: "swot-report", label: "Diagnosis Report", to: "/observe/swot/diagnosis-report" },
    ],
  },
];
