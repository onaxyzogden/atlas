/**
 * ObserveHero — shared 3-part hero header (eyebrow + title + lede) for every
 * Observe-stage page surfaced in the slide-up. Matches the Plan/Act card
 * convention so all three stages share the same visual rhythm.
 *
 * Eyebrow format: `Observe · Module N · <Module label>` where N is the
 * 1-indexed position in OBSERVE_MODULES. Title defaults to the tab label
 * for the page (from OBSERVE_MODULE_CARDS); falls back to the module label.
 *
 * `moduleOverride` exists for pages that are reused across modules (e.g.
 * CartographicDetail is rendered under both Topography and Sectors & Zones).
 */

import card from '../../_shared/stageCard/stageCard.module.css';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  OBSERVE_MODULE_CARDS,
  type ObserveModule,
} from '../types.js';

interface Props {
  sectionId: string;
  lede: string;
  moduleOverride?: ObserveModule;
}

function moduleForSection(sectionId: string): ObserveModule | undefined {
  for (const mod of OBSERVE_MODULES) {
    if (OBSERVE_MODULE_CARDS[mod].some((c) => c.sectionId === sectionId)) return mod;
  }
  return undefined;
}

export default function ObserveHero({ sectionId, lede, moduleOverride }: Props) {
  const module = moduleOverride ?? moduleForSection(sectionId);
  if (!module) return null;

  const moduleIndex = OBSERVE_MODULES.indexOf(module) + 1;
  const moduleLabel = OBSERVE_MODULE_LABEL[module];
  const cardEntry = OBSERVE_MODULE_CARDS[module].find((c) => c.sectionId === sectionId);
  const title = cardEntry?.label ?? moduleLabel;

  return (
    <header className={card.hero} data-stage="observe">
      <span className={card.heroTag}>
        Observe · Module {moduleIndex} · {moduleLabel}
      </span>
      <h1 className={card.title}>{title}</h1>
      <p className={card.lede}>{lede}</p>
    </header>
  );
}
