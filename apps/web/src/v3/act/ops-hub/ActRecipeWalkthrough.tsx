/**
 * ActRecipeWalkthrough — the guided "how to do it, step by step" layer of the
 * Operations Hub walkthrough drawer (Phase 3b).
 *
 * This is the half of the Act revamp the user asked for in plain words: once a
 * task is chosen, walk the steward through HOW to carry it out. It resolves the
 * single authored recipe for the objective via `resolveTaskRecipe` (THE SEAM,
 * @ogden/shared) and renders it as an ordered stepper:
 *
 *     provenance badge  →  why  →  verbatim scopeNotes banner (Amanah)
 *       →  Step N of M  (instruction · rationale · pitfall · citation
 *                        · per-step scopeNotes · tool chips · affordance hint)
 *       →  recipe pitfall
 *
 * It sits ABOVE the retained ActTierExecutionPanel in the drawer (see
 * ActTaskWalkthrough): the stepper NARRATES and the panel beneath is the
 * canonical WRITE surface (checklist / evidence / monitoring / amendments). A
 * step whose `inputKind` implies a write shows an affordance hint pointing at
 * that panel rather than duplicating the write widget — so every proven write
 * path stays single-sourced (the Phase 3a guarantee) while the steward gets the
 * ordered guidance the recipe layer authored. The per-step in-line embedding of
 * each write affordance is the documented Phase 4 follow-up (needs a live map +
 * server to verify the monitoring/CSA path in situ).
 *
 * Amanah: `scopeNotes` (recipe-level + upstream, assembled verbatim by the
 * resolver) and any per-step `scopeNotes` render read-only, never reworded; a
 * `scholarCouncilGated` recipe shows the gate badge. No fiqh/capital/slaughter
 * copy is authored here — it arrives verbatim through the data layer.
 */

import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sprout,
  Wrench,
} from 'lucide-react';
import {
  resolveTaskRecipe,
  getObjectiveObserveDomains,
  type PlanStratumObjective,
  type RecipeStep,
  type RecipeStepInputKind,
  type RecipeTaskInput,
  type ResolveTaskRecipeContext,
} from '@ogden/shared';
import { useProjectStore, MTC_SEED } from '../../../store/projectStore.js';
import css from './ActRecipeWalkthrough.module.css';

interface Props {
  projectId: string;
  objective: PlanStratumObjective;
}

/** Affordance hint per write-bearing inputKind — points at the panel below. */
const AFFORDANCE_HINT: Record<RecipeStepInputKind, string | null> = {
  evidence: 'Capture this evidence in the record panel below.',
  proof: 'Attach the formal proof in the record panel below.',
  decision: 'Mark this decision off in the checklist below.',
  reference: 'Confirm this reference in the checklist below.',
  verification: 'Complete the verification in the record panel below.',
  reading: 'Log this reading in the monitoring panel below.',
  // map-action points at the hub map, not the panel; handled inline via chips.
  'map-action': null,
};

const INPUT_KIND_LABEL: Record<RecipeStepInputKind, string> = {
  evidence: 'Evidence',
  proof: 'Proof',
  decision: 'Decision',
  reference: 'Reference',
  verification: 'Verification',
  reading: 'Monitoring',
  'map-action': 'On the map',
};

function StepBody({ step }: { step: RecipeStep }) {
  const hint = step.inputKind ? AFFORDANCE_HINT[step.inputKind] : null;
  const isMapAction = step.inputKind === 'map-action';
  return (
    <div className={css.stepBody}>
      <p className={css.instruction}>{step.instruction}</p>

      {step.rationale && (
        <div className={css.note}>
          <span className={css.noteLabel}>Why</span>
          <p className={css.noteText}>{step.rationale}</p>
        </div>
      )}

      {step.pitfall && (
        <div className={css.note}>
          <span className={css.noteLabel}>Watch out</span>
          <p className={css.noteText}>{step.pitfall}</p>
        </div>
      )}

      {/* Per-step Amanah caution — verbatim, never reworded. */}
      {step.scopeNotes && (
        <div className={css.scope} role="note">
          <ShieldAlert size={14} strokeWidth={1.75} aria-hidden="true" />
          <p className={css.scopeText}>{step.scopeNotes}</p>
        </div>
      )}

      {step.toolIds.length > 0 && (
        <div className={css.tools}>
          <Wrench size={13} strokeWidth={1.75} aria-hidden="true" />
          {step.toolIds.map((id) => (
            <span key={id} className={css.toolChip}>
              {id}
            </span>
          ))}
        </div>
      )}

      {hint && <p className={css.affordance}>{hint}</p>}
      {isMapAction && (
        <p className={css.affordance}>
          Use the field-activity map above to place or measure this.
        </p>
      )}

      {step.citation && <p className={css.citation}>Source: {step.citation}</p>}
    </div>
  );
}

