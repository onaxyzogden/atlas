/**
 * @vitest-environment happy-dom
 *
 * BoundaryCapture (SP1 re-decompose) -- a CONTROLLED, SELF-ROUTING renderer over
 * a FLAT FormValue (Record<string, string | string[]>) for the re-decomposed
 * s1-boundaries objective (5 items / 5 modes). Register rows persist as parallel
 * arrays (FormValue cannot hold object arrays). Mirrors the StewardCapture /
 * StakeholderCapture test pattern (happy-dom + testing-library + lucide stub).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import BoundaryCapture, {
  boundaryModeFor,
  decodeBoundary,
  emitBoundary,
  isBoundaryValid,
  summariseBoundary,
  TITLE_CATEGORIES,
  type BoundaryRegisterModel,
  type RowRegisterModel,
  type TenancyRegisterModel,
  type TitleCheckerModel,
  type LandHistoryModel,
} from '../BoundaryCapture.js';
import type { FormValue } from '../actToolCatalog.js';

// minimal option resolver for render tests (BR5-BR7)
const OPTS: Record<string, readonly string[]> = {
  boundaryDirection: ['N', 'E', 'S', 'W'],
  boundarySectionType: [
    'Shared / dividing fence',
    'Creek / natural boundary',
    'Council road frontage',
    'Unfenced / in dispute',
  ],
  boundaryRowType: [
    'Utility easement',
    'Access easement',
    'Public right of way',
    'Drainage easement',
  ],
  boundaryRowImpact: ['Restricts', 'Enables', 'Minor impact'],
  boundaryTenancyType: ['Agistment', 'Lease', 'Water license'],
  boundaryTenancyExpiry: ['Near', 'Far', 'Expired'],
  boundaryTenancyFlag: [
    'Must terminate before community occupation',
    'Monitor',
    'No termination required',
  ],
  boundaryTitleState: ['Present', 'Absent', 'Unknown'],
  boundaryHistoryType: ['Agricultural', 'Community', 'Development', 'Industrial'],
  boundaryContamination: [
    'Chemical storage / AST',
    'Asbestos structures',
    'Rubbish dump / landfill',
    'Mining or extraction',
    'None known',
  ],
  boundaryPriorCommunity: ['Yes - detail below', 'No prior community'],
};
function resolveOptions(id: string): readonly string[] {
  return OPTS[id] ?? [];
}
function renderCapture(itemId: string, value: FormValue) {
  const onChange = vi.fn();
  render(
    <BoundaryCapture
      itemId={itemId}
      value={value}
      onChange={onChange}
      resolveOptions={resolveOptions}
    />,
  );
  return { onChange };
}

describe('BoundaryCapture -- boundaryModeFor (BR4)', () => {
  const cases: ReadonlyArray<[string, ReturnType<typeof boundaryModeFor>]> = [
    ['s1-boundaries-c1', 'boundaryRegister'],
    ['s1-boundaries-c2', 'rowRegister'],
    ['s1-boundaries-c3', 'tenancyRegister'],
    ['s1-boundaries-c4', 'titleRestrictionChecker'],
    ['s1-boundaries-c5', 'landHistoryRegister'],
  ];
  it.each(cases)('maps %s -> %s', (id, mode) => {
    expect(boundaryModeFor(id)).toBe(mode);
  });
  it('defaults unknown id to boundaryRegister', () => {
    expect(boundaryModeFor('s1-boundaries-cX')).toBe('boundaryRegister');
  });
});

describe('BoundaryCapture -- c1 boundaryRegister decode/valid/summary (BR4)', () => {
  it('empty -> zero sections -> invalid', () => {
    const m = decodeBoundary('s1-boundaries-c1', {}) as BoundaryRegisterModel;
    expect(m.kind).toBe('boundaryRegister');
    expect(m.sections).toEqual([]);
    expect(isBoundaryValid('s1-boundaries-c1', m)).toBe(false);
  });
  it('zips parallel arrays to min length and validates on a typed section', () => {
    const m = decodeBoundary('s1-boundaries-c1', {
      directions: ['N', 'E'],
      secTypes: ['Shared / dividing fence', 'Creek / natural boundary'],
      names: ['North'],
      obligations: ['Shared upkeep'],
      disputes: ['', 'true'],
    }) as BoundaryRegisterModel;
    // min length across directions(2)/secTypes(2)/names(1)/obligations(1)/disputes(2) = 1
    expect(m.sections).toHaveLength(1);
    expect(m.sections[0]).toEqual({
      direction: 'N',
      type: 'Shared / dividing fence',
      name: 'North',
      obligation: 'Shared upkeep',
      disputeFlag: false,
    });
    expect(isBoundaryValid('s1-boundaries-c1', m)).toBe(true);
  });
  it('summary counts sections and flagged disputes', () => {
    const m = decodeBoundary('s1-boundaries-c1', {
      directions: ['N', 'W'],
      secTypes: ['Shared / dividing fence', 'Unfenced / in dispute'],
      names: ['North', 'West'],
      obligations: ['', ''],
      disputes: ['', 'true'],
    }) as BoundaryRegisterModel;
    const s = summariseBoundary('s1-boundaries-c1', m);
    expect(s).toMatch(/2 boundary section/);
    expect(s).toMatch(/1 flagged/);
  });
});

describe('BoundaryCapture -- c2 rowRegister (BR4)', () => {
  it('empty is valid (zero rights of way is a valid answer)', () => {
    const m = decodeBoundary('s1-boundaries-c2', {}) as RowRegisterModel;
    expect(m.kind).toBe('rowRegister');
    expect(isBoundaryValid('s1-boundaries-c2', m)).toBe(true);
  });
  it('summary counts rows', () => {
    const m = decodeBoundary('s1-boundaries-c2', {
      rowTypes: ['Utility easement', 'Access easement'],
      names: ['Power', 'Driveway'],
      impacts: ['Restricts', 'Enables'],
      holders: ['', ''],
      widths: ['', ''],
      details: ['', ''],
    }) as RowRegisterModel;
    expect(summariseBoundary('s1-boundaries-c2', m)).toMatch(/2 right/);
  });
});

describe('BoundaryCapture -- c3 tenancyRegister (BR4)', () => {
  it('empty is valid (zero agreements is valid)', () => {
    const m = decodeBoundary('s1-boundaries-c3', {}) as TenancyRegisterModel;
    expect(m.kind).toBe('tenancyRegister');
    expect(isBoundaryValid('s1-boundaries-c3', m)).toBe(true);
  });
  it('summary counts agreements and termination-required rows', () => {
    const m = decodeBoundary('s1-boundaries-c3', {
      tenTypes: ['Agistment', 'Lease'],
      names: ['Cattle', 'Shed'],
      expiries: ['Near', 'Far'],
      flags: ['Must terminate before community occupation', 'Monitor'],
      details: ['', ''],
    }) as TenancyRegisterModel;
    const s = summariseBoundary('s1-boundaries-c3', m);
    expect(s).toMatch(/2 agreement/);
    expect(s).toMatch(/1 require/);
  });
});

describe('BoundaryCapture -- c4 titleRestrictionChecker hard gate (BR4)', () => {
  it('exposes 6 fixed categories', () => {
    expect(TITLE_CATEGORIES).toHaveLength(6);
  });
  it('empty -> all six default to unknown -> INVALID (gate locked)', () => {
    const m = decodeBoundary('s1-boundaries-c4', {}) as TitleCheckerModel;
    expect(m.kind).toBe('titleRestrictionChecker');
    expect(m.categories).toEqual([
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      'unknown',
      'unknown',
    ]);
    expect(isBoundaryValid('s1-boundaries-c4', m)).toBe(false);
  });
  it('all six present/absent (none unknown) -> VALID (gate open)', () => {
    const m = decodeBoundary('s1-boundaries-c4', {
      categories: ['present', 'absent', 'absent', 'absent', 'absent', 'absent'],
    }) as TitleCheckerModel;
    expect(isBoundaryValid('s1-boundaries-c4', m)).toBe(true);
  });
  it('a single remaining unknown keeps it INVALID', () => {
    const m = decodeBoundary('s1-boundaries-c4', {
      categories: ['present', 'absent', 'unknown', 'absent', 'absent', 'absent'],
    }) as TitleCheckerModel;
    expect(isBoundaryValid('s1-boundaries-c4', m)).toBe(false);
  });
  it('summary reports present count', () => {
    const m = decodeBoundary('s1-boundaries-c4', {
      categories: ['present', 'present', 'absent', 'absent', 'absent', 'absent'],
    }) as TitleCheckerModel;
    expect(summariseBoundary('s1-boundaries-c4', m)).toMatch(/2 .*present/i);
  });
});

describe('BoundaryCapture -- c5 landHistoryRegister (BR4)', () => {
  it('empty is valid (always recordable)', () => {
    const m = decodeBoundary('s1-boundaries-c5', {}) as LandHistoryModel;
    expect(m.kind).toBe('landHistoryRegister');
    expect(isBoundaryValid('s1-boundaries-c5', m)).toBe(true);
  });
  it('decodes rows + contamination + prior-community + notes', () => {
    const m = decodeBoundary('s1-boundaries-c5', {
      eras: ['1960s-present'],
      histTypes: ['Agricultural'],
      names: ['Grazing'],
      bodies: ['Cattle run'],
      wasPriorIC: 'No prior community',
      contamination: ['Asbestos structures'],
      notes: 'Check creek corridor',
    }) as LandHistoryModel;
    expect(m.rows).toHaveLength(1);
    expect(m.contamination).toEqual(['Asbestos structures']);
    expect(m.wasPriorIC).toBe('No prior community');
    expect(m.notes).toBe('Check creek corridor');
  });
  it('summary counts records and contamination concerns', () => {
    const m = decodeBoundary('s1-boundaries-c5', {
      eras: ['1960s'],
      histTypes: ['Industrial'],
      names: ['Mill'],
      bodies: [''],
      contamination: ['Chemical storage / AST', 'Asbestos structures'],
    }) as LandHistoryModel;
    const s = summariseBoundary('s1-boundaries-c5', m);
    expect(s).toMatch(/1 historical record/);
    expect(s).toMatch(/2 contamination/);
  });
});

describe('BoundaryCapture -- render c1 (boundaryRegister) (BR5)', () => {
  it('add-section appends an empty section', () => {
    const { onChange } = renderCapture('s1-boundaries-c1', {});
    fireEvent.click(screen.getByTestId('section-add'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.secTypes as string[])).toEqual(['']);
  });
  it('selecting a section type emits it at row 0', () => {
    const { onChange } = renderCapture('s1-boundaries-c1', {
      directions: ['N'],
      secTypes: [''],
      names: [''],
      obligations: [''],
      disputes: [''],
    });
    fireEvent.change(screen.getByTestId('section-type-0'), {
      target: { value: 'Creek / natural boundary' },
    });
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.secTypes as string[])[0]).toBe('Creek / natural boundary');
  });
  it('toggling the dispute flag on row 0 emits "true"', () => {
    const { onChange } = renderCapture('s1-boundaries-c1', {
      directions: ['N'],
      secTypes: ['Shared / dividing fence'],
      names: [''],
      obligations: [''],
      disputes: [''],
    });
    fireEvent.click(screen.getByTestId('section-dispute-0'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.disputes as string[])[0]).toBe('true');
  });
  it('remove-section-0 deletes the row', () => {
    const { onChange } = renderCapture('s1-boundaries-c1', {
      directions: ['N'],
      secTypes: ['Shared / dividing fence'],
      names: [''],
      obligations: [''],
      disputes: [''],
    });
    fireEvent.click(screen.getByTestId('section-remove-0'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.secTypes as string[])).toEqual([]);
  });
  it('the map button is rendered disabled', () => {
    renderCapture('s1-boundaries-c1', {});
    expect((screen.getByTestId('open-map') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('BoundaryCapture -- render c2 (rowRegister) (BR5)', () => {
  it('add-row appends an empty right of way', () => {
    const { onChange } = renderCapture('s1-boundaries-c2', {});
    fireEvent.click(screen.getByTestId('row-add'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.rowTypes as string[])).toEqual(['']);
  });
  it('selecting an impact emits it at row 0', () => {
    const { onChange } = renderCapture('s1-boundaries-c2', {
      rowTypes: ['Utility easement'],
      names: [''],
      impacts: [''],
      holders: [''],
      widths: [''],
      details: [''],
    });
    fireEvent.change(screen.getByTestId('row-impact-0'), {
      target: { value: 'Restricts' },
    });
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.impacts as string[])[0]).toBe('Restricts');
  });
});

describe('BoundaryCapture -- render c3 (tenancyRegister) (BR6)', () => {
  it('add-tenancy appends an empty agreement', () => {
    const { onChange } = renderCapture('s1-boundaries-c3', {});
    fireEvent.click(screen.getByTestId('tenancy-add'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.tenTypes as string[])).toEqual(['']);
  });
  it('selecting a termination flag emits it', () => {
    const { onChange } = renderCapture('s1-boundaries-c3', {
      tenTypes: ['Agistment'],
      names: [''],
      expiries: [''],
      flags: [''],
      details: [''],
    });
    fireEvent.change(screen.getByTestId('tenancy-flag-0'), {
      target: { value: 'Must terminate before community occupation' },
    });
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.flags as string[])[0]).toBe(
      'Must terminate before community occupation',
    );
  });
});

describe('BoundaryCapture -- render c4 (titleRestrictionChecker) (BR6)', () => {
  it('renders all 6 category rows', () => {
    renderCapture('s1-boundaries-c4', {});
    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`title-cat-${i}`)).toBeTruthy();
    }
  });
  it('clicking Present on category 0 emits categories[0]="present"', () => {
    const { onChange } = renderCapture('s1-boundaries-c4', {});
    fireEvent.click(screen.getByTestId('title-cat-0-present'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect((arg.categories as string[])[0]).toBe('present');
  });
  it('shows the consequence + Act-task note when a category is Present', () => {
    renderCapture('s1-boundaries-c4', {
      categories: ['present', 'unknown', 'unknown', 'unknown', 'unknown', 'unknown'],
    });
    expect(screen.getByTestId('title-consequence-0')).toBeTruthy();
    expect(screen.getByText(/Act task will be created/i)).toBeTruthy();
  });
  it('shows the unknown-warning while any category is Unknown', () => {
    renderCapture('s1-boundaries-c4', {});
    expect(screen.getByTestId('title-unknown-warning')).toBeTruthy();
  });
  it('hides the unknown-warning when none remain', () => {
    renderCapture('s1-boundaries-c4', {
      categories: ['absent', 'absent', 'absent', 'absent', 'absent', 'absent'],
    });
    expect(screen.queryByTestId('title-unknown-warning')).toBeNull();
  });
});

describe('encode/decode round-trip via emitBoundary', () => {
  it('c1 boundaryRegister: emitBoundary reproduces canonical input exactly', () => {
    const input: FormValue = {
      directions: ['N', 'W'],
      secTypes: ['Shared / dividing fence', 'Unfenced / in dispute'],
      names: ['North fence', 'West boundary'],
      obligations: ['Shared upkeep', ''],
      disputes: ['', 'true'],
    };
    const model = decodeBoundary('s1-boundaries-c1', input);
    const onChange = vi.fn();
    emitBoundary(onChange, model);
    expect(onChange).toHaveBeenCalledWith(input);
  });

  it('c2 rowRegister: emitBoundary reproduces canonical input exactly', () => {
    const input: FormValue = {
      rowTypes: ['Utility easement', 'Access easement'],
      names: ['Power line', 'Driveway'],
      impacts: ['Restricts', 'Enables'],
      holders: ['Energy provider', ''],
      widths: ['3m', ''],
      details: ['Underground cable', ''],
    };
    const model = decodeBoundary('s1-boundaries-c2', input);
    const onChange = vi.fn();
    emitBoundary(onChange, model);
    expect(onChange).toHaveBeenCalledWith(input);
  });

  it('c3 tenancyRegister: emitBoundary reproduces canonical input exactly', () => {
    const input: FormValue = {
      tenTypes: ['Agistment', 'Lease'],
      names: ['Cattle grazing', 'Shed storage'],
      expiries: ['Near', 'Far'],
      flags: ['Must terminate before community occupation', 'Monitor'],
      details: ['Seasonal arrangement', ''],
    };
    const model = decodeBoundary('s1-boundaries-c3', input);
    const onChange = vi.fn();
    emitBoundary(onChange, model);
    expect(onChange).toHaveBeenCalledWith(input);
  });

  it('c4 titleRestrictionChecker: emitBoundary reproduces canonical input exactly', () => {
    const input: FormValue = {
      categories: ['present', 'absent', 'absent', 'unknown', 'absent', 'present'],
    };
    const model = decodeBoundary('s1-boundaries-c4', input);
    const onChange = vi.fn();
    emitBoundary(onChange, model);
    expect(onChange).toHaveBeenCalledWith(input);
  });

  it('c5 landHistoryRegister: emitBoundary reproduces canonical input exactly', () => {
    const input: FormValue = {
      eras: ['1960s-present', '1940s'],
      histTypes: ['Agricultural', 'Industrial'],
      names: ['Cattle run', 'Timber mill'],
      bodies: ['Grazing operation', 'Decommissioned'],
      wasPriorIC: 'No prior community',
      contamination: ['Asbestos structures', 'Chemical storage / AST'],
      notes: 'Check creek corridor for residual contamination',
    };
    const model = decodeBoundary('s1-boundaries-c5', input);
    const onChange = vi.fn();
    emitBoundary(onChange, model);
    expect(onChange).toHaveBeenCalledWith(input);
  });
});
