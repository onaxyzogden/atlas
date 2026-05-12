/**
 * customModelValidator — gatekeeps user-uploaded GLB files before they enter
 * the IndexedDB-backed `customModelStore`.
 *
 * Per ADR 2026-05-11 Phase 6 risk row: user-uploaded GLB exposes a parse +
 * extension attack surface. We refuse anything that:
 *   - exceeds 10 MB
 *   - does not begin with the GLB magic bytes (`glTF` + version 2)
 *   - declares a glTF extension outside the allowlist
 *
 * The strict GLTFLoader parse from `three/examples` is deliberately not
 * invoked here — we keep the validator dependency-light and rely on the
 * runtime renderer (deck.gl `ScenegraphLayer` → luma.gl glTF loader) to
 * surface any deeper structural issues at render time, where they can fall
 * back to the generic-box GLB.
 */

const MAX_BYTES = 10 * 1024 * 1024;

/** Extensions the runtime renderer is known to handle safely. */
const KHR_ALLOWLIST = new Set([
  'KHR_materials_unlit',
  'KHR_materials_pbrSpecularGlossiness',
  'KHR_materials_emissive_strength',
  'KHR_materials_clearcoat',
  'KHR_materials_transmission',
  'KHR_materials_ior',
  'KHR_materials_volume',
  'KHR_materials_specular',
  'KHR_texture_transform',
  'KHR_mesh_quantization',
  'KHR_draco_mesh_compression',
  'KHR_lights_punctual',
]);

export interface ValidationOk {
  ok: true;
  sha256: string;
}

export interface ValidationError {
  ok: false;
  reason: string;
}

export type ValidationResult = ValidationOk | ValidationError;

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function validateCustomGlb(file: File): Promise<ValidationResult> {
  if (file.size > MAX_BYTES) {
    return { ok: false, reason: `File is ${(file.size / 1024 / 1024).toFixed(1)} MB; limit is 10 MB.` };
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength < 12) {
    return { ok: false, reason: 'File is too small to be a GLB.' };
  }

  // GLB header: magic (uint32 'glTF') | version (uint32 == 2) | length (uint32)
  const dv = new DataView(buffer);
  const magic = dv.getUint32(0, true);
  if (magic !== 0x46546c67) {
    return { ok: false, reason: 'Not a binary glTF (GLB) file.' };
  }
  const version = dv.getUint32(4, true);
  if (version !== 2) {
    return { ok: false, reason: `Unsupported glTF version ${version}; only v2 is accepted.` };
  }

  // First chunk should be JSON metadata. Parse it to enforce extension allowlist.
  const jsonChunkLen = dv.getUint32(12, true);
  const jsonChunkType = dv.getUint32(16, true);
  if (jsonChunkType !== 0x4e4f534a) {
    return { ok: false, reason: 'GLB first chunk is not JSON metadata.' };
  }
  if (20 + jsonChunkLen > buffer.byteLength) {
    return { ok: false, reason: 'GLB JSON chunk length exceeds file size.' };
  }
  const decoder = new TextDecoder('utf-8');
  let jsonText: string;
  try {
    jsonText = decoder.decode(new Uint8Array(buffer, 20, jsonChunkLen));
  } catch {
    return { ok: false, reason: 'GLB JSON chunk could not be decoded.' };
  }
  let parsed: { extensionsUsed?: unknown; extensionsRequired?: unknown };
  try {
    parsed = JSON.parse(jsonText) as typeof parsed;
  } catch {
    return { ok: false, reason: 'GLB JSON chunk is not valid JSON.' };
  }

  const declared = new Set<string>();
  if (Array.isArray(parsed.extensionsUsed)) {
    for (const e of parsed.extensionsUsed) if (typeof e === 'string') declared.add(e);
  }
  if (Array.isArray(parsed.extensionsRequired)) {
    for (const e of parsed.extensionsRequired) if (typeof e === 'string') declared.add(e);
  }
  const disallowed = [...declared].filter((e) => !KHR_ALLOWLIST.has(e));
  if (disallowed.length > 0) {
    return { ok: false, reason: `Unsupported glTF extension(s): ${disallowed.join(', ')}` };
  }

  return { ok: true, sha256: await sha256Hex(buffer) };
}
