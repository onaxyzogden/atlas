import { ArrowRight } from "lucide-react";
import { SurfaceCard } from "./SurfaceCard.jsx";

export function InsightSidebar({ title, icon, intro, children, cta }) {
  const Icon = icon;

  return (
    <SurfaceCard className="insight-sidebar">
      <header>
        {Icon ? <Icon aria-hidden="true" /> : null}
        <h2>{title}</h2>
      </header>
      {intro ? <p className="insight-sidebar__intro">{intro}</p> : null}
      <div className="insight-sidebar__body">{children}</div>
      {cta ? (
        <button className="sidebar-cta" type="button">
          {cta}
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </SurfaceCard>
  );
}
