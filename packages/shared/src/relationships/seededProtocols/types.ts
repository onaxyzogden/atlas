/**
 * Maps objective IDs to arrays of seeded protocol IDs for that objective.
 * A partial record — objectives absent from the map have no seeded protocols
 * and render no pill strip (graceful degradation).
 */
export type SeededProtocolMap = Partial<Record<string, readonly string[]>>;
