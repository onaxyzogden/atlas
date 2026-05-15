/**
 * SilvopastureHostsCard — per-host membership rollup for silvopasture
 * polygons drawn on the parcel.
 *
 * Surfaces what's *inside* each silvopasture: how many orchards (from
 * either `cropStore` type='orchard' or `designElementsStore` kind='orchard'),
 * guilds, and paddocks belong to it via spatial overlap or explicit
 * `silvopastureId` pin. Multi-host overlap is flagged with a small
 * "shared" note.
 *
 * Heuristic — overlap detection uses turf and is sized for parcel-scale
 * geometry. Pinned members are absolute.
 */

import { useMemo } from 'react';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import {
  resolveSilvopastureHosts,
  resolveMembers,
} from './silvopastureHosts.js';
import css from './SilvopastureHostsCard.module.css';

interface Props {
  projectId: string;
}

export default function SilvopastureHostsCard({ projectId }: Props) {
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const designElements = useDesignElementsForProject(projectId);

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

  const hosts = useMemo(
    () => resolveSilvopastureHosts(projectId, cropAreas, designElements),
    [projectId, cropAreas, designElements],
  );

  const hostRows = useMemo(
    () =>
      hosts.map((host) => ({
        host,
        members: resolveMembers(
          host,
          { cropAreas, designElements, paddocks, guilds },
          hosts,
        ),
      })),
    [hosts, cropAreas, designElements, paddocks, guilds],
  );

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Silvopasture hosts</h3>
          <p className={css.cardHint}>
            What lives inside each silvopasture polygon — orchards,
            guilds, and paddocks resolved by spatial overlap or explicit
            pin. Members appearing under more than one host are flagged
            so you can pin them where they belong.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>

      {hosts.length === 0 ? (
        <div className={css.emptyBanner}>
          No silvopasture polygons drawn on this parcel yet. Draw one
          via the Plan stage (Plant Systems → Silvopasture) or the crop-
          area tool, and orchards, guilds, and paddocks inside it will
          auto-link as members.
        </div>
      ) : (
        <div className={css.hostList}>
          {hostRows.map(({ host, members }) => {
            const orchardCount =
              members.orchardsFromCrops.length + members.orchardsFromDesign.length;
            const guildCount = members.guilds.length;
            const paddockCount = members.paddocks.length;
            const total = orchardCount + guildCount + paddockCount;
            const sharedCount =
              members.orchardsFromCrops.filter((m) => m.sharedWith > 0).length +
              members.orchardsFromDesign.filter((m) => m.sharedWith > 0).length +
              members.guilds.filter((m) => m.sharedWith > 0).length +
              members.paddocks.filter((m) => m.sharedWith > 0).length;
            return (
              <div key={host.id} className={css.host}>
                <div className={css.hostHead}>
                  <span className={css.hostName}>{host.name}</span>
                  <span className={css.sourcePill}>
                    {host.source === 'design-element' ? 'PLAN' : 'CROP'}
                  </span>
                  <span
                    className={`${css.statusPill} ${
                      total > 0 ? css.status_populated : css.status_empty
                    }`}
                  >
                    {total > 0 ? `${total} member${total === 1 ? '' : 's'}` : 'Empty'}
                  </span>
                </div>
                <div className={css.memberCounts}>
                  <span>
                    <span className={css.metric}>{orchardCount}</span>{' '}
                    <span className={css.metricMuted}>
                      orchard{orchardCount === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span>
                    <span className={css.metric}>{guildCount}</span>{' '}
                    <span className={css.metricMuted}>
                      guild{guildCount === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span>
                    <span className={css.metric}>{paddockCount}</span>{' '}
                    <span className={css.metricMuted}>
                      paddock{paddockCount === 1 ? '' : 's'}
                    </span>
                  </span>
                </div>
                {sharedCount > 0 && (
                  <div className={css.sharedNote}>
                    {sharedCount} member{sharedCount === 1 ? '' : 's'} also
                    overlap another silvopasture — pin to disambiguate.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
