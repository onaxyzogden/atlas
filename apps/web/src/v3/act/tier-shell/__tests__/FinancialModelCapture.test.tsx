// @vitest-environment happy-dom
import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  FinancialModelCapture,
  financialModelModeFor,
  decodeFinancialModel,
  encodeFinancialModel,
  isFinancialModelValid,
  summariseFinancialModel,
  FINANCIAL_MODEL_PREFIX,
  type FinancialModelMode,
} from '../FinancialModelCapture.js';
import type { FormValue } from '../actToolCatalog.js';

// lucide-react is not imported by this capture, but other captures in the same
// suite tree mock it; keep a defensive forwardRef stub in case of transitive use.
vi.mock('lucide-react', () => {
  const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>((props, ref) => (
    <svg ref={ref} {...props} />
  ));
  Stub.displayName = 'LucideStub';
  return new Proxy({}, { get: () => Stub });
});

const ALL_MODES: FinancialModelMode[] = [
  'buyin',
  'levy',
  'fundgov',
  'hardship',
  'reserves',
  'ratify',
];

const NOTES_KEY: Record<FinancialModelMode, string> = {
  buyin: 'fiBuyinNotes',
  levy: 'fiLevyNotes',
  fundgov: 'fiFundgovNotes',
  hardship: 'fiHardshipNotes',
  reserves: 'fiReservesNotes',
  ratify: 'fiRatifyNotes',
};

describe('financialModelModeFor', () => {
  it('maps c1..c6 to the six modes in catalogue order', () => {
    expect(financialModelModeFor(`${FINANCIAL_MODEL_PREFIX}-c1`)).toBe('buyin');
    expect(financialModelModeFor(`${FINANCIAL_MODEL_PREFIX}-c2`)).toBe('levy');
    expect(financialModelModeFor(`${FINANCIAL_MODEL_PREFIX}-c3`)).toBe('fundgov');
    expect(financialModelModeFor(`${FINANCIAL_MODEL_PREFIX}-c4`)).toBe('hardship');
    expect(financialModelModeFor(`${FINANCIAL_MODEL_PREFIX}-c5`)).toBe('reserves');
    expect(financialModelModeFor(`${FINANCIAL_MODEL_PREFIX}-c6`)).toBe('ratify');
  });

  it('returns null for a foreign prefix or unknown suffix', () => {
    expect(financialModelModeFor('ev-s4-settlement-strategy-c1')).toBeNull();
    expect(financialModelModeFor(`${FINANCIAL_MODEL_PREFIX}-c7`)).toBeNull();
    expect(financialModelModeFor(`${FINANCIAL_MODEL_PREFIX}`)).toBeNull();
    expect(financialModelModeFor('')).toBeNull();
  });
});

describe('decodeFinancialModel (defensive / total)', () => {
  it('defaults notes to empty string for an empty FormValue', () => {
    for (const mode of ALL_MODES) {
      const model = decodeFinancialModel(mode, {});
      expect(model.notes).toBe('');
      expect(model.kind).toBe(mode);
    }
  });

  it('does not throw on garbage / wrong-typed values, coercing to empty string', () => {
    for (const mode of ALL_MODES) {
      const garbage = { [NOTES_KEY[mode]]: 12345 } as unknown as FormValue;
      expect(() => decodeFinancialModel(mode, garbage)).not.toThrow();
      expect(decodeFinancialModel(mode, garbage).notes).toBe('');
    }
  });

  it('reads a stored string value', () => {
    const model = decodeFinancialModel('buyin', { fiBuyinNotes: 'hello' });
    expect(model.notes).toBe('hello');
  });
});

describe('encodeFinancialModel (lossless inverse of decode)', () => {
  it('roundtrips notes for every mode', () => {
    for (const mode of ALL_MODES) {
      const value: FormValue = { [NOTES_KEY[mode]]: 'roundtrip text' };
      const model = decodeFinancialModel(mode, value);
      const encoded = encodeFinancialModel(mode, model);
      expect(encoded).toEqual(value);
    }
  });
});

