/**
 * OperationalRoleEditor -- owner / primary-steward control to rename + re-scope
 * the project's six operational roles (ADR 2026-06-24 Operational Role Layer,
 * Option C). Renaming the role vocabulary is a governance act, so it is gated to
 * owner / primary_steward and hidden entirely on a solo project (where the layer
 * does not engage). Route-agnostic: mount it from the c2 capture header or
 * MembersTab.
 *
 * The pure diff/orphan logic lives in operationalRoleEditorModel; this component
 * is the editable surface over it. Per role: a label + description input and a
 * domain multi-select over SELECTABLE_DOMAINS (the 16 universal domains minus the
 * steward-only vision-intent), with a live ScopePreview. A re-scope that leaves a
 * domain owned by no role raises an advisory orphan warning -- it never blocks
 * the save (the orphan degrades to the full-view fallback for everyone; "never
 * hide, only de-emphasize"). Saving sends the minimal override via
 * useSetOperationalRoleDefs, which invalidates the project so every resolver
 * repaints. Reset-to-default (per role / all) clears back to the built-ins.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  resolveOperationalRoleDefs,
  resolveOperationalRoleDomains,
  UNIVERSAL_DOMAIN_LABELS,
  type OperationalRole,
  type UniversalDomain,
} from '@ogden/shared';
import { useMemberStore } from '../../store/memberStore.js';
import { useResolvedOperationalRoles } from '../../v3/roles/useResolvedOperationalRoles.js';
import { useSetOperationalRoleDefs } from '../../hooks/useProjectQueries.js';
import { useIsSoloProject } from './useIsSoloProject.js';
import ScopePreview from './ScopePreview.js';
import {
  buildOverridePayload,
  orphanDomains,
  seedRoleDrafts,
  SELECTABLE_DOMAINS,
  type RoleDraft,
} from './operationalRoleEditorModel.js';
import css from './OperationalRoleEditor.module.css';

export interface OperationalRoleEditorProps {
  projectId: string;
}

/** The six built-in drafts -- the reset-to-default baseline (no overrides). */
function builtinDrafts(): RoleDraft[] {
  return seedRoleDrafts(resolveOperationalRoleDefs(), resolveOperationalRoleDomains());
}

