/**
 * @vitest-environment happy-dom
 *
 * VisionFormsTabsModal -- the tabbed text-capture popup that replaces the
 * one-textarea VisionFormModal for Act tier-shell kind:'form' tools.
 *
 * Verified behaviours:
 *   1. One tab renders per form tool.
 *   2. The active tab shows its prompt + seeded initial value.
 *   3. Clicking another tab calls onTabChange with that tool's formId.
 *   4. Save is disabled for an empty active draft, enabled after typing.
 *   5. Typing + Save calls onSave(activeFormId, trimmedText) and does NOT close
 *      the popup (onClose not called).
 *   6. The Close button calls onClose.
 *
 * Icons are passed as stub components so no lucide-react import is needed; Modal
 * and Tabs have no lucide dependency. Pattern mirrors
 * asBuiltReconciliationCard.test.tsx (happy-dom + testing-library).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VisionFormsTabsModal from '../VisionFormsTabsModal.js';
import type { ActTool, FormFieldSpec, FormValue } from '../actToolCatalog.js';
import type { ProjectMetadata } from '@ogden/shared';

const StubIcon = () => null;

function mkFormTool(formId: string, label: string, prompt: string): ActTool {
  return {
    id: formId,
    label,
    icon: StubIcon as unknown as ActTool['icon'],
    category: 'vision',
    arm: { kind: 'form', formId, prompt },
  };
}

function mkFieldsTool(
  formId: string,
  label: string,
  prompt: string,
  fields: readonly FormFieldSpec[],
): ActTool {
  return {
    id: formId,
    label,
    icon: StubIcon as unknown as ActTool['icon'],
    category: 'vision',
    arm: { kind: 'form', formId, prompt, fields },
  };
}

const TOOLS: ActTool[] = [
  mkFormTool('s1-vision-c1', 'Primary purpose', 'State the primary purpose'),
  mkFormTool('s1-vision-c2', 'Success criteria', 'Define success criteria'),
  mkFormTool('s1-vision-c3', 'Capital budget', 'Inventory available capital'),
];

function renderModal(overrides: Partial<React.ComponentProps<typeof VisionFormsTabsModal>> = {}) {
  const props = {
    open: true,
    title: 'Vision & Setup',
    tools: TOOLS,
    activeFormId: 's1-vision-c1',
    initialValues: {} as Record<string, string>,
    projectId: 'test-project',
    metadata: null,
    // Empty checklist -> no tab resolves as a prefilled recap, so these tests
    // exercise the textarea capture path (the recap path is covered in preview).
    checklistItems: [] as React.ComponentProps<typeof VisionFormsTabsModal>['checklistItems'],
    onTabChange: vi.fn(),
    onSave: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<VisionFormsTabsModal {...props} />);
  return props;
}

describe('VisionFormsTabsModal', () => {
  it('renders one tab per form tool', () => {
    renderModal();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(screen.getByText('Primary purpose')).toBeTruthy();
    expect(screen.getByText('Success criteria')).toBeTruthy();
    expect(screen.getByText('Capital budget')).toBeTruthy();
  });

  it('shows the active tab prompt and seeded initial value', () => {
    renderModal({ initialValues: { 's1-vision-c1': 'grow food for the village' } });
    expect(screen.getByText('State the primary purpose')).toBeTruthy();
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('grow food for the village');
  });

  it('calls onTabChange when another tab is clicked', () => {
    const props = renderModal();
    fireEvent.click(screen.getByText('Capital budget'));
    expect(props.onTabChange).toHaveBeenCalledWith('s1-vision-c3');
  });

  it('disables Save for an empty draft and enables it after typing', () => {
    renderModal();
    const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(save.disabled).toBe(false);
  });

  it('Save calls onSave with the active formId + trimmed text and keeps the popup open', () => {
    const props = renderModal();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  hello  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(props.onSave).toHaveBeenCalledWith('s1-vision-c1', 'hello');
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('Close calls onClose', () => {
    const props = renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('back-compat: a fields-less tool still renders a textarea and Save calls onSave', () => {
    const props = renderModal({ activeFormId: 's1-vision-c1' });
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.tagName).toBe('TEXTAREA');
    fireEvent.change(textarea, { target: { value: 'plain text answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(props.onSave).toHaveBeenCalledWith('s1-vision-c1', 'plain text answer');
  });
});

// ---------------------------------------------------------------------------
// SF5 -- structured fields (VisionFormFields engine) rendering path.
// ---------------------------------------------------------------------------

const SUCCESS_FIELDS: readonly FormFieldSpec[] = [
  {
    kind: 'repeatable',
    key: 'criteria',
    label: 'Success criterion',
    min: 3,
    max: 5,
    addLabel: 'Add criterion',
    itemLabel: 'Criterion',
    item: {
      kind: 'hybrid',
      optionSetId: 'successCriteriaByType',
      placeholder: 'Pick or type',
    },
  },
];

const PURPOSE_FIELDS: readonly FormFieldSpec[] = [
  {
    kind: 'text',
    key: 'purpose',
    label: 'Primary purpose',
    required: true,
    multiline: true,
    placeholder: 'Describe the purpose',
  },
];

function renderFieldsModal(
  overrides: Partial<React.ComponentProps<typeof VisionFormsTabsModal>> = {},
) {
  const fieldsTool = mkFieldsTool(
    's1-vision-c2',
    'Success criteria',
    'Define success criteria',
    SUCCESS_FIELDS,
  );
  const props = {
    open: true,
    title: 'Vision & Setup',
    tools: [
      mkFormTool('s1-vision-c1', 'Primary purpose', 'State the primary purpose'),
      fieldsTool,
    ] as ActTool[],
    activeFormId: 's1-vision-c2',
    initialValues: {} as Record<string, string>,
    initialData: {} as Record<string, FormValue>,
    projectId: 'test-project',
    metadata: {
      projectTypeRecord: { primaryTypeId: 'homestead', secondaryTypeIds: [] },
    } as unknown as ProjectMetadata,
    checklistItems: [] as React.ComponentProps<
      typeof VisionFormsTabsModal
    >['checklistItems'],
    onTabChange: vi.fn(),
    onSave: vi.fn(),
    onSaveData: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<VisionFormsTabsModal {...props} />);
  return props;
}

describe('VisionFormsTabsModal -- structured fields', () => {
  it('renders the structured engine (Add button) for a fields tool, not a textarea', () => {
    renderFieldsModal();
    // The repeatable Add button is present...
    expect(screen.getByRole('button', { name: 'Add criterion' })).toBeTruthy();
    // ...and no raw multi-line textarea capture for the structured tab.
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('resolves options from metadata.projectTypeRecord via the real resolveFieldOptions', () => {
    renderFieldsModal();
    // successCriteriaByType._base includes this exact string (one <option> per
    // repeatable row -> assert at least one is present).
    expect(screen.getAllByText('Baseline conditions recorded').length).toBeGreaterThan(0);
  });

  it('disables Save below min (3) entries', () => {
    renderFieldsModal({
      initialData: { 's1-vision-c2': { criteria: ['Alpha', 'Beta'] } },
    });
    const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('enables Save when min (3) entries are filled', () => {
    renderFieldsModal({
      initialData: { 's1-vision-c2': { criteria: ['Alpha', 'Beta', 'Gamma'] } },
    });
    const save = screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;
    expect(save.disabled).toBe(false);
  });

  it('Save on a valid fields tool calls onSaveData(formId, value, summary) and not onClose', () => {
    const props = renderFieldsModal({
      initialData: { 's1-vision-c2': { criteria: ['Alpha', 'Beta', 'Gamma'] } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const onSaveData = props.onSaveData as ReturnType<typeof vi.fn>;
    expect(onSaveData).toHaveBeenCalledTimes(1);
    const call = onSaveData.mock.calls[0] ?? [];
    const [formId, value, summary] = call as [string, FormValue, string];
    expect(formId).toBe('s1-vision-c2');
    expect(value).toBeTruthy();
    expect(typeof summary).toBe('string');
    expect(summary.length).toBeGreaterThan(0);
    expect(props.onClose).not.toHaveBeenCalled();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('recap precedence: the structured engine supersedes the answerSpec recap', () => {
    const fieldsTool = mkFieldsTool(
      's1-vision-c2',
      'Success criteria',
      'Define success criteria',
      SUCCESS_FIELDS,
    );
    renderFieldsModal({
      tools: [fieldsTool],
      activeFormId: 's1-vision-c2',
      checklistItems: [
        {
          id: 's1-vision-c2',
          label: 'Success criteria',
          answerSpec: {
            fieldType: 'multi_select',
            sourceField: 'visionProfile.primaryOutcomes',
            optionSetId: 'successCriteriaByType',
            editRoute: 'vision',
          },
        },
      ] as unknown as React.ComponentProps<
        typeof VisionFormsTabsModal
      >['checklistItems'],
      metadata: {
        projectTypeRecord: { primaryTypeId: 'homestead', secondaryTypeIds: [] },
        visionProfile: { primaryOutcomes: ['some-outcome'] },
      } as unknown as ProjectMetadata,
    });
    // Structured engine renders...
    expect(screen.getByRole('button', { name: 'Add criterion' })).toBeTruthy();
    // ...and the read-only recap hint is suppressed.
    expect(
      screen.queryByText('Answered in Plan - edit there to change'),
    ).toBeNull();
  });

  it('rehydrates initialData values into the form controls', () => {
    renderFieldsModal({
      initialData: {
        's1-vision-c2': { criteria: ['Alpha', 'Beta', 'Gamma'] },
      },
    });
    // 'Alpha'/'Beta'/'Gamma' are not resolved options, so each hybrid row drops
    // into free-text mode (select shows the __free__ sentinel) and the stored
    // value renders in the revealed free-text <input>.
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects.every((s) => s.value === '__free__')).toBe(true);
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    const values = inputs.map((i) => i.value);
    expect(values).toContain('Alpha');
    expect(values).toContain('Beta');
    expect(values).toContain('Gamma');
  });

  it('pre-seeds a single text leaf from a resolved answerSpec when initialData is absent', () => {
    const purposeTool = mkFieldsTool(
      's1-vision-c1',
      'Primary purpose',
      'State the primary purpose',
      PURPOSE_FIELDS,
    );
    renderFieldsModal({
      tools: [purposeTool],
      activeFormId: 's1-vision-c1',
      initialData: {},
      checklistItems: [
        {
          id: 's1-vision-c1',
          label: 'Primary purpose',
          answerSpec: {
            fieldType: 'single_select',
            sourceField: 'projectTypeRecord.primaryTypeId',
            optionSetId: 'projectPrimaryType',
            editRoute: 'vision',
          },
        },
      ] as unknown as React.ComponentProps<
        typeof VisionFormsTabsModal
      >['checklistItems'],
      metadata: {
        projectTypeRecord: { primaryTypeId: 'homestead', secondaryTypeIds: [] },
      } as unknown as ProjectMetadata,
    });
    // The single text leaf is pre-seeded from the resolved label (non-empty).
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value.trim().length).toBeGreaterThan(0);
  });
});
