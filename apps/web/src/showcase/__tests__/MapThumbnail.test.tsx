// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MapThumbnail } from '../components/MapThumbnail';

vi.mock('../components/ShowcaseMap', () => ({ ShowcaseMap: () => <div data-testid="showcase-map-live" /> }));

describe('MapThumbnail', () => {
  it('renders <img> by default and hydrates ShowcaseMap on click', () => {
    render(
      <MapThumbnail
        sceneId="y2-current"
        alt="Year 2 — soils + watershed"
        mapProps={{ boundary: { type: 'MultiPolygon', coordinates: [] } as any, layers: [], features: [], activeLayerIds: [] }}
      />,
    );
    const img = screen.getByRole('button', { name: /Year 2/i });
    expect(img).toBeTruthy();
    fireEvent.click(img);
    expect(screen.getByTestId('showcase-map-live')).toBeTruthy();
  });
});
