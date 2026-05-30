// DetailsExpander — the REFERENCE section of ObjectiveDetailPanel
// (Plan Navigation Spec v1, Slice 1.8). Collapsible host that lazy-loads
// the legacy module card pointed to by `objective.legacyCardSectionId`.
//
// The stratum shell intentionally does NOT depend on PlanModuleSlideUp's
// chrome (sheet, focus trap, orphan-output gate, view badge). The
// REFERENCE section is a flat in-panel embed — only the card content
// itself is reused.
//
// Each card is wrapped in `React.lazy` so the stratum route only pays the
// chunk cost when a steward actually expands the section (see plan §"Risks
// & Mitigations" — "Module-card embed in REFERENCE section pulls heavy
// module-bar dependencies into the stratum route").
//
// New legacy mappings: extend the switch + add a `lazy()` line for the
// matching card. The catalogue lives in
// `packages/shared/src/constants/plan/stratumObjectives.ts`.

import {
  Component,
  Suspense,
  lazy,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  useProjectStore,
  type LocalProject,
} from '../../../store/projectStore.js';
import css from './DetailsExpander.module.css';

// Lazy card imports — only the legacy cards currently mapped from a stratum
// objective's `legacyCardSectionId` need to be listed here. Add more as
// the seed grows. Each line creates its own JS chunk.
const DevelopPlanTab = lazy(
  () => import('../cards/goal-compass/DevelopPlanTab.js'),
);
const SocialNodesCard = lazy(
  () => import('../cards/zone-circulation/SocialNodesCard.js'),
);
const SoilBaselineCard = lazy(
  () => import('../cards/soil-fertility/SoilBaselineCard.js'),
);
const ZoneCirculationOverviewCard = lazy(
  () => import('../cards/zone-circulation/ZoneCirculationOverviewCard.js'),
);
const SectorOverlayCard = lazy(
  () => import('../cards/zone-circulation/SectorOverlayCard.js'),
);
const WaterNetworkCard = lazy(
  () => import('../cards/water-management/WaterNetworkCard.js'),
);
const ClosedLoopGraphCard = lazy(
  () => import('../cards/soil-fertility/ClosedLoopGraphCard.js'),
);
const PhasingMatrixCard = lazy(
  () => import('../../../features/plan/PhasingMatrixCard.js'),
);

const noop = () => {};

interface Props {
  projectId: string;
  legacyCardSectionId: string;
}

export default function DetailsExpander({
  projectId,
  legacyCardSectionId,
}: Props) {
  const [open, setOpen] = useState(false);
  // Look up the LocalProject directly — legacy cards consume the local
  // shape, not the adapted v3 Project. Reading off the store here keeps
  // the parent ObjectiveDetailPanel free of the extra prop.
  const projects = useProjectStore((s) => s.projects);
  const project = useMemo<LocalProject | null>(
    () =>
      projects.find((p) => p.id === projectId || p.serverId === projectId) ??
      null,
    [projects, projectId],
  );

  const cardLabel = LEGACY_CARD_LABELS[legacyCardSectionId] ?? 'legacy card';

  return (
    <section
      className={css.section}
      aria-label="Reference"
      data-testid="plan-objective-reference"
    >
      <button
        type="button"
        className={css.header}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={css.headerLead}>
          {open ? (
            <ChevronDown size={14} aria-hidden />
          ) : (
            <ChevronRight size={14} aria-hidden />
          )}
          <span className={css.eyebrow}>Reference</span>
        </span>
        <span className={css.headerHint}>
          {open ? 'Hide' : 'Show'} {cardLabel}
        </span>
      </button>

      {open && (
        <div className={css.body}>
          {project ? (
            <CardErrorBoundary>
              <Suspense
                fallback={
                  <p className={css.placeholder}>Loading legacy card…</p>
                }
              >
                {renderLegacyCard(legacyCardSectionId, project)}
              </Suspense>
            </CardErrorBoundary>
          ) : (
            <p className={css.placeholder}>
              Project unavailable — reference cannot render.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// Friendly labels for the toggle. Keyed by sectionId. Fallback "legacy
// card" still produces a sensible hint when a new mapping ships ahead of
// the label entry.
const LEGACY_CARD_LABELS: Readonly<Record<string, string>> = {
  'plan-develop-plan': 'develop plan',
  'plan-social-nodes': 'social nodes',
  'plan-soil-baseline': 'soil baseline',
  'plan-zone-overview': 'zone overview',
  'plan-sector-overlay': 'sectors',
  'plan-water-network': 'water network',
  'plan-closed-loop-graph': 'closed-loop graph',
  'plan-phasing-matrix': 'phasing matrix',
};

function renderLegacyCard(
  sectionId: string,
  project: LocalProject,
): ReactNode {
  switch (sectionId) {
    case 'plan-develop-plan':
      return <DevelopPlanTab project={project} onSwitchModule={noop} />;
    case 'plan-social-nodes':
      return <SocialNodesCard project={project} onSwitchToMap={noop} />;
    case 'plan-soil-baseline':
      return <SoilBaselineCard project={project} onSwitchToMap={noop} />;
    case 'plan-zone-overview':
      return (
        <ZoneCirculationOverviewCard project={project} onSwitchToMap={noop} />
      );
    case 'plan-sector-overlay':
      return <SectorOverlayCard project={project} onSwitchToMap={noop} />;
    case 'plan-water-network':
      return <WaterNetworkCard project={project} onSwitchToMap={noop} />;
    case 'plan-closed-loop-graph':
      return <ClosedLoopGraphCard project={project} onSwitchToMap={noop} />;
    case 'plan-phasing-matrix':
      return <PhasingMatrixCard project={project} onSwitchToMap={noop} />;
    default:
      return (
        <p className={css.placeholder}>
          No legacy card registered for &quot;{sectionId}&quot; yet.
        </p>
      );
  }
}

// Boundary so a card whose data dependencies aren't hydrated yet can't
// take down the panel. The stratum shell embeds run with looser preconditions
// than ModuleSlideUp (no orphan-output gate, no probe), so failures here
// degrade to a readable notice instead of bubbling to the route.
class CardErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean; msg: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false, msg: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { failed: true, msg: error.message };
  }
  override componentDidCatch(error: Error) {
    console.warn('[DetailsExpander] legacy card failed:', error.message);
  }
  override render() {
    if (this.state.failed) {
      return (
        <p className={css.placeholder}>
          Legacy card failed to render: {this.state.msg}
        </p>
      );
    }
    return this.props.children;
  }
}
