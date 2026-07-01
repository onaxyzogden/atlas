import { describe, expect, it } from 'vitest';
import {
  archetypeFor,
  healthLabel,
  moduleCompleteness,
  phaseNotesCaptured,
  regionalCompleteness,
  regionalCounts,
  rosterCapacityHours,
  rosterCompleteness,
  stewardCompleteness,
  stewardSupplyBaseline,
  totalHoursPerWeek,
  visionCompleteness,
  visionCounts,
} from '../derivations.js';

describe('stewardCompleteness', () => {
  it('returns 0% for undefined steward', () => {
    const c = stewardCompleteness(undefined);
    expect(c).toEqual({ filled: 0, total: 11, pct: 0 });
  });

  it('counts only non-empty fields', () => {
    const c = stewardCompleteness({
      relationship: 'lead',
      age: 30,
      occupation: '',
      lifestyle: 'active',
      maintenanceHrsInitial: 0,
      skills: [],
    });
    // relationship, age, lifestyle, maintenanceHrsInitial=0 (0 is filled per isFilled)
    expect(c.filled).toBe(4);
    expect(c.total).toBe(11);
    expect(c.pct).toBe(36); // round(4/11 * 100)
  });

  it('counts needs toward completeness (Option 3)', () => {
    const c = stewardCompleteness({ needs: ['wheelchair-accessible paths'] });
    expect(c.filled).toBe(1);
    expect(c.total).toBe(11);
  });

  it('no longer counts the retired teamRole free-text; residency + allocation still count (Phase-4 consolidation 2026-06-28)', () => {
    // teamRole was folded into the standardized operational-role pills (which
    // live on the membership, outside this profile-overlay completeness count),
    // so it is dropped from STEWARD_FIELDS. residentStatus + roleAllocation
    // remain profile fields and still count.
    const c = stewardCompleteness({
      teamRole: 'Land manager',
      residentStatus: 'live-in',
      roleAllocation: 'full-time',
    });
    expect(c.filled).toBe(2);
    expect(c.total).toBe(11);
  });

  it('reaches 100% with all 11 fields', () => {
    const c = stewardCompleteness({
      relationship: 'lead',
      age: 30,
      occupation: 'farmer',
      lifestyle: 'active',
      maintenanceHrsInitial: 20,
      maintenanceHrsOngoing: 8,
      budget: '$10k',
      skills: ['carpentry'],
      needs: ['wheelchair-accessible paths'],
      residentStatus: 'live-in',
      roleAllocation: 'full-time',
    });
    expect(c.pct).toBe(100);
  });
});

describe('archetypeFor', () => {
  it('defaults to Observer-In-Residence for empty profile', () => {
    expect(archetypeFor(undefined).name).toBe('Observer-In-Residence');
    expect(archetypeFor({}).name).toBe('Observer-In-Residence');
  });

  it('detects Practical Builder', () => {
    expect(
      archetypeFor({
        skills: ['carpentry', 'orcharding', 'gardening'],
        maintenanceHrsInitial: 20,
      }).name,
    ).toBe('Practical Builder');
  });

  it('promotes Cartographer-Steward when CAD/GIS present', () => {
    expect(
      archetypeFor({
        skills: ['carpentry', 'gardening', 'CAD/GIS'],
        maintenanceHrsInitial: 20,
      }).name,
    ).toBe('Cartographer-Steward');
  });

  it('detects Hands-Off Caretaker for low hours', () => {
    expect(
      archetypeFor({ skills: ['gardening'], maintenanceHrsInitial: 3 }).name,
    ).toBe('Hands-Off Caretaker');
  });
});

describe('totalHoursPerWeek', () => {
  it('sums initial and ongoing, treating undefined as 0', () => {
    expect(totalHoursPerWeek(undefined)).toBe(0);
    expect(totalHoursPerWeek({ maintenanceHrsInitial: 20 })).toBe(20);
    expect(
      totalHoursPerWeek({ maintenanceHrsInitial: 20, maintenanceHrsOngoing: 8 }),
    ).toBe(28);
  });
});

describe('roster rollups', () => {
  it('rosterCapacityHours sums hours across all stewards', () => {
    expect(rosterCapacityHours([])).toBe(0);
    expect(
      rosterCapacityHours([
        { maintenanceHrsInitial: 20, maintenanceHrsOngoing: 8 },
        { maintenanceHrsInitial: 10, maintenanceHrsOngoing: 2 },
      ]),
    ).toBe(40);
  });

  it('rosterCompleteness averages per-steward completeness', () => {
    expect(rosterCompleteness([])).toEqual({ filled: 0, total: 11, pct: 0 });
    const c = rosterCompleteness([
      {
        relationship: 'lead',
        age: 30,
        occupation: 'farmer',
        lifestyle: 'active',
        maintenanceHrsInitial: 20,
        maintenanceHrsOngoing: 8,
        budget: '$10k',
        skills: ['carpentry'],
        needs: ['wheelchair-accessible paths'],
        residentStatus: 'live-in',
        roleAllocation: 'full-time',
      }, // 100% (11 of 11)
      {}, // 0%
    ]);
    expect(c.pct).toBe(50);
    expect(c.total).toBe(22);
    expect(c.filled).toBe(11);
  });
});

