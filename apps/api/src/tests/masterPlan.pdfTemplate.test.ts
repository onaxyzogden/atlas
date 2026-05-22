/**
 * PDF template tests for the captured-map exports: `renderMasterPlan`,
 * `renderBaseMapSheet`, `renderZoneMapSheet` (Phase A of the OSU-PDC
 * master-plan roadmap).
 *
 * These templates embed a client-captured MapLibre canvas image (base64
 * data URL) and compose it with a legend, a zone roster, and a feature
 * inventory. The tests lock in: (1) the image is rendered inline; (2) the
 * data-URL guard rejects non-image strings (HTML-injection safety);
 * (3) the zone roster falls back to deriving from designFeatures when no
 * client roster is supplied; (4) the not-available path when no capture.
 */

import { describe, it, expect } from 'vitest';
import { renderMasterPlan } from '../services/pdf/templates/masterPlan.js';
import { renderBaseMapSheet, renderZoneMapSheet } from '../services/pdf/templates/mapSheet.js';
import type {
  ExportDataBag,
  ProjectRow,
  DesignFeatureRow,
} from '../services/pdf/templates/index.js';

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
    updated_at: '2026-05-21T00:00:00Z',
  };
}

function makeFeature(over: Partial<DesignFeatureRow>): DesignFeatureRow {
  return {
    id: 'f1',
    feature_type: 'zone',
    subtype: null,
    label: null,
    properties: {},
    phase_tag: null,
    geometry_json: '{"type":"Polygon","coordinates":[]}',
    sort_order: 0,
    ...over,
  };
}

function makeBag(over: Partial<ExportDataBag>): ExportDataBag {
  return {
    project: makeProject(),
    assessment: null,
    layers: [],
    designFeatures: [],
    payload: undefined,
    generatedAt: '2026-05-21T00:00:00Z',
    ...over,
  };
}

describe('renderMasterPlan', () => {
  it('embeds the captured map image, legend, and client zone roster', () => {
    const html = renderMasterPlan(
      makeBag({
        payload: {
          mapSheet: {
            mapImages: [{ dataUrl: PNG, caption: 'Design map', widthPx: 800, heightPx: 600 }],
            legend: [{ label: 'Habitation', color: '#abc123', kind: 'fill' }],
            zones: [
              {
                id: 'z1',
                name: 'Homestead Core',
                category: 'habitation',
                primaryUse: 'Dwelling',
                areaM2: 5000,
                permacultureZone: 1,
                phaseTag: 'Phase 1',
              },
            ],
          },
        },
      }),
    );

    expect(html).toContain(`src="${PNG}"`);
    expect(html).toContain('Design map'); // caption
    expect(html).toContain('Habitation'); // legend label
    expect(html).toContain('#abc123'); // legend swatch color
    expect(html).toContain('Homestead Core'); // zone roster
    expect(html).toContain('Z1'); // permaculture zone
    expect(html).toContain('Phase 1'); // phase badge
  });

  it('derives the zone roster from designFeatures when no client roster is given', () => {
    const html = renderMasterPlan(
      makeBag({
        designFeatures: [
          makeFeature({
            id: 'z9',
            feature_type: 'zone',
            label: 'Derived Orchard',
            subtype: 'food_production',
            properties: { areaM2: 12000, permacultureZone: 2, primaryUse: 'Fruit trees' },
            phase_tag: 'Phase 2',
          }),
          makeFeature({ id: 's1', feature_type: 'structure', label: 'Barn' }),
        ],
        payload: { mapSheet: { mapImages: [{ dataUrl: PNG }] } },
      }),
    );

    expect(html).toContain('Derived Orchard');
    expect(html).toContain('Fruit trees');
    expect(html).toContain('Z2');
    // Feature inventory counts the non-zone structure feature too.
    expect(html).toContain('Structure');
  });

  it('rejects a non-image dataUrl (no <img> injection)', () => {
    const html = renderMasterPlan(
      makeBag({
        payload: {
          mapSheet: {
            mapImages: [{ dataUrl: 'javascript:alert(1)' }],
          },
        },
      }),
    );
    expect(html).not.toContain('javascript:alert(1)');
    expect(html).not.toContain('<img src="javascript');
  });

  it('renders the not-available block when no map capture is supplied', () => {
    const html = renderMasterPlan(makeBag({ payload: undefined }));
    expect(html).toContain('not-available');
    expect(html).toContain('Export master plan');
  });
});

describe('renderBaseMapSheet / renderZoneMapSheet', () => {
  it('base map sheet embeds the image under the Base Map title', () => {
    const html = renderBaseMapSheet(
      makeBag({ payload: { mapSheet: { mapImages: [{ dataUrl: PNG }] } } }),
    );
    expect(html).toContain(`src="${PNG}"`);
    expect(html).toContain('Base Map');
  });

  it('zone map sheet embeds the image under the Zone Map title', () => {
    const html = renderZoneMapSheet(
      makeBag({ payload: { mapSheet: { mapImages: [{ dataUrl: PNG }] } } }),
    );
    expect(html).toContain(`src="${PNG}"`);
    expect(html).toContain('Zone Map');
  });

  it('falls back to not-available without a capture', () => {
    const html = renderZoneMapSheet(makeBag({ payload: undefined }));
    expect(html).toContain('not-available');
  });
});
