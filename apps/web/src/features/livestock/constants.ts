/**
 * Shared livestock thresholds — pulled out where the same literal lives
 * across multiple files.
 */

/** Shelter-access fail threshold (m). Beyond this distance from a paddock
 *  centroid to the nearest shelter, the welfare/predator-risk audits flag
 *  the paddock as outside the working welfare guideline. */
export const SHELTER_MAX_M = 300;
