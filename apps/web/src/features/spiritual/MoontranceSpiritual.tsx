import type { MoontranceIdentity } from '../../store/visionStore.js';
import p from '../../styles/panel.module.css';
import s from './SpiritualPanel.module.css';

interface Props {
  identity: MoontranceIdentity | null;
  projectType: string;
}

const FIELDS: { key: keyof MoontranceIdentity; label: string }[] = [
  { key: 'prayerPavilionIntent', label: 'Prayer Pavilion Intent' },
  { key: 'quietZoneDesignation', label: 'Quiet Zone Designation' },
  { key: 'waterLandWorshipIntegration', label: 'Water & Worship Integration' },
  { key: 'hospitalitySequenceNotes', label: 'Hospitality Sequence' },
  { key: 'mensCohortZoneIntent', label: "Men's Cohort Zone" },
];

export default function MoontranceSpiritual({ identity, projectType }: Props) {
  if (projectType !== 'moontrance') return null;

  return (
    <div>
      <div className={p.sectionLabel}>Moontrance Identity</div>
      {!identity ? (
        <div className={p.empty}>Open the Vision panel to set up Moontrance identity fields</div>
      ) : (
        FIELDS.map((f) => {
          const val = identity[f.key];
          if (!val) return null;
          return (
            <div key={f.key} className={s.moonCard}>
              <div className={s.moonLabel}>{f.label}</div>
              <div className={s.moonValue}>{val}</div>
            </div>
          );
        })
      )}
    </div>
  );
}
