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
import type { ActTool } from '../actToolCatalog.js';

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
});
