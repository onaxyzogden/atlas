// Per-module to-do checklists for the Land Brief workspace.
// Items with `tag` auto-complete when a feature with that property tag exists
// in drawnByModule[moduleKey]. Items without a `tag` are manual-toggle.

export const MODULE_TODOS = {
  "human-context": [
    { id: "neighbours-mapped", label: "Map adjacent neighbours", tag: "neighbour" },
    { id: "stewards-mapped", label: "Mark steward households", tag: "steward" },
    { id: "access-traced", label: "Trace primary access road", tag: "access-road" },
    { id: "boundary-walked", label: "Walk the property boundary" },
    { id: "stakeholder-call", label: "Call key stakeholders" },
  ],
  macroclimate: [
    { id: "frost-pockets", label: "Outline frost pockets", tag: "frost-pocket" },
    { id: "hazard-zones", label: "Mark hazard zones", tag: "hazard" },
    { id: "wind-notes", label: "Note prevailing wind direction" },
  ],
  topography: [
    { id: "contours-digitized", label: "Digitize contour lines", tag: "contour" },
    { id: "high-points", label: "Mark high points / ridges", tag: "high-point" },
    { id: "drainage-traced", label: "Trace drainage lines", tag: "drainage" },
    { id: "slope-walked", label: "Walk steepest slopes" },
  ],
  ewe: [
    { id: "watercourses", label: "Trace watercourses", tag: "watercourse" },
    { id: "soil-samples", label: "Drop soil sample sites", tag: "soil-sample" },
    { id: "ecology-zones", label: "Outline ecology zones", tag: "ecology-zone" },
    { id: "lab-results", label: "Record lab results" },
  ],
  sectors: [
    { id: "sun-wind", label: "Draw sun/wind wedges", tag: "sun-wind" },
    { id: "perma-zones", label: "Outline permaculture zones", tag: "perma-zone" },
    { id: "zone-rationale", label: "Document zone rationale" },
  ],
  swot: [
    { id: "swot-s", label: "Pin strengths", tag: "S" },
    { id: "swot-w", label: "Pin weaknesses", tag: "W" },
    { id: "swot-o", label: "Pin opportunities", tag: "O" },
    { id: "swot-t", label: "Pin threats", tag: "T" },
    { id: "synthesis-write", label: "Write synthesis paragraph" },
  ],
};

export function isTodoDone(todo, drawnFC, manualCheckedSet) {
  if (todo.tag) {
    const features = drawnFC?.features ?? [];
    return features.some((f) => f?.properties?.tag === todo.tag);
  }
  return !!manualCheckedSet?.has(todo.id);
}

export function todoProgress(todos, drawnFC, manualCheckedSet) {
  let done = 0;
  for (const t of todos) if (isTodoDone(t, drawnFC, manualCheckedSet)) done += 1;
  return { done, total: todos.length };
}
