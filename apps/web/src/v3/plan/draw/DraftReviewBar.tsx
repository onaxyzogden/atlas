/**
 * DraftReviewBar — floating Accept / Discard / Regenerate control for the
 * live Auto-Design generation. Renders only when `generatorDraftStore`
 * has an active generation for this project. Per-class chips let the
 * steward discard one feature-class bucket while keeping the rest in
 * review.
 *
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md (Phase 5).
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { useGeneratorDraftStore } from '../../../store/generatorDraftStore.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import {
  bandForWater,
  WATER_BAND_RULE_COPY,
} from '../../../features/livestock/waterSource.js';

interface Props {
  projectId: string;
  onRegenerate: (prevGenerationId: string) => void;
}

export default function DraftReviewBar({ projectId, onRegenerate }: Props) {
  const activeGenerationId = useGeneratorDraftStore(
    (s) => s.activeGenerationId,
  );
  const activeProjectId = useGeneratorDraftStore((s) => s.activeProjectId);
  const commit = useGeneratorDraftStore((s) => s.commit);
  const discard = useGeneratorDraftStore((s) => s.discard);
  const discardClass = useGeneratorDraftStore((s) => s.discardClass);

  const landByProject = useLandDesignStore((s) => s.byProject);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const fenceLines = useLivestockStore((s) => s.fenceLines);

  const active =
    activeGenerationId !== null && activeProjectId === projectId
      ? activeGenerationId
      : null;

  const classCounts = useMemo(() => {
    if (!active) return [] as { cls: string; count: number }[];
    const counts = new Map<string, number>();
    for (const el of landByProject[projectId] ?? []) {
      if (el.draft && el.generationId === active) {
        const cls = el.draftClass ?? 'other';
        counts.set(cls, (counts.get(cls) ?? 0) + 1);
      }
    }
    const lsCount =
      paddocks.filter((p) => p.draft && p.generationId === active).length +
      fenceLines.filter((f) => f.draft && f.generationId === active).length;
    if (lsCount > 0) counts.set('livestock', lsCount);
    return [...counts.entries()]
      .map(([cls, count]) => ({ cls, count }))
      .sort((a, b) => a.cls.localeCompare(b.cls));
  }, [active, landByProject, projectId, paddocks, fenceLines]);

  const warnings = useMemo(() => {
    if (!active) return [] as string[];
    const draftPaddocks = paddocks.filter(
      (p) => p.draft && p.generationId === active,
    );
    const out: string[] = [];

    // Stocking-rate advisory — generator emits paddocks without a density.
    const noDensity = draftPaddocks.filter(
      (p) => p.stockingDensity == null || p.species.length === 0,
    ).length;
    if (noDensity > 0) {
      out.push(
        `${noDensity} paddock(s) need a stocking density / species before grazing`,
      );
    }

    // Water-band check — nearest draft water feature to each paddock centroid.
    const waterPts: [number, number][] = [];
    for (const el of landByProject[projectId] ?? []) {
      if (!el.draft || el.generationId !== active) continue;
      if (el.draftClass !== 'water') continue;
      try {
        const c = turf.centroid(el.geometry as turf.AllGeoJSON).geometry
          .coordinates as [number, number];
        waterPts.push(c);
      } catch {
        /* skip degenerate geometry */
      }
    }
    let belowFair = 0;
    for (const p of draftPaddocks) {
      let nearest: number | null = null;
      try {
        const pc = turf.centroid(p.geometry).geometry.coordinates as [
          number,
          number,
        ];
        for (const w of waterPts) {
          const d = turf.distance(pc, w, { units: 'meters' });
          if (nearest == null || d < nearest) nearest = d;
        }
      } catch {
        /* skip */
      }
      const band = bandForWater(nearest);
      if (band === 'poor' || band === 'missing') belowFair += 1;
    }
    if (belowFair > 0) {
      out.push(
        `${belowFair} paddock(s) lack a water source within fair range (${WATER_BAND_RULE_COPY})`,
      );
    }
    return out;
  }, [active, paddocks, landByProject, projectId]);

  if (!active) return null;

  const total = classCounts.reduce((s, c) => s + c.count, 0);

  return (
    <div
      role="region"
      aria-label="Auto-design draft review"
      style={{
        marginTop: 12,
        padding: '12px 14px',
        borderRadius: 10,
        background: 'rgba(40,34,26,0.85)',
        border: '1px solid rgba(212,182,99,0.45)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
      }}
    >
      <strong
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          color: 'rgba(245,225,170,0.95)',
        }}
      >
        {total} draft feature{total === 1 ? '' : 's'} in review
      </strong>

      {warnings.length > 0 ? (
        <ul
          style={{
            flexBasis: '100%',
            margin: '4px 0 0',
            paddingLeft: 18,
            fontSize: 11,
            color: 'rgba(240,180,120,0.9)',
          }}
        >
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      ) : null}

      {classCounts.map(({ cls, count }) => (
        <button
          key={cls}
          type="button"
          onClick={() => discardClass(active, cls)}
          title={`Discard ${cls} drafts`}
          style={chipStyle}
        >
          {cls} ({count}) ✕
        </button>
      ))}

      <span style={{ flex: 1 }} />

      <button
        type="button"
        onClick={() => commit(active)}
        style={{ ...btnStyle, borderColor: 'rgba(120,200,120,0.6)' }}
      >
        Accept all
      </button>
      <button
        type="button"
        onClick={() => onRegenerate(active)}
        style={btnStyle}
      >
        Regenerate
      </button>
      <button
        type="button"
        onClick={() => discard(active)}
        style={{ ...btnStyle, borderColor: 'rgba(220,80,80,0.6)' }}
      >
        Discard all
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.3)',
  color: 'rgba(232,220,200,0.92)',
  border: '1px solid rgba(212,182,99,0.4)',
  borderRadius: 6,
  padding: '5px 12px',
  fontSize: 12,
  cursor: 'pointer',
};

const chipStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.25)',
  color: 'rgba(232,220,200,0.8)',
  border: '1px solid rgba(212,182,99,0.3)',
  borderRadius: 999,
  padding: '3px 10px',
  fontSize: 11,
  cursor: 'pointer',
};
