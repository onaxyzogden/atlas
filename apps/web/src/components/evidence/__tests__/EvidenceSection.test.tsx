/**
 * @vitest-environment happy-dom
 *
 * Phase E.3 — EvidenceSection unit tests.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import EvidenceSection from '../EvidenceSection.js';
import type { EvidenceItem } from '../../../lib/evidence/types.js';

const ITEM: EvidenceItem = {
  panelKey: 'land-verdict',
  summary: { label: 'Land verdict', value: 'Conditional Opportunity' },
  evidence: [
    {
      label: 'Overall score',
      value: 62,
      unit: '/100',
      source: { kind: 'computed', derivation: 'computeAssessmentScores', confidence: 'high' },
      methodologyHint: 'Aggregated weighted average across 7 sub-scores.',
    },
    {
      label: 'Soils layer',
      value: 'present',
      source: { kind: 'layer', layerType: 'soils', confidence: 'medium' },
    },
    {
      label: 'FAO/USDA fallback',
      value: 'Class III',
      source: { kind: 'rule', ruleId: 'classification.usda', confidence: 'low' },
    },
  ],
  details: {
    rawGeoJsonRef: 'layer:soils',
    rawSummaryRef: 'site_assessments.score_breakdown',
  },
};

describe('EvidenceSection', () => {
  afterEach(() => cleanup());

  it('renders nothing when compactMode is true (mobile guard)', () => {
    render(<EvidenceSection item={ITEM} compactMode={true} />);
    expect(screen.queryByTestId('evidence-section')).toBeNull();
  });

  it('renders nothing when item is null', () => {
    render(<EvidenceSection item={null} />);
    expect(screen.queryByTestId('evidence-section')).toBeNull();
  });

  it('renders the toggle with collapsed state by default', () => {
    render(<EvidenceSection item={ITEM} />);
    const toggle = screen.getByTestId('evidence-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toContain('Show evidence');
    expect(toggle.textContent).toContain('(3)');
    expect(screen.queryByTestId('evidence-body')).toBeNull();
  });

  it('expands the body on click and shows all fragments + source pills', () => {
    render(<EvidenceSection item={ITEM} />);
    fireEvent.click(screen.getByTestId('evidence-toggle'));

    const body = screen.getByTestId('evidence-body');
    expect(body).toBeTruthy();
    expect(screen.getAllByTestId('evidence-fragment').length).toBe(3);

    const pills = screen.getAllByTestId('evidence-source-pill');
    expect(pills.length).toBe(3);
    expect(pills.map((p) => p.textContent?.trim()[0])).toEqual(
      expect.arrayContaining(['c', 'l', 'r']),
    );

    // Methodology hint surfaced for the first fragment.
    const hints = screen.getAllByTestId('evidence-hint');
    expect(hints.length).toBe(1);
    expect(hints[0]!.textContent).toContain('weighted average');
  });

  it('confidence dots reflect the per-source confidence level', () => {
    render(<EvidenceSection item={ITEM} />);
    fireEvent.click(screen.getByTestId('evidence-toggle'));
    const dots = screen.getAllByTestId('evidence-confidence');
    // Three fragments → three confidence groups, with labels low/medium/high.
    const labels = dots.map((d) => d.getAttribute('aria-label'));
    expect(labels).toEqual(
      expect.arrayContaining([
        'confidence: high',
        'confidence: medium',
        'confidence: low',
      ]),
    );
  });

  it('ESC collapses the expanded body and the details link opens the drawer', () => {
    render(<EvidenceSection item={ITEM} />);
    const toggle = screen.getByTestId('evidence-toggle');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    // Details link is shown because item.details has refs.
    const detailsLink = screen.getByTestId('evidence-details-link');
    fireEvent.click(detailsLink);
    expect(screen.getByTestId('details-drawer')).toBeTruthy();

    // ESC inside the section collapses (drawer remains its own concern).
    fireEvent.keyDown(screen.getByTestId('evidence-section'), { key: 'Escape' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('hides the View details link when item.details is missing', () => {
    const noDetails: EvidenceItem = { ...ITEM, details: undefined };
    render(<EvidenceSection item={noDetails} />);
    fireEvent.click(screen.getByTestId('evidence-toggle'));
    expect(screen.queryByTestId('evidence-details-link')).toBeNull();
  });
});
