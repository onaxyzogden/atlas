// Schemas
export * from './schemas/confidence.schema.js';
export * from './schemas/layer.schema.js';
export * from './schemas/assessment.schema.js';
export * from './schemas/visionProfile.schema.js';
export * from './schemas/project.schema.js';
export * from './schemas/universalDomain.schema.js';
export * from './schemas/template.schema.js';
export * from './schemas/spiritual.schema.js';
export * from './schemas/api.schema.js';
export * from './schemas/designFeature.schema.js';
export * from './schemas/machineryItem.schema.js';
export * from './schemas/vegetationPatch.schema.js';
export * from './schemas/successionMilestone.schema.js';
export * from './schemas/projectState.schema.js';
export * from './schemas/file.schema.js';
export * from './schemas/export.schema.js';
export * from './schemas/portal.schema.js';
export * from './schemas/collaboration.schema.js';
export * from './schemas/regenerationEvent.schema.js';
export * from './schemas/regenerationMetrics.js';
export * from './schemas/websocket.schema.js';
export * from './schemas/sectionResponse.js';
export * from './schemas/section2.schema.js';
export * from './schemas/section3.schema.js';
export * from './schemas/section4.schema.js';
export * from './schemas/section5.schema.js';
export * from './schemas/section6.schema.js';
export * from './schemas/section7.schema.js';
export * from './schemas/section8.schema.js';
export * from './schemas/section9.schema.js';
export * from './schemas/section10.schema.js';
export * from './schemas/section11.schema.js';
export * from './schemas/section12.schema.js';
export * from './schemas/section13.schema.js';
export * from './schemas/section14.schema.js';
export * from './schemas/section15.schema.js';
export * from './schemas/section16.schema.js';
export * from './schemas/section17.schema.js';
export * from './schemas/section18.schema.js';
export * from './schemas/section19.schema.js';
export * from './schemas/section20.schema.js';
export * from './schemas/section21.schema.js';
export * from './schemas/section22.schema.js';
export * from './schemas/section23.schema.js';
export * from './schemas/section24.schema.js';
export * from './schemas/section25.schema.js';
export * from './schemas/section26.schema.js';
export * from './schemas/section27.schema.js';
export * from './schemas/section28.schema.js';
export * from './schemas/section29.schema.js';
export * from './schemas/elevation.schema.js';
export * from './schemas/actTelemetry.schema.js';
export * from './schemas/clientErrorTelemetry.schema.js';
export * from './schemas/showcaseTelemetry.schema.js';
export * from './schemas/workItem.schema.js';
export * from './schemas/crewMember.schema.js';
export * from './schemas/costRange.schema.js';
export * from './schemas/proofEvent.schema.js';

// Built Environment (unified Observe + Plan entity — see ADR 2026-05-10)
export * from './builtEnvironment.js';
export * from './builtEnvironmentKinds.js';
export * from './builtEnvironmentProjection.js';
export * from './demand/structureDemand.js';

// Utilities
export * from './lib/caseTransform.js';
export * from './lib/geojsonGeometry.js';
export * from './lib/workItemGraph.js';
export * from './lib/resourcingConflicts.js';
export * from './lib/budgetVariance.js';
export * from './lib/fieldProof.js';
export * from './lib/operatingHealth.js';
export * from './lib/moduleDomainMap.js';
export * from './lib/moduleDomainMigration.js';
export * from './astronomy/sunPath.js';
export * from './astronomy/solarExposure.js';
export * from './climate/comfortCalendar.js';
export * from './climate/comfortGrid.js';
export * from './climate/windbreakLines.js';
export * from './ecology/pollinatorHabitat.js';
export * from './ecology/ecoregion.js';
export * from './ecology/corridorLCP.js';
export * from './ecology/pollinatorHabitatState.js';
export * from './succession/index.js';
export * from './fieldVerification/index.js';

// Constants
export * from './constants/dataSources.js';
export * from './constants/flags.js';
export * from './constants/system.js';
export * from './constants/universalDomain.js';

// Store mirrors / payload helpers
export * from './store-mirrors/pickHelpers.js';

