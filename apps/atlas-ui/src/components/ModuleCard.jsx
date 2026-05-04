import { Link } from "@tanstack/react-router";
import { CroppedArt } from "./CroppedArt.jsx";

export function ModuleCard({ number, title, status, active, artSrc, artClassName = "", to }) {
  const inner = (
    <>
      <span className="module-number">{number}</span>
      <CroppedArt className={`module-art ${artClassName}`} src={artSrc} />
      <span className="module-copy">
        <strong>
          {title.split("\n").map((line) => (
            <span key={line}>{line}</span>
          ))}
        </strong>
        <em className={active ? "is-active" : ""}>{status}</em>
      </span>
    </>
  );
  if (to) return <Link to={to} className="module-card-handbuilt">{inner}</Link>;
  return <button className="module-card-handbuilt" type="button">{inner}</button>;
}
