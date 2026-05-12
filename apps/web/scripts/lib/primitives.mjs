/**
 * primitives — geometry builders for the procedural structure GLBs.
 *
 * Every primitive returns `{ positions, normals, indices }` as typed arrays.
 * All output is unit-normalized: X/Z in [-0.5, 0.5], Y in [0, 1], anchored
 * at the base centre. `DesignElementScenegraphLayer` scales the model to
 * the kind's per-instance footprint and height at render time.
 *
 * Primitives are flat-shaded (per-face normals) except spheres/domes which
 * use smoothed normals for nicer silhouettes.
 *
 * `merge([a, b, c])` welds independent primitive outputs into one mesh by
 * concatenating buffers and reindexing — used by compound shapes like
 * yurt (cylinder body + cone roof) and prayer-pavilion (box base + dome).
 */

const TAU = Math.PI * 2;

// ── Box ──────────────────────────────────────────────────────────────────
/**
 * Axis-aligned box. width/depth straddle the X/Z origin; height extends
 * upward from y0 by `height`. Used for sheds, machinery sheds, compost
 * bins, parking slabs, equipment yards.
 *
 * @param {number} width  X extent (centred on 0)
 * @param {number} height Y extent (from y0)
 * @param {number} depth  Z extent (centred on 0)
 * @param {number} [y0]   Base Y (default 0)
 */
