/**
 * §14 CurrentVsVisionToggleCard — quantifies the gap between "current
 * land" (Phase 1 only) and "full vision" (all phases combined).
 *
 * VisionPanel already exposes a binary overlay toggle that flips the
 * map between Phase 1 and all phases. This card surfaces the *numbers*
 * behind that toggle: how many entities sit in current vs vision, what
 * share of vision is built today, what's still to come, and whether
 * the steward has authored a vision statement and per-phase notes to
 * anchor the picture.
 *
 * Pure derivation from phaseStore + entity stores + visionStore. No
 * map mutation by default; an optional toggle button writes
 * activePhaseFilter to mapStore (the same write VisionPanel performs).
 *
 * Closes manifest §14 `toggle-current-vs-vision` (P2) partial -> done.
 */

import { useMemo } from 'react';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useMapStore } from '../../store/mapStore.js';
import { useVisionStore } from '../../store/visionStore.js';
import css from './CurrentVsVisionToggleCard.module.css';

interface Props {
  projectId: string;
}

interface ScopeTotals {
  crops: number;
  structures: number;
  utilities: number;
  paddocks: number;
}

function emptyTotals(): ScopeTotals {
  return { crops: 0, structures: 0, utilities: 0, paddocks: 0 };
}

function totalCount(t: ScopeTotals): number {
  return t.crops + t.structures + t.utilities + t.paddocks;
}

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((n / d) * 100);
}

