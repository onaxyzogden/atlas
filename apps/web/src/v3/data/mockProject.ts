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
};
