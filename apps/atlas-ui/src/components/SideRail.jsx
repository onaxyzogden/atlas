import {
  BookOpen,
  CircleHelp,
  ClipboardList,
  FileText,
  Home,
  Layers,
  Map,
  Waves
} from "lucide-react";

export function SideRail({ active = "Overview" }) {
  const items = [
    { label: "Overview", icon: Home },
    { label: "Map", icon: Map },
    { label: "Journal", icon: ClipboardList },
    { label: "Data", icon: Waves },
    { label: "Library", icon: BookOpen },
    { label: "Reports", icon: FileText }
  ];

  return (
    <aside className="side-rail" aria-label="Main navigation">
      <div className="side-rail__mark" aria-label="OLOS">
        <Layers />
      </div>
      {items.map((item) => (
        <button
          className={`side-rail__item ${item.label === active ? "is-active" : ""}`}
          key={item.label}
          type="button"
        >
          <item.icon aria-hidden="true" />
          <span>{item.label}</span>
        </button>
      ))}
      <div className="side-rail__spacer" />
      <button className="side-rail__item side-rail__help" type="button">
        <CircleHelp aria-hidden="true" />
        <span>Help</span>
      </button>
      <div className="side-rail__avatar" aria-hidden="true" />
    </aside>
  );
}