export function box(width, height, depth, y0 = 0) {
  const hw = width / 2;
  const hd = depth / 2;
  const y1 = y0 + height;
  // 24 verts × 3 components — face-major order: +X, -X, +Y, -Y, +Z, -Z
  const positions = new Float32Array([
    // +X
    hw, y0, -hd,  hw, y1, -hd,  hw, y1, hd,  hw, y0, hd,
    // -X
    -hw, y0, hd, -hw, y1, hd, -hw, y1, -hd, -hw, y0, -hd,
    // +Y
    -hw, y1, -hd, -hw, y1, hd,  hw, y1, hd,  hw, y1, -hd,
    // -Y
    -hw, y0, hd, -hw, y0, -hd,  hw, y0, -hd,  hw, y0, hd,
    // +Z
    -hw, y0, hd,  hw, y0, hd,  hw, y1, hd, -hw, y1, hd,
    // -Z
     hw, y0, -hd, -hw, y0, -hd, -hw, y1, -hd,  hw, y1, -hd,
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
  return { positions, normals, indices };
}

// ── Gable-roof box ───────────────────────────────────────────────────────
/**
 * Box with a pitched (gable) roof along the +X/-X axis. Used for barns,
 * greenhouses, machinery sheds. The ridge runs along the Z axis at
 * y = eaveH + ridgeH.
 *
 * @param {number} width  X extent
 * @param {number} depth  Z extent
 * @param {number} eaveH  Wall height (from y=0 to eaves)
 * @param {number} ridgeH Roof rise above the eaves
 */
export function pitchedBox(width, depth, eaveH, ridgeH) {
  const hw = width / 2;
  const hd = depth / 2;
  const ridgeY = eaveH + ridgeH;

  // Walls — open-topped box (no +Y face; the roof covers it).
  const wallsPos = [
    // +X wall
     hw, 0, -hd,   hw, eaveH, -hd,  hw, eaveH, hd,  hw, 0, hd,
    // -X wall
    -hw, 0, hd,  -hw, eaveH, hd, -hw, eaveH, -hd, -hw, 0, -hd,
    // -Y floor
    -hw, 0, hd,  -hw, 0, -hd,   hw, 0, -hd,   hw, 0, hd,
    // +Z gable triangle (base + ridge apex)
    -hw, 0, hd,   hw, 0, hd,    hw, eaveH, hd,
     0, ridgeY, hd, -hw, eaveH, hd,
    // -Z gable triangle
     hw, 0, -hd, -hw, 0, -hd,  -hw, eaveH, -hd,
     0, ridgeY, -hd,  hw, eaveH, -hd,
  ];
  const wallsNorm = [
    1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
    -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
    0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
  ];
  // Walls indices: 3 quads (X-X-floor) + 2 pentagons (gables as triangle fans)
  const wallsIdx = [
    0, 1, 2,    0, 2, 3,           // +X
    4, 5, 6,    4, 6, 7,           // -X
    8, 9, 10,   8, 10, 11,         // floor
    // +Z pentagon (verts 12..16): fan from vert 12
    12, 13, 14,  12, 14, 15,  12, 15, 16,
    // -Z pentagon (verts 17..21): fan from vert 17
    17, 18, 19,  17, 19, 20,  17, 20, 21,
  ];

  // Roof slopes — two quads tilted to the ridge.
  // +X slope: from eave +X back/front up to ridge.
  const slopeLen = Math.hypot(hw, ridgeH);
  const nx = ridgeH / slopeLen; // outward X component of slope normal
  const ny = hw / slopeLen;     // upward Y component
  const roofPos = [
    // +X slope quad: ( hw, eaveH, -hd) -> (0, ridgeY, -hd) -> (0, ridgeY, hd) -> ( hw, eaveH, hd)
     hw, eaveH, -hd,  0, ridgeY, -hd,  0, ridgeY, hd,  hw, eaveH, hd,
    // -X slope quad: (-hw, eaveH,  hd) -> (0, ridgeY,  hd) -> (0, ridgeY, -hd) -> (-hw, eaveH, -hd)
    -hw, eaveH, hd,  0, ridgeY, hd,  0, ridgeY, -hd, -hw, eaveH, -hd,
  ];
  const roofNorm = [
    nx, ny, 0, nx, ny, 0, nx, ny, 0, nx, ny, 0,
    -nx, ny, 0, -nx, ny, 0, -nx, ny, 0, -nx, ny, 0,
  ];
  const wallsVertCount = wallsPos.length / 3;
  const roofIdx = [
    wallsVertCount + 0, wallsVertCount + 1, wallsVertCount + 2,
    wallsVertCount + 0, wallsVertCount + 2, wallsVertCount + 3,
    wallsVertCount + 4, wallsVertCount + 5, wallsVertCount + 6,
    wallsVertCount + 4, wallsVertCount + 6, wallsVertCount + 7,
  ];

  return {
    positions: new Float32Array([...wallsPos, ...roofPos]),
    normals: new Float32Array([...wallsNorm, ...roofNorm]),
    indices: new Uint16Array([...wallsIdx, ...roofIdx]),
  };
}

// ── Cylinder (capped) ────────────────────────────────────────────────────
/**
 * Cylinder with flat top + bottom caps. Used for water tanks, fire circles,
 * yurt walls.
 *
 * @param {number} radius
 * @param {number} height
 * @param {number} [segments=16]
 * @param {number} [y0=0]
 */
export function cylinder(radius, height, segments = 16, y0 = 0) {
  const positions = [];
  const normals = [];
  const indices = [];
  const y1 = y0 + height;

  // Side wall — segments × 4 verts (two pairs per segment for flat-shaded faces).
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * TAU;
    const a1 = ((i + 1) / segments) * TAU;
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;
    const nxMid = Math.cos((a0 + a1) / 2);
    const nzMid = Math.sin((a0 + a1) / 2);
    const base = positions.length / 3;
    positions.push(x0, y0, z0,  x1, y0, z1,  x1, y1, z1,  x0, y1, z0);
    normals.push(nxMid, 0, nzMid,  nxMid, 0, nzMid,  nxMid, 0, nzMid,  nxMid, 0, nzMid);
    indices.push(base, base + 1, base + 2,  base, base + 2, base + 3);
  }

  // Bottom cap — fan around centre, normal -Y.
  const botCentre = positions.length / 3;
  positions.push(0, y0, 0);
  normals.push(0, -1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TAU;
    positions.push(Math.cos(a) * radius, y0, Math.sin(a) * radius);
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < segments; i++) {
    // Reverse winding so the -Y face's normal stays correct under right-handed culling.
    indices.push(botCentre, botCentre + i + 2, botCentre + i + 1);
  }

  // Top cap — fan around centre, normal +Y.
  const topCentre = positions.length / 3;
  positions.push(0, y1, 0);
  normals.push(0, 1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TAU;
    positions.push(Math.cos(a) * radius, y1, Math.sin(a) * radius);
    normals.push(0, 1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(topCentre, topCentre + i + 1, topCentre + i + 2);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

// ── Cone ─────────────────────────────────────────────────────────────────
/**
 * Cone with optional flat bottom cap. Used for yurt and roof shapes.
 *
 * @param {number} radius   Base radius
 * @param {number} height   Apex height above base
 * @param {number} [segments=16]
 * @param {number} [y0=0]   Base Y
 */
export function cone(radius, height, segments = 16, y0 = 0) {
  const positions = [];
  const normals = [];
  const indices = [];
  const y1 = y0 + height;

  // Side faces — each face is a triangle: base[i], base[i+1], apex.
  // Flat-shaded with face normals.
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * TAU;
    const a1 = ((i + 1) / segments) * TAU;
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;
    // Face normal: cross of (apex - p0) × (p1 - p0), normalized.
    const ex = x1 - x0, ey = 0, ez = z1 - z0;
    const fx = -x0, fy = height, fz = -z0;
    let nx = ey * fz - ez * fy;
    let ny = ez * fx - ex * fz;
    let nz = ex * fy - ey * fx;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len; ny /= len; nz /= len;
    const base = positions.length / 3;
    positions.push(x0, y0, z0,  x1, y0, z1,  0, y1, 0);
    normals.push(nx, ny, nz,  nx, ny, nz,  nx, ny, nz);
    indices.push(base, base + 1, base + 2);
  }

  // Bottom cap.
  const botCentre = positions.length / 3;
  positions.push(0, y0, 0);
  normals.push(0, -1, 0);
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * TAU;
    positions.push(Math.cos(a) * radius, y0, Math.sin(a) * radius);
    normals.push(0, -1, 0);
  }
  for (let i = 0; i < segments; i++) {
    indices.push(botCentre, botCentre + i + 2, botCentre + i + 1);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

// ── Dome (half-sphere) ───────────────────────────────────────────────────
/**
 * Smooth half-sphere from the equator to the pole. Smoothed normals for
 * curved appearance. Used for prayer-pavilion roof and spring features.
 *
 * @param {number} radius
 * @param {number} height       Pole height above base (squash factor = height/radius)
 * @param {number} [segments=20] Longitude segments
 * @param {number} [rings=8]     Latitude rings between equator and pole
 * @param {number} [y0=0]
 */
export function dome(radius, height, segments = 20, rings = 8, y0 = 0) {
  const positions = [];
  const normals = [];
  const indices = [];

  // Generate ring vertices from equator (ring=0) to pole (ring=rings).
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * (Math.PI / 2); // 0 = equator, pi/2 = pole
    const y = y0 + Math.sin(phi) * height;
    const ringRadius = Math.cos(phi) * radius;
    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * TAU;
      const x = Math.cos(theta) * ringRadius;
      const z = Math.sin(theta) * ringRadius;
      positions.push(x, y, z);
      // Smoothed normal: point outward from centre at base, scaled for squash.
      let nx = Math.cos(theta) * Math.cos(phi);
      let ny = Math.sin(phi) * (radius / height);
      let nz = Math.sin(theta) * Math.cos(phi);
      const len = Math.hypot(nx, ny, nz) || 1;
      normals.push(nx / len, ny / len, nz / len);
    }
  }

  // Triangulate the strip between each pair of rings.
  const stride = segments + 1;
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, d,  a, d, c);
    }
  }

  // Bottom cap — closes the equator so the dome sits on its base flat.
  const botCentre = positions.length / 3;
  positions.push(0, y0, 0);
  normals.push(0, -1, 0);
  for (let s = 0; s <= segments; s++) {
    const theta = (s / segments) * TAU;
    positions.push(Math.cos(theta) * radius, y0, Math.sin(theta) * radius);
    normals.push(0, -1, 0);
  }
  for (let s = 0; s < segments; s++) {
    indices.push(botCentre, botCentre + s + 2, botCentre + s + 1);
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices),
  };
}

