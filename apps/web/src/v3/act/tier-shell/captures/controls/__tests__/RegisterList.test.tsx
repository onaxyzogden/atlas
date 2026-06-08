/**
 * @vitest-environment happy-dom
 *
 * RegisterList -- generic add/remove card list with per-row fields.
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

import { RegisterList } from '../RegisterList.js';

interface Row {
  name: string;
  flag: boolean;
}

const makeEmpty = (): Row => ({ name: '', flag: false });

function renderRow(
  item: Row,
  index: number,
  update: (patch: Partial<Row>) => void,
): React.ReactNode {
  return (
    <>
      <input
        aria-label={`name-${index}`}
        value={item.name}
        onChange={(e) => update({ name: e.target.value })}
      />
      <button
        type="button"
        aria-label={`flag-${index}`}
        aria-pressed={item.flag}
        onClick={() => update({ flag: !item.flag })}
      >
        flag
      </button>
    </>
  );
}

describe('RegisterList', () => {
  it('renders emptyHint when there are no items', () => {
    render(
      <RegisterList<Row>
        items={[]}
        onChange={() => {}}
        renderRow={renderRow}
        makeEmpty={makeEmpty}
        emptyHint="Nothing yet"
      />,
    );
    expect(screen.getByText('Nothing yet')).toBeTruthy();
  });

  it('Add calls onChange with one appended makeEmpty row', () => {
    const onChange = vi.fn();
    render(
      <RegisterList<Row>
        items={[]}
        onChange={onChange}
        renderRow={renderRow}
        makeEmpty={makeEmpty}
        addLabel="Add row"
      />,
    );
    fireEvent.click(screen.getByText('Add row'));
    expect(onChange).toHaveBeenCalledWith([{ name: '', flag: false }]);
  });

  it('Remove calls onChange without that row', () => {
    const onChange = vi.fn();
    const items: Row[] = [
      { name: 'a', flag: false },
      { name: 'b', flag: true },
    ];
    render(
      <RegisterList<Row>
        items={items}
        onChange={onChange}
        renderRow={renderRow}
        makeEmpty={makeEmpty}
      />,
    );
    fireEvent.click(screen.getAllByLabelText('Remove')[0]!);
    expect(onChange).toHaveBeenCalledWith([{ name: 'b', flag: true }]);
  });

  it('editing via the update callback calls onChange with the patched row', () => {
    const onChange = vi.fn();
    const items: Row[] = [{ name: 'a', flag: false }];
    render(
      <RegisterList<Row>
        items={items}
        onChange={onChange}
        renderRow={renderRow}
        makeEmpty={makeEmpty}
      />,
    );
    fireEvent.change(screen.getByLabelText('name-0'), {
      target: { value: 'abc' },
    });
    expect(onChange).toHaveBeenCalledWith([{ name: 'abc', flag: false }]);
  });

  it('renders one row per item', () => {
    const items: Row[] = [
      { name: 'a', flag: false },
      { name: 'b', flag: false },
      { name: 'c', flag: false },
    ];
    render(
      <RegisterList<Row>
        items={items}
        onChange={() => {}}
        renderRow={renderRow}
        makeEmpty={makeEmpty}
      />,
    );
    expect(screen.getAllByLabelText('Remove')).toHaveLength(3);
  });

  it('applies the ariaLabel to the group', () => {
    render(
      <RegisterList<Row>
        items={[]}
        onChange={() => {}}
        renderRow={renderRow}
        makeEmpty={makeEmpty}
        ariaLabel="Tenancies"
      />,
    );
    expect(screen.getByRole('group', { name: 'Tenancies' })).toBeTruthy();
  });
});
