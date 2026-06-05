/**
 * Design Map generator — barrel.
 *
 * Re-exports the orchestrator and shared geometry primitives so callers can
 * `import { generateDesignMap } from '../services/designMap/index.js'`
 * without reaching into individual algorithm files.
 */

export {
  generateDesignMap,
  emptySummary,
  DEFAULT_ENTERPRISES,
} from './DesignMapGenerator.js';

export type {
  ContourInput,
  DesignMapSummary,
  EnterpriseKind,
  GenerateDesignMapInput,
  GenerateDesignMapOutput,
  ParcelInput,
  SwaleCandidateInput,
} from './DesignMapGenerator.js';

export type { LineString, LonLat, Ring } from './geometry.js';
