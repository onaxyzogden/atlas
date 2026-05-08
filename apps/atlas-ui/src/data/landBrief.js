// Land Brief composition layer.
//
// Normalises the six Observe module VMs into a uniform shape so the
// LandBriefPage doesn't have to know which module uses `hero` vs `header`,
// or how progress is named.

import {
  humanContextDashboard,
  macroclimateDashboard,
  topographyDashboard,
  earthWaterEcologyPage,
  sectorsMicroclimatesDashboard,
  swotDashboard,
} from "./builtin-sample.js";

import humanContextHero from "../assets/generated/human-context-dashboard/hero-landscape.png";
import macroclimateHero from "../assets/generated/macroclimate-dashboard/monthly-climate.png";
import topographyHero from "../assets/generated/topography-dashboard/hero-terrain.png";
import eweHero from "../assets/generated/earth-water-ecology/site-observations-map.png";

const progressFromHeader = (vm) => vm.hero?.progressPct ?? vm.header?.progressPct ?? vm.modulePct ?? 0;

export const LAND_BRIEF_MODULES = [
  {
    key: "human-context",
    label: "Human Context",
    iconKey: "users",
    route: "/observe/human-context",
    vm: humanContextDashboard,
    heroImage: humanContextHero,
    progressPct: progressFromHeader(humanContextDashboard),
    synthesis: humanContextDashboard.synthesis,
  },
  {
    key: "macroclimate",
    label: "Macroclimate & Hazards",
    iconKey: "sun",
    route: "/observe/macroclimate-hazards",
    vm: macroclimateDashboard,
    heroImage: macroclimateHero,
    progressPct: progressFromHeader(macroclimateDashboard),
    synthesis: macroclimateDashboard.synthesis,
  },
  {
    key: "topography",
    label: "Topography",
    iconKey: "mountain",
    route: "/observe/topography",
    vm: topographyDashboard,
    heroImage: topographyHero,
    progressPct: progressFromHeader(topographyDashboard),
    synthesis: topographyDashboard.synthesis,
  },
  {
    key: "ewe",
    label: "Earth, Water & Ecology",
    iconKey: "droplet",
    route: "/observe/earth-water-ecology",
    vm: earthWaterEcologyPage,
    heroImage: eweHero,
    progressPct: progressFromHeader(earthWaterEcologyPage),
    synthesis: earthWaterEcologyPage.synthesis,
  },
  {
    key: "sectors",
    label: "Sectors & Zones",
    iconKey: "compass",
    route: "/observe/sectors-zones",
    vm: sectorsMicroclimatesDashboard,
    heroImage: null,
    progressPct: progressFromHeader(sectorsMicroclimatesDashboard),
    synthesis: sectorsMicroclimatesDashboard.synthesis,
  },
  {
    key: "swot",
    label: "SWOT Synthesis",
    iconKey: "target",
    route: "/observe/swot",
    vm: swotDashboard,
    heroImage: null,
    progressPct: progressFromHeader(swotDashboard),
    synthesis: swotDashboard.synthesis,
  },
];

export function aggregateAlignment(modules = LAND_BRIEF_MODULES) {
  const pcts = modules.map((m) => m.synthesis?.alignmentPct ?? 0);
  const avgPct = Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);

  let confidenceTier = "Low";
  let verdictLabel = "Limited Opportunity";
  let verdictCopy =
    "Diagnostic coverage is still thin. Capture more field observations before locking design decisions.";

  if (avgPct >= 80) {
    confidenceTier = "High";
    verdictLabel = "Strong Opportunity";
    verdictCopy =
      "Diagnostics are well-grounded across the six observation modules. The site is ready to move into design.";
  } else if (avgPct >= 65) {
    confidenceTier = "Moderate";
    verdictLabel = "Conditional Opportunity";
    verdictCopy =
      "This land shows strong potential, but a handful of patterns must be verified before design decisions are made.";
  }

  return { avgPct, confidenceTier, verdictLabel, verdictCopy };
}

export function topPriorities(modules = LAND_BRIEF_MODULES, n = 3) {
  const sorted = [...modules].sort(
    (a, b) => (a.synthesis?.alignmentPct ?? 0) - (b.synthesis?.alignmentPct ?? 0),
  );
  return sorted
    .slice(0, n)
    .map((m) => ({
      moduleKey: m.key,
      moduleLabel: m.label,
      iconKey: m.iconKey,
      text: m.synthesis?.nextSteps?.[0] ?? `Advance ${m.label.toLowerCase()} diagnostics.`,
    }));
}

export function aggregatedObservations(modules = LAND_BRIEF_MODULES) {
  const out = [];
  for (const m of modules) {
    const insights = m.synthesis?.keyInsights ?? [];
    for (const text of insights) {
      out.push({ moduleKey: m.key, moduleLabel: m.label, iconKey: m.iconKey, text });
    }
  }
  return out;
}
