// seededProtocols.conformance.test.ts
//
// Guards seeded-protocol-ID validity. A seeded map (universal + each primary
// type) points objective ids at protocol ids; if an id is mistyped it resolves
// to nothing and the pill silently vanishes in the running app — no error, no
// test failure, until now. This suite proves every seeded id actually resolves
// in the protocol set its projects see:
//
//   1. UNIVERSAL_SEEDED_PROTOCOLS — every id exists in UNIVERSAL_PROTOCOL_TEMPLATES
//      (the universal pool is resolved for EVERY project).
//   2. Each entry of PRIMARY_MAPS — every id resolves against
//      resolveProjectProtocols({ primaryTypeId }), i.e. universal + that type's
//      own catalogue, exactly the set useProtocolLibrary resolves at runtime.
//
// PRIMARY_MAPS is iterated directly, so a type added to the resolver is
// automatically covered here. NOTE: this catches a wrong PROTOCOL id, not a
// wrong OBJECTIVE key (an unknown key simply seeds nothing) — objective ids are
// verified against the plan catalogue at authoring time.

import { describe, it, expect } from 'vitest';
import { UNIVERSAL_SEEDED_PROTOCOLS } from '../universal.js';
import { PRIMARY_MAPS, SECONDARY_MAPS } from '../index.js';
import { UNIVERSAL_PROTOCOL_TEMPLATES } from '../../../constants/protocol/catalogues/universal.js';
import { getSecondaryProtocolCatalogue } from '../../../constants/protocol/catalogues/index.js';
import { resolveProjectProtocols } from '../../resolveProjectProtocols.js';
import type { ProjectTypeId } from '../../../schemas/plan/projectTypeTaxonomy.schema.js';
import type { SeededProtocolMap } from '../types.js';

/** Flatten a seeded map into (objectiveId, protocolId) pairs for granular asserts. */
function pairs(map: SeededProtocolMap): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [objectiveId, protocolIds] of Object.entries(map)) {
    for (const protocolId of protocolIds ?? []) out.push([objectiveId, protocolId]);
  }
  return out;
}

describe('seeded protocol ID conformance', () => {
  it('every universal seeded id resolves in UNIVERSAL_PROTOCOL_TEMPLATES', () => {
    const valid = new Set(UNIVERSAL_PROTOCOL_TEMPLATES.map((p) => p.id));
    for (const [objectiveId, protocolId] of pairs(UNIVERSAL_SEEDED_PROTOCOLS)) {
      expect(
        valid.has(protocolId),
        `universal seeded protocol "${protocolId}" (objective "${objectiveId}") does not resolve in UNIVERSAL_PROTOCOL_TEMPLATES`,
      ).toBe(true);
    }
  });

  for (const [typeId, map] of Object.entries(PRIMARY_MAPS) as Array<
    [ProjectTypeId, SeededProtocolMap]
  >) {
    it(`every seeded id for "${typeId}" resolves in its project protocol set`, () => {
      const resolved = resolveProjectProtocols({ primaryTypeId: typeId });
      const valid = new Set(resolved.protocols.map((p) => p.id));
      for (const [objectiveId, protocolId] of pairs(map)) {
        expect(
          valid.has(protocolId),
          `"${typeId}" seeded protocol "${protocolId}" (objective "${objectiveId}") does not resolve in resolveProjectProtocols`,
        ).toBe(true);
      }
    });
  }

  // A SECONDARY-keyed map (e.g. nursery's nur-sec-* objectives) is host-agnostic:
  // its objectives appear whenever the type is layered onto ANY compatible host.
  // The protocols guaranteed present for every such host are the universal pool
  // plus that secondary's own additive catalogue (its primary protocols load only
  // when the type is the PRIMARY). So the valid set here is universal ∪ additive —
  // a strict subset of any concrete host's resolved set (universal ∪ hostPrimary ∪
  // additive), so passing guarantees the pill resolves on every compatible host.
  const universalIds = UNIVERSAL_PROTOCOL_TEMPLATES.map((p) => p.id);
  for (const [typeId, map] of Object.entries(SECONDARY_MAPS) as Array<
    [ProjectTypeId, SeededProtocolMap]
  >) {
    it(`every seeded id for secondary "${typeId}" resolves when layered`, () => {
      const additive = getSecondaryProtocolCatalogue(typeId)?.additive ?? [];
      const valid = new Set([...universalIds, ...additive.map((p) => p.id)]);
      for (const [objectiveId, protocolId] of pairs(map)) {
        expect(
          valid.has(protocolId),
          `secondary "${typeId}" seeded protocol "${protocolId}" (objective "${objectiveId}") resolves in neither the universal pool nor the "${typeId}" additive catalogue`,
        ).toBe(true);
      }
    });
  }
});
