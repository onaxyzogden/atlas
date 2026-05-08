/**
 * AlertsPanel — derives operational alerts from hazards + livestock +
 * actuals stores. For the Harvest module we substitute a "Recent
 * Harvests" panel because harvests are opportunity-driven, not alert-
 * driven (per plan).
 */

import { useMemo } from 'react';
import { Droplet, AlertTriangle, Beef, Sprout } from 'lucide-react';
import { useHazardsStore } from '../../../store/hazardsStore.js';
import { useLivestockStore } from '../../../store/livestockStore.js';
import { useHarvestLogStore } from '../../../store/harvestLogStore.js';
import type { ActModule } from '../types.js';
import css from './ActOpsAside.module.css';

interface AlertRow {
  id: string;
  title: string;
  meta?: string;
  severity: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
}

interface Props {
  projectId: string | null;
  activeModule: ActModule | null;
}

export default function AlertsPanel({ projectId, activeModule }: Props) {
  const hazardsByProject = useHazardsStore((s) => s.byProject);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const harvestEntries = useHarvestLogStore((s) => s.entries);

  const harvestMode = activeModule === 'harvest';

  const recentHarvests = useMemo(() => {
    if (!projectId) return [];
    return [...harvestEntries]
      .filter((e) => e.projectId === projectId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 4);
  }, [harvestEntries, projectId]);

  const alerts = useMemo<AlertRow[]>(() => {
    if (!projectId || harvestMode) return [];
    const rows: AlertRow[] = [];

    const hazards =
      hazardsByProject.find((p) => p.projectId === projectId)?.hazards ?? [];

    const wantReview = activeModule === null || activeModule === 'review';
    if (wantReview) {
      for (const h of hazards) {
        if (h.status === 'mitigated') continue;
        if (h.risk === 'low') continue;
        rows.push({
          id: `hz-${h.id}`,
          title: h.label || h.kind,
          meta: `${h.kind} · ${h.mitigationPct}% mitigated`,
          severity: h.risk === 'high' ? 'high' : 'medium',
          icon: <AlertTriangle size={14} strokeWidth={1.7} />,
        });
      }
    }

    const wantLivestock = activeModule === null || activeModule === 'livestock';
    if (wantLivestock) {
      for (const p of paddocks) {
        if (p.projectId !== projectId) continue;
        if (!p.waterPointNote || p.waterPointNote.trim() === '') {
          rows.push({
            id: `pd-water-${p.id}`,
            title: `${p.name} — water point unset`,
            meta: 'No water note recorded for paddock',
            severity: 'medium',
            icon: <Droplet size={14} strokeWidth={1.7} />,
          });
        }
        if (p.fencing === 'none') {
          rows.push({
            id: `pd-fence-${p.id}`,
            title: `${p.name} — no fencing`,
            meta: 'Stock cannot be confined',
            severity: 'high',
            icon: <Beef size={14} strokeWidth={1.7} />,
          });
        }
      }
    }

    const wantBuild = activeModule === null || activeModule === 'build';
    if (wantBuild) {
      // Budget-vs-actuals overruns left as a future wire — actualsStore
      // join requires phaseStore tasks; surface only when a real overrun
      // is computed there. (No mocking per plan.)
    }

    return rows.slice(0, 5);
  }, [projectId, activeModule, hazardsByProject, paddocks, harvestMode]);

  if (harvestMode) {
    return (
      <section className={css.panel}>
        <header className={css.panelHeader}>
          <h3 className={css.panelTitle}>Recent Harvests</h3>
        </header>
        {recentHarvests.length === 0 ? (
          <p className={css.empty}>No harvests logged yet.</p>
        ) : (
          <ul className={css.alertList}>
            {recentHarvests.map((e) => (
              <li
                key={e.id}
                className={css.alertItem}
                data-severity="low"
              >
                <span className={css.alertIcon}>
                  <Sprout size={14} strokeWidth={1.7} />
                </span>
                <div className={css.alertBody}>
                  <span className={css.alertTitle}>
                    {e.quantity} {e.unit}
                    {e.quality ? ` · grade ${e.quality}` : ''}
                  </span>
                  <span className={css.alertMeta}>
                    {new Date(e.date).toLocaleDateString()} ·{' '}
                    {e.sourceKind === 'crop' ? 'Crop' : 'Livestock'}
                  </span>
                </div>
                <span />
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section className={css.panel}>
      <header className={css.panelHeader}>
        <h3 className={css.panelTitle}>
          {activeModule === 'livestock' ? 'Animal / Water Alerts' : 'Alerts'}
        </h3>
        {alerts.length > 0 ? (
          <span className={css.panelSubtitle}>
            {alerts.length} active
          </span>
        ) : null}
      </header>
      {alerts.length === 0 ? (
        <p className={css.empty}>No active alerts.</p>
      ) : (
        <ul className={css.alertList}>
          {alerts.map((a) => (
            <li
              key={a.id}
              className={css.alertItem}
              data-severity={a.severity}
            >
              <span className={css.alertIcon}>{a.icon}</span>
              <div className={css.alertBody}>
                <span className={css.alertTitle}>{a.title}</span>
                {a.meta ? (
                  <span className={css.alertMeta}>{a.meta}</span>
                ) : null}
              </div>
              <span className={css.alertChip} data-severity={a.severity}>
                {a.severity}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

