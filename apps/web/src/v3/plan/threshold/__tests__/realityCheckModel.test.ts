import { describe, it, expect } from 'vitest';
import type { IntentElement } from '../intentElements';
import {
  ALL_SURVEY_OBJECTIVE_IDS,
  CSA_ADVISORY_COPY,
  composePlanningDirection,
  DEFAULT_CONFIGURATION_LABEL,
  deriveStrandEvidence,
  detectCsaLikeText,
  EVIDENCE_STRANDS,
  INTENT_TYPE_META,
  phase2Complete,
  REALITY_CHECK_COPY,
  releaseNeedsConfirm,
  STATUS_META,
  STRAND_SURVEY_MAP,
  statusOptionsForType,
  strandForSurvey,
  type ElementClassification,
  type RealityCheckStatus,
  type StrandSurveyEvidence,
} from '../realityCheckModel';

const el = (
  id: string,
  text: string,
  type: IntentElement['type'],
): IntentElement => ({ id, text, type, source: 'classify' });

// ---------------------------------------------------------------------------
// Classification vocabulary + type-gating
// ---------------------------------------------------------------------------

describe('statusOptionsForType', () => {
  it('non-negotiable -> feasible | released only', () => {
    expect(statusOptionsForType('non-negotiable')).toEqual(['feasible', 'released']);
  });

  it('committed -> all four', () => {
    expect(statusOptionsForType('committed')).toEqual([
      'feasible',
      'conditional',
      'deferred',
      'released',
    ]);
  });

  it('aspirational -> all four', () => {
    expect(statusOptionsForType('aspirational')).toEqual([
      'feasible',
      'conditional',
      'deferred',
      'released',
    ]);
  });

  it('non-negotiable can never be conditional or deferred', () => {
    const opts = statusOptionsForType('non-negotiable');
    expect(opts).not.toContain('conditional');
    expect(opts).not.toContain('deferred');
  });
});

describe('releaseNeedsConfirm', () => {
  it('is true for committed (must confirm the project can proceed without it)', () => {
    expect(releaseNeedsConfirm('committed')).toBe(true);
  });
  it('is false for aspirational (held lightly -- releases freely)', () => {
    expect(releaseNeedsConfirm('aspirational')).toBe(false);
  });
  it('is false for non-negotiable (the option set already restricts it)', () => {
    expect(releaseNeedsConfirm('non-negotiable')).toBe(false);
  });
});

