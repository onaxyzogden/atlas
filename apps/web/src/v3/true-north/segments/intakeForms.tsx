/**
 * intakeForms — the 8 True North segment intake forms.
 *
 * Each form is a thin, reactive surface over its backing store: it reads the
 * current answer and writes through the store action. The forms are pure
 * capture — no grading happens here; the Fit Gate engine reads the same stores
 * downstream. Covenant note: the Financial form offers only the permitted
 * capital channels (donation / restricted-donation / qard ḥasan / in-kind /
 * sponsorship); no investor / advance-purchase framing is modeled.
 */

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useGoalTreeStore } from '../../../store/goalTreeStore.js';
import { useTrueNorthStore } from '../../../store/trueNorthStore.js';
import { useSiteProfileStore } from '../../../store/siteProfileStore.js';
import { ARCHETYPE_TO_PROJECT_TYPE } from '../trueNorthConfig.js';
import type { ProjectArchetype } from '../../plan/data/goalCompassTypes.js';
import type {
  CapitalChannel,
  DealBreaker,
  EcologicalFeature,
  LandFunction,
} from '../data/trueNorthTypes.js';
import { Field, ChoiceRow, MultiChoice, type Option } from './intakeControls.js';
import css from './intake.module.css';

interface FormProps {
  projectId: string;
}

const TRISTATE: readonly Option<'yes' | 'no' | 'unknown'>[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Not sure' },
];

/* ── 1. Core Vision ──────────────────────────────────────────────────── */

const ARCHETYPES: readonly Option<ProjectArchetype>[] = [
  { value: 'homestead', label: 'Homestead' },
  { value: 'regenerative-farm', label: 'Regenerative Farm' },
  { value: 'retreat', label: 'Retreat' },
  { value: 'education', label: 'Education' },
  { value: 'conservation', label: 'Conservation' },
  { value: 'multi-enterprise', label: 'Multi-Enterprise' },
];

export function CoreVisionIntake({ projectId }: FormProps) {
  const goalTree = useGoalTreeStore((s) => s.goalTreesByProject[projectId]);
  const ensureDefault = useGoalTreeStore((s) => s.ensureDefault);
  const switchTemplate = useGoalTreeStore((s) => s.switchTemplate);
  const setParentGoal = useGoalTreeStore((s) => s.setParentGoal);

  useEffect(() => {
    if (!goalTree) ensureDefault(projectId);
  }, [goalTree, ensureDefault, projectId]);

  const archetype = goalTree?.archetype ?? 'homestead';

  return (
    <div className={css.form}>
      <Field
        label="Project archetype"
        hint="Sets the goal-tree template and the land scores your goal is measured against."
      >
        <ChoiceRow
          ariaLabel="Project archetype"
          options={ARCHETYPES}
          value={archetype}
          onChange={(v) => switchTemplate(projectId, ARCHETYPE_TO_PROJECT_TYPE[v])}
        />
      </Field>

      <Field label="Parent goal" hint="One sentence: what is this land ultimately for?">
        <input
          className={css.input}
          type="text"
          value={goalTree?.parentGoal.title ?? ''}
          placeholder="e.g. A self-reliant homestead that feeds three families"
          onChange={(e) => setParentGoal(projectId, { title: e.target.value })}
        />
      </Field>

      <Field label="Narrative" hint="Optional — the fuller story behind the goal.">
        <textarea
          className={css.textarea}
          value={goalTree?.parentGoal.narrative ?? ''}
          placeholder="What does success look like in ten years?"
          onChange={(e) => setParentGoal(projectId, { narrative: e.target.value })}
        />
      </Field>
    </div>
  );
}

/* ── 2. Required Land Functions ──────────────────────────────────────── */

const LAND_FUNCTIONS: readonly Option<LandFunction>[] = [
  { value: 'growing-food', label: 'Growing food' },
  { value: 'grazing', label: 'Grazing' },
  { value: 'hosting-visitors', label: 'Hosting visitors' },
  { value: 'parking', label: 'Parking' },
  { value: 'water-storage', label: 'Water storage' },
  { value: 'housing', label: 'Housing' },
  { value: 'workshops', label: 'Workshops' },
  { value: 'trails', label: 'Trails' },
  { value: 'composting', label: 'Composting' },
  { value: 'nursery', label: 'Nursery' },
  { value: 'market-garden', label: 'Market garden' },
  { value: 'forest-access', label: 'Forest access' },
];

