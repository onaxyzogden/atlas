/**
 * Atlas 3.0 view-model types.
 *
 * Brief-aligned shapes consumed by /v3 pages. v3 reads these via useV3Project;
 * the adapter is the only place v2 stores or API responses get mapped in.
 * Pages never import from v2 stores directly.
 */

import type { BannerId } from "../features/land-os/lifecycle.js";

export type LifecycleStage = BannerId;

export type VerdictStatus =
  | "strong"
  | "supported"
  | "supported-with-fixes"
  | "conditional"
  | "at-risk"
  | "blocked";

export type BlockerSeverity = "blocking" | "warning" | "incomplete" | "advisory";

export type ActionType = "design" | "investigation" | "build" | "ops" | "decision";
export type ActionStatus = "todo" | "in-progress" | "done";
export type ActionImpact = "high" | "medium" | "low";

export type ConfidenceTier = "high" | "good" | "mixed" | "low";

export interface ProjectLocation {
  region: string;
  country: string;
  acreage: number;
  acreageUnit: "ac" | "ha";
}

export interface Verdict {
  status: VerdictStatus;
  label: string; // e.g. "Supported with Required Fixes"
  score: number; // 0–100
  scoreLabel?: string; // e.g. "Vision Fit", "Overall Fit"
  summary: string; // 1–3 sentences
}

/** Six brief-mandated score categories. */
export interface ProjectScores {
  landFit: Score;
  water: Score;
  regulation: Score;
  access: Score;
  financial: Score;
  designCompleteness: Score;
}

export interface Score {
  category: string;
  value: number; // 0–100
  label: string; // e.g. "Strong", "Needs improvement"
  meaning: string; // "What this means" sentence
  confidence: ConfidenceTier;
}

export interface Blocker {
  id: string;
  title: string;
  severity: BlockerSeverity;
  description: string;
  recommendedAction: string;
  actionLabel?: string; // e.g. "Fix on Map"
  relatedEntityId?: string;
}

export interface Action {
  id: string;
  title: string;
  type: ActionType;
  status: ActionStatus;
  impact?: ActionImpact;
  dueLabel?: string; // e.g. "Due in 2 days"
}

export interface ActivityEntry {
  id: string;
  title: string;
  detail: string;
  timestamp: string; // human label, e.g. "2h ago"
  category: "water" | "access" | "soil" | "feasibility" | "regulation" | "design" | "ops";
}

export interface DesignElement {
  id: string;
  type: "paddock" | "water" | "path" | "structure" | "amenity" | "zone";
  label: string;
  metadata?: Record<string, string | number>;
}

export interface ReadinessSummary {
  landFit: ConfidenceTier;
  designCompleteness: ConfidenceTier;
  opsBurden: "light" | "moderate" | "heavy";
  capitalBurden: "light" | "moderate" | "heavy";
  confidence: ConfidenceTier;
}

/** Candidate property surfaced on the Discover board. */
export interface Candidate {
  id: string;
  name: string;
  region: string;
  acreage: number;
  acreageUnit: "ac" | "ha";
  priceUsd: number;
  isNew?: boolean;
  /** Coarse verdict shown as the headline pill. */
  verdict: VerdictStatus;
  verdictLabel: string;
  /** "Education", "Conservation", "Mixed Use", etc. */
  fitTags: string[];
  /** Headline blocker shown front-of-card. */
  topBlocker: { title: string; severity: BlockerSeverity };
  /** Four headline sub-scores (0–100). */
  subScores: {
    landFit: number;
    water: number;
    regulation: number;
    access: number;
  };
}

export interface Project {
  id: string;
  name: string;
  shortLabel: string; // e.g. "MTC"
  stage: LifecycleStage;
  location: ProjectLocation;

  verdict: Verdict;
  summary: string;

  scores: ProjectScores;
  blockers: Blocker[];
  actions: Action[];
  activity: ActivityEntry[];
  readiness: ReadinessSummary;
  designElements?: DesignElement[];
}
