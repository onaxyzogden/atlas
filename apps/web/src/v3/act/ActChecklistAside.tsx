/**
 * ActChecklistAside — right rail surface for the Act stage.
 *
 * Was: a stack of permaculture-principle GuidanceCards (why/how copy).
 * Now: an Operations Hub dashboard (today's priorities, alerts, events,
 * quick actions) — Act is the execution stage, not a guidance stage.
 *
 * Prop shape preserved so ActLayout consumers do not change.
 */

import type { ActModule } from './types.js';
import ActOpsAside from './ops/ActOpsAside.js';

interface Props {
  activeModule: ActModule | null;
  onSelectModule: (module: ActModule | null) => void;
  slideUpOpen: boolean;
  onOpenSlideUp: () => void;
  onCloseSlideUp: () => void;
}

export default function ActChecklistAside(props: Props) {
  return <ActOpsAside {...props} />;
}
