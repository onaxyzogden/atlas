/**
 * §24 FieldworkChecklistCard — today's-walk punch list derived from
 * placed entities. Surfaces design items that are missing the kind of
 * detail a steward would normally confirm during an in-person site
 * visit, so the walk has a concrete checklist that reflects the actual
 * design state instead of a generic template.
 *
 * Heuristic — derived purely from store contents (no real audit log):
 *   - Paddocks with no species OR no stocking density → "rotation plan
 *     not configured"
 *   - Water utilities (water_tank, well_pump, rain_catchment) with no
 *     capacityGal → "inspect / measure capacity"
 *   - Structures with empty notes → "confirm build status / condition"
 *   - Crop areas with empty species list → "confirm planned plantings"
 *
 * Each row has a tap-friendly "mark observed" toggle. Observed state
 * persists to localStorage keyed by project id, so the steward can keep
 * a fresh punch list across sessions without a server round-trip.
 *
 * Mounts inside the Fieldwork panel's "Checklist" tab, above the static
 * `SiteChecklist` template. Closes manifest entry §24
 * `punch-list-site-verification` (P4 planned → partial).
 */

import { useEffect, useMemo, useState } from 'react';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import css from './FieldworkChecklistCard.module.css';

interface Props {
  projectId: string;
}

type ItemKind = 'paddock' | 'water' | 'structure' | 'crop';

interface PunchItem {
  id: string;
  kind: ItemKind;
  label: string;
  reason: string;
}

const KIND_LABEL: Record<ItemKind, string> = {
  paddock: 'Paddock',
  water: 'Water',
  structure: 'Structure',
  crop: 'Crop area',
};

const STORAGE_PREFIX = 'ogden-fieldwork-punchlist-';

const WATER_UTIL_TYPES = new Set(['water_tank', 'well_pump', 'rain_catchment']);

function loadObserved(projectId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + projectId);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as Record<string, string>;
  } catch {
    /* ignore */
  }
  return {};
}

function saveObserved(projectId: string, observed: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + projectId, JSON.stringify(observed));
  } catch {
    /* ignore */
  }
}

