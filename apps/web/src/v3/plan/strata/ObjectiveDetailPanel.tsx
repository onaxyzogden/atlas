// ObjectiveDetailPanel — right column of the Plan stratum shell, mounted when a
// stratum objective is selected (Plan Navigation Spec v1, Slice 1.6). Hosts the
// four spec sections: OBJECTIVE (ObjectiveHeader), MAP ACTIVATION
// (MapActivationStrip + ObjectiveMap), YOUR DECISIONS (Slice 1.7), and
// REFERENCE (Slice 1.8). LaunchActButton (Slice 1.9) anchors the bottom.
//
// activeOverlayIds is owned here so the strip and the map stay in lockstep.
// Reset is keyed to objective.id at the parent via `<ObjectiveDetailPanel
// key={objective.id} ... />` — clean reset, no useEffect.

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useSearch } from '@tanstack/react-router';
import type {
  OverlayId,
  PlanStratum,
  PlanStratumObjective,
  PlanStratumObjectiveStatus,
} from '@ogden/shared';
import {
  enterprisesForProjectTypes,
  isCyclicalReviewDue,
  UNIVERSAL_DOMAIN_LABELS,
} from '@ogden/shared';
import { describeReviewReason } from '../../observe/dashboard/revision/describeObserveChange.js';
import type { Project } from '../../types.js';
import { useProjectStore } from '../../../store/projectStore.js';
import { useCyclicalReviewStore } from '../../../store/cyclicalReviewStore.js';
import ObjectiveMap from '../../olos/map/ObjectiveMap.js';
import ObjectiveHeader from './ObjectiveHeader.js';
import MapActivationStrip from './MapActivationStrip.js';
import ActProgressBar from './ActProgressBar.js';
import Mode4DesignChrome from './Mode4DesignChrome.js';
import Mode5LaunchChrome from './Mode5LaunchChrome.js';
import CapacityBridgePanel from './CapacityBridgePanel.js';
import CoherenceObjectiveAmendments from '../threshold/CoherenceObjectiveAmendments.js';
import ConcernAmendments from '../threshold/ConcernAmendments.js';
import RaiseConcernAffordance from '../threshold/RaiseConcernAffordance.js';
import DecisionProgressBar from './DecisionProgressBar.js';
import DecisionChecklist from './DecisionChecklist.js';
import FormulaResultSection from './FormulaResultSection.js';
import DetailsExpander from './DetailsExpander.js';
import LaunchActButton from './LaunchActButton.js';
import CyclicalReviewBanner from './CyclicalReviewBanner.js';
import CyclicalReviewModal from './CyclicalReviewModal.js';
import ObserveUpdatesSection from './ObserveUpdatesSection.js';
import AsBuiltReconciliationCard from './AsBuiltReconciliationCard.js';
import type { VisionDerivedMap } from '../../strata/visionProfileToChecklist.js';
import { findUpstreamSourceObjectives } from '../objectiveCatalog.js';
import ParameterGroup from './ParameterGroup.js';
import ProtocolApprovalOverlay from './ProtocolApprovalOverlay.js';
import SeededProtocolPills from './SeededProtocolPills.js';
// Plan Spine re-skin — the panel is now the full-bleed RIGHT pane of the
// 3-column spine shell (no longer a bordered BentoBox card). Its inner sections
// (map body, reference placeholders) keep their existing CSS module, which
// already resolves against the app's dark `--color-*` theme.
import { C } from '../spine/tokens.js';
import {
  useReviewFlagsForObjective,
  useReviewFlagStore,
  isOpenReviewFlag,
} from '../../../store/reviewFlagStore.js';
import {
  useProtocolStore,
  useObjectiveInstantiated,
} from '../../../store/protocolStore.js';
import { useObjectivePlanLock } from '../../../store/actMandateStore.js';
import css from './ObjectiveDetailPanel.module.css';

// T1.7 -- shared button style for the three review-flag action buttons.
// Defined at module level so the object reference is stable across renders.
const REVIEW_FLAG_BTN: CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  background: 'transparent',
  border: '1px solid rgba(232, 169, 88, 0.45)',
  color: '#e8a958',
};

