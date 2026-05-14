/**
 * Goal Compass tab 2/4 — site facets with per-facet provenance stamps.
 *
 * Each facet's `provenance` is one of `'observe' | 'manual' | null`.
 * MVP wires manual entry only; Observe-prefill is a follow-up that will
 * pull from the Observe stores (`useHumanContextStore`, `useTopographyStore`,
 * `useWaterSystemsStore`) and flip provenance to `'observe'` per facet.
 */

import { useEffect } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useSiteProfileStore } from '../../../../store/siteProfileStore.js';
import type {
  Household,
  SoilCompaction,
  WaterPosture,
} from '../../data/goalCompassTypes.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const COMPACTION_OPTIONS: SoilCompaction[] = ['low', 'med', 'high'];
const WATER_OPTIONS: WaterPosture[] = ['rainfed', 'irrigated', 'pond-fed', 'mixed'];

export default function SiteProfileTab({ project }: Props) {
  const ensureDefault = useSiteProfileStore((s) => s.ensureDefault);
  const profile = useSiteProfileStore(
    (s) => s.profilesByProject[project.id] ?? null,
  );
  const setFacet = useSiteProfileStore((s) => s.setFacet);

  useEffect(() => {
    ensureDefault(project.id);
  }, [project.id, ensureDefault]);

  if (!profile) {
    return <div className={styles.empty}>Initializing site profile…</div>;
  }

  const facetList = [
    profile.acres,
    profile.climateZone,
    profile.primaryLandform,
    profile.avgSlopePct,
    profile.currentLandCover,
    profile.soilCompaction,
    profile.waterPosture,
    profile.hazards,
    profile.household,
  ];
  const filled = facetList.filter((f) => f.value !== null);
  const counts = {
    filled: filled.length,
    manual: filled.filter((f) => f.provenance === 'manual').length,
    observe: filled.filter((f) => f.provenance === 'observe').length,
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Goal Compass · 2 of 4</span>
        <h2 className={styles.title}>Site profile</h2>
        <p className={styles.lede}>
          Facts about the parcel that drive intervention eligibility. Each
          facet carries a provenance stamp — manual entries lower the
          forecast confidence until verified from Observe data.
        </p>
        <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(232,220,200,0.55)' }}>
          {counts.filled} of 9 facets filled · {counts.manual} manual ·{' '}
          {counts.observe} from Observe
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Parcel</h3>
        <div className={styles.grid}>
          <FacetNumberField
            label="Acres"
            value={profile.acres.value}
            provenance={profile.acres.provenance}
            onChange={(v) => setFacet(project.id, 'acres', v, 'manual')}
          />
          <FacetTextField
            label="Climate zone (e.g. 5b, 6a)"
            value={profile.climateZone.value}
            provenance={profile.climateZone.provenance}
            onChange={(v) => setFacet(project.id, 'climateZone', v, 'manual')}
          />
          <FacetTextField
            label="Primary landform"
            value={profile.primaryLandform.value}
            provenance={profile.primaryLandform.provenance}
            onChange={(v) => setFacet(project.id, 'primaryLandform', v, 'manual')}
          />
          <FacetNumberField
            label="Avg slope (%)"
            value={profile.avgSlopePct.value}
            provenance={profile.avgSlopePct.provenance}
            onChange={(v) => setFacet(project.id, 'avgSlopePct', v, 'manual')}
          />
          <FacetTextField
            label="Current land cover"
            value={profile.currentLandCover.value}
            provenance={profile.currentLandCover.provenance}
            onChange={(v) => setFacet(project.id, 'currentLandCover', v, 'manual')}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Conditions</h3>
        <div className={styles.grid}>
          <FacetSelectField
            label="Soil compaction"
            value={profile.soilCompaction.value}
            options={COMPACTION_OPTIONS}
            provenance={profile.soilCompaction.provenance}
            onChange={(v) =>
              setFacet(project.id, 'soilCompaction', v as SoilCompaction, 'manual')
            }
          />
          <FacetSelectField
            label="Water posture"
            value={profile.waterPosture.value}
            options={WATER_OPTIONS}
            provenance={profile.waterPosture.provenance}
            onChange={(v) =>
              setFacet(project.id, 'waterPosture', v as WaterPosture, 'manual')
            }
          />
          <FacetTextField
            label="Hazards (comma separated)"
            value={profile.hazards.value ? profile.hazards.value.join(', ') : null}
            provenance={profile.hazards.provenance}
            onChange={(v) =>
              setFacet(
                project.id,
                'hazards',
                v
                  ? v
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : null,
                'manual',
              )
            }
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Household</h3>
        <div className={styles.grid}>
          <FacetNumberField
            label="Adults"
            value={profile.household.value?.adults ?? null}
            provenance={profile.household.provenance}
            onChange={(v) => {
              const cur: Household = profile.household.value ?? { adults: 0, children: 0 };
              setFacet(
                project.id,
                'household',
                v === null ? null : { ...cur, adults: v },
                'manual',
              );
            }}
          />
          <FacetNumberField
            label="Children"
            value={profile.household.value?.children ?? null}
            provenance={profile.household.provenance}
            onChange={(v) => {
              const cur: Household = profile.household.value ?? { adults: 0, children: 0 };
              setFacet(
                project.id,
                'household',
                v === null ? null : { ...cur, children: v },
                'manual',
              );
            }}
          />
        </div>
      </section>
    </div>
  );
}

function ProvenancePill({ provenance }: { provenance: 'observe' | 'manual' | null }) {
  if (provenance === 'observe') {
    return <span className={`${styles.pill} ${styles.pillMet}`}>Observe</span>;
  }
  if (provenance === 'manual') {
    return <span className={`${styles.pill} ${styles.pillPartial}`}>Manual</span>;
  }
  return <span className={styles.pill}>Unset</span>;
}

function FacetTextField({
  label,
  value,
  provenance,
  onChange,
}: {
  label: string;
  value: string | null;
  provenance: 'observe' | 'manual' | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className={styles.field}>
      <label>
        {label} <ProvenancePill provenance={provenance} />
      </label>
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? e.target.value : null)}
      />
    </div>
  );
}

function FacetNumberField({
  label,
  value,
  provenance,
  onChange,
}: {
  label: string;
  value: number | null;
  provenance: 'observe' | 'manual' | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className={styles.field}>
      <label>
        {label} <ProvenancePill provenance={provenance} />
      </label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange(null);
          const n = Number(raw);
          if (Number.isNaN(n)) return onChange(null);
          onChange(n);
        }}
      />
    </div>
  );
}

function FacetSelectField({
  label,
  value,
  options,
  provenance,
  onChange,
}: {
  label: string;
  value: string | null;
  options: readonly string[];
  provenance: 'observe' | 'manual' | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className={styles.field}>
      <label>
        {label} <ProvenancePill provenance={provenance} />
      </label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
