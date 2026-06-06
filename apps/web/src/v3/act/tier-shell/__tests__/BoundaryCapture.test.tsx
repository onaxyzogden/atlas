/**
 * @vitest-environment happy-dom
 *
 * BoundaryCapture -- a CONTROLLED, SELF-ROUTING renderer over a FLAT FormValue
 * (Record<string, string | string[]>) for the s1-boundaries objective. It
 * switches on `itemId` internally to render one of several mode bodies. This
 * test covers the BT2 slice: doc (c1 titleDeed), doc (c6 covenant), and
 * pure-map (c2). The mode router covers all 7 ids now (later tasks fill the
 * mapEntry/decision bodies).
 *
 * Mirrors LabourInventoryCapture.test.tsx / VisionClassifyCapture.test.tsx
 * (happy-dom + testing-library; the lucide-react svg stub avoids the
 * childless-forwardRef re-render crash).
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
  isBoundaryValid,
  summariseBoundary,
  type TitleDeedModel,
  type CovenantModel,
  type MapModel,
} from '../BoundaryCapture.js';
import type { FormValue } from '../actToolCatalog.js';

const DOC_STATUS = ['Verified', 'Pending', 'Not held'] as const;
const COVENANT_TYPES = [
  'Conservation',
  'Access',
  'Water rights',
  'Tenancy',
] as const;

function resolveOptions(optionSetId: string): readonly string[] {
  if (optionSetId === 'boundaryDocStatus') return DOC_STATUS;
  if (optionSetId === 'boundaryCovenantTypes') return COVENANT_TYPES;
  return [];
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

// --------------------------------------------------------------------------
// boundaryModeFor
// --------------------------------------------------------------------------

describe('BoundaryCapture -- boundaryModeFor', () => {
  const cases: ReadonlyArray<[string, ReturnType<typeof boundaryModeFor>]> = [
    ['s1-boundaries-c1', 'doc'],
    ['s1-boundaries-c2', 'map'],
    ['s1-boundaries-c3', 'mapEntry'],
    ['s1-boundaries-c4', 'decision'],
    ['s1-boundaries-c5', 'decision'],
    ['s1-boundaries-c6', 'doc'],
    ['s1-boundaries-c7', 'decision'],
  ];

  it.each(cases)('maps %s -> %s', (itemId, mode) => {
    expect(boundaryModeFor(itemId)).toBe(mode);
  });

  it('defaults to decision for an unknown id', () => {
    expect(boundaryModeFor('s1-boundaries-cX')).toBe('decision');
  });
});

// --------------------------------------------------------------------------
// c1 titleDeed -- decode / valid / summary
// --------------------------------------------------------------------------

describe('BoundaryCapture -- c1 titleDeed model', () => {
  it('empty value decodes invalid', () => {
    const m = decodeBoundary('s1-boundaries-c1', {});
    expect(m.kind).toBe('titleDeed');
    expect(isBoundaryValid('s1-boundaries-c1', m)).toBe(false);
  });

  it('setting docStatus makes it valid', () => {
    const m = decodeBoundary('s1-boundaries-c1', { docStatus: 'Verified' });
    expect(isBoundaryValid('s1-boundaries-c1', m)).toBe(true);
  });

  it('summary contains the status', () => {
    const m = decodeBoundary('s1-boundaries-c1', {
      docStatus: 'Verified',
      docName: 'Deed.pdf',
    });
    const s = summariseBoundary('s1-boundaries-c1', m);
    expect(s).toMatch(/Verified/);
    expect(s).toMatch(/Deed\.pdf/);
  });
});

// --------------------------------------------------------------------------
// c6 covenant -- decode / valid / summary
// --------------------------------------------------------------------------

describe('BoundaryCapture -- c6 covenant model', () => {
  it('empty value decodes invalid', () => {
    const m = decodeBoundary('s1-boundaries-c6', {});
    expect(m.kind).toBe('covenant');
    expect(isBoundaryValid('s1-boundaries-c6', m)).toBe(false);
  });

  it('one obligation makes it valid', () => {
    const m = decodeBoundary('s1-boundaries-c6', {
      obligationTypes: ['Conservation'],
    });
    expect(isBoundaryValid('s1-boundaries-c6', m)).toBe(true);
  });

  it('summary lists the obligations', () => {
    const m = decodeBoundary('s1-boundaries-c6', {
      obligationTypes: ['Conservation', 'Access'],
    });
    const s = summariseBoundary('s1-boundaries-c6', m);
    expect(s).toMatch(/2 obligation/);
    expect(s).toMatch(/Conservation/);
    expect(s).toMatch(/Access/);
  });
});

// --------------------------------------------------------------------------
// c2 map -- decode / valid
// --------------------------------------------------------------------------

describe('BoundaryCapture -- c2 map model', () => {
  it('empty value decodes acknowledged false -> invalid', () => {
    const m = decodeBoundary('s1-boundaries-c2', {});
    expect(m.kind).toBe('map');
    expect((m as MapModel).acknowledged).toBe(false);
    expect(isBoundaryValid('s1-boundaries-c2', m)).toBe(false);
  });

  it('acknowledged "true" decodes true -> valid', () => {
    const m = decodeBoundary('s1-boundaries-c2', { acknowledged: 'true' });
    expect((m as MapModel).acknowledged).toBe(true);
    expect(isBoundaryValid('s1-boundaries-c2', m)).toBe(true);
  });

  it('summary reflects acknowledgement', () => {
    const ack = decodeBoundary('s1-boundaries-c2', { acknowledged: 'true' });
    expect(summariseBoundary('s1-boundaries-c2', ack)).toMatch(/acknowledged/i);
    const not = decodeBoundary('s1-boundaries-c2', {});
    expect(summariseBoundary('s1-boundaries-c2', not)).toMatch(/Not acknowledged/i);
  });
});

// --------------------------------------------------------------------------
// Render -- c1 doc body
// --------------------------------------------------------------------------

describe('BoundaryCapture -- render c1 (titleDeed)', () => {
  it('clicking a docstatus button emits onChange with that status encoded', () => {
    const { onChange } = renderCapture('s1-boundaries-c1', {});
    fireEvent.click(screen.getByTestId('docstatus-Verified'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.docStatus).toBe('Verified');
  });

  it('clicking doc-upload emits onChange with docName set', () => {
    const { onChange } = renderCapture('s1-boundaries-c1', {});
    fireEvent.click(screen.getByTestId('doc-upload'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.docName).toBe('Title document.pdf');
  });

  it('doc-remove clears the attached docName', () => {
    const { onChange } = renderCapture('s1-boundaries-c1', {
      docName: 'Title document.pdf',
    });
    fireEvent.click(screen.getByTestId('doc-remove'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.docName).toBe('');
  });
});

// --------------------------------------------------------------------------
// Render -- c6 covenant body
// --------------------------------------------------------------------------

describe('BoundaryCapture -- render c6 (covenant)', () => {
  it('clicking an obligation button toggles it on', () => {
    const { onChange } = renderCapture('s1-boundaries-c6', {});
    fireEvent.click(screen.getByTestId('obligation-Conservation'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.obligationTypes).toEqual(['Conservation']);
  });

  it('clicking an active obligation button toggles it off', () => {
    const { onChange } = renderCapture('s1-boundaries-c6', {
      obligationTypes: ['Conservation'],
    });
    fireEvent.click(screen.getByTestId('obligation-Conservation'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.obligationTypes).toEqual([]);
  });

  it('doc-upload sets the covenant document filename', () => {
    const { onChange } = renderCapture('s1-boundaries-c6', {});
    fireEvent.click(screen.getByTestId('doc-upload'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.docName).toBe('Covenant document.pdf');
  });
});

// --------------------------------------------------------------------------
// Render -- c2 map body
// --------------------------------------------------------------------------

describe('BoundaryCapture -- render c2 (map)', () => {
  it('open-map button is rendered disabled', () => {
    renderCapture('s1-boundaries-c2', {});
    const btn = screen.getByTestId('open-map') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('clicking ack-toggle emits onChange with acknowledged "true"', () => {
    const { onChange } = renderCapture('s1-boundaries-c2', {});
    fireEvent.click(screen.getByTestId('ack-toggle'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.acknowledged).toBe('true');
  });

  it('clicking ack-toggle when already acknowledged clears it', () => {
    const { onChange } = renderCapture('s1-boundaries-c2', {
      acknowledged: 'true',
    });
    fireEvent.click(screen.getByTestId('ack-toggle'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.acknowledged).toBe('');
  });
});

// satisfy unused-type lints in strict configs
export type { TitleDeedModel, CovenantModel };
