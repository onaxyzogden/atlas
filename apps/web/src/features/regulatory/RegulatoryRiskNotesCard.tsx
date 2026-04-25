/**
 * §21 RegulatoryRiskNotesCard — structured regulatory risk surfaces with
 * stewardship hand-off notes.
 *
 * The existing RegulatoryPanel surfaces a permit checklist and a numeric
 * risk score, but neither answers "what specific regulatory risk surfaces
 * apply to this project right now?" — the question a steward needs when
 * preparing a pre-consultation packet for a planner or Conservation
 * Authority.
 *
 * This card lists seven canonical regulatory risk categories (zoning
 * variance, conservation authority review, flood-zone permit, well water
 * testing, septic approval, livestock setback bylaw, agritourism license)
 * with a per-category likelihood (likely / possible / unlikely / n/a)
 * derived from existing project fields, designed entities, and fetched
 * site-data layers. Each row carries a one-paragraph rationale and a
 * "next step" the steward can act on. Orientation only — not legal advice.
 */
import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import css from './RegulatoryRiskNotesCard.module.css';

interface RegulatoryRiskNotesCardProps {
  project: LocalProject;
}

type Likelihood = 'likely' | 'possible' | 'unlikely' | 'na';

interface RiskCategory {
  key: string;
  label: string;
  likelihood: Likelihood;
  rationale: string;
  nextStep: string;
}

interface ZoningSummary {
  zoning_code?: string;
  permitted_uses?: string[];
}

interface FloodWetlandSummary {
  flood_zone?: string;
  has_significant_wetland?: boolean;
}

interface SoilsSummary {
  drainage_class?: string;
  farmland_class?: string;
}

