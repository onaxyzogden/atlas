/**
 * §23 DesignBriefFeatureSchedulePreviewCard — feature-schedule preview for the
 * Design Brief / Feature Schedule export.
 *
 * Sections mirror the spine of those two PDFs: property overview, zones by
 * category, structures by type, paths by type, utilities by type,
 * paddocks/livestock, crops by type, phasing summary, scenarios. Each section
 * reports its own readiness pill and contributes lines to a copy-to-clipboard
 * markdown brief.
 *
 * Pure derivation — reads project + the seven design stores. No new endpoint,
 * no shared math, no map overlay, no entity writes.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useZoneStore, type ZoneCategory } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore, UTILITY_TYPE_CONFIG } from '../../store/utilityStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useScenarioStore } from '../../store/scenarioStore.js';
import css from './DesignBriefFeatureSchedulePreviewCard.module.css';

interface Props {
  project: LocalProject;
}

type SectionStatus = 'ready' | 'partial' | 'thin' | 'empty';

interface Section {
  id: string;
  title: string;
  count: number;
  status: SectionStatus;
  detail: string;
  rows: { label: string; value: string }[];
  markdown: string[];
}

const STATUS_LABEL: Record<SectionStatus, string> = {
  ready: 'Ready',
  partial: 'Partial',
  thin: 'Thin',
  empty: 'Empty',
};

function statusFromCount(n: number, full = 5): SectionStatus {
  if (n === 0) return 'empty';
  if (n >= full) return 'ready';
  if (n >= Math.ceil(full / 2)) return 'partial';
  return 'thin';
}

function statusClass(s: SectionStatus): string {
  if (s === 'ready') return css.statusReady ?? '';
  if (s === 'partial') return css.statusPartial ?? '';
  if (s === 'thin') return css.statusThin ?? '';
  return css.statusEmpty ?? '';
}

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function groupCounts<T extends string>(items: { type: T }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    out[it.type] = (out[it.type] ?? 0) + 1;
  }
  return out;
}

export default function DesignBriefFeatureSchedulePreviewCard({ project }: Props) {
  const zones = useZoneStore((s) => s.zones);
  const structures = useStructureStore((s) => s.structures);
  const paths = usePathStore((s) => s.paths);
  const utilities = useUtilityStore((s) => s.utilities);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const crops = useCropStore((s) => s.cropAreas);
  const scenarios = useScenarioStore((s) => s.scenarios);
  const activeScenarioId = useScenarioStore((s) => s.activeScenarioId);

  const [copied, setCopied] = useState(false);

  const sections = useMemo<Section[]>(() => {
    const pid = project.id;
    const pZones = zones.filter((z) => z.projectId === pid);
    const pStructures = structures.filter((s) => s.projectId === pid);
    const pPaths = paths.filter((p) => p.projectId === pid);
    const pUtilities = utilities.filter((u) => u.projectId === pid);
    const pPaddocks = paddocks.filter((p) => p.projectId === pid);
    const pCrops = crops.filter((c) => c.projectId === pid);
    const pScenarios = scenarios.filter((s) => s.projectId === pid);

    // ── §1 Property Overview ──
    const overviewRows = [
      { label: 'Name', value: project.name?.trim() || '—' },
      { label: 'Type', value: project.projectType?.trim() || '—' },
      { label: 'Acreage', value: project.acreage != null && project.acreage > 0 ? `${project.acreage.toFixed(2)} ac` : '—' },
      { label: 'Address', value: project.address?.trim() || '—' },
      { label: 'Region', value: project.metadata?.climateRegion?.trim() || '—' },
      { label: 'Bioregion', value: project.metadata?.bioregion?.trim() || '—' },
    ];
    const overviewFilled = overviewRows.filter((r) => r.value !== '—').length;

    // ── §2 Zones by category ──
    const zoneCats: Record<string, { count: number; areaM2: number }> = {};
    for (const z of pZones) {
      const c = z.category as ZoneCategory;
      const slot = zoneCats[c] ?? { count: 0, areaM2: 0 };
      slot.count += 1;
      slot.areaM2 += z.areaM2 || 0;
      zoneCats[c] = slot;
    }
    const zoneRows = Object.entries(zoneCats)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([cat, v]) => ({ label: titleCase(cat), value: `${v.count} · ${(v.areaM2 / 4046.86).toFixed(2)} ac` }));

    // ── §3 Structures by type ──
    const structCounts = groupCounts(pStructures);
    const structRows = Object.entries(structCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([t, n]) => ({ label: titleCase(t), value: String(n) }));

    // ── §4 Paths by type ──
    const pathByType: Record<string, { count: number; lengthM: number }> = {};
    for (const p of pPaths) {
      const slot = pathByType[p.type] ?? { count: 0, lengthM: 0 };
      slot.count += 1;
      slot.lengthM += p.lengthM || 0;
      pathByType[p.type] = slot;
    }
    const pathRows = Object.entries(pathByType)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([t, v]) => ({ label: titleCase(t), value: `${v.count} · ${v.lengthM.toFixed(0)} m` }));

    // ── §5 Utilities by category ──
    const utilByCategory: Record<string, number> = {};
    for (const u of pUtilities) {
      const cat = UTILITY_TYPE_CONFIG[u.type]?.category ?? 'Other';
      utilByCategory[cat] = (utilByCategory[cat] ?? 0) + 1;
    }
    const utilRows = Object.entries(utilByCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([c, n]) => ({ label: c, value: String(n) }));

    // ── §6 Paddocks / livestock ──
    let livestockHeads = 0;
    let paddockAreaM2 = 0;
    for (const p of pPaddocks) {
      paddockAreaM2 += p.areaM2 || 0;
      if (p.stockingDensity != null && p.areaM2 > 0) {
        livestockHeads += (p.areaM2 / 10_000) * p.stockingDensity;
      }
    }
    const paddockRows = [
      { label: 'Paddocks', value: String(pPaddocks.length) },
      { label: 'Total area', value: paddockAreaM2 > 0 ? `${(paddockAreaM2 / 4046.86).toFixed(2)} ac` : '—' },
      { label: 'Estimated heads', value: livestockHeads > 0 ? Math.round(livestockHeads).toString() : '—' },
    ];

    // ── §7 Crops by type ──
    const cropByType: Record<string, { count: number; areaM2: number }> = {};
    for (const c of pCrops) {
      const slot = cropByType[c.type] ?? { count: 0, areaM2: 0 };
      slot.count += 1;
      slot.areaM2 += c.areaM2 || 0;
      cropByType[c.type] = slot;
    }
    const cropRows = Object.entries(cropByType)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([t, v]) => ({ label: titleCase(t), value: `${v.count} · ${(v.areaM2 / 4046.86).toFixed(2)} ac` }));

    // ── §8 Phasing summary ──
    const phaseCounts: Record<string, number> = {};
    const tally = (phase: string) => {
      const key = phase?.trim() || 'unphased';
      phaseCounts[key] = (phaseCounts[key] ?? 0) + 1;
    };
    pStructures.forEach((s) => tally(s.phase));
    pPaths.forEach((p) => tally(p.phase));
    pUtilities.forEach((u) => tally(u.phase));
    pPaddocks.forEach((p) => tally(p.phase));
    pCrops.forEach((c) => tally(c.phase));
    const phaseRows = Object.entries(phaseCounts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([ph, n]) => ({ label: titleCase(ph), value: `${n} feature${n === 1 ? '' : 's'}` }));

    // ── §9 Scenarios ──
    const activeScenario = pScenarios.find((s) => s.id === activeScenarioId);
    const scenarioRows = [
      { label: 'Saved', value: String(pScenarios.length) },
      { label: 'Baselines', value: String(pScenarios.filter((s) => s.isBaseline).length) },
      { label: 'Active', value: activeScenario?.name ?? '—' },
    ];

    // ── Build sections ──
    const result: Section[] = [
      {
        id: 'overview',
        title: 'Property Overview',
        count: overviewFilled,
        status: statusFromCount(overviewFilled, overviewRows.length),
        detail: `${overviewFilled} of ${overviewRows.length} project metadata fields filled.`,
        rows: overviewRows,
        markdown: [
          '## Property Overview',
          ...overviewRows.map((r) => `- **${r.label}:** ${r.value}`),
        ],
      },
      {
        id: 'zones',
        title: 'Zones',
        count: pZones.length,
        status: statusFromCount(pZones.length, 6),
        detail: pZones.length === 0
          ? 'No zones placed yet. The brief will render an empty zone schedule.'
          : `${pZones.length} zone${pZones.length === 1 ? '' : 's'} across ${zoneRows.length} categor${zoneRows.length === 1 ? 'y' : 'ies'}.`,
        rows: zoneRows.length > 0 ? zoneRows : [{ label: 'No zones', value: '—' }],
        markdown: [
          '## Zones',
          ...(zoneRows.length > 0 ? zoneRows.map((r) => `- ${r.label}: ${r.value}`) : ['_No zones placed._']),
        ],
      },
      {
        id: 'structures',
        title: 'Structures',
        count: pStructures.length,
        status: statusFromCount(pStructures.length, 5),
        detail: pStructures.length === 0
          ? 'No structures placed yet.'
          : `${pStructures.length} structure${pStructures.length === 1 ? '' : 's'} across ${structRows.length} type${structRows.length === 1 ? '' : 's'}.`,
        rows: structRows.length > 0 ? structRows : [{ label: 'No structures', value: '—' }],
        markdown: [
          '## Structures',
          ...(structRows.length > 0 ? structRows.map((r) => `- ${r.label}: ${r.value}`) : ['_No structures placed._']),
        ],
      },
      {
        id: 'paths',
        title: 'Paths & Roads',
        count: pPaths.length,
        status: statusFromCount(pPaths.length, 4),
        detail: pPaths.length === 0
          ? 'No paths drawn yet.'
          : `${pPaths.length} path${pPaths.length === 1 ? '' : 's'} drawn.`,
        rows: pathRows.length > 0 ? pathRows : [{ label: 'No paths', value: '—' }],
        markdown: [
          '## Paths & Roads',
          ...(pathRows.length > 0 ? pathRows.map((r) => `- ${r.label}: ${r.value}`) : ['_No paths drawn._']),
        ],
      },
      {
        id: 'utilities',
        title: 'Utilities',
        count: pUtilities.length,
        status: statusFromCount(pUtilities.length, 5),
        detail: pUtilities.length === 0
          ? 'No utilities placed yet.'
          : `${pUtilities.length} utility placement${pUtilities.length === 1 ? '' : 's'} across ${utilRows.length} category-group${utilRows.length === 1 ? '' : 's'}.`,
        rows: utilRows.length > 0 ? utilRows : [{ label: 'No utilities', value: '—' }],
        markdown: [
          '## Utilities',
          ...(utilRows.length > 0 ? utilRows.map((r) => `- ${r.label}: ${r.value}`) : ['_No utilities placed._']),
        ],
      },
      {
        id: 'paddocks',
        title: 'Paddocks & Livestock',
        count: pPaddocks.length,
        status: statusFromCount(pPaddocks.length, 3),
        detail: pPaddocks.length === 0
          ? 'No paddocks defined yet.'
          : `${pPaddocks.length} paddock${pPaddocks.length === 1 ? '' : 's'}, est. ${Math.round(livestockHeads)} head${Math.round(livestockHeads) === 1 ? '' : 's'} at full stocking.`,
        rows: paddockRows,
        markdown: [
          '## Paddocks & Livestock',
          ...paddockRows.map((r) => `- **${r.label}:** ${r.value}`),
        ],
      },
      {
        id: 'crops',
        title: 'Crops',
        count: pCrops.length,
        status: statusFromCount(pCrops.length, 4),
        detail: pCrops.length === 0
          ? 'No crop areas drawn yet.'
          : `${pCrops.length} crop area${pCrops.length === 1 ? '' : 's'} across ${cropRows.length} type${cropRows.length === 1 ? '' : 's'}.`,
        rows: cropRows.length > 0 ? cropRows : [{ label: 'No crops', value: '—' }],
        markdown: [
          '## Crops',
          ...(cropRows.length > 0 ? cropRows.map((r) => `- ${r.label}: ${r.value}`) : ['_No crop areas drawn._']),
        ],
      },
      {
        id: 'phasing',
        title: 'Phasing Summary',
        count: phaseRows.length,
        status: statusFromCount(phaseRows.length, 3),
        detail: phaseRows.length === 0
          ? 'No phased features yet.'
          : `Features distributed across ${phaseRows.length} phase bucket${phaseRows.length === 1 ? '' : 's'}.`,
        rows: phaseRows.length > 0 ? phaseRows : [{ label: 'No phasing', value: '—' }],
        markdown: [
          '## Phasing Summary',
          ...(phaseRows.length > 0 ? phaseRows.map((r) => `- ${r.label}: ${r.value}`) : ['_No phased features._']),
        ],
      },
      {
        id: 'scenarios',
        title: 'Scenarios',
        count: pScenarios.length,
        status: statusFromCount(pScenarios.length, 2),
        detail: pScenarios.length === 0
          ? 'No saved scenarios — brief will reflect current canvas only.'
          : `${pScenarios.length} saved scenario${pScenarios.length === 1 ? '' : 's'}.`,
        rows: scenarioRows,
        markdown: [
          '## Scenarios',
          ...scenarioRows.map((r) => `- **${r.label}:** ${r.value}`),
        ],
      },
    ];

    return result;
  }, [project, zones, structures, paths, utilities, paddocks, crops, scenarios, activeScenarioId]);

  const totalFeatures = sections
    .filter((s) => ['zones', 'structures', 'paths', 'utilities', 'paddocks', 'crops'].includes(s.id))
    .reduce((acc, s) => acc + s.count, 0);
  const readyCount = sections.filter((s) => s.status === 'ready').length;
  const emptyCount = sections.filter((s) => s.status === 'empty').length;
  const verdict: SectionStatus = readyCount === sections.length
    ? 'ready'
    : emptyCount === sections.length
    ? 'empty'
    : emptyCount > sections.length / 2
    ? 'thin'
    : 'partial';

  function buildMarkdown(): string {
    const head = [
      `# Design Brief — ${project.name || 'Untitled Project'}`,
      '',
      `_Generated from current canvas state · ${totalFeatures} placed feature${totalFeatures === 1 ? '' : 's'}_`,
      '',
    ];
    const body = sections.flatMap((s) => [...s.markdown, '']);
    return [...head, ...body].join('\n');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Design brief / feature schedule preview</h3>
          <p className={css.hint}>
            One pre-flight pass across every design store before you generate the Design Brief or Feature Schedule PDF. Each section reports its readiness and contributes to a copy-ready markdown brief.
          </p>
        </div>
        <span className={css.modeBadge}>EXPORT</span>
      </div>

      <div className={css.headlineRow}>
        <div className={css.headline}>
          <div className={css.headlineValue}>{totalFeatures}</div>
          <div className={css.headlineLabel}>Total features</div>
        </div>
        <div className={css.headline}>
          <div className={css.headlineValue}>{readyCount}/{sections.length}</div>
          <div className={css.headlineLabel}>Sections ready</div>
        </div>
        <div className={css.headline}>
          <div className={css.headlineValue}>{sections.find((s) => s.id === 'phasing')?.count ?? 0}</div>
          <div className={css.headlineLabel}>Phase buckets</div>
        </div>
        <div className={css.headline}>
          <div className={css.headlineValue}>{sections.find((s) => s.id === 'scenarios')?.count ?? 0}</div>
          <div className={css.headlineLabel}>Scenarios</div>
        </div>
      </div>

      <div className={`${css.verdictBanner} ${statusClass(verdict)}`}>
        <div className={css.verdictTitle}>
          {verdict === 'ready' && 'All sections will populate cleanly.'}
          {verdict === 'partial' && `${readyCount} of ${sections.length} sections fully ready.`}
          {verdict === 'thin' && 'Most sections will render placeholder text.'}
          {verdict === 'empty' && 'Brief will be mostly placeholder content.'}
        </div>
        <div className={css.verdictNote}>
          The brief still generates — empty sections fall back to a &ldquo;none placed&rdquo; line. This card flags where the recipient may want explanation.
        </div>
      </div>

      <div className={css.sectionList}>
        {sections.map((s) => (
          <div key={s.id} className={css.section}>
            <div className={css.sectionHead}>
              <span className={css.sectionTitle}>{s.title}</span>
              <span className={css.sectionCount}>{s.count} item{s.count === 1 ? '' : 's'}</span>
              <span className={`${css.statusPill} ${statusClass(s.status)}`}>{STATUS_LABEL[s.status]}</span>
            </div>
            <div className={css.sectionDetail}>{s.detail}</div>
            <div className={css.rowGrid}>
              {s.rows.map((r, i) => (
                <div key={i} className={css.row}>
                  <span className={css.rowLabel}>{r.label}</span>
                  <span className={css.rowValue}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={css.actions}>
        <button type="button" className={css.copyBtn} onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy as markdown'}
        </button>
        <span className={css.actionsHint}>
          Pastes a Markdown brief into your clipboard — handy for landowner emails or a working doc before generating the PDF.
        </span>
      </div>

      <div className={css.assumption}>
        Section spine mirrors the Design Brief and Feature Schedule PDFs: property overview, then placed entities grouped by category/type, then phasing and scenarios. Counts are project-scoped reads of <code>useZoneStore</code>, <code>useStructureStore</code>, <code>usePathStore</code>, <code>useUtilityStore</code>, <code>useLivestockStore</code>, <code>useCropStore</code>, <code>useScenarioStore</code>. Livestock heads use <code>areaM2 / 10000 × stockingDensity</code> per paddock.
      </div>
    </section>
  );
}
