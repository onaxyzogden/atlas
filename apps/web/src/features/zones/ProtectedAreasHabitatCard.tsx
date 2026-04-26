/**
 * §3 ProtectedAreasHabitatCard — surface protected-area proximity and
 * critical-habitat presence as a stewardship-posture card.
 *
 * Reads from layers already fetched into siteData:
 *   - InfrastructureSummary: protected_area_nearest_km / _name / _count
 *   - CriticalHabitatSummary: on_site, species_on_site, species_nearby,
 *     species_list, primary_species, primary_status, listing_date
 *
 * Output: a HEURISTIC card with a posture summary (CRITICAL / SENSITIVE /
 * AWARE / CLEAR), per-data-source rows quoting the actual values, and a
 * stewardship recommendation list keyed on the combined posture.
 *
 * Pure presentation layer — no shared math, no new entities, no map
 * overlay. Closes §3 manifest item `habitat-wildlife-corridors` (P2
 * planned → done) — the manifest label "Habitat, wildlife corridor,
 * protected species notes" maps directly to these two layer summaries.
 */

import { useMemo } from 'react';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import s from './ProtectedAreasHabitatCard.module.css';

// Local narrowing — these summary shapes live in @ogden/shared/scoring/layerSummary
// but are not re-exported via the package barrel. Mirroring the local-narrow
// pattern used by HydrologyRightPanel.
interface InfrastructureSummary {
  protected_area_nearest_km?: number | null;
  protected_area_name?: string | null;
  protected_area_count?: number | null;
}

interface CriticalHabitatSummary {
  on_site?: boolean;
  species_on_site?: number | null;
  species_nearby?: number | null;
  species_list?: string[];
  primary_species?: string | null;
  primary_status?: string | null;
  listing_date?: string | null;
}

interface Props {
  projectId: string;
}

type Posture = 'critical' | 'sensitive' | 'aware' | 'clear' | 'unknown';

interface Finding {
  source: 'protected-areas' | 'critical-habitat';
  headline: string;
  detail: string;
  posture: Posture;
}

function classifyProtectedAreaKm(km: number | null | undefined): Posture {
  if (km == null) return 'unknown';
  if (km <= 1) return 'sensitive';
  if (km <= 5) return 'aware';
  return 'clear';
}

function classifyHabitat(ch: CriticalHabitatSummary | null): Posture {
  if (!ch) return 'unknown';
  if (ch.on_site === true) return 'critical';
  if (typeof ch.species_nearby === 'number' && ch.species_nearby > 0) return 'sensitive';
  if (typeof ch.species_on_site === 'number' && ch.species_on_site > 0) return 'critical';
  return 'clear';
}

const POSTURE_RANK: Record<Posture, number> = {
  critical: 4,
  sensitive: 3,
  aware: 2,
  clear: 1,
  unknown: 0,
};

function worstPosture(...ps: Posture[]): Posture {
  let worst: Posture = 'unknown';
  for (const p of ps) {
    if (POSTURE_RANK[p] > POSTURE_RANK[worst]) worst = p;
  }
  return worst;
}

const POSTURE_LABEL: Record<Posture, string> = {
  critical: 'Critical',
  sensitive: 'Sensitive',
  aware: 'Aware',
  clear: 'Clear',
  unknown: 'Unknown',
};

const POSTURE_HEADLINE: Record<Posture, string> = {
  critical:
    'Critical-habitat presence detected on or directly adjacent to the parcel — federal-level review required before any clearing, grading, or earthworks.',
  sensitive:
    'Listed species nearby or protected-area boundary within 1 km — site planning should treat this as a sensitive-context project.',
  aware:
    'Protected lands within 5 km — keep regional ecology in mind for visitor traffic, light pollution, dog policy, and outflow water quality.',
  clear:
    'No on-site critical habitat and no protected lands within 5 km. Standard ecological diligence applies.',
  unknown:
    'Habitat / protected-area data not yet loaded for this site. Refresh the layer summaries from Map View to populate this card.',
};

