import { useMemo } from 'react';
import type { Utility } from '../../store/utilityStore.js';
import { estimateSolarOutput } from './utilityAnalysis.js';
import p from '../../styles/panel.module.css';
import s from './UtilityPanel.module.css';

interface Props {
  utilities: Utility[];
  sunTrapAreaPct: number | null;
}

export default function SolarPlacement({ utilities, sunTrapAreaPct }: Props) {
  const solarPanels = useMemo(() => utilities.filter((u) => u.type === 'solar_panel'), [utilities]);
  const estimate = useMemo(() => estimateSolarOutput(solarPanels.length), [solarPanels.length]);

  return (
    <div>
      <div className={p.sectionLabel}>Solar Energy</div>
      {sunTrapAreaPct != null && (
        <div className={`${p.highlightBox} ${p.highlightBoxGold} ${p.mb8}`}>
          <div className={p.highlightBoxTitle}>Sun Trap Coverage</div>
          <div className={p.highlightBoxText}>{sunTrapAreaPct.toFixed(0)}% of site area in sun traps (sheltered, south-facing)</div>
        </div>
      )}
      {solarPanels.length === 0 ? (
        <div className={p.empty}>No solar panels placed. Use the Energy category to add panels.</div>
      ) : (
        <div className={s.solarCard}>
          <div className={s.solarStat}><span className={s.solarLabel}>Panels placed</span><span className={s.solarValue}>{estimate.panelCount}</span></div>
          <div className={s.solarStat}><span className={s.solarLabel}>Panel area</span><span className={s.solarValue}>{estimate.panelAreaM2.toFixed(0)} m{'\u00B2'}</span></div>
          <div className={s.solarStat}><span className={s.solarLabel}>Daily output</span><span className={s.solarValue}>{estimate.dailyKwh.toFixed(1)} kWh</span></div>
          <div className={s.solarStat}><span className={s.solarLabel}>Annual output</span><span className={s.solarValue}>{estimate.annualKwh.toFixed(0)} kWh</span></div>
          <div className={s.solarStat}><span className={s.solarLabel}>Avg irradiance</span><span className={s.solarValue}>{estimate.avgIrradiance} kWh/m{'\u00B2'}/day</span></div>
        </div>
      )}
    </div>
  );
}
