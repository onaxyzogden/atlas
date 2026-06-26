import { describe, it, expect } from 'vitest';
import { matchV3ProjectRoute, V3_PROJECT_STAGES } from '../v3ProjectRoute.js';

describe('matchV3ProjectRoute', () => {
  it('returns the project id + stage for each of the four ceremony stages', () => {
    for (const stage of V3_PROJECT_STAGES) {
      expect(matchV3ProjectRoute(`/v3/project/abc123/${stage}`)).toEqual({
        projectId: 'abc123',
        stage,
      });
    }
  });

  it('captures the project id but null stage for non-stage project segments', () => {
    // The switcher must render on these (projectId present) but they are not a
    // ceremony stage, so stage is null and the switcher falls back to /plan.
    for (const seg of ['home', 'wizard', 'protocols', 'olos']) {
      expect(matchV3ProjectRoute(`/v3/project/abc123/${seg}`)).toEqual({
        projectId: 'abc123',
        stage: null,
      });
    }
  });

  it('matches when the stage has further nested path segments', () => {
    expect(matchV3ProjectRoute('/v3/project/p1/plan/command-centre')).toEqual({
      projectId: 'p1',
      stage: 'plan',
    });
    expect(matchV3ProjectRoute('/v3/project/p1/wizard/2')).toEqual({
      projectId: 'p1',
      stage: null,
    });
  });

  it('does not match a bare project route with no segment', () => {
    expect(matchV3ProjectRoute('/v3/project/abc123')).toEqual({
      projectId: null,
      stage: null,
    });
  });

  it('does not match the portfolio or legacy non-v3 project routes', () => {
    expect(matchV3ProjectRoute('/v3/portfolio')).toEqual({
      projectId: null,
      stage: null,
    });
    expect(matchV3ProjectRoute('/project/abc123/plan')).toEqual({
      projectId: null,
      stage: null,
    });
  });

  it('does not match an unknown project segment', () => {
    expect(matchV3ProjectRoute('/v3/project/abc123/settings')).toEqual({
      projectId: null,
      stage: null,
    });
  });
});