export default function RegulatoryRiskNotesCard({ project }: RegulatoryRiskNotesCardProps) {
  const allStructures = useStructureStore((st) => st.structures);
  const allPaddocks = useLivestockStore((st) => st.paddocks);
  const allPaths = usePathStore((st) => st.paths);
  const allUtilities = useUtilityStore((st) => st.utilities);
  const siteData = useSiteData(project.id);

  const categories = useMemo<RiskCategory[]>(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);

    const zoning = siteData ? getLayerSummary<ZoningSummary>(siteData, 'zoning') : null;
    const floodWetland = siteData ? getLayerSummary<FloodWetlandSummary>(siteData, 'wetlands_flood') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;

    const isHospitality = project.projectType === 'retreat_center' || project.projectType === 'moontrance';
    const isFarm = project.projectType === 'regenerative_farm' || project.projectType === 'multi_enterprise';

    const hasDwelling = structures.some(
      (s) => STRUCTURE_TEMPLATES[s.type]?.category === 'dwelling',
    );
    const hasWell = utilities.some((u) => u.type === 'well_pump');
    const hasSeptic = utilities.some((u) => u.type === 'septic');
    const hasLivestock = paddocks.length > 0;
    const hasMainRoad = paths.some((p) => p.type === 'main_road');

    const out: RiskCategory[] = [];

    // 1. Zoning variance
    {
      const zoningCode = zoning?.zoning_code?.toLowerCase() ?? '';
      const isAg = zoningCode.startsWith('a') || zoningCode.includes('agri') || zoningCode.includes('farm');
      const usePermitsHospitality = zoning?.permitted_uses?.some((u) =>
        /retreat|hospitality|accommodation|guest|lodge|tourism/i.test(u),
      ) ?? false;
      let likelihood: Likelihood = 'possible';
      let rationale = 'Without a fetched zoning layer, variance risk is unknown.';
      let nextStep = 'Pull the municipal zoning code and the list of permitted uses.';
      if (isHospitality && isAg && !usePermitsHospitality) {
        likelihood = 'likely';
        rationale = 'Hospitality / retreat use on agricultural-zoned land typically requires a site-specific zoning amendment or minor variance. Permitted uses do not appear to include guest accommodation.';
        nextStep = 'Open a pre-consultation with the municipal planner; budget 6–18 months for an amendment cycle.';
      } else if (isHospitality && isAg && usePermitsHospitality) {
        likelihood = 'unlikely';
        rationale = 'The zoning code permits hospitality / retreat use directly. No amendment is anticipated for the planned program.';
        nextStep = 'Confirm by-law fine-print (occupancy caps, frontage requirements) before structure placement.';
      } else if (zoning?.zoning_code) {
        likelihood = 'unlikely';
        rationale = 'No conflict between the planned project type and the fetched zoning code is detected.';
        nextStep = 'Re-check if the program changes (e.g., adding events / commercial agriculture).';
      }
      out.push({ key: 'zoning_variance', label: 'Zoning variance / amendment', likelihood, rationale, nextStep });
    }

    // 2. Conservation Authority / regulated-area review
    {
      let likelihood: Likelihood = 'possible';
      let rationale = 'Most rural Ontario sites trigger Conservation Authority review for any permanent structure within or adjacent to regulated features.';
      let nextStep = 'Contact the local CA for a pre-consultation map of regulated area on the parcel.';
      if (floodWetland?.has_significant_wetland) {
        likelihood = 'likely';
        rationale = 'A Provincially Significant Wetland is mapped on or adjacent to the parcel. CA review is mandatory for any development within the regulated area.';
        nextStep = 'Stake the wetland boundary in the field; budget 60–120 days for CA permit review.';
      } else if (project.country === 'CA' && project.provinceState === 'ON') {
        likelihood = 'possible';
        rationale = 'Ontario CA jurisdictions cover most rural watersheds. Even outside mapped wetlands, watercourses and steep slopes can trigger review.';
        nextStep = 'Submit a regulated-area inquiry by parcel roll number — turnaround is typically 2–4 weeks.';
      } else if (project.country !== 'CA') {
        likelihood = 'na';
        rationale = 'Conservation Authority structure is Ontario-specific. Equivalent watershed agencies vary by jurisdiction.';
        nextStep = 'Identify the equivalent watershed / drainage authority for the project location.';
      }
      out.push({ key: 'conservation_authority', label: 'Conservation authority review', likelihood, rationale, nextStep });
    }

    // 3. Flood-zone permit
    {
      let likelihood: Likelihood = 'unlikely';
      let rationale = 'No mapped flood zone on the parcel based on the fetched flood layer.';
      let nextStep = 'Re-verify after any boundary change or new structure placement near drainage features.';
      if (floodWetland?.flood_zone === 'AE') {
        likelihood = 'likely';
        rationale = 'Parcel is within FEMA AE Special Flood Hazard Area. Structures, fill, and grading require flood-plain permits and elevation certificates; flood insurance is mandatory.';
        nextStep = 'Engage a flood-mitigation engineer before siting any permanent structure.';
      } else if (floodWetland?.flood_zone && floodWetland.flood_zone !== 'X') {
        likelihood = 'possible';
        rationale = `Parcel intersects FEMA flood zone "${floodWetland.flood_zone}". Permit triggers depend on the specific structure and grading proposed.`;
        nextStep = 'Pull the FIRMette for the parcel and confirm BFE (base flood elevation).';
      } else if (!floodWetland) {
        likelihood = 'possible';
        rationale = 'Flood / wetland layer not fetched. Risk cannot be derived without the data.';
        nextStep = 'Fetch the flood layer from the Site Data panel.';
      }
      out.push({ key: 'flood_permit', label: 'Flood-zone development permit', likelihood, rationale, nextStep });
    }

    // 4. Well water testing
    {
      let likelihood: Likelihood = 'unlikely';
      let rationale = 'No well placed and no dwelling planned, so well testing is not on the critical path.';
      let nextStep = 'Re-evaluate if a well or dwelling is added.';
      if (hasWell || hasDwelling) {
        likelihood = 'likely';
        rationale = 'Private well water serving a dwelling typically requires lab testing for bacteria + nitrate before occupancy permit, and ongoing sampling per provincial code.';
        nextStep = 'Schedule baseline bacteriological + chemical panel; document a sampling cadence in operations notes.';
      } else if (isHospitality) {
        likelihood = 'likely';
        rationale = 'Hospitality / retreat use intensifies water-quality testing requirements (often quarterly bacteriological panels for guest-serving wells).';
        nextStep = 'Confirm Public Health Unit testing schedule for guest-serving private water systems.';
      }
      out.push({ key: 'well_water_testing', label: 'Well water testing', likelihood, rationale, nextStep });
    }

    // 5. Septic approval
    {
      let likelihood: Likelihood = 'unlikely';
      let rationale = 'No dwelling planned, so septic approval is not yet on the critical path.';
      let nextStep = 'Re-evaluate if any habitable structure is added.';
      if (hasDwelling && !hasSeptic) {
        likelihood = 'likely';
        rationale = 'A dwelling is planned without a septic system placed. Building permit will not issue without an approved on-site sewage system unless municipal sewer is available.';
        nextStep = 'Place a septic location and engage a designer for a percolation test on the proposed leach-field area.';
      } else if (hasDwelling && hasSeptic) {
        likelihood = 'possible';
        rationale = 'Septic system planned. Approval is routine but design class depends on dwelling occupancy and soil percolation rate.';
        nextStep = 'Verify septic class against intended occupancy; confirm separation distance from any well placed.';
      }
      if (hasDwelling && hasSeptic && soils?.drainage_class && /poor|very poor/i.test(soils.drainage_class)) {
        likelihood = 'likely';
        rationale = 'Soil drainage class is poor — conventional leach-fields are unlikely to receive approval; expect a Class 4 (raised) or Class 5 (holding tank) requirement.';
        nextStep = 'Budget for an engineered raised system; verify separation from groundwater table.';
      }
      out.push({ key: 'septic_approval', label: 'Septic system approval', likelihood, rationale, nextStep });
    }

    // 6. Livestock setback bylaw (MDS / equivalent)
    {
      let likelihood: Likelihood = 'unlikely';
      let rationale = 'No livestock paddocks placed; nutrient-management / minimum-distance separation rules are not currently triggered.';
      let nextStep = 'Re-evaluate if livestock is added.';
      if (hasLivestock && isFarm) {
        likelihood = 'likely';
        rationale = 'Livestock barns and manure storage trigger minimum-distance separation (MDS) bylaws. Setback distances scale with animal units and existing neighbouring dwellings.';
        nextStep = 'Run an MDS calculation against neighbouring residences; document setback compliance in the design brief.';
      } else if (hasLivestock) {
        likelihood = 'possible';
        rationale = 'Livestock present without a primary agricultural project type. Confirm the land-use bylaw permits the planned livestock load.';
        nextStep = 'Verify livestock count and species against the permitted-uses list.';
      }
      out.push({ key: 'livestock_setback', label: 'Livestock setback / MDS bylaw', likelihood, rationale, nextStep });
    }

    // 7. Agritourism / event license
    {
      let likelihood: Likelihood = 'na';
      let rationale = 'Project type does not currently include hospitality / event hosting.';
      let nextStep = 'Re-evaluate if event hosting or short-term rental is added.';
      if (isHospitality) {
        likelihood = 'likely';
        rationale = 'Retreat / accommodation / event hosting requires short-term-rental, fire-code, and (for groups) gathering / event licensing in most municipalities.';
        nextStep = 'Itemize required licenses by municipality before pricing the hospitality program.';
      } else if (isFarm && hasMainRoad) {
        likelihood = 'possible';
        rationale = 'Working farms with public road access often add agritourism (farm stand, U-pick, tours) which can trigger commercial-use review.';
        nextStep = 'Decide whether agritourism is in scope before submitting building permits — it changes the use class.';
      }
      out.push({ key: 'agritourism_license', label: 'Agritourism / event license', likelihood, rationale, nextStep });
    }

    return out;
  }, [project, siteData, allStructures, allPaddocks, allPaths, allUtilities]);

  const counts = {
    likely: categories.filter((c) => c.likelihood === 'likely').length,
    possible: categories.filter((c) => c.likelihood === 'possible').length,
    unlikely: categories.filter((c) => c.likelihood === 'unlikely').length,
    na: categories.filter((c) => c.likelihood === 'na').length,
  };

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Regulatory Risk Notes</h3>
          <p className={css.cardHint}>
            Seven canonical regulatory surfaces with a derived likelihood + stewardship next step. Use this as the
            scaffold for a planner / Conservation Authority pre-consultation packet — not as legal advice.
          </p>
        </div>
        <span className={css.heuristicBadge}>ORIENTATION</span>
      </div>

      <div className={css.tallyRow}>
        <Tally label="Likely" value={counts.likely} cls={css.toneLikely} />
        <Tally label="Possible" value={counts.possible} cls={css.tonePossible} />
        <Tally label="Unlikely" value={counts.unlikely} cls={css.toneUnlikely} />
        <Tally label="N/A" value={counts.na} cls={css.toneNa} />
      </div>

      <ul className={css.riskList}>
        {categories.map((cat) => (
          <li key={cat.key} className={`${css.riskRow} ${css[`risk_${cat.likelihood}`]}`}>
            <div className={css.riskHead}>
              <span className={css.riskLabel}>{cat.label}</span>
              <span className={css.riskBadge}>{badgeText(cat.likelihood)}</span>
            </div>
            <div className={css.riskRationale}>{cat.rationale}</div>
            <div className={css.riskNextStep}>
              <span className={css.nextStepKey}>Next step</span>
              <span>{cat.nextStep}</span>
            </div>
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        Likelihoods are derived from existing project fields, placed entities, and fetched site-data layers.
        Categories tagged <em>n/a</em> are switched off because no current input triggers them — adding a dwelling,
        livestock, or hospitality program will re-activate them. Always verify with the relevant authority before
        making design or financing decisions.
      </p>
    </div>
  );
}

function Tally({ label, value, cls }: { label: string; value: number; cls: string | undefined }) {
  return (
    <div className={css.tally}>
      <div className={`${css.tallyValue} ${cls ?? ''}`}>{value}</div>
      <div className={css.tallyLabel}>{label}</div>
    </div>
  );
}

function badgeText(l: Likelihood): string {
  return l === 'likely' ? 'Likely' : l === 'possible' ? 'Possible' : l === 'unlikely' ? 'Unlikely' : 'N/A';
}
