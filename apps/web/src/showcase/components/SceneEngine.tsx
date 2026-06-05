import { useEffect, useRef, type ReactNode } from 'react';
import type { Tier } from '../data/sceneManifest';
import { recordShowcaseEvent } from '../lib/showcaseEventLog';

export function SceneEngine({ tier, children }: { tier: Tier; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let scroller: any;
    // Dedupe scene_viewed: fire once per scene per mount, not on every re-entry.
    const seen = new Set<string>();
    (async () => {
      const mod = await import('scrollama');
      scroller = mod.default();
      scroller.setup({ step: '[data-scene-id]', offset: 0.55, debug: false })
        .onStepEnter((resp: any) => {
          resp.element.classList.add('scene-active');
          const sceneId = resp.element.getAttribute('data-scene-id');
          if (sceneId && !seen.has(sceneId)) {
            seen.add(sceneId);
            recordShowcaseEvent({ eventType: 'scene_viewed', tier, payload: { sceneId } });
          }
        })
        .onStepExit((resp: any) => { resp.element.classList.remove('scene-active'); });
    })();
    return () => { scroller?.destroy?.(); };
  }, [tier]);
  return <div ref={ref} data-showcase-tier={tier}>{children}</div>;
}