export default function FieldworkChecklistCard({ projectId }: Props) {
  const paddocks = useLivestockStore((s) => s.paddocks).filter((p) => p.projectId === projectId);
  const utilities = useUtilityStore((s) => s.utilities).filter((u) => u.projectId === projectId);
  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === projectId);
  const crops = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === projectId);
  // Touch path/zone stores so the card stays consistent with sibling
  // panels that mount on entity churn — no derivations from them today.
  usePathStore((s) => s.paths);
  useZoneStore((s) => s.zones);

  const [observed, setObserved] = useState<Record<string, string>>(() => loadObserved(projectId));

  useEffect(() => {
    setObserved(loadObserved(projectId));
  }, [projectId]);

  const items = useMemo<PunchItem[]>(() => {
    const out: PunchItem[] = [];

    for (const p of paddocks) {
      const missingSpecies = !p.species || p.species.length === 0;
      const missingDensity = p.stockingDensity == null;
      if (missingSpecies || missingDensity) {
        const reasons: string[] = [];
        if (missingSpecies) reasons.push('no species assigned');
        if (missingDensity) reasons.push('no stocking density');
        out.push({
          id: `paddock:${p.id}`,
          kind: 'paddock',
          label: p.name || 'Unnamed paddock',
          reason: 'Confirm rotation plan — ' + reasons.join(', ') + '.',
        });
      }
    }

    for (const u of utilities) {
      if (!WATER_UTIL_TYPES.has(u.type)) continue;
      if (u.capacityGal == null || u.capacityGal <= 0) {
        out.push({
          id: `water:${u.id}`,
          kind: 'water',
          label: u.name || u.type.replace(/_/g, ' '),
          reason: 'Inspect on-site and record storage / flow capacity.',
        });
      }
    }

    for (const s of structures) {
      if (!s.notes || s.notes.trim() === '') {
        out.push({
          id: `structure:${s.id}`,
          kind: 'structure',
          label: s.name || s.type.replace(/_/g, ' '),
          reason: 'Confirm build status / condition note.',
        });
      }
    }

    for (const c of crops) {
      if (!c.species || c.species.length === 0) {
        out.push({
          id: `crop:${c.id}`,
          kind: 'crop',
          label: c.name || c.type.replace(/_/g, ' '),
          reason: 'Confirm planned plantings — species list empty.',
        });
      }
    }

    return out;
  }, [paddocks, utilities, structures, crops]);

  const toggle = (id: string): void => {
    setObserved((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = new Date().toISOString();
      }
      saveObserved(projectId, next);
      return next;
    });
  };

  const observedCount = items.filter((i) => observed[i.id]).length;
  const total = items.length;
  const remaining = total - observedCount;

  // Group by kind
  const grouped = useMemo(() => {
    const buckets: Record<ItemKind, PunchItem[]> = {
      paddock: [],
      water: [],
      structure: [],
      crop: [],
    };
    for (const item of items) buckets[item.kind].push(item);
    return buckets;
  }, [items]);

  return (
    <section className={css.card} aria-label="Today's walk punch list">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Today&rsquo;s walk &mdash; punch list</h3>
          <p className={css.cardHint}>
            Auto-derived from your placed entities. Items here are missing
            detail that you would normally confirm in person. Tap{' '}
            <strong>Mark observed</strong> as you walk past each one &mdash;
            state is saved to this device.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      {total === 0 ? (
        <p className={css.empty}>
          No outstanding items &mdash; every placed paddock, water utility,
          structure and crop area has the basic detail filled in. Add new
          entities or clear notes to surface walk items.
        </p>
      ) : (
        <>
          <div className={css.tallyRow}>
            <div className={css.tally}>
              <div className={`${css.tallyValue} ${css.tone_muted}`}>{total}</div>
              <div className={css.tallyLabel}>Items</div>
            </div>
            <div className={css.tally}>
              <div className={`${css.tallyValue} ${css.tone_good}`}>{observedCount}</div>
              <div className={css.tallyLabel}>Observed</div>
            </div>
            <div className={css.tally}>
              <div
                className={`${css.tallyValue} ${remaining === 0 ? css.tone_good : css.tone_fair}`}
              >
                {remaining}
              </div>
              <div className={css.tallyLabel}>Remaining</div>
            </div>
          </div>

          {(['paddock', 'water', 'structure', 'crop'] as ItemKind[]).map((kind) => {
            const rows = grouped[kind];
            if (rows.length === 0) return null;
            return (
              <div key={kind} className={css.kindBlock}>
                <h4 className={`${css.kindLabel} ${css[`kind_${kind}`]}`}>
                  {KIND_LABEL[kind]} ({rows.length})
                </h4>
                <ul className={css.itemList}>
                  {rows.map((item) => {
                    const isObserved = Boolean(observed[item.id]);
                    return (
                      <li
                        key={item.id}
                        className={`${css.itemRow} ${css[`row_${kind}`]} ${
                          isObserved ? css.itemObserved : ''
                        }`}
                      >
                        <div className={css.itemBody}>
                          <div className={css.itemName}>{item.label}</div>
                          <div className={css.itemReason}>{item.reason}</div>
                          {isObserved && observed[item.id] && (
                            <div className={css.itemStamp}>
                              Observed{' '}
                              {new Date(observed[item.id]!).toLocaleString()}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(item.id)}
                          className={isObserved ? css.toggleBtnDone : css.toggleBtn}
                          aria-pressed={isObserved}
                        >
                          {isObserved ? 'Observed \u2713' : 'Mark observed'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </>
      )}

      <p className={css.footnote}>
        <em>How this list is built:</em> paddocks missing species or stocking
        density, water utilities missing capacity, structures missing
        condition notes, and crop areas missing planned species. No real
        timestamp store yet &mdash; observation marks are local-only.
      </p>
    </section>
  );
}
