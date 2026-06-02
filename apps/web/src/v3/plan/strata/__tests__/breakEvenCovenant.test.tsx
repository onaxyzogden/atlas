// @vitest-environment happy-dom
/**
 * Covenant guard for the S7 `enterprise-break-even` surface.
 *
 * The break-even surface is cost-recovery TIMING math only. This test pins both
 * the rendered widget text and the catalogue `summarize` display against a
 * forbidden-token list, and asserts neither path ever surfaces `tenYearROI`.
 * Belt-and-suspenders on fiqh-csra-erased (2026-05-04): no advance-sale /
 * salam / CSRA / investor / yield / ROI / offer framing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import type { FinancialModel } from '../../../../features/financial/engine/types.js';
import type { ProjectBreakEven } from '../../../../features/financial/engine/computeProjectBreakEven.js';

const useFinancialModel = vi.fn();
vi.mock('../../../../features/financial/hooks/useFinancialModel.js', () => ({
  useFinancialModel: (projectId: string) => useFinancialModel(projectId),
}));

const computeProjectBreakEven = vi.fn();
vi.mock('../../../../features/financial/engine/computeProjectBreakEven.js', () => ({
  computeProjectBreakEven: (inputs: unknown) => computeProjectBreakEven(inputs),
}));
vi.mock('../../../../features/financial/engine/assembleFinancialInputs.js', () => ({
  assembleFinancialInputs: () => ({}),
}));

// Imported AFTER the mocks are registered (vi.mock is hoisted).
import BreakEvenWidget from '../formula-widgets/BreakEvenWidget.js';
import { FORMULA_CATALOG } from '../formulaCatalog.js';

/** Tokens that would betray advance-sale / riba-adjacent / ROI framing. */
const FORBIDDEN = [
  'tenyearroi',
  'roi',
  'investor',
  'yield',
  'offer',
  'advance',
  'salam',
  'csra',
  'csa',
];

function assertClean(text: string): void {
  const lower = text.toLowerCase();
  for (const token of FORBIDDEN) {
    expect(lower, `forbidden token "${token}" in: ${text}`).not.toContain(token);
  }
}

function modelWith(breakEven: FinancialModel['breakEven']): FinancialModel {
  return { breakEven } as unknown as FinancialModel;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('S7 break-even covenant', () => {
  describe('widget rendering', () => {
    it('shows a numeric cost-recovery year with no forbidden framing', () => {
      useFinancialModel.mockReturnValue(
        modelWith({
          breakEvenYear: { low: 2, mid: 3, high: 5 },
          peakNegativeCashflow: { low: -40000, mid: -30000, high: -22000 },
          // tenYearROI present on the model but the widget MUST NOT read it.
          tenYearROI: { low: 1, mid: 2, high: 3 },
        } as unknown as FinancialModel['breakEven']),
      );
      const { container } = render(<BreakEvenWidget projectId="p1" />);
      const text = container.textContent ?? '';
      expect(text).toContain('Cost recovery');
      expect(text).toContain('Year 3');
      assertClean(text);
    });

    it('shows the beyond-horizon case cleanly when breakEvenYear is null', () => {
      useFinancialModel.mockReturnValue(
        modelWith({
          breakEvenYear: { low: null, mid: null, high: null },
          peakNegativeCashflow: { low: -10000, mid: -10000, high: -10000 },
        } as unknown as FinancialModel['breakEven']),
      );
      const { container } = render(<BreakEvenWidget projectId="p1" />);
      const text = container.textContent ?? '';
      expect(text).toContain('Beyond 10-yr horizon');
      assertClean(text);
    });

    it('renders a clean empty state when there is no model', () => {
      useFinancialModel.mockReturnValue(null);
      const { container } = render(<BreakEvenWidget projectId="p1" />);
      assertClean(container.textContent ?? '');
    });
  });

  describe('catalogue summarize', () => {
    const summarize = (projectId: string) =>
      FORMULA_CATALOG['enterprise-break-even'].summarize(projectId);

    function pbe(partial: Partial<ProjectBreakEven>): ProjectBreakEven {
      return {
        hasModel: false,
        breakEvenYear: { low: null, mid: null, high: null },
        peakNegativeCashflow: { low: 0, mid: 0, high: 0 },
        ...partial,
      };
    }

    it('reports a numeric recovery year and tracks hasModel', () => {
      computeProjectBreakEven.mockReturnValue(
        pbe({ hasModel: true, breakEvenYear: { low: 2, mid: 4, high: 6 } }),
      );
      const r = summarize('p1');
      expect(r.hasResult).toBe(true);
      expect(r.display).toContain('Year 4');
      assertClean(r.display);
    });

    it('stays hasResult:true with a clean message when recovery is beyond horizon', () => {
      computeProjectBreakEven.mockReturnValue(pbe({ hasModel: true }));
      const r = summarize('p1');
      expect(r.hasResult).toBe(true);
      assertClean(r.display);
    });

    it('reports no result (clean) when there is no model', () => {
      computeProjectBreakEven.mockReturnValue(pbe({ hasModel: false }));
      const r = summarize('p1');
      expect(r.hasResult).toBe(false);
      assertClean(r.display);
    });
  });
});