describe('stewardSupplyBaseline', () => {
  it('returns an all-zero baseline for an empty roster + team', () => {
    const b = stewardSupplyBaseline([], {});
    expect(b).toEqual({
      rosterSize: 0,
      liveInCount: 0,
      weeklyHours: 0,
      domainsCovered: [],
      domainCoverageCount: 0,
      rightsHolders: 0,
      skillGaps: 0,
      fundingSources: 0,
    });
  });

  it('rolls up roster capacity and team-level fields', () => {
    const b = stewardSupplyBaseline(
      [
        {
          residentStatus: 'live-in',
          maintenanceHrsInitial: 20,
          maintenanceHrsOngoing: 8,
          capabilityByDomain: { water: [], food: [] },
          decisionRights: { water: 'lead' },
        },
        {
          residentStatus: 'off-site',
          maintenanceHrsInitial: 10,
          capabilityByDomain: { food: [], energy: [] },
        },
      ],
      { skillGaps: ['bookkeeping'], fundingSources: ['Charitable donation'] },
    );
    expect(b.rosterSize).toBe(2);
    expect(b.liveInCount).toBe(1);
    expect(b.weeklyHours).toBe(38);
    expect(b.domainsCovered.sort()).toEqual(['energy', 'food', 'water']);
    expect(b.domainCoverageCount).toBe(3);
    expect(b.rightsHolders).toBe(1);
    expect(b.skillGaps).toBe(1);
    expect(b.fundingSources).toBe(1);
  });
});

describe('regionalCounts + regionalCompleteness', () => {
  it('handles undefined regional', () => {
    const counts = regionalCounts(undefined);
    expect(counts).toEqual({
      placeNames: 0,
      challenges: 0,
      strengths: 0,
      contacts: 0,
      total: 0,
    });
    expect(regionalCompleteness(undefined).pct).toBe(0);
  });

  it('counts each list independently', () => {
    const counts = regionalCounts({
      indigenousNames: ['a', 'b'],
      culturalChallenges: ['c'],
      culturalStrengths: ['d', 'e', 'f'],
      localNetwork: [{ id: '1', name: 'x', type: 'community' }],
    });
    expect(counts).toEqual({
      placeNames: 2,
      challenges: 1,
      strengths: 3,
      contacts: 1,
      total: 7,
    });
    expect(regionalCompleteness({
      indigenousNames: ['a'],
      culturalChallenges: ['c'],
    }).pct).toBe(50);
  });
});

describe('visionCounts + visionCompleteness', () => {
  it('counts list fields on the shared vision', () => {
    const counts = visionCounts({
      coreFunctions: ['a', 'b'],
      successMetrics: ['x'],
      moodboardImages: [{ id: '1', dataUrl: 'data:,' }],
    });
    expect(counts.coreFunctions).toBe(2);
    expect(counts.successMetrics).toBe(1);
    expect(counts.moodboardImages).toBe(1);
  });

  it('visionCompleteness rises as fields fill', () => {
    expect(visionCompleteness(undefined).pct).toBe(0);
    expect(
      visionCompleteness({
        projectId: 'x',
        phaseNotes: [
          { phaseKey: 'year1', label: 'Y1', notes: 'something' },
          { phaseKey: 'years2to3', label: 'Y2', notes: '' },
          { phaseKey: 'years4plus', label: 'Y4', notes: '' },
        ],
        moontranceIdentity: null,
        conceptOverlayVisible: false,
        milestones: [],
        stewardProfiles: {},
        stewardTeam: {},
        sharedVision: { statement: 'a', coreFunctions: ['x'] },
      }).pct,
    ).toBeGreaterThan(0);
  });
});

describe('moduleCompleteness + healthLabel + phaseNotesCaptured', () => {
  it('moduleCompleteness rolls up weighted', () => {
    const empty = moduleCompleteness(undefined, []);
    expect(empty.pct).toBe(0);
  });

  it('healthLabel categorises', () => {
    expect(healthLabel(85)).toBe('Strong');
    expect(healthLabel(50)).toBe('Forming');
    expect(healthLabel(10)).toBe('Sparse');
  });

  it('phaseNotesCaptured counts non-empty notes', () => {
    expect(phaseNotesCaptured(undefined)).toEqual({ filled: 0, total: 3 });
    expect(
      phaseNotesCaptured({
        projectId: 'x',
        phaseNotes: [
          { phaseKey: 'year1', label: 'Y1', notes: 'a' },
          { phaseKey: 'years2to3', label: 'Y2', notes: '' },
          { phaseKey: 'years4plus', label: 'Y4', notes: 'b' },
        ],
        moontranceIdentity: null,
        conceptOverlayVisible: false,
        milestones: [],
        stewardProfiles: {},
        stewardTeam: {},
        sharedVision: {},
      }),
    ).toEqual({ filled: 2, total: 3 });
  });
});
