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
  type EasementModel,
  type ZoningModel,
  type WaterModel,
  type PermitsModel,
} from '../BoundaryCaptureLegacy.js';
import type { FormValue } from '../actToolCatalog.js';

const DOC_STATUS = ['Verified', 'Pending', 'Not held'] as const;
const COVENANT_TYPES = [
  'Conservation',
  'Access',
  'Water rights',
  'Tenancy',
] as const;
const EASEMENT_IMPLICATIONS = [
  'Restricts building',
  'Maintenance duty',
  'Access required',
  'No implications',
] as const;
const ZONING = ['Agricultural', 'Residential', 'Mixed use'] as const;
const PERMITTED_USES = ['Grazing', 'Cropping', 'Dwelling'] as const;
const ZONING_REVIEW = [
  'None',
  'Change of use',
  'Planning permission',
  'Unsure',
] as const;
const WATER_SOURCES = ['Mains', 'Borehole', 'River', 'Rainwater'] as const;
const WATER_UNIT = ['m3', 'litres'] as const;
const WATER_STATUS = ['Licenced', 'Unlicenced', 'Exempt'] as const;
const PERMIT_ACTIVITIES = [
  'Abstraction',
  'Discharge',
  'Burning',
  'Felling',
  'Construction',
] as const;

function resolveOptions(optionSetId: string): readonly string[] {
  if (optionSetId === 'boundaryDocStatus') return DOC_STATUS;
  if (optionSetId === 'boundaryCovenantTypes') return COVENANT_TYPES;
  if (optionSetId === 'boundaryEasementImplications')
    return EASEMENT_IMPLICATIONS;
  if (optionSetId === 'boundaryZoning') return ZONING;
  if (optionSetId === 'boundaryPermittedUses') return PERMITTED_USES;
  if (optionSetId === 'boundaryZoningReview') return ZONING_REVIEW;
  if (optionSetId === 'boundaryWaterSources') return WATER_SOURCES;
  if (optionSetId === 'boundaryWaterUnit') return WATER_UNIT;
  if (optionSetId === 'boundaryWaterStatus') return WATER_STATUS;
  if (optionSetId === 'boundaryPermitActivities') return PERMIT_ACTIVITIES;
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

// --------------------------------------------------------------------------
// c3 mapEntry -- decode / valid / summary / render
// --------------------------------------------------------------------------

describe('BoundaryCapture -- mapEntry mode (c3)', () => {
  it('boundaryModeFor c3 is mapEntry', () => {
    expect(boundaryModeFor('s1-boundaries-c3')).toBe('mapEntry');
  });

  it('empty value decodes empty arrays -> invalid', () => {
    const m = decodeBoundary('s1-boundaries-c3', {});
    expect(m.kind).toBe('mapEntry');
    expect((m as EasementModel).easements).toEqual([]);
    expect((m as EasementModel).implications).toEqual([]);
    expect(isBoundaryValid('s1-boundaries-c3', m)).toBe(false);
  });

  it('one easement makes it valid', () => {
    const m = decodeBoundary('s1-boundaries-c3', {
      easements: ['Utility ROW'],
    });
    expect(isBoundaryValid('s1-boundaries-c3', m)).toBe(true);
  });

  it('"No implications" makes it valid even with zero easements', () => {
    const m = decodeBoundary('s1-boundaries-c3', {
      implications: ['No implications'],
    });
    expect((m as EasementModel).easements).toEqual([]);
    expect(isBoundaryValid('s1-boundaries-c3', m)).toBe(true);
  });

  it('summary reflects counts', () => {
    const m = decodeBoundary('s1-boundaries-c3', {
      easements: ['Utility ROW', 'Footpath'],
      implications: ['Access required'],
    });
    const s = summariseBoundary('s1-boundaries-c3', m);
    expect(s).toMatch(/2 easement/);
    expect(s).toMatch(/1 implication/);
  });

  it('clicking easement-add appends an empty easement', () => {
    const { onChange } = renderCapture('s1-boundaries-c3', {});
    fireEvent.click(screen.getByTestId('easement-add'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.easements).toEqual(['']);
  });

  it('editing easement-input-0 emits the new text', () => {
    const { onChange } = renderCapture('s1-boundaries-c3', {
      easements: ['Utility ROW'],
    });
    fireEvent.change(screen.getByTestId('easement-input-0'), {
      target: { value: 'Drainage easement' },
    });
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.easements).toEqual(['Drainage easement']);
  });

  it('clicking easement-remove-0 removes that entry', () => {
    const { onChange } = renderCapture('s1-boundaries-c3', {
      easements: ['Utility ROW'],
    });
    fireEvent.click(screen.getByTestId('easement-remove-0'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.easements).toEqual([]);
  });

  it('clicking an implication button toggles it into implications', () => {
    const { onChange } = renderCapture('s1-boundaries-c3', {});
    fireEvent.click(screen.getByTestId('implication-Access required'));
    const arg = onChange.mock.calls[0]![0] as FormValue;
    expect(arg.implications).toEqual(['Access required']);
  });

  it('open-map button is rendered disabled', () => {
    renderCapture('s1-boundaries-c3', {});
    const btn = screen.getByTestId('open-map') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('mapEntry renders BOTH the map mock AND the entry-list that plain map does not', () => {
    // The dedicated mapEntry branch (c3 -> EasementBody) renders the map mock
    // (open-map) PLUS the easement entry-list affordance (easement-add). The
    // plain map branch (c2 -> MapBody) renders the map mock but NO entry list.
    const { unmount } = render(
      <BoundaryCapture
        itemId="s1-boundaries-c3"
        value={{}}
        onChange={vi.fn()}
        resolveOptions={resolveOptions}
      />,
    );
    // map mock present in mapEntry
    expect(screen.getByTestId('open-map')).toBeTruthy();
    // entry-list affordance present in mapEntry
    expect(screen.getByTestId('easement-add')).toBeTruthy();
    unmount();

    // Plain map mode (c2): map mock present, entry-list ABSENT.
    render(
      <BoundaryCapture
        itemId="s1-boundaries-c2"
        value={{}}
        onChange={vi.fn()}
        resolveOptions={resolveOptions}
      />,
    );
    expect(screen.getByTestId('open-map')).toBeTruthy();
    expect(screen.queryByTestId('easement-add')).toBeNull();
  });
});

// --------------------------------------------------------------------------
// decision modes (c4/c5/c7)
// --------------------------------------------------------------------------

describe('decision modes (c4/c5/c7)', () => {
  it('temporary default fallback is gone -- c4 decodes to zoning, not map', () => {
    const m = decodeBoundary('s1-boundaries-c4', {});
    expect(m.kind).toBe('zoning');
  });

  // ---- c4 zoning ----
  describe('c4 zoning model', () => {
    it('empty value decodes invalid', () => {
      const m = decodeBoundary('s1-boundaries-c4', {});
      expect(m.kind).toBe('zoning');
      expect(isBoundaryValid('s1-boundaries-c4', m)).toBe(false);
    });

    it('zoning + reviewFlag makes it valid', () => {
      const m = decodeBoundary('s1-boundaries-c4', {
        zoning: 'Agricultural',
        reviewFlag: 'None',
      });
      expect(isBoundaryValid('s1-boundaries-c4', m)).toBe(true);
    });

    it('missing reviewFlag is invalid', () => {
      const m = decodeBoundary('s1-boundaries-c4', { zoning: 'Agricultural' });
      expect(isBoundaryValid('s1-boundaries-c4', m)).toBe(false);
    });

    it('missing zoning is invalid', () => {
      const m = decodeBoundary('s1-boundaries-c4', { reviewFlag: 'None' });
      expect(isBoundaryValid('s1-boundaries-c4', m)).toBe(false);
    });

    it('summary contains the zoning', () => {
      const m = decodeBoundary('s1-boundaries-c4', {
        zoning: 'Agricultural',
        permittedUses: ['Grazing'],
        reviewFlag: 'None',
      });
      const s = summariseBoundary('s1-boundaries-c4', m);
      expect(s).toMatch(/Agricultural/);
    });

    it('changing zoning-select emits zoning', () => {
      const { onChange } = renderCapture('s1-boundaries-c4', {});
      fireEvent.change(screen.getByTestId('zoning-select'), {
        target: { value: 'Agricultural' },
      });
      const arg = onChange.mock.calls[0]![0] as FormValue;
      expect(arg.zoning).toBe('Agricultural');
    });

    it('toggling a use checkbox emits permittedUses', () => {
      const { onChange } = renderCapture('s1-boundaries-c4', {});
      fireEvent.click(screen.getByTestId('use-Grazing'));
      const arg = onChange.mock.calls[0]![0] as FormValue;
      expect(arg.permittedUses).toEqual(['Grazing']);
    });

    it('clicking a review button emits reviewFlag', () => {
      const { onChange } = renderCapture('s1-boundaries-c4', {});
      fireEvent.click(screen.getByTestId('review-None'));
      const arg = onChange.mock.calls[0]![0] as FormValue;
      expect(arg.reviewFlag).toBe('None');
    });
  });

  // ---- c5 water ----
  describe('c5 water model', () => {
    it('empty value decodes invalid', () => {
      const m = decodeBoundary('s1-boundaries-c5', {});
      expect(m.kind).toBe('water');
      expect(isBoundaryValid('s1-boundaries-c5', m)).toBe(false);
    });

    it('sources>=1 AND status set makes it valid', () => {
      const m = decodeBoundary('s1-boundaries-c5', {
        sources: ['Mains'],
        status: 'Licenced',
      });
      expect(isBoundaryValid('s1-boundaries-c5', m)).toBe(true);
    });

    it('sources>=1 but no status is invalid', () => {
      const m = decodeBoundary('s1-boundaries-c5', { sources: ['Mains'] });
      expect(isBoundaryValid('s1-boundaries-c5', m)).toBe(false);
    });

    it('summary reflects counts', () => {
      const m = decodeBoundary('s1-boundaries-c5', {
        sources: ['Mains', 'Borehole'],
        entitlement: '500',
        unit: 'm3',
        status: 'Licenced',
      });
      const s = summariseBoundary('s1-boundaries-c5', m);
      expect(s).toMatch(/2 source/);
      expect(s).toMatch(/Licenced/);
    });

    it('toggling a source checkbox emits sources', () => {
      const { onChange } = renderCapture('s1-boundaries-c5', {});
      fireEvent.click(screen.getByTestId('source-Mains'));
      const arg = onChange.mock.calls[0]![0] as FormValue;
      expect(arg.sources).toEqual(['Mains']);
    });

    it('typing in water-entitlement emits entitlement string', () => {
      const { onChange } = renderCapture('s1-boundaries-c5', {});
      fireEvent.change(screen.getByTestId('water-entitlement'), {
        target: { value: '500' },
      });
      const arg = onChange.mock.calls[0]![0] as FormValue;
      expect(arg.entitlement).toBe('500');
    });

    it('selecting water-unit emits unit', () => {
      const { onChange } = renderCapture('s1-boundaries-c5', {});
      fireEvent.change(screen.getByTestId('water-unit'), {
        target: { value: 'm3' },
      });
      const arg = onChange.mock.calls[0]![0] as FormValue;
      expect(arg.unit).toBe('m3');
    });

    it('clicking a waterstatus button emits status', () => {
      const { onChange } = renderCapture('s1-boundaries-c5', {});
      fireEvent.click(screen.getByTestId('waterstatus-Licenced'));
      const arg = onChange.mock.calls[0]![0] as FormValue;
      expect(arg.status).toBe('Licenced');
    });
  });

  // ---- c7 permits ----
  describe('c7 permits model', () => {
    it('empty value decodes ALWAYS valid', () => {
      const m = decodeBoundary('s1-boundaries-c7', {});
      expect(m.kind).toBe('permits');
      expect(isBoundaryValid('s1-boundaries-c7', m)).toBe(true);
    });

    it('summary reflects activity count', () => {
      const m = decodeBoundary('s1-boundaries-c7', {
        activities: ['Abstraction', 'Burning'],
      });
      const s = summariseBoundary('s1-boundaries-c7', m);
      expect(s).toMatch(/2 permit-required/);
    });

    it('toggling an activity checkbox emits activities', () => {
      const { onChange } = renderCapture('s1-boundaries-c7', {});
      fireEvent.click(screen.getByTestId('activity-Abstraction'));
      const arg = onChange.mock.calls[0]![0] as FormValue;
      expect(arg.activities).toEqual(['Abstraction']);
    });

    it('the advisory text is present', () => {
      renderCapture('s1-boundaries-c7', {});
      expect(
        screen.getByText(/cannot receive an Act handoff approval/i),
      ).toBeTruthy();
    });
  });
});

// satisfy unused-type lints in strict configs
export type {
  TitleDeedModel,
  CovenantModel,
  EasementModel,
  ZoningModel,
  WaterModel,
  PermitsModel,
};
