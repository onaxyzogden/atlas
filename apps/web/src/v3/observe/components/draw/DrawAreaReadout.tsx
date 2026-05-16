/**
 * DrawAreaReadout — shared live-area chip for polygon-mode annotation tools.
 *
 * Each Observe / Plan draw tool owns its own CSS module (ObserveDrawHost,
 * MapToolbar, etc.) so we accept `labelClassName` + `valueClassName` and let
 * the caller pass through its module's `readoutLabel` / `readoutValue` keys.
 * Renders nothing when m2 is null (no draft polygon or <3 vertices).
 *
 * Format mirrors AreaTool:
 *   > 10 000 m² → "X.XX ha (Y.YY ac)"
 *   ≤ 10 000 m² → "N m²"
 */

interface Props {
  m2: number | null;
  /** Label shown alongside the value. Defaults to "Area". */
  label?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function formatAreaDisplay(m2: number): string {
  return m2 > 10000
    ? `${(m2 / 10000).toFixed(2)} ha (${(m2 / 4046.86).toFixed(2)} ac)`
    : `${m2.toFixed(0)} m²`;
}

export default function DrawAreaReadout({
  m2,
  label = 'Area',
  labelClassName,
  valueClassName,
}: Props) {
  if (m2 === null) return null;
  return (
    <>
      <span className={labelClassName}>{label}</span>
      <span className={valueClassName}>{formatAreaDisplay(m2)}</span>
    </>
  );
}
