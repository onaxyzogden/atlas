/**
 * NextBestActionsPanel — opinionated, ordered list of the 3–5 most valuable
 * next steps for this parcel (2026-04-27 brief §5 / Phase 5).
 *
 * Replaces the underused "Regenerative Metrics will appear when data is
 * populated" empty state on the Overview right rail. The queue is derived
 * from the same canonical scoring helpers used elsewhere on the page so the
 * verdict, triad, and action list always agree.
 *
 * Priority order:
 *   1. Draw parcel boundary (if missing) — nothing else works without it
 *   2. Top critical blocker → review constraint
 *   3. Top opportunity → incorporate into design
 *   4. Run feasibility scenario (decision support)
 *   5. Generate Land Brief
 * Capped at 5 visible items so the panel stays scannable.
 */

import { useMemo } from 'react';
import { ArrowRight, AlertOctagon, Sparkles, Map, FileText, Calculator } from 'lucide-react';
import { deriveOpportunities, deriveRisks } from '../../lib/computeScores.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData } from '../../store/siteDataStore.js';
import { useUIStore } from '../../store/uiStore.js';
import type { MockLayerResult } from '../../lib/mockLayerData.js';
import css from './NextBestActionsPanel.module.css';

const EMPTY_LAYERS: MockLayerResult[] = [];
const MAX_ACTIONS = 5;

type ActionTone = 'primary' | 'critical' | 'opportunity' | 'neutral';

interface NextAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: ActionTone;
  onClick: () => void;
}

interface NextBestActionsPanelProps {
  project: LocalProject;
  onGenerateBrief?: () => void;
  onSwitchToMap?: () => void;
}

export default function NextBestActionsPanel({
  project,
  onGenerateBrief,
  onSwitchToMap,
}: NextBestActionsPanelProps) {
  const siteData = useSiteData(project.id);
  const layers = siteData?.layers ?? EMPTY_LAYERS;
  const setActiveSection = useUIStore((s) => s.setActiveDashboardSection);

  const actions = useMemo<NextAction[]>(() => {
    const queue: NextAction[] = [];

    if (!project.parcelBoundaryGeojson) {
      queue.push({
        id: 'draw-boundary',
        icon: <Map size={14} strokeWidth={2} />,
        title: 'Draw the parcel boundary',
        description: 'Required before any layer or score can be evaluated.',
        tone: 'primary',
        onClick: () => onSwitchToMap?.(),
      });
    }

    const risks = deriveRisks(layers, project.country);
    const topCritical = [...risks.filter((r) => r.severity === 'critical')]
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
    if (topCritical) {
      queue.push({
        id: `risk-${topCritical.id}`,
        icon: <AlertOctagon size={14} strokeWidth={2} />,
        title: 'Resolve the blocking constraint',
        description: topCritical.message,
        tone: 'critical',
        onClick: () => setActiveSection('regulatory'),
      });
    }

    const opportunities = deriveOpportunities(layers, project.country);
    const topOpp = [...opportunities].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
    if (topOpp) {
      queue.push({
        id: `opp-${topOpp.id}`,
        icon: <Sparkles size={14} strokeWidth={2} />,
        title: 'Plan around the top opportunity',
        description: topOpp.message,
        tone: 'opportunity',
        onClick: () => setActiveSection('design-rules'),
      });
    }

    queue.push({
      id: 'run-feasibility',
      icon: <Calculator size={14} strokeWidth={2} />,
      title: 'Run a feasibility scenario',
      description: 'Test a low-impact enterprise mix against current constraints.',
      tone: 'neutral',
      onClick: () => setActiveSection('decision-feasibility'),
    });

    if (onGenerateBrief) {
      queue.push({
        id: 'generate-brief',
        icon: <FileText size={14} strokeWidth={2} />,
        title: 'Generate Land Brief',
        description: 'Export the verdict, constraints, and recommended actions for stakeholders.',
        tone: 'primary',
        onClick: onGenerateBrief,
      });
    }

    return queue.slice(0, MAX_ACTIONS);
  }, [layers, project.country, project.parcelBoundaryGeojson, onSwitchToMap, onGenerateBrief, setActiveSection]);

  if (actions.length === 0) return null;

  return (
    <div className={css.panel}>
      <h3 className={css.title}>Next Best Actions</h3>
      <ol className={css.list}>
        {actions.map((action) => (
          <li key={action.id}>
            <button
              type="button"
              className={`${css.action} ${css[`tone_${action.tone}`]}`}
              onClick={action.onClick}
            >
              <span className={css.iconWrap} aria-hidden="true">{action.icon}</span>
              <span className={css.body}>
                <span className={css.actionTitle}>{action.title}</span>
                <span className={css.actionDesc}>{action.description}</span>
              </span>
              <ArrowRight size={12} strokeWidth={2.2} className={css.chevron} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
