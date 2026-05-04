import { CalendarDays, MapPin, Maximize2, Mountain } from "lucide-react";
import { CroppedArt } from "./CroppedArt.jsx";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";

export function ProjectOverviewCard({ mapSrc }) {
  const { project, siteBanner } = useBuiltinProject();

  const haHa = project?.acreage ? (project.acreage * 0.404686).toFixed(1) : "25.7";
  const rows = [
    { icon: MapPin,       label: "Location",      value: siteBanner.location },
    { icon: Maximize2,    label: "Size",           value: `${haHa} ha` },
    { icon: Mountain,     label: "Elevation",      value: siteBanner.elevationRange },
    { icon: CalendarDays, label: "Project start",  value: siteBanner.projectStart },
  ];

  return (
    <aside className="project-overview-card">
      <h2>Project Overview</h2>
      <div className="project-overview-card__name">{project?.name ?? siteBanner.siteName}</div>
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
