import { useMemo } from 'react';
import type { SiteData } from '../../store/siteDataStore.js';
import { assembleSignsInCreation } from './spiritualAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './SpiritualPanel.module.css';

interface Props { siteData: SiteData | null; }

export default function SignsInCreation({ siteData }: Props) {
  const signs = useMemo(() => assembleSignsInCreation(siteData), [siteData]);

  if (signs.length === 0) {
    return (
      <div>
        <div className={p.sectionLabel}>Signs in Creation</div>
        <div className={p.empty}>Fetch site intelligence data to reveal ecological signs</div>
      </div>
    );
  }

  return (
    <div>
      <div className={p.sectionLabel}>Signs in Creation</div>
      {signs.map((sign) => (
        <div key={sign.label} className={`${s.signCard} ${sign.present ? s.signPresent : s.signAbsent}`}>
          <div className={s.signLabel}>{sign.label}</div>
          <div className={s.signDesc}>{sign.description}</div>
          {sign.value && <div className={s.signValue}>{sign.value}</div>}
        </div>
      ))}
    </div>
  );
}
