/**
 * WasteVectorTool — PLAN Module 5.
 *
 * Hosts a List / Dashboard segmented view switcher over the project's
 * waste-to-resource MaterialFlow records. The list view captures vectors
 * as labelled directed edges between any two existing on-project features
 * (zones, structures, fertility units, crop areas); the dashboard view
 * is a read-mostly bento overview of streams, flows, risks and scenarios.
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import WasteVectorListView from './WasteVectorListView.js';
import WasteVectorDashboardView from './WasteVectorDashboardView.js';
import LoopDesignScorePanel from './closedLoop/LoopDesignScorePanel.js';
import shared from '../../v3/_shared/stageCard/stageCard.module.css';
import styles from './WasteVectorTool.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

type View = 'list' | 'dashboard';

export default function WasteVectorTool({ project }: Props) {
  const [view, setView] = useState<View>('list');

  return (
    <div className={shared.page}>
      <header className={shared.hero} data-stage="plan">
        <span className={shared.heroTag}>Plan · Module 5 · Soil Fertility</span>
        <h1 className={shared.title}>Waste-to-resource vectors</h1>
        <p className={shared.lede}>
          Connect features that produce a waste stream to those that
          consume it as input. The classic example: kitchen → chicken
          coop → composter → orchard.
        </p>
      </header>

      <LoopDesignScorePanel project={project} />

      <div className={styles.switcher} role="tablist" aria-label="Waste vector view">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'list'}
          className={`${styles.switcherBtn} ${view === 'list' ? styles.switcherBtnActive : ''}`}
          onClick={() => setView('list')}
        >
          List
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'dashboard'}
          className={`${styles.switcherBtn} ${view === 'dashboard' ? styles.switcherBtnActive : ''}`}
          onClick={() => setView('dashboard')}
        >
          Dashboard
        </button>
      </div>

      {view === 'list' ? (
        <WasteVectorListView project={project} />
      ) : (
        <WasteVectorDashboardView project={project} onSwitchToList={() => setView('list')} />
      )}
    </div>
  );
}
