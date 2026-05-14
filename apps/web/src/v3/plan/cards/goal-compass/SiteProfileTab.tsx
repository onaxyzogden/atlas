/**
 * Goal Compass tab 2/4 — site facets with per-facet provenance stamps.
 *
 * Each facet's `provenance` is one of `'observe' | 'manual' | null`.
 * MVP wires manual entry only; Observe-prefill is a follow-up that will
 * pull from the Observe stores (`useHumanContextStore`, `useTopographyStore`,
 * `useWaterSystemsStore`) and flip provenance to `'observe'` per facet.
 */

import { useEffect, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useSiteProfileStore } from '../../../../store/siteProfileStore.js';
import { useObservePrefill } from '../../engine/goalCompass/observePrefill.js';
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
  const { candidates, applyAll, applyOne } = useObservePrefill(project.id);
  const [prefillNote, setPrefillNote] = useState<string | null>(null);

  useEffect(() => {
    ensureDefault(project.id);
  }, [project.id, ensureDefault]);

  const candidateCount = Object.keys(candidates).length;
  const handlePrefillAll = () => {
    const applied = applyAll();
    setPrefillNote(
      applied > 0
        ? `Prefilled ${applied} facet${applied === 1 ? '' : 's'} from Observe — review and edit any that look wrong.`
        : 'No unset facets to prefill — Observe candidates already applied or overridden.',
    );
  };

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
    profile.lastFrostDate,
    profile.firstFrostDate,
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
        <span className={styles.heroTag}>Goal Compass · 2 of 5</span>
        <h2 className={styles.title}>Site profile</h2>
        <p className={styles.lede}>
          Facts about the parcel that drive intervention eligibility. Each
          facet carries a provenance stamp — manual entries lower the
          forecast confidence until verified from Observe data.
        </p>
        <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(232,220,200,0.55)' }}>
          {counts.filled} of 11 facets filled · {counts.manual} manual ·{' '}
          {counts.observe} from Observe
        </div>
        <div className={styles.btnRow} style={{ marginTop: 12 }}>
          <button
            type="button"
            className={styles.btn}
            onClick={handlePrefillAll}
            disabled={candidateCount === 0}
            title={
              candidateCount === 0
                ? 'No Observe data available for this project yet.'
                : `${candidateCount} facet${candidateCount === 1 ? '' : 's'} available from Observe`
            }
          >
            Prefill from Observe
          </button>
          {prefillNote ? (
            <span
              className={styles.hint}
              role="status"
              aria-live="polite"
              style={{ fontSize: 12 }}
            >
              {prefillNote}
            </span>
          ) : null}
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
            prefillRef={candidates.acres?.observeFieldRef}
            onPrefill={candidates.acres ? () => applyOne('acres') : undefined}
          />
          <FacetTextField
            label="Climate zone (e.g. 5b, 6a)"
            value={profile.climateZone.value}
            provenance={profile.climateZone.provenance}
            onChange={(v) => setFacet(project.id, 'climateZone', v, 'manual')}
            prefillRef={candidates.climateZone?.observeFieldRef}
            onPrefill={candidates.climateZone ? () => applyOne('climateZone') : undefined}
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
            prefillRef={candidates.avgSlopePct?.observeFieldRef}
            onPrefill={candidates.avgSlopePct ? () => applyOne('avgSlopePct') : undefined}
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
            prefillRef={candidates.waterPosture?.observeFieldRef}
            onPrefill={candidates.waterPosture ? () => applyOne('waterPosture') : undefined}
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
            prefillRef={candidates.hazards?.observeFieldRef}
            onPrefill={candidates.hazards ? () => applyOne('hazards') : undefined}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Frost normals</h3>
        <div className={styles.grid}>
          <FacetTextField
            label="Last frost (spring, YYYY-MM-DD)"
            value={profile.lastFrostDate.value}
            provenance={profile.lastFrostDate.provenance}
            onChange={(v) => setFacet(project.id, 'lastFrostDate', v, 'manual')}
            prefillRef={candidates.lastFrostDate?.observeFieldRef}
            onPrefill={candidates.lastFrostDate ? () => applyOne('lastFrostDate') : undefined}
          />
          <FacetTextField
            label="First frost (fall, YYYY-MM-DD)"
            value={profile.firstFrostDate.value}
            provenance={profile.firstFrostDate.provenance}
            onChange={(v) => setFacet(project.id, 'firstFrostDate', v, 'manual')}
            prefillRef={candidates.firstFrostDate?.observeFieldRef}
            onPrefill={candidates.firstFrostDate ? () => applyOne('firstFrostDate') : undefined}
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
            prefillRef={candidates.household?.observeFieldRef}
            onPrefill={candidates.household ? () => applyOne('household') : undefined}
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

function PrefillButton({
  candidateRef,
  onClick,
}: {
  candidateRef: string | undefined;
  onClick: () => void;
}) {
  if (!candidateRef) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`Pull from Observe (${candidateRef})`}
      aria-label="Pull from Observe"
      style={{
        marginLeft: 6,
        padding: '0 6px',
        fontSize: 11,
        lineHeight: '16px',
        background: 'transparent',
        border: '1px solid rgba(212,182,99,0.45)',
        borderRadius: 4,
        color: 'rgba(245,225,170,0.85)',
        cursor: 'pointer',
      }}
    >
      ↻ Observe
    </button>
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
  prefillRef,
  onPrefill,
}: {
  label: string;
  value: string | null;
  provenance: 'observe' | 'manual' | null;
  onChange: (v: string | null) => void;
  prefillRef?: string;
  onPrefill?: () => void;
}) {
  return (
    <div className={styles.field}>
      <label>
        {label} <ProvenancePill provenance={provenance} />
        {onPrefill ? <PrefillButton candidateRef={prefillRef} onClick={onPrefill} /> : null}
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
  prefillRef,
  onPrefill,
}: {
  label: string;
  value: number | null;
  provenance: 'observe' | 'manual' | null;
  onChange: (v: number | null) => void;
  prefillRef?: string;
  onPrefill?: () => void;
}) {
  return (
    <div className={styles.field}>
      <label>
        {label} <ProvenancePill provenance={provenance} />
        {onPrefill ? <PrefillButton candidateRef={prefillRef} onClick={onPrefill} /> : null}
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
  prefillRef,
  onPrefill,
}: {
  label: string;
  value: string | null;
  options: readonly string[];
  provenance: 'observe' | 'manual' | null;
  onChange: (v: string | null) => void;
  prefillRef?: string;
  onPrefill?: () => void;
}) {
  return (
    <div className={styles.field}>
      <label>
        {label} <ProvenancePill provenance={provenance} />
        {onPrefill ? <PrefillButton candidateRef={prefillRef} onClick={onPrefill} /> : null}
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