export default function CurrentVsVisionToggleCard({ projectId }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const visionData = useVisionStore((s) => s.getVisionData(projectId));

  const activePhaseFilter = useMapStore((s) => s.activePhaseFilter);
  const setActivePhaseFilter = useMapStore((s) => s.setActivePhaseFilter);

  const phases = useMemo(
    () =>
      allPhases
        .filter((p) => p.projectId === projectId)
        .slice()
        .sort((a, b) => a.order - b.order),
    [allPhases, projectId],
  );

  const crops = useMemo(() => allCrops.filter((c) => c.projectId === projectId), [allCrops, projectId]);
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === projectId),
    [allUtilities, projectId],
  );
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const phase1Name = phases[0]?.name ?? 'Phase 1';

  const { current, vision, phaseUsage } = useMemo(() => {
    const cur = emptyTotals();
    const vis = emptyTotals();

    for (const c of crops) {
      vis.crops += 1;
      if (c.phase === phase1Name) cur.crops += 1;
    }
    for (const s of structures) {
      vis.structures += 1;
      if (s.phase === phase1Name) cur.structures += 1;
    }
    for (const u of utilities) {
      vis.utilities += 1;
      if (u.phase === phase1Name) cur.utilities += 1;
    }
    for (const p of paddocks) {
      vis.paddocks += 1;
      if (p.phase === phase1Name) cur.paddocks += 1;
    }

    const phaseUsage = phases.map((p) => {
      const used =
        crops.some((c) => c.phase === p.name) ||
        structures.some((s) => s.phase === p.name) ||
        utilities.some((u) => u.phase === p.name) ||
        paddocks.some((pd) => pd.phase === p.name);
      return { name: p.name, color: p.color, used };
    });

    return { current: cur, vision: vis, phaseUsage };
  }, [crops, structures, utilities, paddocks, phases, phase1Name]);

  const visionTotal = totalCount(vision);
  const currentTotal = totalCount(current);
  const builtPct = pct(currentTotal, visionTotal);
  const phasesTouched = phaseUsage.filter((p) => p.used).length;
  const phasesUntouched = phaseUsage.filter((p) => !p.used).length;

  const hasVisionStatement = (visionData?.phaseNotes ?? []).length > 0;
  const phaseNoteCount = visionData?.phaseNotes?.filter((n) => n.notes.trim().length > 0).length ?? 0;

  const isViewingVision = activePhaseFilter === 'all';
  const handleToggle = () => {
    setActivePhaseFilter(isViewingVision ? phase1Name : 'all');
  };

  const empty = visionTotal === 0;

  return (
    <section className={css.card} aria-label="Current vs vision toggle">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Current Land vs Full Vision</h3>
          <p className={css.cardHint}>
            How far is the placed plan from the picture you described? Phase 1 is "current
            land"; everything beyond is the vision.
          </p>
        </div>
        <button
          type="button"
          className={`${css.toggleBtn} ${isViewingVision ? css.toggleBtnVision : css.toggleBtnCurrent}`}
          onClick={handleToggle}
          aria-label="Toggle map between current and vision"
        >
          <span className={css.toggleSwitch}>
            <span className={`${css.toggleDot} ${isViewingVision ? css.toggleDotOn : ''}`} />
          </span>
          <span className={css.toggleLabel}>
            Map: {isViewingVision ? 'Vision' : 'Current'}
          </span>
        </button>
      </header>

      {empty ? (
        <p className={css.empty}>
          No entities placed yet. Add crops, structures, utilities, or paddocks to populate
          the comparison.
        </p>
      ) : (
        <>
          <div className={css.headlineRow}>
            <div className={css.headline}>
              <div className={css.headlineValue}>{builtPct}%</div>
              <div className={css.headlineLabel}>of vision is current</div>
            </div>
            <div className={css.headline}>
              <div className={css.headlineValue}>{visionTotal - currentTotal}</div>
              <div className={css.headlineLabel}>items still to come</div>
            </div>
            <div className={css.headline}>
              <div className={css.headlineValue}>
                {phasesUntouched}
                <span className={css.headlineDenom}>/{phaseUsage.length}</span>
              </div>
              <div className={css.headlineLabel}>phases empty</div>
            </div>
          </div>

          <div className={css.scopeGrid}>
            <ScopeBlock
              variant="current"
              title="Current"
              subtitle={phase1Name}
              totals={current}
              total={currentTotal}
            />
            <ScopeBlock
              variant="vision"
              title="Vision"
              subtitle="All phases"
              totals={vision}
              total={visionTotal}
            />
          </div>

          <ul className={css.phaseStrip} aria-label="Phase coverage">
            {phaseUsage.map((p) => (
              <li
                key={p.name}
                className={`${css.phaseChip} ${p.used ? css.phaseChipUsed : css.phaseChipEmpty}`}
              >
                <span className={css.phaseDot} style={{ background: p.color }} aria-hidden="true" />
                <span className={css.phaseChipName}>{p.name}</span>
                <span className={css.phaseChipState}>{p.used ? 'used' : 'empty'}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={css.visionNotesRow}>
        <span className={css.visionNotesLabel}>Vision authored</span>
        <span className={css.visionNotesValue}>
          {hasVisionStatement
            ? `${phaseNoteCount} phase note${phaseNoteCount === 1 ? '' : 's'} written`
            : 'No phase notes yet'}
        </span>
      </div>

      <p className={css.footnote}>
        The map toggle here mirrors the Vision panel overlay {'\u2014'} same write to the
        active phase filter, surfaced where the gap numbers live.
      </p>
    </section>
  );
}

interface ScopeBlockProps {
  variant: 'current' | 'vision';
  title: string;
  subtitle: string;
  totals: ScopeTotals;
  total: number;
}

function ScopeBlock({ variant, title, subtitle, totals, total }: ScopeBlockProps) {
  return (
    <div className={`${css.scope} ${variant === 'current' ? css.scopeCurrent : css.scopeVision}`}>
      <div className={css.scopeHead}>
        <span className={css.scopeTitle}>{title}</span>
        <span className={css.scopeSub}>{subtitle}</span>
      </div>
      <div className={css.scopeTotal}>{total}</div>
      <div className={css.scopeTotalLabel}>total entities</div>
      <ul className={css.scopeBreakdown}>
        <li>
          <span>Crops</span>
          <span>{totals.crops}</span>
        </li>
        <li>
          <span>Structures</span>
          <span>{totals.structures}</span>
        </li>
        <li>
          <span>Utilities</span>
          <span>{totals.utilities}</span>
        </li>
        <li>
          <span>Paddocks</span>
          <span>{totals.paddocks}</span>
        </li>
      </ul>
    </div>
  );
}
