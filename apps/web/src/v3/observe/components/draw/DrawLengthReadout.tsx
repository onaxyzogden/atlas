/**
 * DrawLengthReadout — shared live-length chip for polyline-mode annotation
 * tools. Mirrors DrawAreaReadout in shape: caller passes CSS-module
 * classnames so this component is layout-agnostic. Renders nothing when
 * meters is null (no draft line or <2 vertices).
 *
 * Format mirrors DistanceTool:
 *   > 1000 m → "X.XX km"
 *   ≤ 1000 m → "N.N m"
 */

interface Props {
  meters: number | null;
  /** Label shown alongside the value. Defaults to "Length". */
  label?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function formatLengthDisplay(meters: number): string {
  return meters > 1000
    ? `${(meters / 1000).toFixed(2)} km`
    : `${meters.toFixed(1)} m`;
}

export default function DrawLengthReadout({
  meters,
  label = 'Length',
  labelClassName,
  valueClassName,
}: Props) {
  if (meters === null) return null;
  return (
    <>
      <span className={labelClassName}>{label}</span>
      <span className={valueClassName}>{formatLengthDisplay(meters)}</span>
    </>
  );
}