export default function ActRecipeWalkthrough({ projectId, objective }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(
    () =>
      projects.find((p) => p.id === projectId || p.serverId === projectId) ??
      MTC_SEED,
    [projects, projectId],
  );

  // Resolve the one authored recipe for this objective. Objective-centric input:
  // the resolver tries the per-objective recipe first, then the objective's
  // domain, then the universal floor — so this is TOTAL (never null) whenever the
  // project carries a primary type. Pure function (not a hook): safe in useMemo.
  const resolved = useMemo(() => {
    const record = project.metadata?.projectTypeRecord;
    if (!record?.primaryTypeId) return null;
    const domains = getObjectiveObserveDomains(objective);
    const input: RecipeTaskInput = {
      kind: 'checklist-item',
      objectiveId: objective.id,
      domain: domains[0],
    };
    const ctx: ResolveTaskRecipeContext = {
      primaryTypeId: record.primaryTypeId,
      secondaryTypeIds: record.secondaryTypeIds ?? [],
    };
    return resolveTaskRecipe(input, ctx);
  }, [project, objective]);

  const [stepIndex, setStepIndex] = useState(0);

  // Untyped project (no primaryTypeId) → no recipe; the panel below still works.
  if (!resolved) return null;

  const { recipe, provenance, scopeNotes, scholarCouncilGated } = resolved;
  const steps = recipe.steps;
  const total = steps.length;
  const current = Math.min(stepIndex, total - 1);
  const step = steps[current];

  // The recipe schema guarantees >=1 step and `current` is clamped to a valid
  // index, so this is unreachable at runtime — but it narrows `step` from
  // `RecipeStep | undefined` (noUncheckedIndexedAccess) to `RecipeStep` honestly,
  // without a non-null assertion. All hooks above have already run.
  if (!step) return null;

  return (
    <section className={css.root} aria-label="Task walkthrough steps">
      <header className={css.head}>
        <span className={css.kicker}>
          <Sprout size={13} strokeWidth={1.75} aria-hidden="true" />
          How to do it
        </span>
        <span
          className={css.badge}
          data-bespoke={!provenance.isFallback}
          title={`Matched by ${provenance.matchedBy} (${provenance.sourceLayer})`}
        >
          {provenance.isFallback ? 'Standard guidance' : 'Tailored to this work'}
        </span>
      </header>

      <p className={css.why}>{recipe.why}</p>

      {/* Recipe-level + upstream Amanah cautions, assembled verbatim by the
          resolver. Read-only; never edited or reworded. */}
      {scopeNotes.length > 0 && (
        <div className={css.scopeBanner} role="note">
          <span className={css.scopeBannerHead}>
            <ShieldAlert size={14} strokeWidth={1.75} aria-hidden="true" />
            Scope note
            {scholarCouncilGated && (
              <span className={css.gate}>Scholar Council review</span>
            )}
          </span>
          {scopeNotes.map((note, i) => (
            <p key={i} className={css.scopeBannerText}>
              {note}
            </p>
          ))}
        </div>
      )}

      <div className={css.stepper}>
        <div className={css.stepHead}>
          <span className={css.stepCount}>
            Step {current + 1} of {total}
          </span>
          <h3 className={css.stepTitle}>{step.title}</h3>
        </div>

        {/* Progress rail — one segment per step, filled up to the current one. */}
        <div className={css.progress} aria-hidden="true">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={css.progressSeg}
              data-on={i <= current}
            />
          ))}
        </div>

        <StepBody step={step} />

        {step.inputKind && (
          <span className={css.kindTag}>{INPUT_KIND_LABEL[step.inputKind]}</span>
        )}

        <div className={css.nav}>
          <button
            type="button"
            className={css.navBtn}
            disabled={current === 0}
            onClick={() => setStepIndex(Math.max(0, current - 1))}
          >
            <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            className={css.navBtn}
            data-primary="true"
            disabled={current >= total - 1}
            onClick={() => setStepIndex(Math.min(total - 1, current + 1))}
          >
            Next
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      {recipe.pitfall && (
        <div className={css.recipePitfall}>
          <span className={css.noteLabel}>Common pitfall</span>
          <p className={css.noteText}>{recipe.pitfall}</p>
        </div>
      )}
    </section>
  );
}
