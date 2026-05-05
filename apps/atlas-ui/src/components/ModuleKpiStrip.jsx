import { SurfaceCard } from "./SurfaceCard.jsx";

export function ModuleKpiStrip({ items, iconMap }) {
  return (
    <SurfaceCard className="module-kpi-strip">
      {items.map(([iconKey, label, value, note, tone]) => {
        const Icon = iconMap[iconKey];
        return (
          <div className={`module-kpi${tone ? ` ${tone}` : ""}`} key={label}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        );
      })}
    </SurfaceCard>
  );
}
