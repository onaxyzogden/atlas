/**
 * CriticalConstraintAlert — surfaced under LandVerdictCard when a blocking
 * (severity 'critical') assessment flag exists for the project. Returns null
 * otherwise so the Overview hero block stays calm when nothing is on fire.
 *
 * Per 2026-04-27 brief §3 / Phase 3: provides a "Create Regulatory Checklist"
 * action so the alert is not a dead end. Wiring to the checklist generator is
 * stubbed and reserved for a later sprint — the button currently routes the
 * user to the Regulatory dashboard section.
 */

import { useMemo } from 'react';
import { OctagonX, ArrowRight } from 'lucide-react';
import { deriveRisks } from '../../lib/computeScores.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import type { MockLayerResult } from '../../lib/mockLayerData.js';
import css from './CriticalConstraintAlert.module.css';

const EMPTY_LAYERS: MockLayerResult[] = [];

interface CriticalConstraintAlertProps {
  project: LocalProject;
  onCreateChecklist?: () => void;
}

export default function CriticalConstraintAlert({
  project,
  onCreateChecklist,
}: CriticalConstraintAlertProps) {
  const siteData = useSiteData(project.id);
  const layers = siteData?.layers ?? EMPTY_LAYERS;

  const blockingFlag = useMemo(() => {
    const critical = deriveRisks(layers, project.country).filter((r) => r.severity === 'critical');
    if (critical.length === 0) return null;
    return [...critical].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
  }, [layers, project.country]);

  if (!blockingFlag) return null;

  return (
    <div className={css.alert} role="alert">
      <span className={css.icon} aria-hidden="true">
        <OctagonX size={18} strokeWidth={2} />
      </span>
      <div className={css.body}>
        <div className={css.titleRow}>
          <span className={css.severity}>Critical</span>
          <span className={css.title}>Regulatory or environmental blocker</span>
        </div>
        <p className={css.message}>{blockingFlag.message}</p>
        {blockingFlag.layerSource && (
          <span className={css.source}>Source: {blockingFlag.layerSource}</span>
        )}
      </div>
      <button
        type="button"
        className={css.cta}
        onClick={onCreateChecklist}
        disabled={!onCreateChecklist}
      >
        Create Regulatory Checklist
        <ArrowRight size={12} strokeWidth={2.2} aria-hidden="true" />
      </button>
    </div>
  );
}
