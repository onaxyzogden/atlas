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
import { Link } from "@tanstack/react-router";

export function SideRail({ active = "Overview" }) {
  const items = [
    { label: "Overview", icon: Home, to: "/observe" },
    { label: "Map", icon: Map },
    { label: "Journal", icon: ClipboardList },
    { label: "Data", icon: Waves },
    { label: "Library", icon: BookOpen },
    { label: "Reports", icon: FileText }
  ];

  return (
    <aside className="side-rail" aria-label="Main navigation">
      <Link to="/observe" className="side-rail__mark" aria-label="OLOS">
        <Layers />
      </Link>
      {items.map((item) => {
        const cls = `side-rail__item ${item.label === active ? "is-active" : ""}`;
        return item.to
          ? <Link to={item.to} className={cls} key={item.label}><item.icon aria-hidden="true" /><span>{item.label}</span></Link>
          : <button className={cls} key={item.label} type="button"><item.icon aria-hidden="true" /><span>{item.label}</span></button>;
      })}
      <div className="side-rail__spacer" />
      <button className="side-rail__item side-rail__help" type="button">
        <CircleHelp aria-hidden="true" />
        <span>Help</span>
      </button>
      <div className="side-rail__avatar" aria-hidden="true" />
    </aside>
  );
}
