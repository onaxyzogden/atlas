/**
 * operationalRoleEditorModel -- pure model behind the OperationalRoleEditor
 * (ADR 2026-06-24 Operational Role Layer, Option C). The editor lets an owner /
 * primary-steward rename + re-scope the six built-in operational roles. This
 * module is the React-free core:
 *
 *   seedRoleDrafts      -- turn the resolved defs + domain map into an editable
 *                          per-role draft (canonical OPERATIONAL_ROLES order).
 *   buildOverridePayload -- diff the draft against the BUILT-IN and emit the
 *                          minimal `operationalRoleDefs` override: only slugs
 *                          that differ, only the fields that differ. A draft
 *                          identical to the built-ins yields `[]` (no override).
 *   orphanDomains        -- selectable domains that end up owned by no role, so
 *                          the editor can warn (never block -- "never hide, only
 *                          de-emphasize"; an orphan degrades to the full view).
 *
 * `SELECTABLE_DOMAINS` is the 16 universal domains minus the steward-only
 * `vision-intent` (mirrors the schema's vision-intent guard) -- the domains a
 * role may actually be scoped to.
 */

import {
  OPERATIONAL_ROLES,
  OPERATIONAL_ROLE_DEFS,
  OPERATIONAL_ROLE_DOMAINS,
  PRIMARY_STEWARD_ONLY_DOMAINS,
  UNIVERSAL_DOMAINS,
  type OperationalRole,
  type OperationalRoleDef,
  type OperationalRoleDefsOverride,
  type UniversalDomain,
} from '@ogden/shared';

/** One role's editable state in the definition editor. */
export interface RoleDraft {
  slug: OperationalRole;
  label: string;
  description: string;
  domains: ReadonlySet<UniversalDomain>;
}

/**
 * The domains a role may be scoped to: the 16 universal domains minus the
 * steward-only `vision-intent`, in canonical UNIVERSAL_DOMAINS order. The
 * override schema rejects vision-intent in any role's domains, so the editor
 * never offers it.
 */
export const SELECTABLE_DOMAINS: readonly UniversalDomain[] =
  UNIVERSAL_DOMAINS.filter((d) => !PRIMARY_STEWARD_ONLY_DOMAINS.has(d));

/**
 * Build the editable draft from the project-resolved defs + domain map (as
 * returned by `useResolvedOperationalRoles`). One draft per built-in role, in
 * canonical order; each draft's domains are copied into a fresh mutable Set so
 * the editor can toggle without mutating the resolved (cached) value.
 */
export function seedRoleDrafts(
  defs: readonly OperationalRoleDef[],
  domainsMap: Record<OperationalRole, ReadonlySet<UniversalDomain>>,
): RoleDraft[] {
  return OPERATIONAL_ROLES.map((slug) => {
    const def = defs.find((d) => d.slug === slug) ?? OPERATIONAL_ROLE_DEFS[slug];
    return {
      slug,
      label: def.label,
      description: def.description,
      domains: new Set<UniversalDomain>(domainsMap[slug]),
    };
  });
}

/** Set equality by membership (order-independent). */
function sameDomains(
  a: ReadonlySet<UniversalDomain>,
  b: ReadonlySet<UniversalDomain>,
): boolean {
  if (a.size !== b.size) return false;
  for (const d of a) if (!b.has(d)) return false;
  return true;
}

/**
 * The minimal `operationalRoleDefs` override for a draft set: for each role,
 * include only the fields that differ from the built-in, and drop the role
 * entirely when nothing differs. A blank label/description is treated as "no
 * override" (fall back to the built-in) -- the schema's `label.min(1)` forbids a
 * blank, and clearing a field means "use the default", not "store an empty one".
 * Domains are emitted in canonical order for a stable, re-save-identical payload.
 */
export function buildOverridePayload(
  drafts: readonly RoleDraft[],
): OperationalRoleDefsOverride {
  const payload: OperationalRoleDefsOverride = [];

  for (const draft of drafts) {
    const builtinDef = OPERATIONAL_ROLE_DEFS[draft.slug];
    const builtinDomains = OPERATIONAL_ROLE_DOMAINS[draft.slug];
    const entry: OperationalRoleDefsOverride[number] = { slug: draft.slug };
    let changed = false;

    const label = draft.label.trim();
    if (label && label !== builtinDef.label) {
      entry.label = label;
      changed = true;
    }

    const description = draft.description.trim();
    if (description && description !== builtinDef.description) {
      entry.description = description;
      changed = true;
    }

    if (!sameDomains(draft.domains, builtinDomains)) {
      entry.domains = SELECTABLE_DOMAINS.filter((d) => draft.domains.has(d));
      changed = true;
    }

    if (changed) payload.push(entry);
  }

  return payload;
}

/**
 * Selectable domains owned by no role in the draft, in canonical order. An
 * orphan still surfaces for everyone (the full-view fallback), so the editor
 * warns about it but never blocks the save.
 */
export function orphanDomains(
  drafts: readonly RoleDraft[],
): UniversalDomain[] {
  const owned = new Set<UniversalDomain>();
  for (const draft of drafts) for (const d of draft.domains) owned.add(d);
  return SELECTABLE_DOMAINS.filter((d) => !owned.has(d));
}