function recommendationsFor(posture: Posture): string[] {
  switch (posture) {
    case 'critical':
      return [
        'Engage USFWS or equivalent national wildlife authority before any earth-disturbing activity.',
        'Commission a qualified biological survey (incidental-take risk + species-specific protocols).',
        'Re-route paths and structures away from on-site habitat polygons; treat the affected area as conservation zoning.',
        'Document baseline conditions photographically before any work — required for take-permit defense.',
      ];
    case 'sensitive':
      return [
        'Cross-reference state Natural Heritage Program records before clearing or grading.',
        'Establish a vegetated buffer (≥30 m) between the protected boundary and any active management.',
        'Schedule heavy work outside critical breeding windows (spring nesting / migration corridors).',
        'Coordinate with the protected-area land manager on proposed access points and visitor flow.',
      ];
    case 'aware':
      return [
        'Note protected-area proximity in the project brief — useful for grant narratives and stakeholder framing.',
        'Apply outdoor-lighting best practices (downward-cast, warm CCT) to avoid light spillage into adjacent habitat.',
        'Plan stormwater outflow with downstream water-quality margins in mind.',
        'Consider a "good neighbor" notice to the protected-area office before any visible structures go up.',
      ];
    case 'clear':
      return [
        'Maintain standard ecological diligence — soils, hydrology, native-species planting still apply.',
        'Re-check this card if the boundary or land use materially changes; new acquisitions can shift proximity.',
      ];
    case 'unknown':
      return [
        'Open the Map View and load the Infrastructure and Critical Habitat layers to populate this card.',
        'Until populated, default to a sensitive-context posture for any clearing-class work.',
      ];
  }
}

const STATUS_LABEL: Record<string, string> = {
  E: 'Endangered',
  T: 'Threatened',
  C: 'Candidate',
  PE: 'Proposed Endangered',
  PT: 'Proposed Threatened',
  endangered: 'Endangered',
  threatened: 'Threatened',
  candidate: 'Candidate',
};

function formatStatus(raw: string | null | undefined): string {
  if (!raw) return '';
  return STATUS_LABEL[raw] ?? raw;
}

function formatKm(km: number | null | undefined): string {
  if (km == null) return '—';
  if (km < 1) return `${(km * 1000).toFixed(0)} m`;
  return `${km.toFixed(1)} km`;
}

