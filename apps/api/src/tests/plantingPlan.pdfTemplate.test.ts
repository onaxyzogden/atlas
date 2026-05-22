/**
 * PDF template tests for `renderPlantingPlan` (Phase B of the OSU-PDC
 * roadmap — Weeks 7–8 polyculture / guild design).
 *
 * The template embeds a client-captured MapLibre canvas image (base64 data
 * URL) and composes it with a legend and a species schedule merged client-side
 * from guilds + crop areas. The tests lock in: (1) the image renders inline;
 * (2) the schedule table shows species + source rows grouped by kind; (3) the
 * data-URL guard rejects non-image strings (HTML-injection safety); (4) the
 * not-available path when no capture is supplied.
 */

import { describe, it, expect } from 'vitest';
import { renderPlantingPlan } from '../services/pdf/templates/plantingPlan.js';
import type { ExportDataBag, ProjectRow } from '../services/pdf/templates/index.js';

// 1×1 transparent PNG.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function makeProject(): ProjectRow {
  return {
    id: 'proj-test',
    name: 'Test Farm',
    description: null,
    project_type: 'small_homestead',
    country: 'US',
    province_state: 'OR',
    address: null,
    parcel_id: null,
    acreage: 40,
    data_completeness_score: 80,
    owner_notes: null,
    zoning_notes: null,
    access_notes: null,
    water_rights_notes: null,
    climate_region: 'Willamette',
    bioregion: null,
    restrictions_covenants: null,
    created_at: '2026-05-01T00:00:00Z',
    updated_at: '2026-05-22T00:00:00Z',
  };
}

function makeBag(over: Partial<ExportDataBag>): ExportDataBag {
  return {
    project: makeProject(),
    assessment: null,
    layers: [],
    designFeatures: [],
    payload: undefined,
    generatedAt: '2026-05-22T00:00:00Z',
    ...over,
  };
}

describe('renderPlantingPlan', () => {
  it('embeds the captured map, legend, and a merged species schedule', () => {
    const html = renderPlantingPlan(
      makeBag({
        payload: {
          plantingPlan: {
            mapImages: [{ dataUrl: PNG, caption: 'Planting map', widthPx: 800, heightPx: 600 }],
            legend: [{ label: 'Food Production', color: '#6ba47a', kind: 'fill' }],
            schedule: [
              {
                species: 'Black walnut',
                latinName: 'Juglans nigra',
                layer: 'canopy',
                source: 'Apple guild',
                sourceKind: 'guild',
                count: 2,
                spacingM: 12,
              },
              {
                species: 'Apple',
                layer: 'canopy',
                source: 'North orchard',
                sourceKind: 'crop_area',
                areaM2: 2500,
              },
            ],
          },
        },
      }),
    );

    expect(html).toContain(`src="${PNG}"`);
    expect(html).toContain('Planting map'); // caption
    expect(html).toContain('Food Production'); // legend label
    expect(html).toContain('Black walnut'); // guild row
    expect(html).toContain('Juglans nigra'); // latin name
    expect(html).toContain('Apple guild'); // guild source
    expect(html).toContain('North orchard'); // crop-area source
    expect(html).toContain('Guilds'); // group header
    expect(html).toContain('Crop areas'); // group header
  });

  it('rejects a non-image dataUrl (no <img> injection)', () => {
    const html = renderPlantingPlan(
      makeBag({
        payload: {
          plantingPlan: {
            mapImages: [{ dataUrl: 'javascript:alert(1)' }],
            schedule: [],
          },
        },
      }),
    );
    expect(html).not.toContain('javascript:alert(1)');
    expect(html).not.toContain('<img src="javascript');
  });

  it('renders the not-available block when no map capture is supplied', () => {
    const html = renderPlantingPlan(makeBag({ payload: undefined }));
    expect(html).toContain('not-available');
    expect(html).toContain('Planting Plan');
  });
});