export function RequiredFunctionsIntake({ projectId }: FormProps) {
  const profile = useTrueNorthStore((s) => s.profilesByProject[projectId]);
  const setRequiredFunctions = useTrueNorthStore((s) => s.setRequiredFunctions);
  const current = profile?.requiredFunctions ?? [];

  const toggle = (fn: LandFunction) =>
    setRequiredFunctions(
      projectId,
      current.includes(fn) ? current.filter((f) => f !== fn) : [...current, fn],
    );

  return (
    <div className={css.form}>
      <Field
        label="What must the land physically support?"
        hint="Pick every function your vision depends on."
      >
        <MultiChoice
          ariaLabel="Required land functions"
          options={LAND_FUNCTIONS}
          values={current}
          onToggle={toggle}
        />
      </Field>
    </div>
  );
}

/* ── 3. Legal & Zoning Fit ───────────────────────────────────────────── */

const ZONING_FIT: readonly Option<
  'permitted' | 'conditional' | 'variance-needed' | 'prohibited' | 'unknown'
>[] = [
  { value: 'permitted', label: 'Permitted' },
  { value: 'conditional', label: 'Conditional' },
  { value: 'variance-needed', label: 'Variance needed' },
  { value: 'prohibited', label: 'Prohibited' },
  { value: 'unknown', label: 'Not sure' },
];

const LEGAL_ACCESS: readonly Option<
  'deeded' | 'easement' | 'shared' | 'none' | 'unknown'
>[] = [
  { value: 'deeded', label: 'Deeded' },
  { value: 'easement', label: 'Easement' },
  { value: 'shared', label: 'Shared' },
  { value: 'none', label: 'None' },
  { value: 'unknown', label: 'Not sure' },
];

export function LegalZoningIntake({ projectId }: FormProps) {
  const tn = useTrueNorthStore((s) => s.profilesByProject[projectId]);
  const patchLegalZoning = useTrueNorthStore((s) => s.patchLegalZoning);
  const sp = useSiteProfileStore((s) => s.profilesByProject[projectId]);
  const setFacet = useSiteProfileStore((s) => s.setFacet);

  return (
    <div className={css.form}>
      <Field label="Does current zoning permit your core use?">
        <ChoiceRow
          ariaLabel="Zoning permits use"
          options={TRISTATE}
          value={tn?.legalZoning.zoningPermitsUse ?? 'unknown'}
          onChange={(v) => patchLegalZoning(projectId, { zoningPermitsUse: v })}
        />
      </Field>

      <Field label="Parcel zoning fit" hint="The formal zoning designation for the core use.">
        <ChoiceRow
          ariaLabel="Parcel zoning fit"
          options={ZONING_FIT}
          value={sp?.zoningFit.value ?? 'unknown'}
          onChange={(v) => setFacet(projectId, 'zoningFit', v, 'manual')}
        />
      </Field>

      <Field label="Legal access to the parcel">
        <ChoiceRow
          ariaLabel="Legal access"
          options={LEGAL_ACCESS}
          value={sp?.legalAccess.value ?? 'unknown'}
          onChange={(v) => setFacet(projectId, 'legalAccess', v, 'manual')}
        />
      </Field>
    </div>
  );
}

/* ── 4. Financial Fit ────────────────────────────────────────────────── */

const CAPITAL_CHANNELS: readonly Option<CapitalChannel>[] = [
  { value: 'donation', label: 'Charitable donation' },
  { value: 'restricted-donation', label: 'Restricted donation' },
  { value: 'qard-hasan', label: 'Qard ḥasan' },
  { value: 'in-kind', label: 'In-kind' },
  { value: 'sponsorship', label: 'Sponsorship' },
];

const CONFIDENCE: readonly Option<'high' | 'medium' | 'low' | 'unknown'>[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'unknown', label: 'Not sure' },
];

export function FinancialIntake({ projectId }: FormProps) {
  const tn = useTrueNorthStore((s) => s.profilesByProject[projectId]);
  const patchFinancial = useTrueNorthStore((s) => s.patchFinancial);
  const channels = tn?.financial.capitalChannels ?? [];

  const toggle = (c: CapitalChannel) =>
    patchFinancial(projectId, {
      capitalChannels: channels.includes(c)
        ? channels.filter((x) => x !== c)
        : [...channels, c],
    });

  return (
    <div className={css.form}>
      <Field
        label="Capital channels"
        hint="Covenant-permitted channels only — no interest-bearing or advance-purchase capital."
      >
        <MultiChoice
          ariaLabel="Capital channels"
          options={CAPITAL_CHANNELS}
          values={channels}
          onToggle={toggle}
        />
      </Field>

      <Field label="Is the funding secured?">
        <ChoiceRow
          ariaLabel="Funding secured"
          options={TRISTATE}
          value={tn?.financial.fundingSecured ?? 'unknown'}
          onChange={(v) => patchFinancial(projectId, { fundingSecured: v })}
        />
      </Field>

      <Field
        label="Confidence in carrying costs"
        hint="Taxes, insurance, upkeep — can the project sustain them?"
      >
        <ChoiceRow
          ariaLabel="Carrying-cost confidence"
          options={CONFIDENCE}
          value={tn?.financial.carryingCostConfidence ?? 'unknown'}
          onChange={(v) => patchFinancial(projectId, { carryingCostConfidence: v })}
        />
      </Field>
    </div>
  );
}

