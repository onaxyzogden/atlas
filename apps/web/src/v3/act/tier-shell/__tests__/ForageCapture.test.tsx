/**
 * @vitest-environment happy-dom
 *
 * ForageCapture (F2) -- the React component + 5 mode bodies (P1..P5).
 * Logic (decode/encode/valid/summarise) is covered by ForageCapture.test.ts;
 * this file covers the rendered bodies and onChange round-trips.
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';

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

import { ForageCapture } from '../ForageCapture.js';
import {
  FORAGE_PREFIX,
  encodeForage,
  decodeForage,
  type ForageZonesModel,
  type ForageSeasonalModel,
  type ForageCapacityModel,
  type ForageConstraintsModel,
  type ForageToxicModel,
  type ForageZoneInput,
} from '../ForageCapture.js';
import type { FormValue } from '../actToolCatalog.js';

// Mockup demo zones.
const DEMO_ZONES: ForageZoneInput[] = [
  {
    id: 'z-south',
    forageType: 'improved',
    name: 'South paddock',
    areaHa: '8.5',
    condition: 'good',
    composition: 'Ryegrass / sub-clover dominant',
  },
  {
    id: 'z-north',
    forageType: 'native',
    name: 'North paddock',
    areaHa: '12.0',
    condition: 'fair',
    composition: 'Kangaroo grass + wallaby grass',
  },
  {
    id: 'z-creek',
    forageType: 'riparian',
    name: 'Creek flats',
    areaHa: '2.0',
    condition: 'good',
    composition: 'Mixed riparian grasses',
  },
];

function c1Siblings(): Record<string, FormValue> {
  return {
    [`${FORAGE_PREFIX}-c1`]: encodeForage('zones', {
      kind: 'zones',
      zones: DEMO_ZONES,
      candidateSpecies: ['sheep'],
    }),
  };
}

const NOOP = (): void => {};

describe('ForageCapture P1 zones', () => {
  it('renders the forage zone register eyebrow and the candidate-species selector', () => {
    render(
      <ForageCapture
        mode="zones"
        value={encodeForage('zones', { kind: 'zones', zones: DEMO_ZONES, candidateSpecies: ['sheep'] })}
        onChange={NOOP}
        itemId={`${FORAGE_PREFIX}-c1`}
        projectId="proj-1"
      />,
    );
    expect(screen.getByText(/Forage zone register/)).toBeTruthy();
    expect(screen.getByText('Candidate stock species')).toBeTruthy();
    expect(screen.getByText('Sheep')).toBeTruthy();
    expect(screen.getByText('Cattle')).toBeTruthy();
  });

  it('adding a zone then choosing a forage-type label emits onChange reflecting it', () => {
    let current: FormValue = encodeForage('zones', {
      kind: 'zones',
      zones: [],
      candidateSpecies: [],
    });
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <ForageCapture mode="zones" value={current} onChange={onChange} itemId={`${FORAGE_PREFIX}-c1`} projectId="p" />,
    );
    fireEvent.click(screen.getByText('Add forage zone'));
    rerender(
      <ForageCapture mode="zones" value={current} onChange={onChange} itemId={`${FORAGE_PREFIX}-c1`} projectId="p" />,
    );
    // one empty zone now exists; pick a forage type
    fireEvent.change(screen.getByRole('combobox', { name: 'Forage type' }), {
      target: { value: 'Native grassland' },
    });
    rerender(
      <ForageCapture mode="zones" value={current} onChange={onChange} itemId={`${FORAGE_PREFIX}-c1`} projectId="p" />,
    );
    const model = decodeForage('zones', current) as ForageZonesModel;
    expect(model.zones.length).toBe(1);
    expect(model.zones[0]?.forageType).toBe('native');
    expect(model.zones[0]?.id).toBeTruthy();
  });

  it('candidate-species selection round-trips through onChange', () => {
    let current: FormValue = encodeForage('zones', {
      kind: 'zones',
      zones: DEMO_ZONES,
      candidateSpecies: [],
    });
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <ForageCapture mode="zones" value={current} onChange={onChange} itemId={`${FORAGE_PREFIX}-c1`} projectId="p" />,
    );
    fireEvent.click(screen.getByText('Cattle'));
    rerender(
      <ForageCapture mode="zones" value={current} onChange={onChange} itemId={`${FORAGE_PREFIX}-c1`} projectId="p" />,
    );
    const model = decodeForage('zones', current) as ForageZonesModel;
    expect(model.candidateSpecies).toContain('cattle');
  });
});

describe('ForageCapture P2 seasonal', () => {
  it('renders the availability calendar with one row per sibling zone', () => {
    render(
      <ForageCapture
        mode="seasonal"
        value={{}}
        onChange={NOOP}
        itemId={`${FORAGE_PREFIX}-c2`}
        siblingValues={c1Siblings()}
        projectId="p"
      />,
    );
    expect(screen.getByText('Forage availability calendar')).toBeTruthy();
    expect(screen.getByText('South paddock')).toBeTruthy();
    expect(screen.getByText('North paddock')).toBeTruthy();
    expect(screen.getByText('Creek flats')).toBeTruthy();
    // legend
    expect(screen.getByText('Adequate')).toBeTruthy();
    expect(screen.getByText('Moderate')).toBeTruthy();
    expect(screen.getByText('Feed gap')).toBeTruthy();
  });

  it('cycling a month cell changes the stored months for that zone', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <ForageCapture
        mode="seasonal"
        value={current}
        onChange={onChange}
        itemId={`${FORAGE_PREFIX}-c2`}
        siblingValues={c1Siblings()}
        projectId="p"
      />,
    );
    // first zone's January cell (aria-label January). There is one calendar grid
    // per zone; the first January button belongs to the first zone.
    const janCells = screen.getAllByLabelText('January');
    fireEvent.click(janCells[0]!);
    rerender(
      <ForageCapture
        mode="seasonal"
        value={current}
        onChange={onChange}
        itemId={`${FORAGE_PREFIX}-c2`}
        siblingValues={c1Siblings()}
        projectId="p"
      />,
    );
    const model = decodeForage('seasonal', current) as ForageSeasonalModel;
    // cycle is none(0)->med(1)->high(2); one click => 1
    const south = model.calendars.find((c) => c.zoneId === 'z-south');
    expect(south?.months[0]).toBe(1);
  });
});

describe('ForageCapture P3 capacity', () => {
  it('renders the zone carrying-capacity eyebrow and the Reconciliation-2 info note', () => {
    render(
      <ForageCapture
        mode="capacity"
        value={{}}
        onChange={NOOP}
        itemId={`${FORAGE_PREFIX}-c3`}
        siblingValues={c1Siblings()}
        projectId="p"
      />,
    );
    expect(
      screen.getByText(/Zone carrying capacity -- 1 DSE ~ 1 Merino ewe or 50kg live weight/),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /OLOS computes the recorded baseline carrying capacity independently from zone area and candidate species/,
      ),
    ).toBeTruthy();
  });

  it('selecting a condition class shows the DSE calc and updates the total', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <ForageCapture
        mode="capacity"
        value={current}
        onChange={onChange}
        itemId={`${FORAGE_PREFIX}-c3`}
        siblingValues={c1Siblings()}
        projectId="p"
      />,
    );
    // South paddock is improved; choose "Improved -- Good / 10" (10 DSE/ha)
    fireEvent.change(screen.getByRole('combobox', { name: 'Condition class for South paddock' }), {
      target: { value: 'Improved -- Good / 10' },
    });
    rerender(
      <ForageCapture
        mode="capacity"
        value={current}
        onChange={onChange}
        itemId={`${FORAGE_PREFIX}-c3`}
        siblingValues={c1Siblings()}
        projectId="p"
      />,
    );
    const model = decodeForage('capacity', current) as ForageCapacityModel;
    const south = model.classByZone.find((c) => c.zoneId === 'z-south');
    expect(south?.conditionClass).toBe('improved-good');
    // 8.5 ha * 10 DSE/ha = 85; appears in the zone DSE total, the calc result,
    // and the grand-total ceiling block (only South is classified).
    expect(screen.getAllByText('85').length).toBeGreaterThan(0);
  });
});

describe('ForageCapture P4 constraints', () => {
  it('renders the net effective grazeable area block', () => {
    render(
      <ForageCapture
        mode="constraints"
        value={{}}
        onChange={NOOP}
        itemId={`${FORAGE_PREFIX}-c4`}
        siblingValues={c1Siblings()}
        projectId="p"
      />,
    );
    expect(screen.getByText(/Net effective grazeable area/)).toBeTruthy();
  });

  it('net grazeable recomputes when an exclusion area is entered', () => {
    const onChange = vi.fn();
    const value: FormValue = encodeForage('constraints', {
      kind: 'constraints',
      rows: [
        { id: 'c-1', kind: 'exclusion', title: 'Creek corridor', detail: 'reveg', areaHa: '-1.2' },
      ],
    });
    render(
      <ForageCapture
        mode="constraints"
        value={value}
        onChange={onChange}
        itemId={`${FORAGE_PREFIX}-c4`}
        siblingValues={c1Siblings()}
        projectId="p"
      />,
    );
    // total 22.5 ha, exclusions 1.2 ha -> effective 21.3 ha
    expect(screen.getByText(/22\.5/)).toBeTruthy();
    expect(screen.getByText(/1\.2/)).toBeTruthy();
    expect(screen.getByText(/21\.3/)).toBeTruthy();
  });
});

describe('ForageCapture P5 toxic', () => {
  it('renders all 5 toxic plant names and binomials', () => {
    render(
      <ForageCapture
        mode="toxic"
        value={{}}
        onChange={NOOP}
        itemId={`${FORAGE_PREFIX}-c5`}
        projectId="p"
      />,
    );
    expect(screen.getByText('Cape tulip')).toBeTruthy();
    expect(screen.getByText('Moraea flaccida -- previously Homeria flaccida')).toBeTruthy();
    expect(screen.getByText("Patterson's curse / Salvation Jane")).toBeTruthy();
    expect(screen.getByText('Echium plantagineum')).toBeTruthy();
    expect(screen.getByText('Fireweed')).toBeTruthy();
    expect(screen.getByText('Pimelea / Flaxweed')).toBeTruthy();
    expect(screen.getByText('Serrated tussock')).toBeTruthy();
  });

  it('clicking Present on Cape tulip emits states[0]==present and shows the high-risk block', () => {
    let current: FormValue = {};
    const onChange = vi.fn((next: FormValue) => {
      current = next;
    });
    const { rerender } = render(
      <ForageCapture
        mode="toxic"
        value={current}
        onChange={onChange}
        itemId={`${FORAGE_PREFIX}-c5`}
        projectId="p"
      />,
    );
    // The Cape tulip row is the first toxic row; click its "Present" button.
    const capeRow = screen.getByText('Cape tulip').closest('[data-toxic-row]') as HTMLElement;
    fireEvent.click(within(capeRow).getByText('Present'));
    rerender(
      <ForageCapture
        mode="toxic"
        value={current}
        onChange={onChange}
        itemId={`${FORAGE_PREFIX}-c5`}
        projectId="p"
      />,
    );
    const model = decodeForage('toxic', current) as ForageToxicModel;
    expect(model.states[0]).toBe('present');
    expect(
      screen.getByText(
        /High risk -- Cape tulip present\. Act task generated: Cape tulip control programme\./,
      ),
    ).toBeTruthy();
  });
});
