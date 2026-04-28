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

/** Diagnose category — one of the 7 plain-language land-brief sections. */
export type DiagnoseCategoryId =
  | "regulatory"
  | "soil"
  | "water"
  | "terrain"
  | "ecology"
  | "climate"
  | "infrastructure";

export type CategoryStatus =
  | "strong"
  | "workable"
  | "conditional"
  | "at-risk"
  | "blocked"
  | "incomplete";

export interface DiagnoseCategory {
  id: DiagnoseCategoryId;
  title: string;
  status: CategoryStatus;
  statusLabel: string; // e.g. "Workable", "Conditional"
  summary: string; // 1–2 sentences of plain-language findings
  meaning: string; // "What this means" sentence
  metric?: { label: string; value: string }; // optional headline metric
}

/** Insight surfaced in the Risks / Opportunities / Limitations 3-panel row. */
export type InsightKind = "risk" | "opportunity" | "limitation";
export interface Insight {
  id: string;
  kind: InsightKind;
  title: string;
  detail: string;
}

export interface DiagnoseBrief {
  verdict: Verdict;
  parcelCaption?: string; // e.g. "Lot 42 · Wellington County"
  categories: DiagnoseCategory[];
  insights: Insight[];
}

/** A candidate land use scored against the project vision. */
export type FitQuality = "excellent" | "good" | "moderate" | "poor";
export interface BestUse {
  id: string;
  useType: string; // e.g. "Educational Farm", "Conservation Reserve"
  visionFit: number; // 0–100
  fitQuality: FitQuality;
  note?: string; // 1-line elaboration
}

/** Single bar in the Vision Fit Analysis stack. */
export interface VisionFitBar {
  category: string; // e.g. "Educational Goals", "Regenerative Practices"
  value: number; // 0–100
  benchmark?: number; // optional comparator (e.g. industry baseline)
  note?: string;
}

/** Headline execution stats — the cost of building this design. */
export interface ExecutionStat {
  id: string;
  label: string; // "Annual Labor", "Full-Time Equivalents", etc.
  value: string; // already-formatted, e.g. "$1.4M", "4.2 FTE"
  hint?: string; // tiny sub-label e.g. "incl. seasonal"
  tone?: "neutral" | "good" | "watch" | "warning";
}

export type DesignRuleStatus = "pass" | "warning" | "blocked";
/** A single Pass/Warning/Blocked row in the Design Rules & Safety table. */
export interface DesignRule {
  id: string;
  rule: string; // e.g. "Water source within 100 m of paddock"
  status: DesignRuleStatus;
  detail: string; // 1-sentence reason for the status
}

export interface ProveBrief {
  /** Optional override; falls back to project.verdict (typically the same). */
  verdict?: Verdict;
  blockers: Blocker[]; // headline 4 blocking issues
  bestUses: BestUse[];
  visionFit: VisionFitBar[];
  execution: ExecutionStat[];
  designRules: DesignRule[];
}

/** A "Today on the Land" tile on /v3/.../operate. */
export type OpsTone = "neutral" | "good" | "watch" | "warning";
export interface TodayTile {
  id: string;
  title: string; // "Livestock Rotation", "Water Checks", etc.
  headline: string; // primary metric or status, e.g. "Paddock B → C", "2 of 4 tanks"
  detail: string; // 1-line context
  status: { label: string; tone: OpsTone };
  due?: string; // "By 11:00", "This afternoon"
}

export interface FieldAlert {
  id: string;
  title: string;
  detail: string;
  tone: OpsTone;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  when: string; // human label, e.g. "Tomorrow 06:30", "Sat 14:00"
  category: "ops" | "weather" | "regulation" | "team" | "education";
}

export type FieldFlagKind = "livestock" | "water" | "fence" | "weather" | "team";
export interface FieldFlag {
  id: string;
  kind: FieldFlagKind;
  /** Pseudo-coordinate within a 100×100 placeholder canvas. */
  x: number;
  y: number;
  label: string;
  tone: OpsTone;
}

export interface OperateBrief {
  today: TodayTile[];
  alerts: FieldAlert[];
  upcoming: UpcomingEvent[];
  fieldFlags: FieldFlag[];
}

export type BuildTaskStatus = "todo" | "in-progress" | "done" | "blocked";
export interface BuildTask {
  id: string;
  title: string;
  status: BuildTaskStatus;
  owner?: string;
  dueLabel?: string;
}

export type BuildPhaseStatus = "complete" | "in-progress" | "upcoming";
export interface BuildPhase {
  id: string;
  number: number;
  title: string;
  summary: string;
  status: BuildPhaseStatus;
  window?: string; // e.g. "Q3 2026"
  tasks: BuildTask[];
  blockerCount: number;
}

export interface BuildBrief {
  phases: BuildPhase[];
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
  /** Land brief data for /v3/project/:id/diagnose. */
  diagnose?: DiagnoseBrief;
  /** Feasibility brief for /v3/project/:id/prove. */
  prove?: ProveBrief;
  /** Daily operating data for /v3/project/:id/operate. */
  operate?: OperateBrief;
  /** Phased task plan for /v3/project/:id/build. */
  build?: BuildBrief;
}
