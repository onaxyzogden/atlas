// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttributionFooter, APRICOT_LANE_ATTRIBUTION } from '../components/AttributionFooter';

describe('AttributionFooter', () => {
  it('renders the verbatim Apricot Lane attribution', () => {
    render(<AttributionFooter />);
    expect(screen.getByText(APRICOT_LANE_ATTRIBUTION)).toBeTruthy();
  });
  it('pins the exact attribution string (drift guard)', () => {
    expect(APRICOT_LANE_ATTRIBUTION).toBe(
      'Inspired by farms like Apricot Lane Farms and the rehabilitation arc shown in The Biggest Little Farm; Three Streams Farm is a fictional Ontario operation.'
    );
  });
});
