/**
 * SoilResourcesCard — Plan Module 5 (Soil Fertility), Greens/Browns inventory.
 *
 * Per Permaculture Scholar verdict 2026-05-07 (parent ADR
 * `wiki/decisions/2026-05-07-atlas-plan-soil-scholar-build-fresh.md`):
 * "Bare-minimum visualisations include … browns/greens (C/N) inventory."
 * The Scholar sketched a 3-tab Soil workflow — Baseline → Resource
 * inventory & management areas → Closed-loop graph + plan. The baseline
 * and graph are live; this card fills the inventory leg.
 *
 * Scope (v1):
 *   - Checklist of common high-N (greens) and high-C (browns) feedstocks
 *     with reference C:N ratios (USDA / Cornell composting tables).
 *   - Optional volume input (m³) per checked feedstock. When present, the
 *     aggregate C:N is mass-weighted using a coarse 200 kg/m³ density and
 *     each feedstock's reference C:N — the goal isn't lab-grade accuracy,
 *     it's whether the steward's heap will actually decompose hot
 *     (target 25–35:1 per Cornell).
 *   - Live indicator: too-green (< 20:1, ammonia/anaerobic risk),
 *     ideal (25–35:1), too-brown (> 50:1, will not heat).
 *   - Permaculture-grounded prompt at the bottom keyed to the result —
 *     e.g. "add straw or wood chips" / "add manure or grass clippings".
 *
 * Persistence: per-project volumes round-trip through
 * `compostInventoryStore` (zustand + persist) — see
 * `src/store/compostInventoryStore.ts`. The card owns the static
 * Greens/Browns catalog; the store only persists `{ feedstockId → m³ }`,
 * so the catalog can evolve without invalidating saved data.
 *
 * Sources: NotebookLM Permaculture Scholar (5aa3dcf3-…) 2026-05-07;
 * Holmgren D. P6 *Produce No Waste*; Cornell Waste Management Institute
 * "Composting in Schools" C:N table; Mollison B. *Permaculture
 * Designer's Manual* ch.8.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useCompostInventoryStore } from '../../../../store/compostInventoryStore.js';
import {
  GREENS,
  BROWNS,
  aggregateCN,
  type Feedstock,
} from './compostYieldMath.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

export default function SoilResourcesCard({ project }: Props) {
  // ── Persistent inventory (compostInventoryStore) ──────────────────────
  // v1 used component-state; v2 (2026-05-07) persists per-project so the
  // C:N verdict survives reload. The store holds a flat
  // { feedstockId → m³ } record per project — Greens/Browns split
  // happens at render-time by checking the GREENS / BROWNS catalog.
  const byProject = useCompostInventoryStore((s) => s.byProject);
  const setVolume = useCompostInventoryStore((s) => s.setVolume);
  const inventory = useMemo(
    () => byProject[project.id] ?? {},
    [byProject, project.id],
  );

  function setVol(id: string, raw: string) {
    const v = Math.max(0, Number(raw) || 0);
    setVolume(project.id, id, v);
  }

  function checked(id: string): boolean {
    return (inventory[id] ?? 0) > 0;
  }

  // Mass-weighted aggregate C:N — extracted to `compostYieldMath` so the
  // formula has one home + a colocated test (this card had none). The
  // card's rendered numbers are unchanged by construction.
  const aggregate = useMemo(() => aggregateCN(inventory), [inventory]);

  // Verdict bands.
  const verdict = useMemo(() => {
    if (aggregate.greenCount === 0 && aggregate.brownCount === 0) {
      return { kind: 'empty' as const, label: 'No feedstocks logged yet', tone: 'neutral' as const };
    }
    if (aggregate.greenCount === 0) {
      return {
        kind: 'all-brown' as const,
        label: 'No greens — heap will not heat',
        tone: 'warn' as const,
        remedy: 'Add a high-N feedstock: grass clippings, kitchen scraps, comfrey, manure, or coffee grounds. Cornell target: ≥ 1 part green per 2 parts brown by volume.',
      };
    }
    if (aggregate.brownCount === 0) {
      return {
        kind: 'all-green' as const,
        label: 'No browns — risk of ammonia / anaerobic mat',
        tone: 'warn' as const,
        remedy: 'Add a high-C bulking agent: shredded leaves, straw, cardboard, or chipped wood. Without browns, fresh greens slump into a slimy anaerobic layer that off-gasses N as ammonia.',
      };
    }
    if (aggregate.ratio < 20) {
      return {
        kind: 'too-green' as const,
        label: `C:N ${aggregate.ratio.toFixed(1)} : 1 — too green`,
        tone: 'warn' as const,
        remedy: 'Increase brown volume. Target 25–35 : 1. Quick win: shred dry leaves or cardboard at 2× the volume of greens.',
      };
    }
    if (aggregate.ratio > 50) {
      return {
        kind: 'too-brown' as const,
        label: `C:N ${aggregate.ratio.toFixed(1)} : 1 — too brown, slow to heat`,
        tone: 'warn' as const,
        remedy: 'Increase green volume. Target 25–35 : 1. Quick wins: grass clippings, coffee grounds, fresh manure.',
      };
    }
    if (aggregate.ratio >= 25 && aggregate.ratio <= 35) {
      return {
        kind: 'ideal' as const,
        label: `C:N ${aggregate.ratio.toFixed(1)} : 1 — hot-compost ready`,
        tone: 'ok' as const,
        remedy: 'Within Cornell\'s ideal hot-composting band (25–35 : 1). Build the heap ≥ 1 m³, turn at days 4 / 10 / 21.',
      };
    }
    return {
      kind: 'workable' as const,
      label: `C:N ${aggregate.ratio.toFixed(1)} : 1 — workable, slightly off ideal`,
      tone: 'neutral' as const,
      remedy: 'Composts but won\'t hit thermophilic 55–65 °C cleanly. Acceptable for cold composting / sheet mulch.',
    };
  }, [aggregate]);

  const verdictColor: Record<typeof verdict.tone, string> = {
    ok:      'rgba(120, 200, 130, 0.95)',
    warn:    'rgba(220, 150, 100, 0.95)',
    neutral: 'rgba(232, 220, 200, 0.85)',
  };

  function renderRow(f: Feedstock) {
    const v = inventory[f.id] ?? 0;
    const isOn = checked(f.id);
    return (
      <li key={f.id} className={styles.listRow}>
        <div>
          <strong style={{ color: isOn ? 'rgba(232,220,200,0.95)' : 'rgba(232,220,200,0.7)' }}>
            {f.name}
          </strong>
          <div className={styles.listMeta}>
            C:N {f.cn} : 1{f.note ? ` · ${f.note}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            value={v > 0 ? String(v) : ''}
            onChange={(e) => setVol(f.id, e.target.value)}
            placeholder="0"
            inputMode="decimal"
            style={{ width: 60, textAlign: 'right' }}
          />
          <span style={{ fontSize: 11, color: 'rgba(232,220,200,0.55)' }}>m³</span>
        </div>
      </li>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={styles.title}>Resource inventory · Greens & Browns</h1>
        <p className={styles.lede}>
          Holmgren P6 — <em>Produce No Waste</em>. Before designing the
          closed-loop graph, inventory what feedstocks the site already
          generates (or could capture nearby). This card scores the
          aggregate C:N ratio against Cornell's hot-composting band so
          the steward sees, before turning the first heap, whether the
          mix will heat or sulk.
        </p>
      </header>

      <section
        className={styles.section}
        style={{
          borderColor: verdict.tone === 'warn' ? 'rgba(220,150,100,0.4)' : 'rgba(255,255,255,0.06)',
        }}
      >
        <h2 className={styles.sectionTitle}>Aggregate C:N</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(232,220,200,0.55)' }}>Greens logged</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{aggregate.greenCount} <span style={{ fontSize: 11, color: 'rgba(232,220,200,0.55)' }}>of {GREENS.length}</span></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(232,220,200,0.55)' }}>Browns logged</div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{aggregate.brownCount} <span style={{ fontSize: 11, color: 'rgba(232,220,200,0.55)' }}>of {BROWNS.length}</span></div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(232,220,200,0.55)' }}>Aggregate ratio</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: verdictColor[verdict.tone] }}>
              {aggregate.ratio > 0 ? `${aggregate.ratio.toFixed(1)} : 1` : '—'}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.03)',
            color: verdictColor[verdict.tone],
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {verdict.label}
        </div>
        {verdict.kind !== 'empty' && verdict.kind !== 'ideal' && 'remedy' in verdict && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(232,220,200,0.7)', lineHeight: 1.5 }}>
            {verdict.remedy}
          </div>
        )}
        {verdict.kind === 'ideal' && 'remedy' in verdict && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(232,220,200,0.7)', lineHeight: 1.5 }}>
            {verdict.remedy}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Greens (high N — &lt; 25:1)</h2>
        <p style={{ fontSize: 12, color: 'rgba(232,220,200,0.55)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Enter approximate volume (m³) for each feedstock you have on hand or could capture seasonally.
          Leave blank if not available.
        </p>
        <ul className={styles.list}>
          {GREENS.map((f) => renderRow(f))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Browns (high C — &gt; 30:1)</h2>
        <ul className={styles.list}>
          {BROWNS.map((f) => renderRow(f))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why this inventory</h2>
        <p style={{ fontSize: 13, color: 'rgba(232,220,200,0.7)', margin: 0, lineHeight: 1.6 }}>
          A closed-loop diagram (next tab) is only as good as the feedstocks the loops actually
          process. Cornell's hot-composting target of <strong>25–35 : 1</strong> isn't a curiosity —
          below 20:1 nitrogen vents as ammonia and the heap goes anaerobic; above 50:1 microbes
          can't find enough N to grow and the pile sits cold for years. Stewards who skip the
          inventory rebuild this knowledge slowly, the hard way.
        </p>
      </section>
    </div>
  );
}