// OLOS (Observe / Plan / Act) — universal Stage × Domain × Objective foundation
export * from './schemas/olos/stage.schema.js';
export * from './schemas/olos/overlay.schema.js';
export * from './schemas/olos/status.schema.js';
export * from './schemas/olos/geometry.schema.js';
export * from './schemas/olos/checklistItem.schema.js';
export * from './schemas/olos/objective.schema.js';
export * from './schemas/olos/observationRecord.schema.js';
export * from './schemas/olos/planDecisionRecord.schema.js';
export * from './schemas/olos/actHandoffPackage.schema.js';
export * from './schemas/olos/actTask.schema.js';
export * from './schemas/olos/proofRecord.schema.js';
export * from './schemas/olos/verificationRecord.schema.js';
export * from './schemas/olos/escalationRecord.schema.js';
export * from './schemas/olos/stewardshipRoutine.schema.js';
export * from './constants/olos/overlays.js';
export * from './constants/olos/stageBoundaries.js';
export * from './constants/olos/objectives.js';
// checklistItems.ts is a re-export shim for direct imports — its named
// exports already come through ./constants/olos/objectives.js

// Plan tier shell (OLOS Plan Navigation Spec v1)
export * from './schemas/plan/planTierObjective.schema.js';
export * from './constants/plan/tierObjectives.js';
// Per-type objective model (OLOS Project-Type + Secondary-Layer Spec v1.2)
export * from './schemas/plan/projectTypeTaxonomy.schema.js';
export * from './constants/plan/projectTypes.js';
export {
  computeObjectiveStatus,
  computeAllObjectiveStatuses,
  type PlanTierObjectiveStatusMap,
} from './relationships/tierObjectiveStatus.js';
export {
  computeTierState,
  computeAllTierStates,
  type PlanTierStateMap,
} from './relationships/tierState.js';
export {
  isCyclicalReviewDue,
  CYCLICAL_REVIEW_DEFAULT_DAYS,
  type CyclicalReviewInputs,
} from './relationships/cyclicalReviewTrigger.js';

// Field action (OLOS Act Command Center Spec v1 — Phase 3)
export * from './schemas/fieldAction/proofItem.schema.js';
export * from './schemas/fieldAction/proofSchema.schema.js';
export * from './schemas/fieldAction/divergenceFlag.schema.js';
export * from './schemas/fieldAction/fieldAction.schema.js';
export * from './constants/fieldAction/proofSchemas.js';
export {
  canTransition,
  computeNextStatus,
  isTerminal,
  isVerified,
  isObserveFeedable,
  hasAllRequiredProof,
  type FieldActionEvent,
} from './relationships/fieldActionStatus.js';

// OLOS Observe Dashboard (Phase 4)
export * from './schemas/observe/dataPoint.schema.js';
export * from './schemas/observe/supersession.schema.js';
export * from './schemas/observe/cycle.schema.js';
export * from './schemas/observe/presentationShare.schema.js';
export * from './constants/observe/domains.js';
export {
  computeSupersession,
  restoreFromSupersession,
  haversineMeters,
  DEFAULT_SUPERSESSION_PROXIMITY_METERS,
  type ComputeSupersessionOptions,
  type RestorePatch,
} from './relationships/supersession.js';
export {
  computeFreshness,
  computeDomainFreshness,
  type ObserveFreshness,
  type FreshnessThresholds,
} from './relationships/observeFreshness.js';
export {
  computeObserveRevisionFlag,
  type ObserveRevisionTriggerInput,
} from './relationships/observeRevisionTrigger.js';
export {
  computeRevisionPriority,
  FOUNDATION_DOMAINS_FOR_REVISION,
  type RevisionEvent,
  type RevisionEventKind,
  type RevisionPriority,
} from './relationships/revisionPriority.js';
export {
  getObjectiveObserveDomains,
  getObjectivesForDomain,
  getPrimaryDomainForObjective,
  OBJECTIVE_OBSERVE_DOMAINS_OVERRIDE,
  TIER_OBSERVE_DOMAINS_DEFAULT,
} from './relationships/objectiveObserveDomains.js';
export {
  hasCapability,
  roleSatisfies,
  PROJECT_ROLE_CAPABILITIES,
  type ProjectRoleCapability,
} from './relationships/projectRoleCapabilities.js';
export {
  computeProjectUrgency,
  sortByUrgency,
  URGENCY_WEIGHTS,
  INACTIVITY_DAYS_CAP,
  type ProjectUrgencyInputs,
  type ProjectUrgencyBreakdown,
  type ProjectUrgencyResult,
} from './relationships/urgencyScore.js';
