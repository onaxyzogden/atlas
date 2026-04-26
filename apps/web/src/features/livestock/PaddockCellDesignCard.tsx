/**
 * §16 PaddockCellDesignCard — audits drawn paddocks against grazing-cell-group
 * coherence. Companion to RotationScheduleCard: where the schedule answers
 * "when do we move?", this card answers "is the grouping coherent enough to
 * actually rotate?". Flags solo paddocks, mixed-species groups, area-imbalanced
 * groups, and missing-species paddocks.
 *
 * Pure presentation: reads useLivestockStore, no shared-package math, no map.
 */

import { useMemo } from 'react';
import { useLivestockStore, type Paddock, type LivestockSpecies } from '../../store/livestockStore.js';
import { LIVESTOCK_SPECIES } from './speciesData.js';
import css from './PaddockCellDesignCard.module.css';

interface PaddockCellDesignCardProps {
  projectId: string;
}

type FindingTier = 'green' | 'caution' | 'blocker';

interface Finding {
  tier: FindingTier;
  label: string;
  detail: string;
}

interface GroupRollup {
  group: string;
  paddocks: Paddock[];
  totalAreaHa: number;
  meanAreaHa: number;
  cvPct: number; // coefficient of variation in area
  speciesUnion: LivestockSpecies[];
  speciesCoherence: number; // 0-1 — fraction of (paddock,species) pairs covered by union top species
}

function speciesIcons(species: string[]): string {
  return species
    .map((sp) => LIVESTOCK_SPECIES[sp as keyof typeof LIVESTOCK_SPECIES]?.icon ?? sp)
    .join(' ');
}

function rollupGroup(group: string, paddocks: Paddock[]): GroupRollup {
  const areasHa = paddocks.map((p) => p.areaM2 / 10_000);
  const totalAreaHa = areasHa.reduce((a, b) => a + b, 0);
  const meanAreaHa = areasHa.length > 0 ? totalAreaHa / areasHa.length : 0;
  const variance =
    areasHa.length > 1
      ? areasHa.reduce((acc, a) => acc + (a - meanAreaHa) ** 2, 0) / areasHa.length
      : 0;
  const stdev = Math.sqrt(variance);
  const cvPct = meanAreaHa > 0 ? Math.round((stdev / meanAreaHa) * 100) : 0;

  const counts = new Map<LivestockSpecies, number>();
  let totalAssignments = 0;
  for (const p of paddocks) {
    for (const sp of p.species) {
      counts.set(sp, (counts.get(sp) ?? 0) + 1);
      totalAssignments += 1;
    }
  }
  const speciesUnion = Array.from(counts.keys());
  let speciesCoherence = 1;
  if (totalAssignments > 0 && speciesUnion.length > 0) {
    const dominant = Math.max(...counts.values());
    speciesCoherence = dominant / totalAssignments;
  }

  return { group, paddocks, totalAreaHa, meanAreaHa, cvPct, speciesUnion, speciesCoherence };
}