/* ── 5. Access & Market Fit ──────────────────────────────────────────── */

const ROAD_ACCESS: readonly Option<
  'good' | 'adequate' | 'poor' | 'none' | 'unknown'
>[] = [
  { value: 'good', label: 'Good' },
  { value: 'adequate', label: 'Adequate' },
  { value: 'poor', label: 'Poor' },
  { value: 'none', label: 'None' },
  { value: 'unknown', label: 'Not sure' },
];

export function AccessMarketIntake({ projectId }: FormProps) {
  const tn = useTrueNorthStore((s) => s.profilesByProject[projectId]);
  const patchAccessMarket = useTrueNorthStore((s) => s.patchAccessMarket);

  return (
    <div className={css.form}>
      <Field label="Road access quality">
        <ChoiceRow
          ariaLabel="Road access"
          options={ROAD_ACCESS}
          value={tn?.accessMarket.roadAccess ?? 'unknown'}
          onChange={(v) => patchAccessMarket(projectId, { roadAccess: v })}
        />
      </Field>

      <Field label="Year-round / winter access?">
        <ChoiceRow
          ariaLabel="Seasonal access"
          options={TRISTATE}
          value={tn?.accessMarket.seasonalAccess ?? 'unknown'}
          onChange={(v) => patchAccessMarket(projectId, { seasonalAccess: v })}
        />
      </Field>

      <Field
        label="Distance to audience / market (km)"
        hint="Optional — how far to the people this land serves."
      >
        <input
          className={css.input}
          type="number"
          min={0}
          value={tn?.accessMarket.distanceToAudienceKm ?? ''}
          placeholder="e.g. 12"
          onChange={(e) =>
            patchAccessMarket(projectId, {
              distanceToAudienceKm:
                e.target.value === '' ? null : Number(e.target.value),
            })
          }
        />
      </Field>
    </div>
  );
}

/* ── 6. Ecological Non-Negotiables ───────────────────────────────────── */

const ECO_FEATURES: readonly Option<EcologicalFeature>[] = [
  { value: 'wetlands', label: 'Wetlands' },
  { value: 'endangered-habitat', label: 'Endangered habitat' },
  { value: 'floodplain', label: 'Floodplain' },
  { value: 'erosion-slopes', label: 'Erosion slopes' },
  { value: 'old-growth', label: 'Old growth' },
  { value: 'riparian', label: 'Riparian' },
  { value: 'conservation-easement', label: 'Conservation easement' },
  { value: 'cultural-sacred', label: 'Cultural / sacred' },
];

const CONSERVATION_OVERLAY: readonly Option<
  'none' | 'buffer-only' | 'partial' | 'extensive' | 'unknown'
>[] = [
  { value: 'none', label: 'None' },
  { value: 'buffer-only', label: 'Buffer only' },
  { value: 'partial', label: 'Partial' },
  { value: 'extensive', label: 'Extensive' },
  { value: 'unknown', label: 'Not sure' },
];

const FLOODPLAIN_EXTENT: readonly Option<
  'none' | 'fringe' | 'partial' | 'extensive' | 'unknown'
>[] = [
  { value: 'none', label: 'None' },
  { value: 'fringe', label: 'Fringe' },
  { value: 'partial', label: 'Partial' },
  { value: 'extensive', label: 'Extensive' },
  { value: 'unknown', label: 'Not sure' },
];

export function EcologicalIntake({ projectId }: FormProps) {
  const tn = useTrueNorthStore((s) => s.profilesByProject[projectId]);
  const patchEcological = useTrueNorthStore((s) => s.patchEcological);
  const sp = useSiteProfileStore((s) => s.profilesByProject[projectId]);
  const setFacet = useSiteProfileStore((s) => s.setFacet);
  const features = tn?.ecological.protectedFeatures ?? [];

  const toggle = (f: EcologicalFeature) =>
    patchEcological(projectId, {
      protectedFeatures: features.includes(f)
        ? features.filter((x) => x !== f)
        : [...features, f],
    });

  return (
    <div className={css.form}>
      <Field
        label="Sensitive features present"
        hint="Anything that must be protected. Leave blank if none apply."
      >
        <MultiChoice
          ariaLabel="Protected features"
          options={ECO_FEATURES}
          values={features}
          onToggle={toggle}
        />
      </Field>

      <Field label="Do you commit to respecting these features?">
        <ChoiceRow
          ariaLabel="Respect commitment"
          options={TRISTATE}
          value={tn?.ecological.respectCommitment ?? 'unknown'}
          onChange={(v) => patchEcological(projectId, { respectCommitment: v })}
        />
      </Field>

      <Field label="Conservation overlay">
        <ChoiceRow
          ariaLabel="Conservation overlay"
          options={CONSERVATION_OVERLAY}
          value={sp?.conservationOverlay.value ?? 'unknown'}
          onChange={(v) => setFacet(projectId, 'conservationOverlay', v, 'manual')}
        />
      </Field>

      <Field label="Floodplain extent">
        <ChoiceRow
          ariaLabel="Floodplain extent"
          options={FLOODPLAIN_EXTENT}
          value={sp?.floodplainExtent.value ?? 'unknown'}
          onChange={(v) => setFacet(projectId, 'floodplainExtent', v, 'manual')}
        />
      </Field>
    </div>
  );
}

