/**
 * CommunityMeetingPlaceControl — the steward-facing half of the meeting-place
 * designation, mounted in the community area of the Act work panel.
 *
 * It lets the steward say WHERE the community gathers, so the pulsing map
 * marker (`CommunityMeetingMarker` on Act, the Observe-lens pin) has a place to
 * render. Two ways to designate:
 *   - **Choose structure** — pick an existing gathering-kind feature
 *     (`prayer-pavilion` / `pavilion` / `fire-circle`) → a `feature` place;
 *   - **Drop a pin** — arm a one-click map placement (the map-mounted
 *     `CommunityMeetingPlaceDrawHandler` captures the next click) → a `point`
 *     place.
 * Plus **Clear**, a dangling-feature warning, and a nudge when upcoming
 * meetings exist with no place set.
 *
 * Gated to ecovillage projects (primary or secondary type) — the only projects
 * that generate community governance work. Reads are RAW store subscriptions
 * derived in `useMemo` (Zustand selector-stability rule); the designation lives
 * in `communityMeetingPlaceStore`, the upcoming meetings come from CONFIRMED
 * `communityWorkPlanStore` proposals cross-checked against the WorkItem spine
 * — all via the pure helpers in `features/community/communityMeetingPlace`.
 */

import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { getBuiltEnvironmentKind, DEFAULT_COMMUNITY_HORIZON_DAYS } from '@ogden/shared';
import { useProjectStore } from '../../../../store/projectStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../../store/builtEnvironmentStoreV2.js';
import { useCommunityWorkPlanStore } from '../../../../store/communityWorkPlanStore.js';
import { useWorkItemStore } from '../../../../store/workItemStore.js';
import {
  useCommunityMeetingPlaceStore,
  selectMeetingPlace,
} from '../../../../store/communityMeetingPlaceStore.js';
import { selectUpcomingCommunityMeetings } from '../../../../features/community/communityMeetingPlace.js';
import styles from './CommunityMeetingPlaceControl.module.css';

interface Props {
  projectId: string;
}

/** Gathering-kind built-env features that can serve as a meeting place. */
const GATHERING_KINDS: readonly string[] = [
  'prayer-pavilion',
  'pavilion',
  'fire-circle',
];

export default function CommunityMeetingPlaceControl({ projectId }: Props) {
  // --- project type gate (computed before the early return; hooks first) ----
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const isEcovillage = useMemo(() => {
    const tr = project?.metadata?.projectTypeRecord;
    if (!tr) return false;
    return (
      tr.primaryTypeId === 'ecovillage' ||
      (tr.secondaryTypeIds?.includes('ecovillage') ?? false)
    );
  }, [project]);

  // --- raw subscriptions, derived below (selector-stability rule) -----------
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const proposals = useCommunityWorkPlanStore((s) => s.proposals);
  const items = useWorkItemStore((s) => s.items);
  const place = useCommunityMeetingPlaceStore((s) =>
    selectMeetingPlace(s, projectId),
  );
  const armed = useCommunityMeetingPlaceStore(
    (s) => s.armedProjectId === projectId,
  );

  // Stable action refs.
  const setMeetingPlace = useCommunityMeetingPlaceStore(
    (s) => s.setMeetingPlace,
  );
  const clearMeetingPlace = useCommunityMeetingPlaceStore(
    (s) => s.clearMeetingPlace,
  );
  const armMeetingPinPlacement = useCommunityMeetingPlaceStore(
    (s) => s.armMeetingPinPlacement,
  );
  const disarmMeetingPinPlacement = useCommunityMeetingPlaceStore(
    (s) => s.disarmMeetingPinPlacement,
  );

  const gatheringFeatures = useMemo(
    () =>
      entities.filter(
        (e) => e.projectId === projectId && GATHERING_KINDS.includes(e.kind),
      ),
    [entities, projectId],
  );

  /** Resolve the current designation to a status + display label. */
  const designation = useMemo(() => {
    if (!place) return { status: 'unset' as const };
    if (place.kind === 'point') {
      return {
        status: 'point' as const,
        label: place.label?.trim() || 'Pinned location',
      };
    }
    const ent = entities.find((e) => e.id === place.featureId);
    if (!ent) return { status: 'dangling' as const };
    return {
      status: 'feature' as const,
      label:
        ent.label?.trim() || getBuiltEnvironmentKind(ent.kind)?.label || ent.kind,
    };
  }, [place, entities]);

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const spineStatusById = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) m.set(it.id, it.status);
    return m;
  }, [items]);

  const entries = useMemo(
    () =>
      selectUpcomingCommunityMeetings(
        proposals,
        projectId,
        todayISO,
        DEFAULT_COMMUNITY_HORIZON_DAYS,
        spineStatusById,
      ),
    [proposals, projectId, todayISO, spineStatusById],
  );

  // Only ecovillage projects designate a communal meeting place.
  if (!isEcovillage) return null;

  const selectedFeatureId =
    place?.kind === 'feature' &&
    gatheringFeatures.some((f) => f.id === place.featureId)
      ? place.featureId
      : '';

  return (
    <div
      className={styles.control}
      data-testid="community-meeting-place-control"
    >
      <div className={styles.title}>Communal meeting place</div>

      <div
        className={styles.readout}
        data-set={designation.status !== 'unset' ? 'true' : 'false'}
      >
        <span className={styles.readoutIcon}>
          <MapPin size={13} strokeWidth={2} aria-hidden />
        </span>
        <span>
          {designation.status === 'unset'
            ? 'Not set'
            : designation.status === 'dangling'
              ? 'Structure removed'
              : designation.label}
        </span>
      </div>

      {designation.status === 'dangling' && (
        <div className={styles.warning}>
          The designated structure no longer exists — choose another or drop a
          new pin.
        </div>
      )}

      {armed ? (
        <div className={styles.armedHint}>
          <span>Click the map to drop the meeting-place pin.</span>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={() => disarmMeetingPinPlacement()}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className={styles.actions}>
          {gatheringFeatures.length > 0 && (
            <select
              className={styles.select}
              value={selectedFeatureId}
              onChange={(e) => {
                const id = e.target.value;
                if (id) {
                  setMeetingPlace(projectId, { kind: 'feature', featureId: id });
                }
              }}
              aria-label="Choose a gathering structure as the meeting place"
            >
              <option value="">Choose structure…</option>
              {gatheringFeatures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label?.trim() ||
                    getBuiltEnvironmentKind(f.kind)?.label ||
                    f.kind}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className={styles.btn}
            onClick={() => armMeetingPinPlacement(projectId)}
          >
            Drop a pin
          </button>
          {designation.status !== 'unset' && (
            <button
              type="button"
              className={styles.btn}
              onClick={() => clearMeetingPlace(projectId)}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {entries.length > 0 && designation.status === 'unset' && !armed && (
        <div className={styles.nudge}>
          {entries.length === 1
            ? '1 upcoming gathering has no place to show on the map — set one above.'
            : `${entries.length} upcoming gatherings have no place to show on the map — set one above.`}
        </div>
      )}
    </div>
  );
}
