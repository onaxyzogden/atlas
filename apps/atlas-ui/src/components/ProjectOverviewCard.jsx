import { CalendarDays, MapPin, Maximize2, Mountain } from "lucide-react";
import { CroppedArt } from "./CroppedArt.jsx";

const rows = [
  { icon: MapPin, label: "Location", value: "Nimbin, NSW, Australia" },
  { icon: Maximize2, label: "Size", value: "12.4 ha" },
  { icon: Mountain, label: "Elevation", value: "240–268 m" },
  { icon: CalendarDays, label: "Project start", value: "12 Apr 2025" }
];

export function ProjectOverviewCard({ mapSrc }) {
  return (
    <aside className="project-overview-card">
      <h2>Project Overview</h2>
      <div className="project-overview-card__name">Green Valley Homestead</div>
      <div className="project-overview-card__grid">
        <dl>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>
                <row.icon aria-hidden="true" />
                {row.label}
              </dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
        <CroppedArt className="project-overview-card__map" src={mapSrc} />
      </div>
      <button className="outlined-button" type="button">View site map ↗</button>
    </aside>
  );
}