/* ── 7. Human & Neighbour Fit ────────────────────────────────────────── */

const PROXIMITY: readonly Option<
  'isolated' | 'moderate' | 'close' | 'unknown'
>[] = [
  { value: 'isolated', label: 'Isolated' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'close', label: 'Close' },
  { value: 'unknown', label: 'Not sure' },
];

const RISK: readonly Option<'low' | 'medium' | 'high' | 'unknown'>[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'unknown', label: 'Not sure' },
];

const ATTITUDE: readonly Option<
  'supportive' | 'neutral' | 'resistant' | 'unknown'
>[] = [
  { value: 'supportive', label: 'Supportive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'resistant', label: 'Resistant' },
  { value: 'unknown', label: 'Not sure' },
];

export function HumanNeighbourIntake({ projectId }: FormProps) {
  const tn = useTrueNorthStore((s) => s.profilesByProject[projectId]);
  const patch = useTrueNorthStore((s) => s.patchHumanNeighbour);

  return (
    <div className={css.form}>
      <Field label="Neighbour proximity">
        <ChoiceRow
          ariaLabel="Neighbour proximity"
          options={PROXIMITY}
          value={tn?.humanNeighbour.neighbourProximity ?? 'unknown'}
          onChange={(v) => patch(projectId, { neighbourProximity: v })}
        />
      </Field>

      <Field label="Conflict risk">
        <ChoiceRow
          ariaLabel="Conflict risk"
          options={RISK}
          value={tn?.humanNeighbour.conflictRisk ?? 'unknown'}
          onChange={(v) => patch(projectId, { conflictRisk: v })}
        />
      </Field>

      <Field label="Municipal attitude">
        <ChoiceRow
          ariaLabel="Municipal attitude"
          options={ATTITUDE}
          value={tn?.humanNeighbour.municipalAttitude ?? 'unknown'}
          onChange={(v) => patch(projectId, { municipalAttitude: v })}
        />
      </Field>
    </div>
  );
}

/* ── 8. Deal Breakers & Red Flags ────────────────────────────────────── */

const DEAL_BREAKERS: readonly Option<DealBreaker>[] = [
  { value: 'no-legal-access', label: 'No legal access' },
  { value: 'zoning-prohibits-core-use', label: 'Zoning prohibits core use' },
  { value: 'no-water-path', label: 'No lawful water path' },
  { value: 'floodplain-covers-build', label: 'Floodplain covers build' },
  { value: 'conservation-blocks-infrastructure', label: 'Conservation blocks infrastructure' },
  { value: 'extreme-neighbour-conflict', label: 'Extreme neighbour conflict' },
  { value: 'tenure-too-short', label: 'Tenure too short' },
  { value: 'soil-contamination', label: 'Soil contamination' },
  { value: 'unsafe-access-road', label: 'Unsafe access road' },
  { value: 'no-winter-access', label: 'No winter access' },
  { value: 'capital-exceeds-threshold', label: 'Capital exceeds threshold' },
  { value: 'no-lawful-public-activity', label: 'No lawful public activity' },
];

export function DealBreakersIntake({ projectId }: FormProps) {
  const tn = useTrueNorthStore((s) => s.profilesByProject[projectId]);
  const setDealBreakers = useTrueNorthStore((s) => s.setDealBreakers);
  const current = tn?.dealBreakers ?? [];

  const toggle = (d: DealBreaker) =>
    setDealBreakers(
      projectId,
      current.includes(d) ? current.filter((x) => x !== d) : [...current, d],
    );

  return (
    <div className={css.form}>
      <div className={css.note}>
        <AlertTriangle size={15} className={css.noteIcon} strokeWidth={2} />
        <span>
          Flag only conditions that are genuinely present. Any one of these can
          force the Fit Gate to its strongest verdict — but the gate is advisory:
          you can always proceed.
        </span>
      </div>

      <Field label="Hard-stop conditions present">
        <MultiChoice
          ariaLabel="Deal breakers"
          options={DEAL_BREAKERS}
          values={current}
          onToggle={toggle}
        />
      </Field>
    </div>
  );
}
