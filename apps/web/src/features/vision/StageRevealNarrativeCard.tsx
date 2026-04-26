/**
 * §14 StageRevealNarrativeCard — stage-by-stage reveal, design narrative mode.
 *
 * Walks each build phase in order and synthesizes a one-paragraph narrative
 * of what that phase ADDS to the property: structures placed, paddocks lit
 * up, crop area put under cultivation, utilities tied in. Pairs the rollup
 * with the steward's free-text vision note when one is present (mapped from
 * VisionStore's three-bucket year1 / years2to3 / years4plus schema onto
 * PhaseStore's Phase 1-4 ordering).
 *
 * Plays as a visual narrative, not an interactive map reveal — clicking a
 * phase header expands its detail block, otherwise the page reads top-down
 * as a story. Pure presentation rollup of stores already on the page.
 */

import { useMemo, useState } from 'react';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useVisionStore, type PhaseKey } from '../../store/visionStore.js';
import css from './StageRevealNarrativeCard.module.css';

interface Props {
  projectId: string;
}

const M2_PER_ACRE = 4046.86;

function fmtAcres(m2: number): string {
  if (m2 <= 0) return '0';
  const a = m2 / M2_PER_ACRE;
  if (a < 0.1) return a.toFixed(2);
  if (a < 10) return a.toFixed(1);
  return Math.round(a).toLocaleString();
}

function joinList(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0] ?? '';
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}

/**
 * Map a phase order (1-N) onto the VisionStore's three-bucket vocabulary.
 * Phase 1 → year1, Phases 2-3 → years2to3, Phase 4+ → years4plus.
 */
function visionKeyForOrder(order: number): PhaseKey {
  if (order <= 1) return 'year1';
  if (order <= 3) return 'years2to3';
  return 'years4plus';
}

