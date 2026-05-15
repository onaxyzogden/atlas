/**
 * SilvopasturePopover — bottom-anchored read-only inspector for the
 * currently-selected silvopasture polygon.
 *
 * Subscribes to `usePlanSelectionStore`; renders only when the active
 * selection is a `design-element` whose `kind === 'silvopasture'`. Lists
 * the resolved members (orchards, guilds, paddocks) so the steward can
 * see what they've enrolled.
 *
 * Read-only by design — pinning / unpinning is intentionally deferred
 * to a follow-up. The card on the Plan dashboard already surfaces the
 * full per-host rollup; this popover is the "is this silvopasture
 * actually hosting anything?" map-side hint.
 */

import { useMemo } from 'react';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import { usePlanSelectionStore } from '../../store/planSelectionStore.js';
import {
  encodeHostId,
  resolveSilvopastureHosts,
  resolveMembers,
} from './silvopastureHosts.js';
import css from './SilvopasturePopover.module.css';

interface Props {
  projectId: string;
}

export default function SilvopasturePopover({ projectId }: Props) {
  const items = usePlanSelectionStore((s) => s.items);
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const designElements = useDesignElementsForProject(projectId);

  const selected = items[0];

  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === projectId),
    [allCropAreas, projectId],
  );
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const guilds = useMemo(
    () => allGuilds.filter((g) => g.projectId === projectId),
    [allGuilds, projectId],
  );

  const view = useMemo(() => {
    if (!selected) return null;
    if (selected.kind !== 'design-element') return null;
    const el = designElements.find((e) => e.id === selected.id);
    if (!el || el.kind !== 'silvopasture') return null;
    const hosts = resolveSilvopastureHosts(projectId, cropAreas, designElements);
    const hostId = encodeHostId('design-element', el.id);
    const host = hosts.find((h) => h.id === hostId);
    if (!host) return null;
    const members = resolveMembers(
      host,
      { cropAreas, designElements, paddocks, guilds },
      hosts,
    );
    return { host, members };
  }, [selected, designElements, cropAreas, paddocks, guilds, projectId]);

  if (!view) return null;

  const { host, members } = view;
  const collator = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  const sortedPaddocks = [...members.paddocks].sort((a, b) =>
    collator.compare(a.entity.name, b.entity.name),
  );
  const orchardCount =
    members.orchardsFromCrops.length + members.orchardsFromDesign.length;
  const guildCount = members.guilds.length;
  const paddockCount = members.paddocks.length;
  const total = orchardCount + guildCount + paddockCount;

  return (
    <div className={css.popover} role="dialog" aria-label="Silvopasture inspector">
      <div className={css.head}>
        <span className={css.title}>{host.name}</span>
        <span className={css.kindPill}>SILVOPASTURE</span>
      </div>
      {total === 0 ? (
        <div className={css.emptyNote}>
          No orchards, guilds, or paddocks inside this silvopasture yet.
          Draw or pin members to enroll them.
        </div>
      ) : (
        <ul className={css.list}>
          {sortedPaddocks.map((m) => (
            <li key={`pad-${m.entity.id}`} className={css.row}>
              <span className={css.rowKind}>PADDOCK</span>
              <span className={css.rowName}>{m.entity.name}</span>
              {m.pinned && <span className={css.pinnedPill}>PINNED</span>}
              {m.sharedWith > 0 && (
                <span className={css.sharedPill}>+{m.sharedWith}</span>
              )}
            </li>
          ))}
          {members.orchardsFromCrops.map((m) => (
            <li key={`crop-${m.entity.id}`} className={css.row}>
              <span className={css.rowKind}>ORCHARD</span>
              <span className={css.rowName}>{m.entity.name}</span>
              {m.pinned && <span className={css.pinnedPill}>PINNED</span>}
              {m.sharedWith > 0 && (
                <span className={css.sharedPill}>+{m.sharedWith}</span>
              )}
            </li>
          ))}
          {members.orchardsFromDesign.map((m) => (
            <li key={`de-${m.entity.id}`} className={css.row}>
              <span className={css.rowKind}>ORCHARD</span>
              <span className={css.rowName}>{m.entity.label ?? 'Orchard'}</span>
              {m.pinned && <span className={css.pinnedPill}>PINNED</span>}
              {m.sharedWith > 0 && (
                <span className={css.sharedPill}>+{m.sharedWith}</span>
              )}
            </li>
          ))}
          {members.guilds.map((m) => (
            <li key={`gld-${m.entity.id}`} className={css.row}>
              <span className={css.rowKind}>GUILD</span>
              <span className={css.rowName}>{m.entity.name}</span>
              {m.pinned && <span className={css.pinnedPill}>PINNED</span>}
              {m.sharedWith > 0 && (
                <span className={css.sharedPill}>+{m.sharedWith}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