export default function OperationalRoleEditor({
  projectId,
}: OperationalRoleEditorProps): JSX.Element | null {
  const myRole = useMemberStore((s) => s.myRole);
  const isSolo = useIsSoloProject(projectId);
  const { defs, domainsMap } = useResolvedOperationalRoles(projectId);
  const setDefs = useSetOperationalRoleDefs();

  // Seed once from the project-resolved defs; edits survive the resolver's
  // identity churn (a fresh defs/domainsMap each render). Reset re-seeds.
  const [drafts, setDrafts] = useState<RoleDraft[]>(() =>
    seedRoleDrafts(defs, domainsMap),
  );

  const updateDraft = useCallback(
    (slug: OperationalRole, patch: Partial<RoleDraft>) => {
      setDrafts((prev) =>
        prev.map((d) => (d.slug === slug ? { ...d, ...patch } : d)),
      );
    },
    [],
  );

  const toggleDomain = useCallback(
    (slug: OperationalRole, domain: UniversalDomain) => {
      setDrafts((prev) =>
        prev.map((d) => {
          if (d.slug !== slug) return d;
          const next = new Set(d.domains);
          if (next.has(domain)) next.delete(domain);
          else next.add(domain);
          return { ...d, domains: next };
        }),
      );
    },
    [],
  );

  const resetRole = useCallback((slug: OperationalRole) => {
    const def = builtinDrafts().find((d) => d.slug === slug);
    if (!def) return;
    setDrafts((prev) => prev.map((d) => (d.slug === slug ? def : d)));
  }, []);

  const resetAll = useCallback(() => {
    setDrafts(builtinDrafts());
  }, []);

  // A full per-slug map so ScopePreview can show each role's *draft* scope live.
  const draftDomainsMap = useMemo(() => {
    const map = {} as Record<OperationalRole, ReadonlySet<UniversalDomain>>;
    for (const d of drafts) map[d.slug] = d.domains;
    return map;
  }, [drafts]);

  const orphans = useMemo(() => orphanDomains(drafts), [drafts]);

  const handleSave = useCallback(() => {
    setDefs.mutate({
      id: projectId,
      input: { operationalRoleDefs: buildOverridePayload(drafts) },
    });
  }, [setDefs, projectId, drafts]);

  // Governance gate: only the owner / primary-steward edits the role vocabulary,
  // and never on a solo project. All hooks run above, so the gate is render-safe.
  const isAdmin = myRole === 'owner' || myRole === 'primary_steward';
  if (!isAdmin || isSolo) return null;

  return (
    <section className={css.root} data-testid="operational-role-editor">
      <header className={css.head}>
        <h3 className={css.title}>Operational roles</h3>
        <p className={css.sub}>
          Rename and re-scope this project's six operational roles. Each role sets
          which domains are a member's default focus -- out-of-focus domains are
          de-emphasized, never hidden.
        </p>
      </header>

      {drafts.map((draft) => (
        <div key={draft.slug} className={css.role}>
          <div className={css.fields}>
            <label className={css.field}>
              <span className={css.fieldLabel}>Label</span>
              <input
                className={css.textInput}
                data-testid={`role-label-${draft.slug}`}
                value={draft.label}
                maxLength={40}
                onChange={(e) => updateDraft(draft.slug, { label: e.target.value })}
              />
            </label>
            <label className={css.field}>
              <span className={css.fieldLabel}>Description</span>
              <input
                className={css.textInput}
                data-testid={`role-desc-${draft.slug}`}
                value={draft.description}
                maxLength={160}
                onChange={(e) =>
                  updateDraft(draft.slug, { description: e.target.value })
                }
              />
            </label>
          </div>

          <div
            className={css.chips}
            role="group"
            aria-label={`${draft.label} domain focus`}
          >
            {SELECTABLE_DOMAINS.map((domain) => {
              const active = draft.domains.has(domain);
              return (
                <button
                  key={domain}
                  type="button"
                  className={css.chip}
                  data-active={active}
                  data-testid={`domain-${draft.slug}-${domain}`}
                  aria-pressed={active}
                  onClick={() => toggleDomain(draft.slug, domain)}
                >
                  {UNIVERSAL_DOMAIN_LABELS[domain]}
                </button>
              );
            })}
          </div>

          <ScopePreview
            roles={[draft.slug]}
            emptyMeans="none"
            domainsMap={draftDomainsMap}
          />

          <button
            type="button"
            className={css.reset}
            data-testid={`reset-${draft.slug}`}
            onClick={() => resetRole(draft.slug)}
          >
            Reset to default
          </button>
        </div>
      ))}

      {orphans.length > 0 ? (
        <p className={css.orphan} data-testid="orphan-warning" role="status">
          {orphans.length === 1
            ? 'This domain is in no role'
            : 'These domains are in no role'}
          {"'s default focus, so "}
          {orphans.length === 1 ? 'it surfaces' : 'they surface'} for everyone:{' '}
          {orphans.map((d) => UNIVERSAL_DOMAIN_LABELS[d]).join(', ')}.
        </p>
      ) : null}

      <footer className={css.foot}>
        <button
          type="button"
          className={css.secondary}
          data-testid="reset-all"
          onClick={resetAll}
        >
          Reset all to default
        </button>
        <button
          type="button"
          className={css.primary}
          data-testid="save-roles"
          onClick={handleSave}
          disabled={setDefs.isPending}
        >
          {setDefs.isPending ? 'Saving...' : 'Save roles'}
        </button>
      </footer>
    </section>
  );
}
