/**
 * §9 StructureFootprintLibraryCard — predefined footprint library +
 * placement deviation audit.
 *
 * The library side enumerates every entry in `STRUCTURE_TEMPLATES`
 * (the canonical type catalog) grouped by template category — dwelling,
 * agricultural, spiritual, utility, gathering, infrastructure — with
 * reference dimensions, footprint area, ridge/eave height, cost range
 * and infrastructure requirements. The audit side cross-references
 * placed structures against their template and flags ones whose hand-
 * resized footprint deviates >= 25% from the template's nominal area.
 * That is the threshold at which the cost-band scaling math in
 * `deriveInfrastructureCost` starts to matter.
 *
 * Pure derivation — reads `useStructureStore`, no map writes, no
 * shared-package math.
 *
 * Closes manifest §9 `structure-type-footprint-library` (P2)
 * partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore, type Structure, type StructureType } from '../../store/structureStore.js';
import { STRUCTURE_TEMPLATES, estimateStructureHeightM, formatCostShort } from './footprints.js';
import css from './StructureFootprintLibraryCard.module.css';

interface Props {
  project: LocalProject;
}

type Category = 'dwelling' | 'agricultural' | 'spiritual' | 'utility' | 'gathering' | 'infrastructure';

const CATEGORY_LABEL: Record<Category, string> = {
  dwelling: 'Dwelling',
  agricultural: 'Agricultural',
  spiritual: 'Spiritual',
  utility: 'Utility',
  gathering: 'Gathering',
  infrastructure: 'Infrastructure',
};

const CATEGORY_ORDER: Category[] = [
  'dwelling',
  'spiritual',
  'gathering',
  'agricultural',
  'utility',
  'infrastructure',
];

interface LibraryRow {
  type: StructureType;
  label: string;
  icon: string;
  description: string;
  category: Category;
  widthM: number;
  depthM: number;
  areaM2: number;
  heightM: number;
  costLow: number;
  costHigh: number;
  infraReqs: string[];
  placedCount: number;
}

interface DeviationRow {
  structure: Structure;
  templateAreaM2: number;
  placedAreaM2: number;
  ratio: number; // placed / template
  severity: 'mild' | 'major';
}

const DEVIATION_MILD = 0.25; // ±25%
const DEVIATION_MAJOR = 0.6; // ±60%

function buildLibrary(structures: Structure[]): LibraryRow[] {
  const placedByType = new Map<StructureType, number>();
  for (const s of structures) {
    placedByType.set(s.type, (placedByType.get(s.type) ?? 0) + 1);
  }
  const rows: LibraryRow[] = [];
  for (const [type, tmpl] of Object.entries(STRUCTURE_TEMPLATES) as [StructureType, typeof STRUCTURE_TEMPLATES[StructureType]][]) {
    rows.push({
      type,
      label: tmpl.label,
      icon: tmpl.icon,
      description: tmpl.description,
      category: tmpl.category,
      widthM: tmpl.widthM,
      depthM: tmpl.depthM,
      areaM2: tmpl.widthM * tmpl.depthM,
      heightM: estimateStructureHeightM(type),
      costLow: tmpl.costRange[0],
      costHigh: tmpl.costRange[1],
      infraReqs: tmpl.infrastructureReqs,
      placedCount: placedByType.get(type) ?? 0,
    });
  }
  return rows;
}

function buildDeviations(structures: Structure[]): DeviationRow[] {
  const out: DeviationRow[] = [];
  for (const s of structures) {
    const tmpl = STRUCTURE_TEMPLATES[s.type];
    if (!tmpl) continue;
    const tmplArea = tmpl.widthM * tmpl.depthM;
    const placedArea = (s.widthM ?? tmpl.widthM) * (s.depthM ?? tmpl.depthM);
    if (tmplArea <= 0 || placedArea <= 0) continue;
    const ratio = placedArea / tmplArea;
    const offset = Math.abs(ratio - 1);
    if (offset < DEVIATION_MILD) continue;
    out.push({
      structure: s,
      templateAreaM2: tmplArea,
      placedAreaM2: placedArea,
      ratio,
      severity: offset >= DEVIATION_MAJOR ? 'major' : 'mild',
    });
  }
  out.sort((a, b) => Math.abs(b.ratio - 1) - Math.abs(a.ratio - 1));
  return out;
}

function formatArea(m2: number): string {
  if (!Number.isFinite(m2) || m2 <= 0) return '—';
  if (m2 >= 1000) return `${(m2 / 1000).toFixed(1)} k m²`;
  return `${Math.round(m2)} m²`;
}

function formatRatio(ratio: number): string {
  const pct = Math.round((ratio - 1) * 100);
  if (pct === 0) return 'on target';
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

export default function StructureFootprintLibraryCard({ project }: Props) {
  const allStructures = useStructureStore((s) => s.structures);

  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === project.id),
    [allStructures, project.id],
  );

  const library = useMemo(() => buildLibrary(structures), [structures]);
  const deviations = useMemo(() => buildDeviations(structures), [structures]);

  const totals = useMemo(() => {
    const typesInLibrary = library.length;
    const typesPlaced = library.filter((r) => r.placedCount > 0).length;
    const totalStructures = structures.length;
    const majorOutliers = deviations.filter((d) => d.severity === 'major').length;
    return { typesInLibrary, typesPlaced, totalStructures, majorOutliers };
  }, [library, structures.length, deviations]);

  const verdict = useMemo(() => {
    if (totals.totalStructures === 0) {
      return { tone: 'unknown', label: 'No structures placed yet' } as const;
    }
    if (totals.majorOutliers > 0) {
      const word = totals.majorOutliers === 1 ? 'outlier' : 'outliers';
      return { tone: 'block', label: `${totals.majorOutliers} major footprint ${word}` } as const;
    }
    if (deviations.length > 0) {
      const word = deviations.length === 1 ? 'structure resized' : 'structures resized';
      return { tone: 'work', label: `${deviations.length} ${word} from template` } as const;
    }
    return { tone: 'done', label: 'All footprints match library templates' } as const;
  }, [totals, deviations]);

  const groupedByCategory = useMemo(() => {
    const groups = new Map<Category, LibraryRow[]>();
    for (const cat of CATEGORY_ORDER) groups.set(cat, []);
    for (const row of library) {
      groups.get(row.category)?.push(row);
    }
    for (const rows of groups.values()) {
      rows.sort((a, b) => a.label.localeCompare(b.label));
    }
    return groups;
  }, [library]);

  return (
    <section className={css.card} aria-label="Structure footprint library">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Structure Footprint Library {'—'} Reference Catalog</h3>
          <p className={css.cardHint}>
            The canonical 20-archetype catalog with reference dimensions,
            ridge/eave height, cost range, and infrastructure requirements.
            Placed structures are checked against their template; footprints
            resized {'≥'} 25% from nominal are flagged so the cost-band
            scaling stays meaningful.
          </p>
        </div>
        <div className={`${css.verdict} ${css[`verdict_${verdict.tone}`]}`}>{verdict.label}</div>
      </header>

      <div className={css.headlineRow}>
        <Headline value={totals.typesInLibrary} label="archetypes" />
        <Headline value={totals.typesPlaced} label="types placed" />
        <Headline value={totals.totalStructures} label="structures" />
        <Headline value={totals.majorOutliers} label="major outliers" />
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const rows = groupedByCategory.get(cat) ?? [];
        if (rows.length === 0) return null;
        return (
          <div key={cat} className={`${css.group} ${css[`group_${cat}`]}`}>
            <h4 className={css.groupTitle}>
              {CATEGORY_LABEL[cat]}
              <span className={css.groupCount}>{rows.length}</span>
            </h4>
            <ul className={css.libList}>
              {rows.map((r) => (
                <li key={r.type} className={`${css.libRow} ${r.placedCount > 0 ? css.libRowPlaced : ''}`}>
                  <span className={css.libIcon} aria-hidden>{r.icon}</span>
                  <div className={css.libBody}>
                    <div className={css.libNameRow}>
                      <span className={css.libName}>{r.label}</span>
                      {r.placedCount > 0 && (
                        <span className={css.placedPill}>{r.placedCount} placed</span>
                      )}
                    </div>
                    <div className={css.libDesc}>{r.description}</div>
                    <div className={css.libMeta}>
                      <span className={css.metaItem}>
                        <span className={css.metaLabel}>Footprint</span>
                        {r.widthM}{'×'}{r.depthM} m {'·'} {formatArea(r.areaM2)}
                      </span>
                      <span className={css.metaItem}>
                        <span className={css.metaLabel}>Height</span>
                        {r.heightM} m
                      </span>
                      <span className={css.metaItem}>
                        <span className={css.metaLabel}>Cost</span>
                        {formatCostShort(r.costLow)} {'–'} {formatCostShort(r.costHigh)}
                      </span>
                      <span className={css.metaItem}>
                        <span className={css.metaLabel}>Infra</span>
                        {r.infraReqs.length === 0 ? 'none' : r.infraReqs.join(' · ')}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {deviations.length > 0 && (
        <div className={css.deviationSection}>
          <h4 className={css.sectionTitle}>Footprint deviations from library</h4>
          <ul className={css.deviationList}>
            {deviations.map((d) => {
              const tmpl = STRUCTURE_TEMPLATES[d.structure.type];
              const label = tmpl?.label ?? d.structure.type;
              const name = (d.structure.name ?? '').trim() || `Untitled ${label.toLowerCase()}`;
              return (
                <li key={d.structure.id} className={`${css.deviationRow} ${css[`dev_${d.severity}`]}`}>
                  <div className={css.devName}>{name}</div>
                  <div className={css.devMeta}>
                    <span>{label}</span>
                    <span>
                      {formatArea(d.placedAreaM2)} vs {formatArea(d.templateAreaM2)} template
                    </span>
                    <span className={css.devRatio}>{formatRatio(d.ratio)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className={css.footnote}>
        Templates live in <code>features/structures/footprints.ts</code> {'—'} the
        same source the placement tool uses to seed new structures. Cost ranges
        are template-level baselines; per-structure overrides on the
        properties modal take precedence at export time.
      </p>
    </section>
  );
}

function Headline({ value, label }: { value: number; label: string }) {
  return (
    <div className={css.headline}>
      <div className={css.headlineValue}>{value}</div>
      <div className={css.headlineLabel}>{label}</div>
    </div>
  );
}