// ── Disc (thin cylinder, top + side only) ────────────────────────────────
/**
 * Thin flat disc used for ponds. Top-only (since pond is sunk and viewed
 * from above the water surface) with a short side wall for depth perception.
 * Returns vertices with Y in [y0, y0 + height], same convention.
 *
 * @param {number} radius
 * @param {number} height    Disc thickness (typically 0.05–0.1 unit)
 * @param {number} [segments=24]
 */
export function disc(radius, height, segments = 24) {
  return cylinder(radius, height, segments, 0);
}

// ── Merge multiple primitives into one mesh ──────────────────────────────
/**
 * Concatenate buffers from independent primitives, reindexing as we go.
 * All inputs must share the same vertex format (POSITION + NORMAL).
 */
export function merge(meshes) {
  const totalPos = meshes.reduce((s, m) => s + m.positions.length, 0);
  const totalIdx = meshes.reduce((s, m) => s + m.indices.length, 0);
  const positions = new Float32Array(totalPos);
  const normals = new Float32Array(totalPos);
  const indices = new Uint16Array(totalIdx);
  let posOff = 0;
  let idxOff = 0;
  let vertOff = 0;
  for (const m of meshes) {
    positions.set(m.positions, posOff);
    normals.set(m.normals, posOff);
    for (let i = 0; i < m.indices.length; i++) {
      indices[idxOff + i] = m.indices[i] + vertOff;
    }
    posOff += m.positions.length;
    idxOff += m.indices.length;
    vertOff += m.positions.length / 3;
  }
  return { positions, normals, indices };
}