interface Props {
  projectId: string;
  stratum: PlanStratum;
  objective: PlanStratumObjective;
  status: PlanStratumObjectiveStatus;
  project: Project | null;
  onBackToStratum: (stratum: PlanStratum) => void;
  /**
   * This objective's effective completed checklist ids (stored progress UNIONED
   * with wizard-derived / answerSpec / formula auto-satisfy). Computed once in
   * PlanStratumShell via `useEffectiveChecklistProgress` and threaded down so the
   * detail panel reflects the SAME completion the stratum status engine and the
   * Act tier-shell use (e.g. s1-vision-c1/c4 satisfied by the creation wizard's
   * `projectTypeRecord`). Replaces the previous raw `getCompletedItemIds` read,
   * which never ran the answerSpec auto-satisfy.
   */
  completedItemIds: readonly string[];
  /** Slice 1.12 — items the Vision Builder bridge has pre-satisfied. */
  visionDerivedMap?: VisionDerivedMap;
  /**
   * Suppress the embedded MAP ACTIVATION region (strip + ObjectiveMap). The Plan
   * tier shell (PlanTierShell) reuses this panel as its right-rail objective
   * detail but already owns the map in the CENTER canvas, so it passes `true` to
   * avoid a duplicate map. Additive + defaulted `false`, so the legacy
   * PlanStratumShell (which has no center map) is unchanged and keeps its
   * embedded map.
   */
  hideMap?: boolean;
  /**
   * Threshold-3 (Act Mandate) lock override. When provided it wins; when omitted
   * the panel self-derives the lock from `useObjectivePlanLock` (this panel is
   * Plan-only -- imported solely by PlanTierShell / PlanStratumShell, never under
   * v3/act/ -- so calling the hook here can never lock an Act surface). A locked
   * objective stays fully VIEWABLE but its edit affordances are suppressed at the
   * render layer (the surface-aware seam); the shared stores stay writable so Act
   * execution is never frozen. Absent + no mandate armed -> false -> the panel
   * renders byte-identical to today.
   */
  readOnly?: boolean;
}