export default function ProtectedAreasHabitatCard({ projectId }: Props) {
  const siteData = useSiteData(projectId);

  const data = useMemo(() => {
    if (!siteData) return null;
    const infra = getLayerSummary<InfrastructureSummary>(siteData, 'infrastructure');
    const habitat = getLayerSummary<CriticalHabitatSummary>(siteData, 'critical_habitat');
    return { infra, habitat };
  }, [siteData]);

  const findings: Finding[] = useMemo(() => {
    if (!data) return [];
    const list: Finding[] = [];

    // Protected areas
    const paKm = data.infra?.protected_area_nearest_km ?? null;
    const paName = data.infra?.protected_area_name ?? null;
    const paCount = data.infra?.protected_area_count ?? null;
    if (paKm != null || paName || (paCount != null && paCount > 0)) {
      const posture = classifyProtectedAreaKm(paKm);
      const headline =
        posture === 'sensitive'
          ? 'Adjacent to protected lands'
          : posture === 'aware'
            ? 'Protected lands within reach'
            : posture === 'clear'
              ? 'No protected lands within 5 km'
              : 'Protected-area proximity recorded';
      const parts: string[] = [];
      if (paKm != null) parts.push(`Nearest protected area: ${formatKm(paKm)}`);
      if (paName) parts.push(`name: ${paName}`);
      if (paCount != null) parts.push(`${paCount} within search radius`);
      list.push({
        source: 'protected-areas',
        headline,
        detail: parts.join(' · '),
        posture,
      });
    } else if (data.infra) {
      list.push({
        source: 'protected-areas',
        headline: 'No protected-area proximity recorded',
        detail: 'Infrastructure layer loaded but did not return a nearest protected-area distance.',
        posture: 'clear',
      });
    } else {
      list.push({
        source: 'protected-areas',
        headline: 'Protected-area data not loaded',
        detail: 'Open Map View → Infrastructure layer to populate.',
        posture: 'unknown',
      });
    }

    // Critical habitat
    if (data.habitat) {
      const posture = classifyHabitat(data.habitat);
      const onSite = data.habitat.on_site === true;
      const sOn = data.habitat.species_on_site ?? 0;
      const sNear = data.habitat.species_nearby ?? 0;
      const headline = onSite
        ? 'Critical habitat designated on this parcel'
        : sNear > 0
          ? 'Listed species recorded nearby'
          : 'No critical-habitat designation on this parcel';
      const parts: string[] = [];
      if (onSite) parts.push('USFWS critical habitat: ON SITE');
      if (sOn > 0) parts.push(`${sOn} listed species on site`);
      if (sNear > 0) parts.push(`${sNear} listed species nearby`);
      if (data.habitat.primary_species && data.habitat.primary_status) {
        parts.push(
          `primary: ${data.habitat.primary_species} (${formatStatus(data.habitat.primary_status)})`,
        );
      }
      if (data.habitat.listing_date) {
        parts.push(`listed ${data.habitat.listing_date}`);
      }
      if (parts.length === 0) {
        parts.push('No on-site or nearby designations returned.');
      }
      list.push({
        source: 'critical-habitat',
        headline,
        detail: parts.join(' · '),
        posture,
      });
    } else {
      list.push({
        source: 'critical-habitat',
        headline: 'Critical-habitat data not loaded',
        detail: 'Open Map View → Critical Habitat layer to populate.',
        posture: 'unknown',
      });
    }

    return list;
  }, [data]);

  const overall: Posture = useMemo(
    () => worstPosture(...findings.map((f) => f.posture)),
    [findings],
  );

  if (!siteData) {
    return (
      <section className={s.card}>
        <header className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Protected areas & critical habitat</h3>
            <p className={s.cardHint}>
              Reads the Infrastructure and Critical Habitat layer summaries to surface protected-land
              proximity and listed-species presence.
            </p>
          </div>
          <span className={s.heuristicBadge}>Heuristic</span>
        </header>
        <p className={s.empty}>
          Site data not yet loaded for this project. Open Map View to fetch the relevant layers.
        </p>
      </section>
    );
  }

  const speciesList = data?.habitat?.species_list ?? [];

  return (
    <section className={s.card}>
      <header className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Protected areas & critical habitat</h3>
          <p className={s.cardHint}>
            Combines protected-area proximity (USFWS, BLM, state parks) with USFWS critical-habitat
            designations to set a stewardship posture for the project.
          </p>
        </div>
        <span className={s.heuristicBadge}>Heuristic</span>
      </header>

      <div className={`${s.postureBox} ${s[`posture_${overall}`] ?? ''}`}>
        <span className={s.postureLabel}>{POSTURE_LABEL[overall].toUpperCase()} POSTURE</span>
        <p className={s.postureHeadline}>{POSTURE_HEADLINE[overall]}</p>
      </div>

      <h4 className={s.sectionTitle}>Data sources</h4>
      <ul className={s.list}>
        {findings.map((f) => {
          const rowClass = s[`row_${f.posture}`] ?? '';
          const tagClass = s[`tag_${f.posture}`] ?? '';
          return (
            <li key={f.source} className={`${s.row} ${rowClass}`}>
              <div className={s.rowHead}>
                <span className={`${s.tag} ${tagClass}`}>{POSTURE_LABEL[f.posture]}</span>
                <span className={s.rowTitle}>{f.headline}</span>
                <span className={s.kindBadge}>
                  {f.source === 'protected-areas' ? 'Infrastructure' : 'Critical Habitat'}
                </span>
              </div>
              <p className={s.rowDetail}>{f.detail}</p>
            </li>
          );
        })}
      </ul>

      {speciesList.length > 0 && (
        <>
          <h4 className={s.sectionTitle}>Listed species nearby</h4>
          <ul className={s.speciesList}>
            {speciesList.slice(0, 8).map((sp, idx) => (
              <li key={idx} className={s.speciesItem}>
                {sp}
              </li>
            ))}
            {speciesList.length > 8 && (
              <li className={s.moreNote}>+ {speciesList.length - 8} more</li>
            )}
          </ul>
        </>
      )}

      <h4 className={s.sectionTitle}>Stewardship recommendations</h4>
      <ul className={s.recList}>
        {recommendationsFor(overall).map((r, idx) => (
          <li key={idx} className={s.recItem}>
            {r}
          </li>
        ))}
      </ul>

      <p className={s.footnote}>
        <em>Note:</em> Posture is heuristic — proximity bands (≤1 km / ≤5 km / &gt;5 km) and
        on-site / nearby logic are working defaults, not regulatory determinations. Confirm
        boundaries with USFWS, state Natural Heritage Programs, and the relevant land manager
        before relying on this card for permitting decisions.
      </p>
    </section>
  );
}
