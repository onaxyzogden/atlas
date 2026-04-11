/**
 * enterpriseDetector.ts — tests for enterprise type detection and unit counting.
 */

import { describe, it, expect } from 'vitest';
import { detectEnterprises, countEnterpriseUnits } from '../../features/financial/engine/enterpriseDetector.js';
import { emptyInput, regenerativeFarmScenario, retreatCenterScenario } from '../helpers/mockFinancialInput.js';

describe('detectEnterprises', () => {
  it('returns empty array for empty inputs', () => {
    const input = emptyInput();
    const result = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    expect(result).toEqual([]);
  });

  it('detects livestock when paddocks have species', () => {
    const input = emptyInput();
    input.paddocks = [{ id: 'pd1', projectId: 'p1', name: 'Paddock', areaM2: 10000, fencing: 'electric', species: ['cattle'], phase: 'Phase 1' }];
    const result = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    expect(result).toContain('livestock');
  });

  it('does NOT detect livestock for paddocks without species', () => {
    const input = emptyInput();
    input.paddocks = [{ id: 'pd1', projectId: 'p1', name: 'Empty Paddock', areaM2: 10000, fencing: 'electric', species: [], phase: 'Phase 1' }];
    const result = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    expect(result).not.toContain('livestock');
  });

  it('detects orchard from orchard and food_forest crops', () => {
    const input = emptyInput();
    input.crops = [{ id: 'c1', projectId: 'p1', name: 'Orchard', type: 'orchard', areaM2: 5000, phase: 'Phase 1' }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).toContain('orchard');

    input.crops = [{ id: 'c1', projectId: 'p1', name: 'Food Forest', type: 'food_forest', areaM2: 5000, phase: 'Phase 1' }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).toContain('orchard');
  });

  it('detects market_garden from market_garden, garden_bed, or row_crop', () => {
    for (const type of ['market_garden', 'garden_bed', 'row_crop'] as const) {
      const input = emptyInput();
      input.crops = [{ id: 'c1', projectId: 'p1', name: 'Garden', type, areaM2: 3000, phase: 'Phase 1' }];
      expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).toContain('market_garden');
    }
  });

  it('detects retreat when retreat zone + guest structure present', () => {
    const input = emptyInput();
    input.zones = [{ id: 'z1', projectId: 'p1', name: 'Retreat', category: 'retreat', areaM2: 10000 }];
    input.structures = [{ id: 's1', projectId: 'p1', name: 'Cabin', type: 'cabin', phase: 'Phase 1' }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).toContain('retreat');
  });

  it('does NOT detect retreat without guest structure', () => {
    const input = emptyInput();
    input.zones = [{ id: 'z1', projectId: 'p1', name: 'Retreat', category: 'retreat', areaM2: 10000 }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).not.toContain('retreat');
  });

  it('detects education when education zone + classroom', () => {
    const input = emptyInput();
    input.zones = [{ id: 'z1', projectId: 'p1', name: 'Ed', category: 'education', areaM2: 3000 }];
    input.structures = [{ id: 's1', projectId: 'p1', name: 'Classroom', type: 'classroom', phase: 'Phase 1' }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).toContain('education');
  });

  it('detects agritourism when commons zone + gathering structure', () => {
    const input = emptyInput();
    input.zones = [{ id: 'z1', projectId: 'p1', name: 'Commons', category: 'commons', areaM2: 8000 }];
    input.structures = [{ id: 's1', projectId: 'p1', name: 'Pavilion', type: 'pavilion', phase: 'Phase 1' }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).toContain('agritourism');
  });

  it('detects carbon when conservation zone > 5 acres', () => {
    const input = emptyInput();
    // 5 acres = 5 * 4047 = 20235 m²
    input.zones = [{ id: 'z1', projectId: 'p1', name: 'Conservation', category: 'conservation', areaM2: 25000 }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).toContain('carbon');
  });

  it('does NOT detect carbon for small conservation zones', () => {
    const input = emptyInput();
    input.zones = [{ id: 'z1', projectId: 'p1', name: 'Small Conservation', category: 'conservation', areaM2: 10000 }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).not.toContain('carbon');
  });

  it('detects grants when agri or conservation zones present', () => {
    const input = emptyInput();
    input.zones = [{ id: 'z1', projectId: 'p1', name: 'Food', category: 'food_production', areaM2: 5000 }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).toContain('grants');
  });

  it('detects grants when paddocks present even without agri zones', () => {
    const input = emptyInput();
    input.paddocks = [{ id: 'pd1', projectId: 'p1', name: 'P', areaM2: 5000, fencing: 'none', species: [], phase: '' }];
    expect(detectEnterprises(input.zones, input.structures, input.paddocks, input.crops)).toContain('grants');
  });

  it('detects all enterprises in a full regen farm scenario', () => {
    const input = regenerativeFarmScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    expect(enterprises).toContain('livestock');
    expect(enterprises).toContain('orchard');
    expect(enterprises).toContain('market_garden');
    expect(enterprises).toContain('carbon');
    expect(enterprises).toContain('grants');
  });

  it('detects retreat/education/agritourism in retreat center scenario', () => {
    const input = retreatCenterScenario();
    const enterprises = detectEnterprises(input.zones, input.structures, input.paddocks, input.crops);
    expect(enterprises).toContain('retreat');
    expect(enterprises).toContain('education');
    expect(enterprises).toContain('agritourism');
    expect(enterprises).toContain('carbon');
  });
});

describe('countEnterpriseUnits', () => {
  it('counts livestock as total paddock hectares', () => {
    const input = regenerativeFarmScenario();
    const units = countEnterpriseUnits('livestock', input);
    // 20000 + 20000 = 40000 m² / 10000 = 4 hectares
    expect(units).toBeCloseTo(4, 1);
  });

  it('counts orchard as total crop acres', () => {
    const input = regenerativeFarmScenario();
    const units = countEnterpriseUnits('orchard', input);
    // 8000 m² / 4047 ≈ 1.98 acres
    expect(units).toBeCloseTo(1.98, 1);
  });

  it('counts market_garden as total crop acres', () => {
    const input = regenerativeFarmScenario();
    const units = countEnterpriseUnits('market_garden', input);
    // 4000 m² / 4047 ≈ 0.99 acres
    expect(units).toBeCloseTo(0.99, 1);
  });

  it('counts retreat as number of guest structures', () => {
    const input = retreatCenterScenario();
    const units = countEnterpriseUnits('retreat', input);
    expect(units).toBe(3); // 3 cabins
  });

  it('counts education as number of classrooms', () => {
    const input = retreatCenterScenario();
    expect(countEnterpriseUnits('education', input)).toBe(1);
  });

  it('counts agritourism as number of gathering structures', () => {
    const input = retreatCenterScenario();
    // pavilion + fire_circle = 2
    expect(countEnterpriseUnits('agritourism', input)).toBe(2);
  });

  it('counts carbon as conservation acres', () => {
    const input = retreatCenterScenario();
    // 25000 m² / 4047 ≈ 6.18 acres
    expect(countEnterpriseUnits('carbon', input)).toBeCloseTo(6.18, 1);
  });

  it('counts grants as 1 per project', () => {
    const input = regenerativeFarmScenario();
    expect(countEnterpriseUnits('grants', input)).toBe(1);
  });

  it('returns 0 for empty input', () => {
    const input = emptyInput();
    expect(countEnterpriseUnits('livestock', input)).toBe(0);
  });
});