export default function ObjectiveDetailPanel({
  projectId,
  stratum,
  objective,
  status,
  project,
  onBackToStratum,
  completedItemIds,
  visionDerivedMap,
  hideMap = false,
  readOnly,
}: Props) {
  const [activeOverlayIds, setActiveOverlayIds] = useState<OverlayId[]>([
    ...objective.defaultOverlayBundle,
  ]);

  // Deep-link intent (Act → "Open guild builder in Plan"): expand the
  // REFERENCE section on arrival. Read loosely; the strict route validator
  // drops `expandRef` on the next spine navigation, so it is one-shot — the
  // panel remounts per objective (keyed by objective.id at the parent), so
  // ordinary objective clicks land collapsed.
  const search = useSearch({ strict: false }) as { expandRef?: '1' };
  const expandReferenceOnMount = search.expandRef === '1';

  // §10.1 — approval overlay state. Shown when the S6 objective is complete and
  // the project has eligible animal enterprises.
  const [approvalOverlayOpen, setApprovalOverlayOpen] = useState(false);

  // Derive enterprise eligibility using the same project-store read as
  // ParameterGroup and ProtocolLayerPanel (no new prop needed).
  const typeRecord = useProjectStore(
    (s) =>
      s.projects.find((p) => p.id === projectId)?.metadata?.projectTypeRecord,
  );
  const primaryTypeId = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds = typeRecord?.secondaryTypeIds ?? [];
  const hasEligibleEnterprises = useMemo(() => {
    if (!primaryTypeId) return false;
    return enterprisesForProjectTypes(primaryTypeId, secondaryTypeIds).length > 0;
  }, [primaryTypeId, secondaryTypeIds]);

  // §10.1 instantiation gate. An objective gates protocol instantiation when it
  // carries a `parameterGroup` (steward-entered thresholds drive the protocol
  // token values) AND the project has enterprises the legacy approval overlay
  // can populate. This generalises the prior hard-coded `s6-integration-design`
  // check to "any parameterGroup objective" per the confirmed Phase B contract;
  // today only `s6-yield-flows` carries a parameterGroup, so behaviour is
  // unchanged in practice while staying future-proof for new parameter groups.
  const gatesProtocolInstantiation =
    Boolean(objective.parameterGroup) && hasEligibleEnterprises;

  // Surfaced-overlay trigger (human-in-the-loop, per the confirmed Q1 choice):
  // when a gating objective transitions to `complete`, auto-open the approval
  // overlay ONCE for steward review, then stamp the §10.1 marker. The marker
  // gives exactly-once semantics — a steward who reviews and closes (or
  // deactivates protocols) is never re-nagged on subsequent renders/completions.
  // The manual "Approve & instantiate" button below bypasses the marker, so it
  // remains the explicit re-instantiate affordance.
  const markObjectiveInstantiated = useProtocolStore(
    (s) => s.markObjectiveInstantiated,
  );
  const objectiveInstantiated = useObjectiveInstantiated(projectId, objective.id);
  useEffect(() => {
    if (!projectId) return;
    if (status !== 'complete') return;
    if (!gatesProtocolInstantiation) return;
    if (objectiveInstantiated) return;
    setApprovalOverlayOpen(true);
    markObjectiveInstantiated(projectId, objective.id);
  }, [
    projectId,
    objective.id,
    status,
    gatesProtocolInstantiation,
    objectiveInstantiated,
    markObjectiveInstantiated,
  ]);

  // `completedItemIds` arrives as a prop (effective progress, computed once in
  // PlanStratumShell). Phase B made the Plan checklist read-only ("decisions are
  // worked through in Act"), so the panel only READS completion state — no
  // toggling wiring.

  // Slice 1.11 — cyclical review wiring. Subscribe to this objective's
  // review record so the banner mounts/unmounts the moment the steward
  // hits Confirm/Revise. The forced-trigger flag plugs into the predicate
  // via observeRevisionFlag — Phase 4 will swap this for real Observe
  // data; until then it is set by `cyclicalReviewStore.forceTrigger`
  // (dev-tools entry exposed at window.cyclicalReviewStore).
  const reviewRecord = useCyclicalReviewStore((s) =>
    s.getRecord(projectId, objective.id),
  );
  const isForced = useCyclicalReviewStore((s) =>
    s.isForced(projectId, objective.id),
  );
  const noteCompletion = useCyclicalReviewStore((s) => s.noteCompletion);
  const confirmDecision = useCyclicalReviewStore((s) => s.confirmDecision);
  const acknowledgeRevise = useCyclicalReviewStore((s) => s.acknowledgeRevise);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  // ADR 11 Screen 2 variant + the effects snapshot taken at resolution time
  // (confirm/revise CLEAR triggerContext in the store, so we snapshot the
  // diverged-domain labels before firing the mutation).
  const [confirmVariant, setConfirmVariant] = useState<'confirmed' | 'updated'>(
    'confirmed',
  );
  const [confirmEffects, setConfirmEffects] = useState<readonly string[]>([]);
  // "Dismiss for now" — local snooze of the Observe-driven prompt. The advisory
  // flag is untouched, so the prompt returns on remount while the divergence is
  // still active. Reset per objective (panel is keyed by objective.id).
  const [reviewDismissed, setReviewDismissed] = useState(false);

  // Observe-driven trigger attribution (null when flagged only by the 90-day
  // cadence or the dev-tools forceTrigger). Drives the Screen 1 reason copy and
  // the OBSERVE UPDATES section domains.
  const triggerContext = reviewRecord.triggerContext;
  const triggerDomainLabels = useMemo(
    () =>
      (triggerContext?.domains ?? []).map(
        (d) => UNIVERSAL_DOMAIN_LABELS[d] ?? d,
      ),
    [triggerContext],
  );
  const reviewReason = triggerContext
    ? describeReviewReason(triggerContext.via, triggerContext.domains)
    : undefined;

  // T1.7 -- downstream review flags for this objective.
  const allReviewFlags = useReviewFlagsForObjective(projectId, objective.id);
  // Open-predicate sourced from the store (isOpenReviewFlag) so this section
  // and the card count-chip never disagree on what "open" means -- see T1.9.
  const openReviewFlags = useMemo(
    () => allReviewFlags.filter(isOpenReviewFlag),
    [allReviewFlags],
  );
  const acknowledgeFlag = useReviewFlagStore((s) => s.acknowledgeFlag);
  const resolveFlag = useReviewFlagStore((s) => s.resolveFlag);
  const dismissFlag = useReviewFlagStore((s) => s.dismissFlag);

  // T1.9 -- verify-loop copy: resolved flags that have a resolutionParameterDelta
  // show a read-only section tracking post-resolution re-firings. Derive via
  // stable-ref select + useMemo (no inline filter in selector).
  const allActivations = useProtocolStore((s) => s.activations);
  const verifyFlags = useMemo(
    () =>
      allReviewFlags.filter(
        (f) => f.resolvedAt !== undefined && f.resolutionParameterDelta !== undefined,
      ),
    [allReviewFlags],
  );
  // For each verify flag, count activations confirmed AFTER resolvedAt.
  const firingsSinceByFlagId = useMemo(() => {
    const result: Record<string, number> = {};
    for (const flag of verifyFlags) {
      if (flag.resolvedAt === undefined) continue;
      const resolvedMs = Date.parse(flag.resolvedAt);
      const count = allActivations.filter(
        (a) =>
          a.projectId === projectId &&
          a.templateId === flag.sourceTemplateId &&
          a.confirmationStatus === 'confirmed' &&
          Date.parse(a.activatedAt) > resolvedMs,
      ).length;
      result[flag.id] = count;
    }
    return result;
  }, [allActivations, verifyFlags, projectId]);

  // Start the 90-day clock the first time the objective reaches `complete`.
  // The store guards re-writes so re-renders from other state are no-ops.
  useEffect(() => {
    if (!projectId) return;
    if (status === 'complete') {
      noteCompletion(projectId, objective.id);
    }
  }, [projectId, objective.id, status, noteCompletion]);

  const reviewDue = isCyclicalReviewDue({
    objective,
    currentStatus: status,
    lastReviewedAt: reviewRecord.lastReviewedAt,
    now: Date.now(),
    observeRevisionFlag: isForced ? () => true : undefined,
  });

  const handleConfirmDecision = () => {
    if (!projectId) return;
    setConfirmEffects(triggerDomainLabels);
    setConfirmVariant('confirmed');
    confirmDecision(projectId, objective.id);
    setShowConfirmModal(true);
  };

  const handleReviseDecision = () => {
    if (!projectId) return;
    setConfirmEffects(triggerDomainLabels);
    setConfirmVariant('updated');
    acknowledgeRevise(projectId, objective.id);
    setShowConfirmModal(true);
  };

  const handleDismissReview = () => setReviewDismissed(true);

  const toggleOverlay = (overlayId: OverlayId) => {
    setActiveOverlayIds((prev) =>
      prev.includes(overlayId)
        ? prev.filter((id) => id !== overlayId)
        : [...prev, overlayId],
    );
  };

  // Only mount the MAP ACTIVATION region (strip + embedded map) when the
  // objective actually has overlays bound. Exact inverse of the
  // OverlayBundleStrip empty-state (`bundle.length === 0`), so we never show
  // a map with a "No overlays bound to this objective." strip above it. The
  // region reappears automatically once an objective gets a non-empty bundle.
  const hasOverlays = objective.defaultOverlayBundle.length > 0 && !hideMap;

  // Reverse feedsInto: find upstream survey objectives whose checklist items
  // feed into this objective. Non-empty only for transitive-only S4/S5
  // consumers (s4-zones, s4-water-strategy, s5-access, s5-water-infrastructure,
  // s5-soil-improvement). Keyed to objective.id because the panel is re-keyed
  // on objective switch at the parent, so this memo is always fresh.
  const upstreamSources = useMemo(
    () => findUpstreamSourceObjectives(objective.id),
    [objective.id],
  );

  // Threshold-3 lock. The hook is called UNCONDITIONALLY (Rules-of-Hooks) and
  // returns false until Begin Act arms `planReadOnly`; the optional `readOnly`
  // prop, when passed, overrides it (used by tests + explicit hosts). This panel
  // is Plan-only, so the hook can never run inside an Act surface.
  const lockFromStore = useObjectivePlanLock(projectId, objective.id);
  const locked = readOnly ?? lockFromStore;

  return (
    <section
      aria-label={`Objective: ${objective.title}`}
      data-testid="plan-objective-detail-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        overflow: 'hidden auto',
        background: C.bg,
      }}
    >
      <ObjectiveHeader
        stratum={stratum}
        objective={objective}
        status={status}
        onBackToStratum={onBackToStratum}
      />

      {/* Threshold-3 lock notice. Renders ONLY when this objective is locked
          (post Begin Act), so an unlocked panel is byte-identical. The objective
          stays viewable; edits are suppressed. Raise a concern (Stage 7) is the
          covenant path to propose an amendment. */}
      {locked && (
        <div
          data-testid="objective-detail-plan-lock"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            margin: '8px 12px 0',
            padding: '9px 12px',
            borderLeft: '3px solid #94A3B8',
            background: 'rgba(148, 163, 184, 0.12)',
            color: '#475569',
            fontSize: 12.5,
            lineHeight: 1.45,
            borderRadius: 4,
          }}
        >
          <span>
            This objective is locked. The plan was sealed at Begin Act -- it stays
            viewable, but edits are paused while you execute in Act. Raise a concern
            to propose an amendment.
          </span>
        </div>
      )}

      <SeededProtocolPills objective={objective} projectId={projectId} />

      <DecisionProgressBar
        objective={objective}
        completedItemIds={completedItemIds}
        derivedEvidence={visionDerivedMap}
      />

      {reviewDue && !reviewDismissed && (
        <CyclicalReviewBanner
          reason={reviewReason}
          eyebrow={triggerContext ? 'Conditions have changed' : undefined}
          onConfirm={handleConfirmDecision}
          onRevise={handleReviseDecision}
          // "Dismiss for now" only on the Observe-driven prompt; the cadence
          // prompt keeps its original confirm/revise-only affordances.
          onDismiss={triggerContext ? handleDismissReview : undefined}
        />
      )}

      {/* Act as-built deviations for this objective's domain footprint.
          Renders nothing when there are no active feature-scoped divergences. */}
      <AsBuiltReconciliationCard
        projectId={projectId}
        objective={objective}
      />

      {/* T1.7 -- downstream review flags raised by the deviation evaluation
          engine (T1.6). Renders only when there are OPEN flags; resolved,
          dismissed, or dormant flags are filtered out. Inline styles only
          (ObjectiveDetailPanel.module.css is out of scope for T1.7). */}
      {openReviewFlags.length > 0 && (
        <section
          aria-label="Downstream review flags"
          data-testid="objective-review-flags"
          style={{
            margin: '8px 12px',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(232, 169, 88, 0.45)',
            background: 'rgba(232, 169, 88, 0.10)',
          }}
        >
          <h3 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#e8a958' }}>
            Review flags
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {openReviewFlags.map((flag) => (
              <li key={flag.id} data-testid={`review-flag-${flag.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 13, lineHeight: 1.4, color: C.textPrimary }}>{flag.reason}</span>
                {/* Action row suppressed while the objective is locked (the flag
                    stays VISIBLE, read-only); under lock, amendments go through
                    Raise a Concern. Unlocked -> renders byte-identical. */}
                {!locked && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    {/* Acknowledge stamps acknowledgedAt only; the flag stays OPEN
                        (still visible here, still counted on the card) until the
                        steward Resolves or Dismisses it. */}
                    <button type="button" onClick={() => acknowledgeFlag(projectId, flag.id)} style={REVIEW_FLAG_BTN}>Acknowledge</button>
                    <button type="button" onClick={() => resolveFlag(projectId, flag.id)} style={REVIEW_FLAG_BTN}>Resolve</button>
                    <button type="button" onClick={() => dismissFlag(projectId, flag.id)} style={REVIEW_FLAG_BTN}>Dismiss</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* T1.9 -- verify-loop copy: resolved flags with a parameter delta.
          Read-only; no action buttons. Shows post-resolution firing count vs
          expected count plus a confound note about seasonal variation. */}
      {verifyFlags.length > 0 && (
        <section
          aria-label="Verify resolved parameter changes"
          data-testid="objective-verify-flags"
          style={{
            margin: '8px 12px',
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(100, 180, 130, 0.35)',
            background: 'rgba(100, 180, 130, 0.07)',
          }}
        >
          <h3 style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'rgba(100,200,140,0.9)' }}>
            Verify parameter changes
          </h3>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {verifyFlags.map((flag) => {
              const delta = flag.resolutionParameterDelta;
              if (delta === undefined) return null;
              const firingsSince = firingsSinceByFlagId[flag.id] ?? 0;
              const expected = flag.expectedRate?.count ?? 0;
              return (
                <li key={flag.id} data-testid={`verify-flag-${flag.id}`} style={{ fontSize: 13, lineHeight: 1.5, color: C.textPrimary }}>
                  {`Since you changed ${delta.itemId} ${delta.from}->${delta.to}: fired ${firingsSince}x vs expected ${expected}x. Note: seasonal conditions also vary.`}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {hasOverlays && (
        <>
          <MapActivationStrip
            objective={objective}
            activeOverlayIds={activeOverlayIds}
            onToggleOverlay={toggleOverlay}
          />

          <div className={css.mapBody}>
            <ObjectiveMap
              stage="plan"
              domain="land-base"
              project={project}
              activeOverlayIds={activeOverlayIds}
            />
          </div>
        </>
      )}

      <ActProgressBar projectId={projectId} objectiveId={objective.id} />

      {/* MODE 4 — DESIGN chrome (Tiers 3-4 restructure): builds-on, the amber
          Planning Direction mandate, the green monitoring stream, and the
          act-handoff chip. Self-gating — renders nothing unless this objective
          carries a Mode-4 display field, so non-Design objectives are untouched.
          Plan-only by construction (Act never mounts this panel for s4/s5). */}
      <Mode4DesignChrome objective={objective} />

      {/* MODE 5 -- LAUNCH PREPARATION chrome (Tier-6 restructure): the blue
          progress-tracking panel + act-handoff chip. Self-gating -- renders
          nothing unless this objective carries `progressTracking` (every
          resolving s7 objective does, nothing else). Separate from
          Mode4DesignChrome so an objective carrying both fields shows accurate,
          non-overlapping eyebrows. Plan-only by construction (Act never mounts
          this panel). */}
      <Mode5LaunchChrome objective={objective} />

      {/* TIER 0 CAPACITY BRIDGE -- arms ONLY on s7-resource-plan: declared
          steward supply (from Tier 0 / Obj 0.2) read against the Phase-1 demand
          captured in this resource plan. Display-only; demand absent -> honest
          "not yet captured" reading. Plan-only by construction. */}
      <CapacityBridgePanel objective={objective} projectId={projectId} />

      {/* THRESHOLD 2 (Coherence Check) amendments touching this objective --
          Plan-only, additive, display-only. Self-gates to null when none, so a
          non-amended objective is undisturbed and the catalogue design above is
          never mutated (amendments are permanent steward overlays in the store). */}
      <CoherenceObjectiveAmendments
        projectId={projectId}
        objectiveId={objective.id}
      />

      {/* THRESHOLD 3 (Act Mandate) approved-amendments overlay -- Plan-only,
          additive, display-only. Self-gates to null when this objective has no
          APPROVED amendment, so the catalogue design above is never mutated
          (amendments are permanent steward overlays in planConcernsStore). */}
      <ConcernAmendments projectId={projectId} objectiveId={objective.id} />

      {/* THRESHOLD 3 (Act Mandate) Raise-a-Concern affordance -- Plan-only. Self-
          gates: renders ONLY when this objective is HELD under the mandate, so a
          held objective stays viewable and a concern can be raised against it.
          Covenant: free text is CSA-advised in UI + hard-rejected at persist. */}
      <RaiseConcernAffordance projectId={projectId} objectiveId={objective.id} />

      {upstreamSources.length > 0 && (
        <section
          aria-label="Upstream readings informing this objective"
          data-testid="objective-informed-by"
          style={{ padding: '6px 18px 10px' }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: C.textTertiary,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Informed by
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {upstreamSources.map((src) => (
              <span
                key={src.id}
                data-testid={`informed-by-chip-${src.id}`}
                style={{
                  fontSize: 9,
                  color: C.teal,
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  background: C.bg4,
                  borderRadius: 6,
                  padding: '1px 6px',
                  whiteSpace: 'nowrap',
                }}
              >
                {src.shortTitle ?? src.title}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* OBSERVE UPDATES (ADR 11 §2b) — the Observe changes that drove this
          objective's review flag, between MAP ACTIVATION and YOUR DECISIONS.
          Renders nothing when there is no active divergence in the trigger
          domains, so non-flagged objectives are untouched. */}
      {triggerContext && (
        <ObserveUpdatesSection
          projectId={projectId}
          domains={triggerContext.domains}
        />
      )}

      <DecisionChecklist
        projectId={projectId}
        objective={objective}
        status={status}
        completedItemIds={completedItemIds}
        derivedEvidence={visionDerivedMap}
      />

      {/* LIVE CALCULATIONS — reuses the legacy livestock formula engine via
          formulaCatalog. Renders nothing for objectives without bound
          checklist items, so non-livestock panels are untouched. */}
      <FormulaResultSection projectId={projectId} objective={objective} />

      <ParameterGroup projectId={projectId} objective={objective} readOnly={locked} />

      {/* §10.1 — Approve & instantiate protocols button: shown when a gating
          objective (carries a parameter group + the project has eligible
          enterprises) is complete. The overlay auto-opens once on completion
          (effect above); this button is the manual RE-instantiate affordance —
          it bypasses the one-shot marker so the steward can re-open the
          confirmation flow at will. Opens ProtocolApprovalOverlay, which derives
          token values from the entered thresholds and activates chosen protocols
          into protocolStore. */}
      {gatesProtocolInstantiation && status === 'complete' && !locked && (
          <div
            style={{
              padding: '12px 20px 16px',
              borderTop: `1px solid ${'var(--spine-border)'}`,
            }}
          >
            <button
              data-testid="plan-approve-protocols-button"
              onClick={() => setApprovalOverlayOpen(true)}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontSize: 13,
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                color: 'white',
                background: 'var(--spine-gold)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                letterSpacing: '0.01em',
              }}
            >
              Approve &amp; instantiate protocols →
            </button>
          </div>
        )}

      {approvalOverlayOpen && (
        <ProtocolApprovalOverlay
          projectId={projectId}
          objective={objective}
          onClose={() => setApprovalOverlayOpen(false)}
        />
      )}

      {objective.legacyCardSectionId && (
        <DetailsExpander
          projectId={projectId}
          legacyCardSectionId={objective.legacyCardSectionId}
          defaultOpen={expandReferenceOnMount}
        />
      )}

      <LaunchActButton
        projectId={projectId}
        objective={objective}
        status={status}
      />

      {showConfirmModal && (
        <CyclicalReviewModal
          objective={objective}
          variant={confirmVariant}
          effects={confirmEffects}
          onDismiss={() => setShowConfirmModal(false)}
        />
      )}
    </section>
  );
}