describe('STATUS_META / INTENT_TYPE_META', () => {
  it('describes all four statuses', () => {
    const statuses: RealityCheckStatus[] = ['feasible', 'conditional', 'deferred', 'released'];
    for (const s of statuses) {
      expect(STATUS_META[s].label.length).toBeGreaterThan(0);
      expect(STATUS_META[s].description.length).toBeGreaterThan(0);
    }
  });
  it('describes all three intent types', () => {
    for (const t of ['non-negotiable', 'committed', 'aspirational'] as const) {
      expect(INTENT_TYPE_META[t].label.length).toBeGreaterThan(0);
      expect(INTENT_TYPE_META[t].description.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Evidence strands -- the 11 surveys re-organised by six themes
// ---------------------------------------------------------------------------

describe('EVIDENCE_STRANDS + STRAND_SURVEY_MAP', () => {
  it('has exactly the six spec strands in order', () => {
    expect(EVIDENCE_STRANDS.map((s) => s.id)).toEqual([
      'water',
      'soil-fertility',
      'ecology-habitat',
      'infrastructure-access',
      'land-health',
      'landscape-context',
    ]);
  });

  it('maps every one of the 11 surveys exactly once across the strands', () => {
    const mapped = EVIDENCE_STRANDS.flatMap((s) => STRAND_SURVEY_MAP[s.id]);
    // No duplicates.
    expect(new Set(mapped).size).toBe(mapped.length);
    // Exactly the canonical 11.
    expect([...mapped].sort()).toEqual([...ALL_SURVEY_OBJECTIVE_IDS].sort());
    expect(ALL_SURVEY_OBJECTIVE_IDS).toHaveLength(11);
  });

  it('every strand has at least one survey', () => {
    for (const strand of EVIDENCE_STRANDS) {
      expect(STRAND_SURVEY_MAP[strand.id].length).toBeGreaterThan(0);
    }
  });

  it('strandForSurvey resolves each survey to its strand and undefined otherwise', () => {
    expect(strandForSurvey('s3-hydrology')).toBe('water');
    expect(strandForSurvey('silv-sec-s3-stock-water')).toBe('water');
    expect(strandForSurvey('s2-terrain')).toBe('infrastructure-access');
    expect(strandForSurvey('rf-s2-landscape-context')).toBe('landscape-context');
    expect(strandForSurvey('not-a-survey')).toBeUndefined();
  });
});

describe('deriveStrandEvidence', () => {
  const survey = (
    objectiveId: string,
    complete: boolean,
  ): StrandSurveyEvidence => ({
    objectiveId,
    label: objectiveId,
    complete,
  });

  it('returns all six strands even when no evidence is supplied', () => {
    const out = deriveStrandEvidence({});
    expect(out).toHaveLength(6);
    expect(out.map((s) => s.strand.id)).toEqual(EVIDENCE_STRANDS.map((s) => s.id));
    // land-health has one survey -> singular wording, 0 of 1
    const landHealth = out.find((s) => s.strand.id === 'land-health')!;
    expect(landHealth.summary).toBe('0 of 1 survey complete');
    expect(landHealth.surveys).toEqual([]);
  });

  it('counts complete surveys against the full strand total (partial assembly)', () => {
    const out = deriveStrandEvidence({
      's3-hydrology': survey('s3-hydrology', true),
      // stock-water absent -> still counts toward total of 2
    });
    const water = out.find((s) => s.strand.id === 'water')!;
    expect(water.summary).toBe('1 of 2 surveys complete');
    expect(water.surveys.map((s) => s.objectiveId)).toEqual(['s3-hydrology']);
  });

  it('folds in the steward stance/note per strand', () => {
    const out = deriveStrandEvidence(
      { 's3-soil': survey('s3-soil', true), 'rf-s3-nutrient-cycling': survey('rf-s3-nutrient-cycling', true) },
      { 'soil-fertility': { stance: 'challenging', note: 'shallow topsoil' } },
    );
    const soil = out.find((s) => s.strand.id === 'soil-fertility')!;
    expect(soil.summary).toBe('2 of 2 surveys complete');
    expect(soil.stance).toBe('challenging');
    expect(soil.note).toBe('shallow topsoil');
  });
});

// ---------------------------------------------------------------------------
// Phase completion + Planning Direction composition
// ---------------------------------------------------------------------------

describe('phase2Complete', () => {
  const els = [el('e1', 'A', 'committed'), el('e2', 'B', 'aspirational')];

  it('is false when there are no elements', () => {
    expect(phase2Complete([], {})).toBe(false);
  });
  it('is false until every element is classified', () => {
    expect(phase2Complete(els, { e1: { status: 'feasible' } })).toBe(false);
  });
  it('is true when every element has a status', () => {
    expect(
      phase2Complete(els, { e1: { status: 'feasible' }, e2: { status: 'deferred' } }),
    ).toBe(true);
  });
});

describe('composePlanningDirection', () => {
  const elements = [
    el('e4', 'Avoid debt financing', 'non-negotiable'),
    el('e1', 'Water security', 'committed'),
    el('e2', 'Silvopasture grazing', 'committed'),
    el('e3', 'Off-grid living', 'aspirational'),
  ];
  const classifications: Record<string, ElementClassification> = {
    e1: { status: 'feasible' },
    e2: {
      status: 'conditional',
      condition: 'Stock water is confirmed before any livestock introduction',
    },
    e3: { status: 'deferred' },
    e4: { status: 'released', note: 'the financing covenant is incompatible' },
  };

  it('opens with the project name and configuration', () => {
    const text = composePlanningDirection({
      projectName: 'Hillside Farm',
      configurationLabel: DEFAULT_CONFIGURATION_LABEL,
      elements,
      classifications,
    });
    expect(text).toContain(
      `Hillside Farm will proceed as a ${DEFAULT_CONFIGURATION_LABEL}.`,
    );
  });

  it('groups feasible / conditional / deferred / released distinctly', () => {
    const text = composePlanningDirection({
      projectName: 'Hillside Farm',
      configurationLabel: DEFAULT_CONFIGURATION_LABEL,
      elements,
      classifications,
    });
    expect(text).toContain('Confirmed feasible: Water security.');
    expect(text).toContain(
      'Silvopasture grazing will proceed conditional on stock water is confirmed before any livestock introduction.',
    );
    expect(text).toContain(
      'Retained as long-term intentions, deferred this cycle: Off-grid living.',
    );
    expect(text).toContain(
      'Avoid debt financing is released from the plan -- the financing covenant is incompatible.',
    );
  });

  it('falls back to a generic clause when a conditional has no named condition', () => {
    const text = composePlanningDirection({
      projectName: 'X',
      configurationLabel: 'farm',
      elements: [el('e1', 'Orchard', 'committed')],
      classifications: { e1: { status: 'conditional' } },
    });
    expect(text).toContain('Orchard will proceed conditional on a named condition being met.');
  });

  it('is deterministic for the same input', () => {
    const input = {
      projectName: 'Hillside Farm',
      configurationLabel: DEFAULT_CONFIGURATION_LABEL,
      elements,
      classifications,
    };
    expect(composePlanningDirection(input)).toBe(composePlanningDirection(input));
  });

  it('defaults a blank project name', () => {
    const text = composePlanningDirection({
      projectName: '   ',
      configurationLabel: 'farm',
      elements: [],
      classifications: {},
    });
    expect(text).toContain('This project will proceed as a farm.');
  });
});

// ---------------------------------------------------------------------------
// Amanah -- CSA detector + advisory + wording pins
// ---------------------------------------------------------------------------

describe('detectCsaLikeText', () => {
  it('flags advance-sale / subscription / CSA / yield-share framing', () => {
    for (const t of [
      'CSA box subscription',
      'pre-sale of next season',
      'advance sale to members',
      'a yield-share for capital partners',
      'CSRA model',
    ]) {
      expect(detectCsaLikeText(t)).toBe(true);
    }
  });
  it('does not flag covenant-clean intent text', () => {
    for (const t of [
      'Water security for the homestead',
      'Silvopasture grazing rotation',
      'Faith-aligned governance',
      'Regenerate the land',
    ]) {
      expect(detectCsaLikeText(t)).toBe(false);
    }
  });
  it('is null/undefined safe', () => {
    expect(detectCsaLikeText(null)).toBe(false);
    expect(detectCsaLikeText(undefined)).toBe(false);
    expect(detectCsaLikeText('')).toBe(false);
  });
});

describe('Amanah wording pins', () => {
  // Banned advance-sale / subscription / CSA vocabulary (covenant regex).
  const BANNED = /(subscription|presale|pre-sale|advance[ -]sale|csa|csra|yield[ -]share)/i;

  // Flatten every string leaf out of an authored constant.
  const strings = (v: unknown): string[] => {
    if (typeof v === 'string') return [v];
    if (Array.isArray(v)) return v.flatMap(strings);
    if (v && typeof v === 'object') return Object.values(v).flatMap(strings);
    return [];
  };

  it('never seeds banned framing into seed-able surface copy', () => {
    // The advisory copy is DELIBERATELY excluded: it names the prohibited
    // framing precisely because its job is to warn against it.
    const authored = [
      REALITY_CHECK_COPY,
      STATUS_META,
      INTENT_TYPE_META,
      EVIDENCE_STRANDS,
      DEFAULT_CONFIGURATION_LABEL,
    ];
    for (const text of authored.flatMap(strings)) {
      expect(text, `banned term in: "${text}"`).not.toMatch(BANNED);
    }
  });

  it('the CSA advisory names the permitted capital channels', () => {
    const body = CSA_ADVISORY_COPY.body.toLowerCase();
    expect(body).toContain('charitable donation');
    expect(body).toContain('restricted donation');
    expect(body).toContain('qard hasan');
    expect(body).toContain('in-kind contribution');
    expect(body).toContain('sponsorship');
    // ...and it is explicitly advisory, never a block.
    expect(body).toContain('advisory only');
  });
});
