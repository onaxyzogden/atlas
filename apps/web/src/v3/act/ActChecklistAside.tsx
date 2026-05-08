/**
 * ActChecklistAside — right-rail Permaculture-Scholar guidance for Act.
 *
 * 6 module guidance cards grounded in execution discipline. Cards delegate
 * to the shared `<GuidanceCard>`; this file owns the Act guidance copy and
 * the per-module dot palette.
 */

import { useRef } from 'react';
import { useParams } from '@tanstack/react-router';
import { useActHowChecksStore } from '../../store/actHowChecksStore.js';
import { useAutoScrollToActiveModule } from '../_shared/hooks/useAutoScrollToActiveModule.js';
import {
  GuidanceCard,
  type GuidanceCardData,
} from '../_shared/components/GuidanceCard.js';
import { ACT_MODULES, ACT_MODULE_LABEL, type ActModule } from './types.js';
import css from './ActChecklistAside.module.css';

const EMPTY_CHECKS: readonly number[] = [];

const ACT_MODULE_GUIDANCE: Record<ActModule, GuidanceCardData> = {
  build: {
    why: 'Implementation cadence determines whether a design survives contact with the land. Sequencing earthworks, infrastructure, and pilot plots in the right order protects capital and prevents rework (Mollison, Designer\'s Manual ch.14).',
    how: [
      'Track the build schedule against the approved phasing plan, not aspirational dates.',
      'Reconcile budget vs actuals at every milestone gate before unlocking the next phase.',
      'Run pilot plots before scaling — small failures inform large decisions.',
    ],
  },
  maintain: {
    why: 'Apply self-regulation and accept feedback (Holmgren P4): maintenance discipline is what separates a designed system from an abandoned one. Routine attention compounds; neglect compounds faster.',
    how: [
      'Hold the maintenance schedule on the calendar — recurring, not reactive.',
      'Audit irrigation lines, valves, and reservoirs before each dry window.',
      'Close the loop on every waste stream — compost, mulch, or animal feed.',
    ],
  },
  livestock: {
    why: 'Animals integrate the design (Holmgren P8) — they cycle nutrients, manage forage, and signal pasture health. Stewarding them well during execution turns the paddock plan into resilient operations (Mollison, Designer\'s Manual ch.8).',
    how: [
      'Move stock on the cell rotation cadence agreed in Plan — graze short, rest long.',
      'Log animal-day usage per cell so rest periods stay honest.',
      'Inspect water, fencing, and shelter on every move — equipment failures compound fastest with livestock.',
    ],
  },
  harvest: {
    why: 'Obtain a yield (Holmgren P3) is the test of the whole design. Logging harvests and succession data turns lived experience into evidence the next cycle can act on.',
    how: [
      'Log every harvest by weight, date, and bed — no entry is too small.',
      'Track succession plantings in real time so gaps in the bed never sit fallow.',
      'Compare actual yield to design intent at season close — adjust the plan, not the memory.',
    ],
  },
  review: {
    why: 'Use and value diversity (Holmgren P10) extends to the review process: ongoing SWOT and hazard planning catch threats before they become incidents, and reveal opportunities the original design did not anticipate.',
    how: [
      'Refresh the SWOT each season with the team, not in isolation.',
      'Walk the hazard plan annually — fire, flood, biosecurity, equipment failure.',
      'File every near-miss as a learning, not an embarrassment.',
    ],
  },
  network: {
    why: 'Integrate rather than segregate (Holmgren P8): a regenerative project is held by its network — neighbours, customers, suppliers, learners. Stewarding those relationships is part of the operation, not a marketing afterthought.',
    how: [
      'Maintain the network CRM as a living record of every meaningful contact.',
      'Run community events on a predictable cadence so trust accumulates.',
      'Document appropriate-tech adoptions so others can follow the path.',
    ],
  },
};

const ACT_MODULE_DOT: Record<ActModule, string> = {
  build: '#c4a265',
  maintain: '#5fc7d4',
  livestock: '#e6c34a',
  harvest: '#8bd16a',
  review: '#e88aa4',
  network: '#d68bd0',
};

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (module: ActModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

function ActGuidanceCard({
  module,
  active,
  projectId,
  slideUpOpen,
  onSelectModule,
  onOpenSlideUp,
  onCloseSlideUp,
}: {
  module: ActModule;
  active: boolean;
  projectId: string | null;
  slideUpOpen: boolean;
  onSelectModule: (module: ActModule | null) => void;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}) {
  const checkedList = useActHowChecksStore(
    (s) =>
      (projectId ? s.byProject[projectId]?.[module] : null) ?? EMPTY_CHECKS,
  );
  const toggle = useActHowChecksStore((s) => s.toggle);

  return (
    <GuidanceCard
      moduleKey={module}
      label={ACT_MODULE_LABEL[module]}
      dotColor={ACT_MODULE_DOT[module]}
      active={active}
      slideUpOpen={slideUpOpen}
      guidance={ACT_MODULE_GUIDANCE[module]}
      checkedList={checkedList}
      onToggle={(i) => projectId && toggle(projectId, module, i)}
      onSelect={() => onSelectModule(module)}
      onOpenSlideUp={onOpenSlideUp}
      onCloseSlideUp={onCloseSlideUp}
      checksDisabled={!projectId}
    />
  );
}

export default function ActChecklistAside({
  activeModule,
  onSelectModule,
  slideUpOpen,
  onOpenSlideUp,
  onCloseSlideUp,
}: Props) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? null;

  const asideRef = useRef<HTMLDivElement | null>(null);
  useAutoScrollToActiveModule(activeModule, asideRef);

  return (
    <div
      ref={asideRef}
      className={css.checklistBox}
      data-has-active={activeModule !== null ? 'true' : 'false'}
    >
      {ACT_MODULES.map((mod) => (
        <ActGuidanceCard
          key={mod}
          module={mod}
          active={activeModule === mod}
          projectId={projectId}
          slideUpOpen={slideUpOpen}
          onSelectModule={onSelectModule}
          onOpenSlideUp={onOpenSlideUp}
          onCloseSlideUp={onCloseSlideUp}
        />
      ))}
    </div>
  );
}
