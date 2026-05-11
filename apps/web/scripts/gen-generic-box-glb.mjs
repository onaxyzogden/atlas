#!/usr/bin/env node
/**
 * gen-generic-box-glb.mjs
 *
 * Hand-encodes a unit cube GLB used as the procedural fallback asset for
 * the Plan-stage GLB renderer (`DesignElementScenegraphLayer`, deck.gl).
 * Every kind in `elementHeights.ts` resolves to this model until per-kind
 * authored GLBs land under `public/models/structures/<kind>.glb`.
 *
 * Geometry:
 *   - 24 vertices (4 per face × 6 faces) for proper flat-shaded normals.
 *   - X/Z in [-0.5, 0.5], Y in [0, 1] — anchored at its base on ground.
 *   - 36 indices (2 triangles × 6 faces).
 *
 * Material: PBR metallic-roughness, neutral grey, double-sided so back
 * faces don't disappear when scaled negatively or viewed from inside.
 *
 * Output: apps/web/public/models/structures/_generic_box.glb (~1 KB).
 *
 * No external dependencies. Idempotent — re-running produces a
 * byte-identical file (modulo the comment header in this script).
 *
 * Spec reference: glTF 2.0 binary container (GLB) —
 *   https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#binary-gltf-layout
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(
  __dirname,
  '..',
  'public',
  'models',
  'structures',
  '_generic_box.glb',
);

// ---------------------------------------------------------------------------
// Geometry — 24 unique vertices so each face has its own flat normal.
// Face order: +X, -X, +Y, -Y, +Z, -Z.
// ---------------------------------------------------------------------------

const positions = new Float32Array([
  // +X face (right)
  0.5, 0.0, -0.5,   0.5, 1.0, -0.5,   0.5, 1.0, 0.5,   0.5, 0.0, 0.5,
  // -X face (left)
  -0.5, 0.0, 0.5,  -0.5, 1.0, 0.5,  -0.5, 1.0, -0.5, -0.5, 0.0, -0.5,
  // +Y face (top)
  -0.5, 1.0, -0.5,  -0.5, 1.0, 0.5,   0.5, 1.0, 0.5,   0.5, 1.0, -0.5,
  // -Y face (bottom)
  -0.5, 0.0, 0.5,  -0.5, 0.0, -0.5,   0.5, 0.0, -0.5,  0.5, 0.0, 0.5,
  // +Z face (front)
  -0.5, 0.0, 0.5,   0.5, 0.0, 0.5,    0.5, 1.0, 0.5,  -0.5, 1.0, 0.5,
  // -Z face (back)
  0.5, 0.0, -0.5,  -0.5, 0.0, -0.5,  -0.5, 1.0, -0.5,  0.5, 1.0, -0.5,
]);

const normals = new Float32Array([
  1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
  -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
  0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
  0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
  0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
  0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
]);

const indices = new Uint16Array([
  0, 1, 2,    0, 2, 3,
  4, 5, 6,    4, 6, 7,
  8, 9, 10,   8, 10, 11,
  12, 13, 14, 12, 14, 15,
  16, 17, 18, 16, 18, 19,
  20, 21, 22, 20, 22, 23,
]);

// Pack into a single binary buffer with 4-byte alignment between sections
// (glTF requires accessor offsets to be aligned to their componentType size,
//  and uint16 indices need 2-byte alignment which is satisfied automatically).
const positionsBytes = positions.byteLength; // 288
const normalsBytes = normals.byteLength;     // 288
const indicesBytes = indices.byteLength;     // 72

const positionsOffset = 0;
const normalsOffset = positionsBytes;
const indicesOffset = normalsBytes + positionsOffset + positionsBytes - positionsOffset;
// Simpler: indices come right after normals; positions/normals are float32 (4-byte aligned).
const indicesOffsetActual = positionsBytes + normalsBytes;

const totalBinUnaligned = positionsBytes + normalsBytes + indicesBytes;
const binPadding = (4 - (totalBinUnaligned % 4)) % 4;
const totalBin = totalBinUnaligned + binPadding;

const bin = new Uint8Array(totalBin);
bin.set(new Uint8Array(positions.buffer), positionsOffset);
bin.set(new Uint8Array(normals.buffer), positionsBytes);
bin.set(new Uint8Array(indices.buffer), indicesOffsetActual);
// Trailing pad bytes are already zero.

// ---------------------------------------------------------------------------
// Compute bounds for the position accessor (required by spec for POSITION).
// ---------------------------------------------------------------------------
const posMin = [Infinity, Infinity, Infinity];
const posMax = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < positions.length; i += 3) {
  for (let k = 0; k < 3; k++) {
    const v = positions[i + k];
    if (v < posMin[k]) posMin[k] = v;
    if (v > posMax[k]) posMax[k] = v;
  }
}

// ---------------------------------------------------------------------------
// glTF JSON
// ---------------------------------------------------------------------------
const gltf = {
  asset: {
    version: '2.0',
    generator: 'atlas/apps/web/scripts/gen-generic-box-glb.mjs',
  },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0, name: 'GenericBox' }],
  meshes: [
    {
      name: 'GenericBox',
      primitives: [
        {
          attributes: { POSITION: 0, NORMAL: 1 },
          indices: 2,
          material: 0,
          mode: 4, // TRIANGLES
        },
      ],
    },
  ],
  materials: [
    {
      name: 'GenericGrey',
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: [0.6, 0.6, 0.6, 1.0],
        metallicFactor: 0.0,
        roughnessFactor: 0.85,
      },
    },
  ],
  buffers: [{ byteLength: totalBin }],
  bufferViews: [
    { buffer: 0, byteOffset: positionsOffset, byteLength: positionsBytes, target: 34962 }, // ARRAY_BUFFER
    { buffer: 0, byteOffset: positionsBytes, byteLength: normalsBytes, target: 34962 },
    { buffer: 0, byteOffset: indicesOffsetActual, byteLength: indicesBytes, target: 34963 }, // ELEMENT_ARRAY_BUFFER
  ],
  accessors: [
    {
      bufferView: 0,
      byteOffset: 0,
      componentType: 5126, // FLOAT
      count: 24,
      type: 'VEC3',
      min: posMin,
      max: posMax,
    },
    {
      bufferView: 1,
      byteOffset: 0,
      componentType: 5126,
      count: 24,
      type: 'VEC3',
    },
    {
      bufferView: 2,
      byteOffset: 0,
      componentType: 5123, // UNSIGNED_SHORT
      count: indices.length,
      type: 'SCALAR',
    },
  ],
};

const jsonText = JSON.stringify(gltf);
const jsonBytesUnpadded = Buffer.from(jsonText, 'utf-8');
const jsonPadding = (4 - (jsonBytesUnpadded.length % 4)) % 4;
const jsonBytes = Buffer.concat([
  jsonBytesUnpadded,
  Buffer.from(' '.repeat(jsonPadding), 'utf-8'),
]);

// ---------------------------------------------------------------------------
// GLB container
//   12-byte header + JSON chunk header (8) + JSON + BIN chunk header (8) + BIN
// ---------------------------------------------------------------------------
const HEADER_SIZE = 12;
const CHUNK_HEADER_SIZE = 8;
const totalLength =
  HEADER_SIZE +
  CHUNK_HEADER_SIZE + jsonBytes.length +
  CHUNK_HEADER_SIZE + bin.length;

const glb = Buffer.alloc(totalLength);
let p = 0;

// --- header ---
glb.writeUInt32LE(0x46546c67, p); p += 4; // 'glTF'
glb.writeUInt32LE(2, p); p += 4;          // version
glb.writeUInt32LE(totalLength, p); p += 4;

// --- JSON chunk ---
glb.writeUInt32LE(jsonBytes.length, p); p += 4;
glb.writeUInt32LE(0x4e4f534a, p); p += 4; // 'JSON'
jsonBytes.copy(glb, p); p += jsonBytes.length;

// --- BIN chunk ---
glb.writeUInt32LE(bin.length, p); p += 4;
glb.writeUInt32LE(0x004e4942, p); p += 4; // 'BIN\0'
Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength).copy(glb, p);
p += bin.length;

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, glb);

console.log(`wrote ${OUT_PATH} (${glb.length} bytes)`);
