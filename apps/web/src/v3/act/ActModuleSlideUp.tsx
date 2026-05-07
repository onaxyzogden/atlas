/**
 * ActModuleSlideUp — bottom sheet for Act stage module detail.
 *
 * When a module is active, renders the corresponding act card(s) inside a
 * slide-up sheet. Modules with multiple sub-cards show a tab row at the
 * top. Each act card receives the LocalProject and a no-op onSwitchToMap
 * (the map is already visible in the background).
 *
 * Act cards are lazy-loaded to keep the initial bundle tight.
 * ESC and backdrop-click close the sheet.
 */

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import type { ActModule } from './types.js';
import { MODULE_CARDS, ACT_MODULE_FULL_LABEL } from './types.js';
import css from './ActModuleSlideUp.module.css';

// All 13 act cards lazy-loaded.
const BuildGanttCard            = lazy(() => import('../../features/act/BuildGanttCard.js'));
const BudgetActualsCard         = lazy(() => import('../../features/act/BudgetActualsCard.js'));
const PilotPlotsCard            = lazy(() => import('../../features/act/PilotPlotsCard.js'));
const MaintenanceScheduleCard   = lazy(() => import('../../features/act/MaintenanceScheduleCard.js'));
const IrrigationManagerCard     = lazy(() => import('../../features/act/IrrigationManagerCard.js'));
const WasteRoutingChecklistCard = lazy(() => import('../../features/act/WasteRoutingChecklistCard.js'));
const HarvestLogCard            = lazy(() => import('../../features/act/HarvestLogCard.js'));
const SuccessionTrackerCard     = lazy(() => import('../../features/act/SuccessionTrackerCard.js'));
const OngoingSwotCard           = lazy(() => import('../../features/act/OngoingSwotCard.js'));
const HazardPlansCard           = lazy(() => import('../../features/act/HazardPlansCard.js'));
const NetworkCrmCard            = lazy(() => import('../../features/act/NetworkCrmCard.js'));
const CommunityEventCard        = lazy(() => import('../../features/act/CommunityEventCard.js'));
const AppropriateTechLogCard    = lazy(() => import('../../features/act/AppropriateTechLogCard.js'));

function renderCard(sectionId: string, project: LocalProject) {
  const noop = () => {};
  switch (sectionId) {
    case 'act-build-gantt':       return <BuildGanttCard project={project} onSwitchToMap={noop} />;
    case 'act-budget-actuals':    return <BudgetActualsCard project={project} onSwitchToMap={noop} />;
    case 'act-pilot-plots':       return <PilotPlotsCard project={project} onSwitchToMap={noop} />;
    case 'act-maintenance':       return <MaintenanceScheduleCard project={project} onSwitchToMap={noop} />;
    case 'act-irrigation':        return <IrrigationManagerCard project={project} onSwitchToMap={noop} />;
    case 'act-waste-routing':     return <WasteRoutingChecklistCard project={project} onSwitchToMap={noop} />;
    case 'act-harvest-log':       return <HarvestLogCard project={project} onSwitchToMap={noop} />;
    case 'act-succession':        return <SuccessionTrackerCard project={project} onSwitchToMap={noop} />;
    case 'act-ongoing-swot':      return <OngoingSwotCard project={project} onSwitchToMap={noop} />;
    case 'act-hazard-plans':      return <HazardPlansCard project={project} onSwitchToMap={noop} />;
    case 'act-network-crm':       return <NetworkCrmCard project={project} onSwitchToMap={noop} />;
    case 'act-community-event':   return <CommunityEventCard project={project} onSwitchToMap={noop} />;
    case 'act-appropriate-tech':  return <AppropriateTechLogCard project={project} onSwitchToMap={noop} />;
    default: return null;
  }
}

interface Props {
  module: ActModule | null;
  open: boolean;
  onClose: () => void;
  project: LocalProject;
}

export default function ActModuleSlideUp({ module, open, onClose, project }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  useEffect(() => {
    if (module) {
      const cards = MODULE_CARDS[module];
      setActiveSectionId(cards[0]?.sectionId ?? null);
    }
  }, [module]);
  useEffect(() => {
    if (!open) return;
    const cards = module ? MODULE_CARDS[module] : [];
    setActiveSectionId(cards[0]?.sectionId ?? null);
  }, [open, module]);

  const handleEscape = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleEscape();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, handleEscape]);

  if (!open || !module) return null;

  const cards = MODULE_CARDS[module];
  const currentId = activeSectionId ?? cards[0]?.sectionId ?? null;
  const label = ACT_MODULE_FULL_LABEL[module];
  const hasMultiple = cards.length > 1;

  return (
    <div className={css.scrim} role="presentation" onClick={onClose}>
      <aside
        className={css.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={`${label} — act tools`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={css.header}>
          <div className={css.titleBlock}>
            <span className={css.eyebrow}>Act · module</span>
            <h2 className={css.title}>{label}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={css.close}
            onClick={onClose}
            aria-label="Close module"
          >
            ×
          </button>
        </header>

        {hasMultiple && (
          <nav className={css.tabs} aria-label="Module sub-tools">
            {cards.map(({ label: tabLabel, sectionId }) => (
              <button
                key={sectionId}
                type="button"
                className={`${css.tab} ${sectionId === currentId ? css.tabActive : ''}`}
                onClick={() => setActiveSectionId(sectionId)}
              >
                {tabLabel}
              </button>
            ))}
          </nav>
        )}

        <div className={css.body}>
          <Suspense fallback={<p className={css.loading}>Loading…</p>}>
            {currentId ? renderCard(currentId, project) : null}
          </Suspense>
        </div>
      </aside>
    </div>
  );
}