export default function PaddockCellDesignCard({ projectId }: PaddockCellDesignCardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Paddock[]>();
    for (const p of paddocks) {
      const key = p.grazingCellGroup ?? 'ungrouped';
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return Array.from(map.entries())
      .map(([g, ps]) => rollupGroup(g, ps))
      .sort((a, b) => {
        if (a.group === 'ungrouped') return 1;
        if (b.group === 'ungrouped') return -1;
        return b.totalAreaHa - a.totalAreaHa;
      });
  }, [paddocks]);

  const findings = useMemo<Finding[]>(() => {
    const out: Finding[] = [];
    if (paddocks.length === 0) return out;

    // Missing-species paddocks
    const noSpecies = paddocks.filter((p) => p.species.length === 0);
    if (noSpecies.length > 0) {
      out.push({
        tier: 'blocker',
        label: `${noSpecies.length} paddock${noSpecies.length === 1 ? '' : 's'} without species`,
        detail: `Cannot rotate or estimate stocking until species is set: ${noSpecies.slice(0, 3).map((p) => p.name).join(', ')}${noSpecies.length > 3 ? '\u2026' : ''}.`,
      });
    }

    // Ungrouped paddocks
    const ungrouped = groups.find((g) => g.group === 'ungrouped');
    if (ungrouped && ungrouped.paddocks.length > 0) {
      out.push({
        tier: ungrouped.paddocks.length >= 3 ? 'caution' : 'caution',
        label: `${ungrouped.paddocks.length} ungrouped paddock${ungrouped.paddocks.length === 1 ? '' : 's'}`,
        detail: 'Assign a grazing-cell group so the rotation schedule can sequence them as a unit.',
      });
    }

    // Solo groups (1 paddock)
    const solos = groups.filter((g) => g.group !== 'ungrouped' && g.paddocks.length === 1);
    if (solos.length > 0) {
      out.push({
        tier: 'caution',
        label: `${solos.length} solo cell${solos.length === 1 ? '' : 's'}`,
        detail: `Single-paddock cells leave no rotation partner: ${solos.slice(0, 3).map((g) => g.group).join(', ')}${solos.length > 3 ? '\u2026' : ''}.`,
      });
    }

    // Mixed-species groups (coherence < 0.6)
    const mixedGroups = groups.filter(
      (g) => g.group !== 'ungrouped' && g.paddocks.length >= 2 && g.speciesUnion.length >= 2 && g.speciesCoherence < 0.6,
    );
    if (mixedGroups.length > 0) {
      out.push({
        tier: 'caution',
        label: `${mixedGroups.length} mixed-species cell${mixedGroups.length === 1 ? '' : 's'}`,
        detail: `Cells with low species coherence may need separate rotation clocks: ${mixedGroups.slice(0, 2).map((g) => g.group).join(', ')}.`,
      });
    }

    // Area-imbalanced groups (CV > 60%)
    const imbalanced = groups.filter(
      (g) => g.group !== 'ungrouped' && g.paddocks.length >= 3 && g.cvPct > 60,
    );
    if (imbalanced.length > 0) {
      out.push({
        tier: 'caution',
        label: `${imbalanced.length} area-imbalanced cell${imbalanced.length === 1 ? '' : 's'}`,
        detail: `High area variance within cell forces uneven graze days: ${imbalanced.slice(0, 2).map((g) => `${g.group} (CV ${g.cvPct}%)`).join(', ')}.`,
      });
    }

    // Healthy groups (>= 2 paddocks, coherent species, balanced)
    const healthy = groups.filter(
      (g) =>
        g.group !== 'ungrouped' &&
        g.paddocks.length >= 2 &&
        g.speciesCoherence >= 0.6 &&
        (g.paddocks.length < 3 || g.cvPct <= 60) &&
        g.paddocks.every((p) => p.species.length > 0),
    );
    if (healthy.length > 0) {
      out.push({
        tier: 'green',
        label: `${healthy.length} rotation-ready cell${healthy.length === 1 ? '' : 's'}`,
        detail: `Coherent grouping with balanced cells: ${healthy.slice(0, 3).map((g) => g.group).join(', ')}.`,
      });
    }

    return out;
  }, [paddocks, groups]);

  const summary = useMemo(() => {
    const namedGroups = groups.filter((g) => g.group !== 'ungrouped');
    const ungroupedCount = groups.find((g) => g.group === 'ungrouped')?.paddocks.length ?? 0;
    const groupedCount = paddocks.length - ungroupedCount;
    const totalAreaHa = paddocks.reduce((acc, p) => acc + p.areaM2 / 10_000, 0);
    return {
      paddocks: paddocks.length,
      cells: namedGroups.length,
      groupedCount,
      ungroupedCount,
      totalAreaHa,
    };
  }, [paddocks, groups]);

  if (paddocks.length === 0) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Cell Design Audit</h3>
            <p className={css.cardHint}>
              Reviews paddocks against grazing-cell coherence. Draw paddocks to populate.
            </p>
          </div>
          <span className={css.modeBadge}>Audit</span>
        </div>
        <div className={css.empty}>No paddocks in this project yet.</div>
      </section>
    );
  }

  const verdictTier: FindingTier = findings.some((f) => f.tier === 'blocker')
    ? 'blocker'
    : findings.some((f) => f.tier === 'caution')
    ? 'caution'
    : 'green';

  const verdictText = {
    green: 'Cell layout is rotation-ready.',
    caution: 'Cell layout is workable; address cautions to improve rotation efficiency.',
    blocker: 'Cell layout has blockers that prevent reliable rotation.',
  }[verdictTier];

  const verdictTone =
    verdictTier === 'green'
      ? css.verdictGreen
      : verdictTier === 'caution'
      ? css.verdictCaution
      : css.verdictBlocker;

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Cell Design Audit</h3>
          <p className={css.cardHint}>
            Audits drawn paddocks against grazing-cell-group coherence: species mix,
            area balance, solo cells, and ungrouped strays. Companion to the rotation
            schedule {'\u2014'} where the schedule sequences moves, this audits whether the
            grouping itself supports a coherent rotation.
          </p>
        </div>
        <span className={css.modeBadge}>Audit</span>
      </div>

      {/* Verdict */}
      <div className={`${css.verdictBanner} ${verdictTone}`}>
        <div className={css.verdictTitle}>
          {verdictTier === 'green' ? 'Ready' : verdictTier === 'caution' ? 'Caution' : 'Blocker'}
        </div>
        <div className={css.verdictNote}>{verdictText}</div>
      </div>

      {/* Headline grid */}
      <div className={css.headlineGrid}>
        <div className={css.headlineStat}>
          <span className={css.statValue}>{summary.paddocks}</span>
          <span className={css.statLabel}>Paddocks</span>
        </div>
        <div className={css.headlineStat}>
          <span className={css.statValue}>{summary.cells}</span>
          <span className={css.statLabel}>Cells</span>
        </div>
        <div className={css.headlineStat}>
          <span className={css.statValue}>{summary.groupedCount}</span>
          <span className={css.statLabel}>Grouped</span>
        </div>
        <div className={css.headlineStat}>
          <span className={css.statValue}>{summary.totalAreaHa.toFixed(1)}</span>
          <span className={css.statLabel}>Total ha</span>
        </div>
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <>
          <div className={css.sectionLabel}>Findings</div>
          <div className={css.findings}>
            {findings.map((f, i) => {
              const tone =
                f.tier === 'blocker'
                  ? css.findingBlocker
                  : f.tier === 'caution'
                  ? css.findingCaution
                  : css.findingGreen;
              return (
                <div key={i} className={`${css.findingRow} ${tone}`}>
                  <div className={css.findingTier}>{f.tier}</div>
                  <div className={css.findingMain}>
                    <div className={css.findingLabel}>{f.label}</div>
                    <div className={css.findingDetail}>{f.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Per-cell breakdown */}
      <div className={css.sectionLabel}>Cells</div>
      <div className={css.cellList}>
        {groups.map((g) => {
          const isUngrouped = g.group === 'ungrouped';
          const groupLabel = isUngrouped ? 'Ungrouped' : g.group;
          const coherencePct = Math.round(g.speciesCoherence * 100);
          return (
            <div key={g.group} className={css.cellRow}>
              <div className={css.cellHead}>
                <span className={css.cellName}>{groupLabel}</span>
                <span className={css.cellArea}>{g.totalAreaHa.toFixed(1)} ha</span>
              </div>
              <div className={css.cellMeta}>
                <span className={css.metaItem}>
                  {g.paddocks.length} paddock{g.paddocks.length === 1 ? '' : 's'}
                </span>
                {g.speciesUnion.length > 0 && (
                  <span className={css.metaItem}>
                    {speciesIcons(g.speciesUnion)} {coherencePct}% coherent
                  </span>
                )}
                {g.paddocks.length >= 2 && (
                  <span className={css.metaItem}>area CV {g.cvPct}%</span>
                )}
              </div>
              <div className={css.paddockChips}>
                {g.paddocks.map((p) => (
                  <span key={p.id} className={css.paddockChip}>
                    {p.name}
                    <span className={css.chipArea}>
                      {(p.areaM2 / 10_000).toFixed(1)} ha
                    </span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className={css.assumption}>
        Coherence is the share of (paddock, species) assignments belonging to the cell{'\u2019'}s
        most-common species; CV measures area variance across paddocks. Thresholds are
        heuristic {'\u2014'} a real rotation may legitimately mix species or balance against
        terrain rather than area, and {'\u201C'}solo{'\u201D'} cells can be intentional rest paddocks.
      </div>
    </section>
  );
}
