import { describe, expect, it } from 'vitest';
import {
  GUILD_PRESETS,
  resolveValidPresets,
  findGuildPreset,
} from '../guildPresets.js';
import { PLANT_DATABASE } from '../plantCatalog.js';

describe('guildPresets', () => {
  it('ships at least four starter presets', () => {
    expect(GUILD_PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it('every preset has a stable id, name, description, and anchor', () => {
    for (const preset of GUILD_PRESETS) {
      expect(preset.id).toMatch(/^gp-[a-z0-9-]+$/);
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
      expect(preset.anchorSpeciesId).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('every preset id is unique', () => {
    const ids = GUILD_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every anchor species resolves in PLANT_DATABASE', () => {
    const known = new Set(PLANT_DATABASE.map((p) => p.id));
    for (const preset of GUILD_PRESETS) {
      expect(known.has(preset.anchorSpeciesId)).toBe(true);
    }
  });

  it("every member's speciesId resolves and its layer matches the species' canonical layer", () => {
    const byId = new Map(PLANT_DATABASE.map((p) => [p.id, p]));
    for (const preset of GUILD_PRESETS) {
      for (const member of preset.members) {
        const species = byId.get(member.speciesId);
        expect(species, `${preset.id} member ${member.speciesId} not in DB`).toBeDefined();
        expect(species!.layer, `${preset.id} member ${member.speciesId} layer mismatch`).toBe(
          member.layer,
        );
      }
    }
  });

  it('resolveValidPresets returns every shipped preset when run against PLANT_DATABASE', () => {
    const resolved = resolveValidPresets(PLANT_DATABASE);
    expect(resolved.length).toBe(GUILD_PRESETS.length);
    for (const preset of resolved) {
      expect(preset.members.length).toBe(
        GUILD_PRESETS.find((p) => p.id === preset.id)!.members.length,
      );
    }
  });

  it('resolveValidPresets drops a preset whose anchor is missing', () => {
    const dbWithoutApple = PLANT_DATABASE.filter((p) => p.id !== 'apple');
    const resolved = resolveValidPresets(dbWithoutApple);
    expect(resolved.find((p) => p.anchorSpeciesId === 'apple')).toBeUndefined();
  });

  it('resolveValidPresets drops members whose speciesId is missing but keeps the preset', () => {
    const dbWithoutComfrey = PLANT_DATABASE.filter((p) => p.id !== 'comfrey');
    const resolved = resolveValidPresets(dbWithoutComfrey);
    const apple = resolved.find((p) => p.id === 'gp-apple-guild');
    expect(apple).toBeDefined();
    expect(apple!.members.find((m) => m.speciesId === 'comfrey')).toBeUndefined();
  });

  it('findGuildPreset returns a preset by id', () => {
    expect(findGuildPreset('gp-apple-guild')?.name).toContain('Apple');
    expect(findGuildPreset('gp-nonexistent')).toBeUndefined();
  });
});
