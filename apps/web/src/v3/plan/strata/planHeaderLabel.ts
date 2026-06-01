import { findProjectType, type ProjectTypeId } from '@ogden/shared';

/**
 * Plan stratum-spine header — derive the project-type label.
 *
 * Steward ask: "project type ... used to appear here. Bring it back."
 * Project type only (no cycle number). Returns the primary type's human label
 * (falling back to the raw id if the catalogue lacks it), suffixed with
 * ` · +{n}` when secondary types are present. Returns null when no primary type
 * is set, so the header renders nothing.
 */
export function planHeaderProjectTypeLabel(
  primaryTypeId: ProjectTypeId | null,
  secondaryCount: number,
): string | null {
  if (!primaryTypeId) return null;
  const base = findProjectType(primaryTypeId)?.label ?? primaryTypeId;
  return secondaryCount > 0 ? `${base} · +${secondaryCount}` : base;
}
