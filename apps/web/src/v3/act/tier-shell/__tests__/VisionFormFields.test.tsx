/**
 * @vitest-environment happy-dom
 *
 * VisionFormFields -- the structured form-field rendering engine used inside
 * VisionFormsTabsModal for kind:'form' Act tier-shell tools. It renders a
 * FormFieldSpec[] against a controlled FormValue and reports edits via onChange.
 *
 * Verified behaviours:
 *   1. text leaf renders an input; typing reports the new string at the key.
 *   2. text leaf with multiline renders a textarea.
 *   3. hybrid renders a select with each resolved option + the "Other" sentinel;
 *      selecting a real option reports it.
 *   4. hybrid: selecting the sentinel reveals a free-text input; typing reports it.
 *   5. hybrid: a stored free string (not in options) auto-shows the free input,
 *      prefilled.
 *   6. repeatable: a 2-entry value renders two rows; Add appends an empty 3rd;
 *      Add is disabled at max.
 *   7. repeatable: Remove drops that entry.
 *   8. initialFormValue: leaves -> '', repeatable -> array of `min` empties.
 *   9. summariseFormValue: a mixed spec yields a readable string and skips empties.
 *  10. isFormValueValid: required-empty and under-min repeatable are invalid;
 *      satisfied is valid.
 *
 * Fixtures are built inline so the tests stay content-stable. Pattern mirrors
 * VisionFormsTabsModal.test.tsx (happy-dom + testing-library).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VisionFormFields, {
  initialFormValue,
  summariseFormValue,
  isFormValueValid,
  missingRequirements,
} from '../VisionFormFields.js';
import type { FormFieldSpec, FormValue } from '../actToolCatalog.js';

const stubOptions = (): readonly string[] => ['Alpha', 'Beta'];

function renderFields(
  fields: readonly FormFieldSpec[],
  value: FormValue,
  resolveOptions: (id: string) => readonly string[] = stubOptions,
) {
  const onChange = vi.fn();
  render(
    <VisionFormFields
      fields={fields}
      value={value}
      onChange={onChange}
      resolveOptions={resolveOptions}
    />,
  );
  return { onChange };
}

describe('VisionFormFields -- text leaf', () => {
  it('renders an input and reports typing at the field key', () => {
    const fields: FormFieldSpec[] = [
      { kind: 'text', key: 'purpose', label: 'Primary purpose' },
    ];
    const { onChange } = renderFields(fields, { purpose: '' });
    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'grow food' } });
    expect(onChange).toHaveBeenCalledWith({ purpose: 'grow food' });
  });

  it('renders a textarea when multiline is set', () => {
    const fields: FormFieldSpec[] = [
      { kind: 'text', key: 'notes', label: 'Notes', multiline: true },
    ];
    renderFields(fields, { notes: '' });
    const el = screen.getByRole('textbox');
    expect(el.tagName).toBe('TEXTAREA');
  });
});

describe('VisionFormFields -- hybrid leaf', () => {
  it('renders a select with each option plus the Other sentinel; selecting an option reports it', () => {
    const fields: FormFieldSpec[] = [
      { kind: 'hybrid', key: 'season', label: 'Season', optionSetId: 'seasons' },
    ];
    const { onChange } = renderFields(fields, { season: '' });
    expect(screen.getByRole('option', { name: 'Alpha' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Beta' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Other (type your own)' })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Alpha' } });
    expect(onChange).toHaveBeenCalledWith({ season: 'Alpha' });
  });

  it('reveals a free-text input when the sentinel is selected and reports typing', () => {
    const fields: FormFieldSpec[] = [
      { kind: 'hybrid', key: 'season', label: 'Season', optionSetId: 'seasons' },
    ];
    const { onChange } = renderFields(fields, { season: '' });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__free__' } });
    const free = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(free, { target: { value: 'Monsoon' } });
    expect(onChange).toHaveBeenCalledWith({ season: 'Monsoon' });
  });

  it('auto-shows a prefilled free-text input when the stored value is not an option', () => {
    const fields: FormFieldSpec[] = [
      { kind: 'hybrid', key: 'season', label: 'Season', optionSetId: 'seasons' },
    ];
    renderFields(fields, { season: 'Custom thing' });
    const free = screen.getByRole('textbox') as HTMLInputElement;
    expect(free.value).toBe('Custom thing');
  });
});

describe('VisionFormFields -- repeatable', () => {
  const repeatableSpec: FormFieldSpec[] = [
    {
      kind: 'repeatable',
      key: 'criteria',
      label: 'Success criterion',
      min: 1,
      max: 3,
      addLabel: 'Add criterion',
      itemLabel: 'Criterion',
      item: { kind: 'text' },
    },
  ];

  it('renders one row per entry; Add appends an empty entry', () => {
    const { onChange } = renderFields(repeatableSpec, { criteria: ['a', 'b'] });
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Add criterion' }));
    expect(onChange).toHaveBeenCalledWith({ criteria: ['a', 'b', ''] });
  });

  it('disables Add when the array is at max', () => {
    renderFields(repeatableSpec, { criteria: ['a', 'b', 'c'] });
    const add = screen.getByRole('button', { name: 'Add criterion' }) as HTMLButtonElement;
    expect(add.disabled).toBe(true);
  });

  it('Remove drops that entry', () => {
    const { onChange } = renderFields(repeatableSpec, { criteria: ['a', 'b'] });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Criterion 1' }));
    expect(onChange).toHaveBeenCalledWith({ criteria: ['b'] });
  });

  it('tracks hybrid free-mode per row independently', () => {
    const fields: FormFieldSpec[] = [
      {
        kind: 'repeatable',
        key: 'skills',
        label: 'Skills',
        min: 2,
        max: 4,
        item: { kind: 'hybrid', optionSetId: 'skills' },
      },
    ];
    // Row 0 holds a free string (auto free-mode); row 1 holds a real option.
    renderFields(fields, { skills: ['Custom skill', 'Alpha'] });
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(2);
    // Only row 0 shows a free-text input.
    const textInputs = screen.getAllByRole('textbox');
    expect(textInputs).toHaveLength(1);
    expect((textInputs[0] as HTMLInputElement).value).toBe('Custom skill');
  });
});

describe('initialFormValue', () => {
  it('seeds leaves to "" and repeatables to `min` empty strings', () => {
    const fields: FormFieldSpec[] = [
      { kind: 'text', key: 'purpose', label: 'Purpose' },
      { kind: 'hybrid', key: 'season', label: 'Season', optionSetId: 'seasons' },
      {
        kind: 'repeatable',
        key: 'criteria',
        label: 'Criterion',
        min: 3,
        max: 5,
        item: { kind: 'text' },
      },
    ];
    expect(initialFormValue(fields)).toEqual({
      purpose: '',
      season: '',
      criteria: ['', '', ''],
    });
  });
});

describe('summariseFormValue', () => {
  it('produces a readable summary and skips empty fields/entries', () => {
    const fields: FormFieldSpec[] = [
      { kind: 'text', key: 'purpose', label: 'Primary purpose' },
      { kind: 'text', key: 'notes', label: 'Notes' },
      {
        kind: 'repeatable',
        key: 'criteria',
        label: 'Success criterion',
        min: 1,
        max: 5,
        item: { kind: 'text' },
      },
    ];
    const value: FormValue = {
      purpose: 'grow food',
      notes: '',
      criteria: ['ten mm/hr', '', 'cover crop'],
    };
    const summary = summariseFormValue(fields, value);
    expect(summary).toContain('Primary purpose: grow food');
    expect(summary).toContain('Success criterion');
    expect(summary).toContain('ten mm/hr');
    expect(summary).toContain('cover crop');
    // Empty leaf omitted.
    expect(summary).not.toContain('Notes:');
  });
});

describe('isFormValueValid', () => {
  it('is false when a required text is empty', () => {
    const fields: FormFieldSpec[] = [
      { kind: 'text', key: 'purpose', label: 'Purpose', required: true },
    ];
    expect(isFormValueValid(fields, { purpose: '' })).toBe(false);
    expect(isFormValueValid(fields, { purpose: 'x' })).toBe(true);
  });

  it('is false when a repeatable has fewer than `min` non-empty entries', () => {
    const fields: FormFieldSpec[] = [
      {
        kind: 'repeatable',
        key: 'criteria',
        label: 'Criterion',
        min: 2,
        max: 5,
        item: { kind: 'text' },
      },
    ];
    expect(isFormValueValid(fields, { criteria: ['only one', ' '] })).toBe(false);
    expect(isFormValueValid(fields, { criteria: ['one', 'two'] })).toBe(true);
  });

  it('is true when all required leaves and repeatable minimums are satisfied', () => {
    const fields: FormFieldSpec[] = [
      { kind: 'text', key: 'purpose', label: 'Purpose', required: true },
      {
        kind: 'repeatable',
        key: 'criteria',
        label: 'Criterion',
        min: 1,
        max: 5,
        item: { kind: 'text' },
      },
    ];
    expect(
      isFormValueValid(fields, { purpose: 'x', criteria: ['a'] }),
    ).toBe(true);
  });
});

describe('missingRequirements (F11 -- names what blocks a save)', () => {
  const fields: FormFieldSpec[] = [
    { kind: 'text', key: 'purpose', label: 'Primary purpose', required: true },
    { kind: 'text', key: 'notes', label: 'Notes' },
    {
      kind: 'repeatable',
      key: 'criteria',
      label: 'Success criterion',
      min: 3,
      max: 5,
      item: { kind: 'text' },
    },
  ];

  it('lists each unmet required leaf and how many more repeatable entries are needed', () => {
    const missing = missingRequirements(fields, {
      purpose: '',
      notes: '',
      criteria: ['only one'],
    });
    expect(missing).toEqual([
      { label: 'Primary purpose' },
      { label: 'Success criterion', need: 2 },
    ]);
  });

  it('returns [] exactly when isFormValueValid is true (single source of truth)', () => {
    const value: FormValue = {
      purpose: 'grow food',
      notes: '',
      criteria: ['a', 'b', 'c'],
    };
    expect(missingRequirements(fields, value)).toEqual([]);
    expect(isFormValueValid(fields, value)).toBe(true);
  });

  it('omits an optional (non-required) empty leaf', () => {
    const missing = missingRequirements(
      [{ kind: 'text', key: 'notes', label: 'Notes' }],
      { notes: '' },
    );
    expect(missing).toEqual([]);
  });
});

describe('VisionFormFields -- required-field markers (F11)', () => {
  it('marks a required leaf control aria-required and renders an asterisk', () => {
    renderFields(
      [{ kind: 'text', key: 'purpose', label: 'Primary purpose', required: true }],
      { purpose: '' },
    );
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('aria-required')).toBe('true');
    // The visible asterisk sits in the label.
    expect(screen.getByText('*')).toBeTruthy();
  });

  it('does NOT mark an optional leaf required', () => {
    renderFields(
      [{ kind: 'text', key: 'notes', label: 'Notes' }],
      { notes: '' },
    );
    expect(screen.getByRole('textbox').getAttribute('aria-required')).toBeNull();
    expect(screen.queryByText('*')).toBeNull();
  });

  it('shows an "at least N" note on a repeatable whose min >= 1', () => {
    renderFields(
      [
        {
          kind: 'repeatable',
          key: 'criteria',
          label: 'Success criterion',
          min: 3,
          max: 5,
          item: { kind: 'text' },
        },
      ],
      { criteria: ['', '', ''] },
    );
    expect(screen.getByText(/at least 3/i)).toBeTruthy();
  });
});
