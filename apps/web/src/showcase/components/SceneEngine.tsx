import { useEffect, useRef, type ReactNode } from 'react';
import type { Tier } from '../data/sceneManifest';

export function SceneEngine({ tier, children }: { tier: Tier; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let scroller: any;
    (async () => {
      const mod = await import('scrollama');
      scroller = mod.default();
      scroller.setup({ step: '[data-scene-id]', offset: 0.55, debug: false })
        .onStepEnter((resp: any) => { resp.element.classList.add('scene-active'); })
        .onStepExit((resp: any) => { resp.element.classList.remove('scene-active'); });
    })();
    return () => { scroller?.destroy?.(); };
  }, [tier]);
  return <div ref={ref} data-showcase-tier={tier}>{children}</div>;
}
