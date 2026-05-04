import { useReducedMotion } from "../../hooks/useReducedMotion.js";

export function Skeleton({ width, height = 16, radius = 6, className = "", style = {} }) {
  const reduced = useReducedMotion();
  const cls = `prim-skeleton ${reduced ? "prim-skeleton--static" : ""} ${className}`.trim();
  return (
    <span
      className={cls}
      aria-hidden="true"
      style={{ width: width ?? "100%", height, borderRadius: radius, ...style }}
    />
  );
}
