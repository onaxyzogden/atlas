// Sidebar nav for AppShell. The six Roots & Diagnosis modules are
// nested under a collapsible "Observe" group; sub-pages still open as
// in-place slide-up panes from each module dashboard.

export const observeNav = [
  { key: "dashboard", icon: "home", label: "Dashboard", to: "/observe/dashboard" },
  {
    key: "observe",
    icon: "binoculars",
    label: "Observe",
    children: [
      { key: "observe-overview", icon: "binoculars", label: "Overview",              to: "/observe" },
      { key: "land-brief",       icon: "fileText",   label: "Land Brief",             to: "/observe/land-brief" },
      { key: "human-context",    icon: "users",      label: "Human Context",          to: "/observe/human-context" },
      { key: "macroclimate",     icon: "sun",        label: "Macroclimate & Hazards", to: "/observe/macroclimate-hazards" },
      { key: "topography",       icon: "mountain",   label: "Topography",             to: "/observe/topography" },
      { key: "ewe",              icon: "droplet",    label: "Earth, Water & Ecology", to: "/observe/earth-water-ecology" },
      { key: "sectors",          icon: "compass",    label: "Sectors & Zones",        to: "/observe/sectors-zones" },
      { key: "swot",             icon: "target",     label: "SWOT Synthesis",         to: "/observe/swot" },
    ],
  },
];
