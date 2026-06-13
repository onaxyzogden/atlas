/**
 * @vitest-environment happy-dom
 *
 * communityMeetingPlaceStore — the steward's explicit meeting-place
 * designation + the transient "drop a pin" arming flag.
 *
 * (persist + idbPersistStorage + rehydrateWithLogging attach at module load;
 * happy-dom supplies the storage they need. Assertions exercise the actions
 * and selector directly via setState/getState.)
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  useCommunityMeetingPlaceStore,
  selectMeetingPlace,
} from '../communityMeetingPlaceStore.js';

const P = 'p1';
const store = () => useCommunityMeetingPlaceStore.getState();

beforeEach(() => {
  useCommunityMeetingPlaceStore.setState({
    placesByProject: {},
    armedProjectId: null,
  });
});

describe('setMeetingPlace / selectMeetingPlace', () => {
  it('designates a feature place and reads it back via the selector', () => {
    store().setMeetingPlace(P, { kind: 'feature', featureId: 'pav-1' });
    expect(selectMeetingPlace(store(), P)).toEqual({
      kind: 'feature',
      featureId: 'pav-1',
    });
  });

  it('designates a point place', () => {
    store().setMeetingPlace(P, { kind: 'point', coordinates: [-79.4, 43.7] });
    expect(selectMeetingPlace(store(), P)).toEqual({
      kind: 'point',
      coordinates: [-79.4, 43.7],
    });
  });

  it('replaces an existing designation for the same project', () => {
    store().setMeetingPlace(P, { kind: 'feature', featureId: 'pav-1' });
    store().setMeetingPlace(P, { kind: 'point', coordinates: [-1, 2] });
    expect(selectMeetingPlace(store(), P)).toEqual({
      kind: 'point',
      coordinates: [-1, 2],
    });
  });

  it('keeps designations project-scoped', () => {
    store().setMeetingPlace(P, { kind: 'feature', featureId: 'a' });
    store().setMeetingPlace('p2', { kind: 'feature', featureId: 'b' });
    expect(selectMeetingPlace(store(), P)).toEqual({
      kind: 'feature',
      featureId: 'a',
    });
    expect(selectMeetingPlace(store(), 'p2')).toEqual({
      kind: 'feature',
      featureId: 'b',
    });
  });

  it('returns undefined for an unset project', () => {
    expect(selectMeetingPlace(store(), 'never-set')).toBeUndefined();
  });
});

describe('clearMeetingPlace', () => {
  it('removes the designation for a project', () => {
    store().setMeetingPlace(P, { kind: 'feature', featureId: 'pav-1' });
    store().clearMeetingPlace(P);
    expect(selectMeetingPlace(store(), P)).toBeUndefined();
  });

  it('is a no-op (same state reference) when the project has no designation', () => {
    const before = store().placesByProject;
    store().clearMeetingPlace('absent');
    expect(store().placesByProject).toBe(before);
  });
});

describe('arm / disarm pin placement', () => {
  it('arms placement for a project and disarms it', () => {
    store().armMeetingPinPlacement(P);
    expect(store().armedProjectId).toBe(P);
    store().disarmMeetingPinPlacement();
    expect(store().armedProjectId).toBeNull();
  });

  it('setting a place disarms any pending pin placement', () => {
    store().armMeetingPinPlacement(P);
    expect(store().armedProjectId).toBe(P);
    store().setMeetingPlace(P, { kind: 'point', coordinates: [0, 0] });
    expect(store().armedProjectId).toBeNull();
  });
});
