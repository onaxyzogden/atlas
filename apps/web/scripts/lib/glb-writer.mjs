/**
 * glb-writer — minimal glTF 2.0 binary (GLB) serializer for the procedural
 * per-kind structure GLBs in Phase 2 of the deck.gl scenegraph migration
 * (ADR 2026-05-11). Hand-encoded — no external glTF dependencies.
 *
 * Each call writes a single-mesh, single-material GLB:
 *
 *   writeGLB({ positions, normals, indices, color }, outPath)
 *
 * Conventions inherited from `gen-generic-box-glb.mjs`:
 *   - Positions are unit-normalized: X/Z in [-0.5, 0.5], Y in [0, 1]
 *     (anchored at base centre so deck.gl ScenegraphLayer can scale
 *     the model to per-kind footprint/height without re-anchoring).
 *   - Normals are per-vertex; for flat-shaded meshes, duplicate
 *     vertices share the face normal.
 *   - Indices are UNSIGNED_SHORT (uint16) — meshes must have < 65,536
 *     vertices. None of our primitives come close.
 *   - Material is PBR metallic-roughness, double-sided, neutral
 *     roughness. `color` is `[r, g, b]` in 0..1.
 *
 * Spec ref: https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const HEADER_SIZE = 12;
const CHUNK_HEADER_SIZE = 8;

/**
 * @param {{positions: Float32Array, normals: Float32Array, indices: Uint16Array, color: [number, number, number], name?: string}} mesh
 * @param {string} outPath
 */
export function writeGLB(mesh, outPath) {
  const { positions, normals, indices, color, name = 'Mesh' } = mesh;

  if (positions.length !== normals.length) {
    throw new Error(
      `positions/normals length mismatch: ${positions.length} vs ${normals.length}`,
    );
  }
  const vertexCount = positions.length / 3;
  if (vertexCount > 65535) {
    throw new Error(`vertexCount ${vertexCount} exceeds uint16 indices`);
  }

  // ── Binary buffer layout ─────────────────────────────────────────────
  const positionsBytes = positions.byteLength;
  const normalsBytes = normals.byteLength;
  const indicesBytes = indices.byteLength;

  const positionsOffset = 0;
  const normalsOffset = positionsBytes;
  const indicesOffset = positionsBytes + normalsBytes;

  const totalBinUnaligned = positionsBytes + normalsBytes + indicesBytes;
  const binPadding = (4 - (totalBinUnaligned % 4)) % 4;
  const totalBin = totalBinUnaligned + binPadding;

  const bin = new Uint8Array(totalBin);
  bin.set(new Uint8Array(positions.buffer, positions.byteOffset, positionsBytes), positionsOffset);
  bin.set(new Uint8Array(normals.buffer, normals.byteOffset, normalsBytes), normalsOffset);
  bin.set(new Uint8Array(indices.buffer, indices.byteOffset, indicesBytes), indicesOffset);

  // ── Position bounds (required by spec for POSITION accessor) ─────────
  const posMin = [Infinity, Infinity, Infinity];
  const posMax = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k];
      if (v < posMin[k]) posMin[k] = v;
      if (v > posMax[k]) posMax[k] = v;
    }
  }

  // ── glTF JSON ────────────────────────────────────────────────────────
  const gltf = {
    asset: {
      version: '2.0',
      generator: 'atlas/apps/web/scripts/lib/glb-writer.mjs',
    },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name }],
    meshes: [
      {
        name,
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
        name: `${name}Material`,
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [color[0], color[1], color[2], 1.0],
          metallicFactor: 0.0,
          roughnessFactor: 0.85,
        },
      },
    ],
    buffers: [{ byteLength: totalBin }],
    bufferViews: [
      { buffer: 0, byteOffset: positionsOffset, byteLength: positionsBytes, target: 34962 },
      { buffer: 0, byteOffset: normalsOffset, byteLength: normalsBytes, target: 34962 },
      { buffer: 0, byteOffset: indicesOffset, byteLength: indicesBytes, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: vertexCount,
        type: 'VEC3',
        min: posMin,
        max: posMax,
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5126,
        count: vertexCount,
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

  // ── GLB packaging ────────────────────────────────────────────────────
  const jsonText = JSON.stringify(gltf);
  const jsonBytesUnpadded = Buffer.from(jsonText, 'utf-8');
  const jsonPadding = (4 - (jsonBytesUnpadded.length % 4)) % 4;
  const jsonBytes = Buffer.concat([
    jsonBytesUnpadded,
    Buffer.from(' '.repeat(jsonPadding), 'utf-8'),
  ]);

  const totalLength =
    HEADER_SIZE +
    CHUNK_HEADER_SIZE + jsonBytes.length +
    CHUNK_HEADER_SIZE + bin.length;

  const glb = Buffer.alloc(totalLength);
  let p = 0;

  glb.writeUInt32LE(0x46546c67, p); p += 4; // 'glTF'
  glb.writeUInt32LE(2, p); p += 4;          // version
  glb.writeUInt32LE(totalLength, p); p += 4;

  glb.writeUInt32LE(jsonBytes.length, p); p += 4;
  glb.writeUInt32LE(0x4e4f534a, p); p += 4; // 'JSON'
  jsonBytes.copy(glb, p); p += jsonBytes.length;

  glb.writeUInt32LE(bin.length, p); p += 4;
  glb.writeUInt32LE(0x004e4942, p); p += 4; // 'BIN\0'
  Buffer.from(bin.buffer, bin.byteOffset, bin.byteLength).copy(glb, p);
  p += bin.length;

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, glb);

  return { bytes: glb.length, vertexCount, triangleCount: indices.length / 3 };
}
