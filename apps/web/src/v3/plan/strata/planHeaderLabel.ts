import { findProjectType, type ProjectTypeId } from '@ogden/shared';

/**
 * Plan stratum-spine header — derive the project-type label.
 *
 * Steward ask: "project type ... used to appear here. Bring it back." +
 * "show all chosen project types instead of hiding it behind +#".
 * Lists EVERY chosen type, primary first, joined by ` · ` (no cycle number,
 * no `+N` count). Each id resolves to its human label (falling back to the raw
 * id if the catalogue lacks it). Returns null when no primary type is set, so
 * the header renders nothing.
 */
export function planHeaderProjectTypeLabel(
  primaryTypeId: ProjectTypeId | null,
  secondaryTypeIds: ProjectTypeId[],
): string | null {
  if (!primaryTypeId) return null;
  const ids = [primaryTypeId, ...secondaryTypeIds];
  return ids.map((id) => findProjectType(id)?.label ?? id).join(' · ');
}