export default function StageRevealNarrativeCard({ projectId }: Props) {
  const cropAreas = useCropStore((s) => s.cropAreas);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const structures = useStructureStore((s) => s.structures);
  const utilities = useUtilityStore((s) => s.utilities);
  const allPhases = usePhaseStore((s) => s.phases);
  const visionData = useVisionStore((s) => s.getVisionData(projectId));

  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);

  const phases = useMemo(
    () => allPhases.filter((p) => p.projectId === projectId).sort((a, b) => a.order - b.order),
    [allPhases, projectId],
  );

  const projectCrops = useMemo(
    () => cropAreas.filter((c) => c.projectId === projectId),
    [cropAreas, projectId],
  );
  const projectPaddocks = useMemo(
    () => paddocks.filter((p) => p.projectId === projectId),
    [paddocks, projectId],
  );
  const projectStructures = useMemo(
    () => structures.filter((s) => s.projectId === projectId),
    [structures, projectId],
  );
  const projectUtilities = useMemo(
    () => utilities.filter((u) => u.projectId === projectId),
    [utilities, projectId],
  );

  const totalEntities =
    projectCrops.length +
    projectPaddocks.length +
    projectStructures.length +
    projectUtilities.length;

  const stages = useMemo(() => {
    return phases.map((phase) => {
      const cropsHere = projectCrops.filter((c) => c.phase === phase.name);
      const paddocksHere = projectPaddocks.filter((p) => p.phase === phase.name);
      const structuresHere = projectStructures.filter((s) => s.phase === phase.name);
      const utilitiesHere = projectUtilities.filter((u) => u.phase === phase.name);

      const cropM2 = cropsHere.reduce((acc, c) => acc + (c.areaM2 || 0), 0);
      const grazedM2 = paddocksHere.reduce((acc, p) => acc + (p.areaM2 || 0), 0);

      // Top structure types in this phase, by frequency.
      const structTypeCounts = new Map<string, number>();
      for (const s of structuresHere) {
        structTypeCounts.set(s.type, (structTypeCounts.get(s.type) ?? 0) + 1);
      }
      const topStructureTypes = [...structTypeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, n]) => (n > 1 ? `${n} ${type.replace(/_/g, ' ')}s` : type.replace(/_/g, ' ')));

      const utilityTypeCounts = new Map<string, number>();
      for (const u of utilitiesHere) {
        utilityTypeCounts.set(u.type, (utilityTypeCounts.get(u.type) ?? 0) + 1);
      }
      const topUtilityTypes = [...utilityTypeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type, n]) => (n > 1 ? `${n} ${type.replace(/_/g, ' ')}s` : type.replace(/_/g, ' ')));

      // Build the narrative paragraph for this stage.
      const fragments: string[] = [];
      if (cropsHere.length > 0) {
        fragments.push(
          `${cropsHere.length} crop area${cropsHere.length === 1 ? '' : 's'} (${fmtAcres(cropM2)} ac)`,
        );
      }
      if (paddocksHere.length > 0) {
        fragments.push(
          `${paddocksHere.length} paddock${paddocksHere.length === 1 ? '' : 's'} (${fmtAcres(grazedM2)} ac)`,
        );
      }
      if (structuresHere.length > 0) {
        const structDetail = topStructureTypes.length > 0 ? ` (${joinList(topStructureTypes)})` : '';
        fragments.push(
          `${structuresHere.length} structure${structuresHere.length === 1 ? '' : 's'}${structDetail}`,
        );
      }
      if (utilitiesHere.length > 0) {
        const utilDetail = topUtilityTypes.length > 0 ? ` (${joinList(topUtilityTypes)})` : '';
        fragments.push(
          `${utilitiesHere.length} utilit${utilitiesHere.length === 1 ? 'y' : 'ies'}${utilDetail}`,
        );
      }

      const narrative =
        fragments.length === 0
          ? 'Nothing placed in this phase yet.'
          : `Adds ${joinList(fragments)}.`;

      const stewardNote = visionData?.phaseNotes.find(
        (n) => n.phaseKey === visionKeyForOrder(phase.order),
      )?.notes ?? '';

      return {
        id: phase.id,
        order: phase.order,
        name: phase.name,
        timeframe: phase.timeframe,
        color: phase.color,
        completed: phase.completed,
        narrative,
        stewardNote,
        counts: {
          crops: cropsHere.length,
          paddocks: paddocksHere.length,
          structures: structuresHere.length,
          utilities: utilitiesHere.length,
        },
        cropM2,
        grazedM2,
        // Names of the actual entities, for the expanded detail block.
        sampleStructures: structuresHere.slice(0, 6).map((s) => s.name || s.type),
        samplePaddocks: paddocksHere.slice(0, 6).map((p) => p.name),
        sampleCrops: cropsHere.slice(0, 6).map((c) => c.name),
        sampleUtilities: utilitiesHere.slice(0, 6).map((u) => u.name || u.type),
      };
    });
  }, [phases, projectCrops, projectPaddocks, projectStructures, projectUtilities, visionData]);

  if (totalEntities === 0 || phases.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h2 className={css.cardTitle}>Stage-by-Stage Reveal</h2>
            <p className={css.cardHint}>
              The narrative arc of the buildout, phase by phase.
            </p>
          </div>
          <span className={css.modeBadge}>Narrative</span>
        </div>
        <div className={css.empty}>
          {phases.length === 0
            ? 'Phases load automatically — refresh if this persists.'
            : 'Place crops, paddocks, structures, or utilities to begin the narrative.'}
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h2 className={css.cardTitle}>Stage-by-Stage Reveal</h2>
          <p className={css.cardHint}>
            The narrative arc of the buildout. Each phase below shows what it
            adds; click a phase to expand the placed-feature detail.
          </p>
        </div>
        <span className={css.modeBadge}>Narrative</span>
      </div>

      <ol className={css.timeline}>
        {stages.map((stage, idx) => {
          const isExpanded = expandedPhaseId === stage.id;
          const hasContent =
            stage.counts.crops +
              stage.counts.paddocks +
              stage.counts.structures +
              stage.counts.utilities >
            0;
          return (
            <li
              key={stage.id}
              className={`${css.stage} ${stage.completed ? css.stageDone : ''} ${
                isExpanded ? css.stageExpanded : ''
              }`}
            >
              <div className={css.stageRail}>
                <span
                  className={css.stageDot}
                  style={{
                    borderColor: stage.color,
                    background: stage.completed ? stage.color : 'transparent',
                  }}
                />
                {idx < stages.length - 1 && <span className={css.stageLine} />}
              </div>

              <div className={css.stageBody}>
                <button
                  type="button"
                  className={css.stageHeader}
                  onClick={() => setExpandedPhaseId(isExpanded ? null : stage.id)}
                  aria-expanded={isExpanded}
                  disabled={!hasContent}
                >
                  <div className={css.stageHeaderLeft}>
                    <span className={css.stageOrder}>Stage {stage.order}</span>
                    <span className={css.stageName}>{stage.name}</span>
                    <span className={css.stageTimeframe} style={{ color: stage.color }}>
                      {stage.timeframe}
                    </span>
                  </div>
                  {hasContent && (
                    <span className={css.stageChevron} aria-hidden="true">
                      {isExpanded ? '\u2212' : '+'}
                    </span>
                  )}
                </button>

                <p className={css.stageNarrative}>{stage.narrative}</p>

                {stage.stewardNote && (
                  <blockquote className={css.stageStewardNote}>
                    {'\u201C'}{stage.stewardNote}{'\u201D'}
                  </blockquote>
                )}

                {isExpanded && hasContent && (
                  <div className={css.stageDetail}>
                    {stage.sampleStructures.length > 0 && (
                      <div className={css.detailGroup}>
                        <span className={css.detailLabel}>Structures</span>
                        <ul className={css.detailList}>
                          {stage.sampleStructures.map((n, i) => (
                            <li key={`s-${i}`}>{n}</li>
                          ))}
                          {stage.counts.structures > stage.sampleStructures.length && (
                            <li className={css.detailMore}>
                              + {stage.counts.structures - stage.sampleStructures.length} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {stage.samplePaddocks.length > 0 && (
                      <div className={css.detailGroup}>
                        <span className={css.detailLabel}>Paddocks</span>
                        <ul className={css.detailList}>
                          {stage.samplePaddocks.map((n, i) => (
                            <li key={`p-${i}`}>{n}</li>
                          ))}
                          {stage.counts.paddocks > stage.samplePaddocks.length && (
                            <li className={css.detailMore}>
                              + {stage.counts.paddocks - stage.samplePaddocks.length} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {stage.sampleCrops.length > 0 && (
                      <div className={css.detailGroup}>
                        <span className={css.detailLabel}>Crop areas</span>
                        <ul className={css.detailList}>
                          {stage.sampleCrops.map((n, i) => (
                            <li key={`c-${i}`}>{n}</li>
                          ))}
                          {stage.counts.crops > stage.sampleCrops.length && (
                            <li className={css.detailMore}>
                              + {stage.counts.crops - stage.sampleCrops.length} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                    {stage.sampleUtilities.length > 0 && (
                      <div className={css.detailGroup}>
                        <span className={css.detailLabel}>Utilities</span>
                        <ul className={css.detailList}>
                          {stage.sampleUtilities.map((n, i) => (
                            <li key={`u-${i}`}>{n}</li>
                          ))}
                          {stage.counts.utilities > stage.sampleUtilities.length && (
                            <li className={css.detailMore}>
                              + {stage.counts.utilities - stage.sampleUtilities.length} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className={css.footnote}>
        Steward notes are pulled from the Vision panel's Timeline tab — Phase 1
        reads from {'\u201C'}Year 1{'\u201D'}, Phases 2{'\u2013'}3 from{' '}
        {'\u201C'}Years 2{'\u2013'}3{'\u201D'}, Phase 4+ from {'\u201C'}Years
        4+{'\u201D'}.
      </p>
    </div>
  );
}
