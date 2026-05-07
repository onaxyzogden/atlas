import {
  CalendarDays,
  Compass,
  Droplet,
  Eye,
  Flag,
  Layers,
  Leaf,
  MapPin,
  Mountain,
  Ruler,
  SlidersHorizontal,
  Snowflake,
  Sprout,
  Sun,
  Triangle,
  TriangleAlert,
  Wind,
} from "lucide-react";
import { CroppedArt } from "./CroppedArt.jsx";
import { ProgressRing } from "./ProgressRing.jsx";
import { SurfaceCard } from "./SurfaceCard.jsx";

const METRIC_ICONS = {
  calendar: CalendarDays,
  compass: Compass,
  droplet: Droplet,
  eye: Eye,
  flag: Flag,
  layers: Layers,
  leaf: Leaf,
  mapPin: MapPin,
  mountain: Mountain,
  ruler: Ruler,
  sliders: SlidersHorizontal,
  snowflake: Snowflake,
  sprout: Sprout,
  sun: Sun,
  alert: TriangleAlert,
  triangle: Triangle,
  wind: Wind,
};

function MetricBlock({ iconKey, label, value, note }) {
  const Icon = iconKey ? METRIC_ICONS[iconKey] : null;
  return (
    <div className="module-metric-block">
      {Icon && <Icon aria-hidden="true" />}
      <span>{label}</span>
      {value && <strong>{value}</strong>}
      <small>{note}</small>
    </div>
  );
}

export function ModuleHeroCard({ moduleNumber, title, icon: Icon, copy, progressPct, metrics, heroImage }) {
  return (
    <SurfaceCard className="module-hero-card">
      {heroImage && <CroppedArt src={heroImage} className="module-hero-image" />}
      <div className="module-hero-copy">
        <span>{moduleNumber}</span>
        <h1>{title} {Icon && <Icon aria-hidden="true" />}</h1>
        <p>{copy}</p>
      </div>
      <div className="module-hero-metrics">
        <ProgressRing value={progressPct} label={`${progressPct}%`} />
        {metrics.map((m) => (
          <MetricBlock key={m.label} iconKey={m.iconKey} label={m.label} value={m.value} note={m.note} />
        ))}
      </div>
    </SurfaceCard>
  );
}
