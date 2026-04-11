import { useMemo } from 'react';
import type { Structure } from '../../store/structureStore.js';
import { analyzePrayerSpaces } from './spiritualAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './SpiritualPanel.module.css';

interface Props { structures: Structure[]; qiblaBearing: number | null; }

export default function PrayerSpaceAlignment({ structures, qiblaBearing }: Props) {
  const results = useMemo(() => {
    if (qiblaBearing == null) return [];
    return analyzePrayerSpaces(structures, qiblaBearing);
  }, [structures, qiblaBearing]);

  const prayerSpaces = structures.filter((st) => st.type === 'prayer_space');
  if (prayerSpaces.length === 0) {
    return (
      <div>
        <div className={p.sectionLabel}>Prayer Space Alignment</div>
        <div className={p.empty}>No prayer spaces placed. Add a "Prayer Space" structure to check Qibla alignment.</div>
      </div>
    );
  }

  return (
    <div>
      <div className={p.sectionLabel}>Prayer Space Alignment</div>
      {results.map((r) => (
        <div key={r.structure.id} className={`${s.alignmentCard} ${r.isAligned ? s.alignmentAligned : s.alignmentMisaligned}`}>
          <div className={s.alignmentName}>{r.structure.name}</div>
          <div className={s.alignmentDetail}>
            {r.correction}
            {!r.isAligned && ` (${Math.abs(r.offsetDeg).toFixed(1)}\u00B0 offset)`}
          </div>
        </div>
      ))}
    </div>
  );
}