describe('isFinancialModelValid (advisory: always true)', () => {
  it('is true for every mode regardless of value', () => {
    for (const mode of ALL_MODES) {
      expect(isFinancialModelValid(mode, {})).toBe(true);
      expect(isFinancialModelValid(mode, { [NOTES_KEY[mode]]: 'x' })).toBe(true);
    }
  });
});

describe('summariseFinancialModel', () => {
  it('returns a non-empty line for every mode', () => {
    for (const mode of ALL_MODES) {
      const s = summariseFinancialModel(mode, {});
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });
});

describe('FinancialModelCapture render (verbatim mockup content)', () => {
  function renderMode(mode: FinancialModelMode, value: FormValue = {}) {
    const onChange = vi.fn();
    const utils = render(
      <FinancialModelCapture
        mode={mode}
        value={value}
        onChange={onChange}
        itemId={`${FINANCIAL_MODEL_PREFIX}-c1`}
      />,
    );
    return { ...utils, onChange };
  }

  it('buyin shows the three buy-in components and capitalisation total', () => {
    renderMode('buyin');
    expect(screen.getByText('Land purchase share (per household)')).toBeTruthy();
    expect(screen.getByText('Community fund seed deposit')).toBeTruthy();
    expect(screen.getByText('Total community capitalisation')).toBeTruthy();
    expect(screen.getByText('$389,500')).toBeTruthy();
  });

  it('levy shows components and the reduced-household basis', () => {
    renderMode('levy');
    expect(screen.getByText('Communal insurance (property & liability)')).toBeTruthy();
    expect(screen.getByText('Reduced 80%')).toBeTruthy();
    expect(screen.getByText('Total monthly inflow')).toBeTruthy();
  });

  it('fundgov shows the credit-union custody and signatory rule', () => {
    renderMode('fundgov');
    expect(screen.getByText('Credit union - member-owned')).toBeTruthy();
    expect(screen.getByText('2 of 4 founding members')).toBeTruthy();
    expect(screen.getByText('External bookkeeper - annual')).toBeTruthy();
  });

  it('hardship shows all three tiers with the interest-free Tier 1 deferral', () => {
    renderMode('hardship');
    expect(screen.getByText('Short-term difficulty')).toBeTruthy();
    expect(screen.getByText('Extended hardship')).toBeTruthy();
    expect(screen.getByText('Irresolvable financial exit')).toBeTruthy();
    expect(screen.getByText('Deferred - repaid over 6 months')).toBeTruthy();
  });

  it('reserves shows the target, summary stats and trigger events', () => {
    renderMode('reserves');
    expect(screen.getByText('Capital Reserve Fund target')).toBeTruthy();
    expect(screen.getAllByText('$124,800').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Major infrastructure failure - repair cost exceeds 2x monthly levy inflow'),
    ).toBeTruthy();
  });

  it('ratify shows the construction gate warn, brief and founding-member roster', () => {
    renderMode('ratify');
    expect(screen.getByText('Kinfolk Ridge - Financial Contribution Model')).toBeTruthy();
    expect(screen.getByText('Sarah Mitchell')).toBeTruthy();
    expect(screen.getByText('Aroha & James Ngai')).toBeTruthy();
    expect(screen.getByText('Elif Yildiz & family')).toBeTruthy();
    expect(screen.getByText(/No dwelling or communal infrastructure construction begins/)).toBeTruthy();
  });

  it('emits onChange with the mode notes key when typed into', () => {
    const { onChange } = renderMode('buyin');
    const area = screen.getByLabelText('Buy-in notes');
    fireEvent.change(area, { target: { value: 'typed buy-in note' } });
    expect(onChange).toHaveBeenCalledWith({ fiBuyinNotes: 'typed buy-in note' });
  });
});
