// objectives.ts
//
// The 48 canonical OLOS Objectives — 16 Universal Domains × 3 Stages —
// derived from the developer specs (tables 10-25 in each stage doc).
// Each Objective binds a focused question, a default overlay bundle, the
// upstream record types it requires, the ordered checklist items that
// make up the work, the Record type it emits, and the status set it can
// land in.
//
// This file is the source of truth for the universal catalogue. Project-
// type templates (Phase 3) layer on top by subsetting / overriding entries.
// The checklist items exported from here are flattened into
// UNIVERSAL_CHECKLIST_ITEMS so a project's frontend has both views in one
// import.

import type { Objective } from '../../schemas/olos/objective.schema.js';
import type { ChecklistItem } from '../../schemas/olos/checklistItem.schema.js';
import type {
  OverlayId,
  OverlayBundle,
} from '../../schemas/olos/overlay.schema.js';
import type { UniversalDomain } from '../../schemas/universalDomain.schema.js';
import type { Stage } from '../../schemas/olos/stage.schema.js';
import { ObserveStatus, PlanApprovalStatus, ActTaskStatus } from '../../schemas/olos/status.schema.js';

// ---------------------------------------------------------------------------
// Per-Stage checklist templates — applied to every Domain × Stage cell, then
// supplemented by 1-2 domain-flavoured items below.
// ---------------------------------------------------------------------------

type ChecklistItemSpec = {
  instruction: string;
  requiredInputType: ChecklistItem['requiredInputType'];
  linkedOverlayId?: OverlayId;
  required?: boolean;
};

const OBSERVE_TEMPLATE: ChecklistItemSpec[] = [
  {
    instruction:
      'Walk the relevant area of the site and photograph the current state.',
    requiredInputType: 'evidence',
  },
  {
    instruction:
      'Sketch the area on the map and tag it with the relevant overlay.',
    requiredInputType: 'evidence',
  },
  {
    instruction: 'Note constraints, unknowns, and disqualifier flags.',
    requiredInputType: 'evidence',
  },
];

const PLAN_TEMPLATE: ChecklistItemSpec[] = [
  {
    instruction:
      'Review the upstream Observe record(s) and confirm all required inputs are present.',
    requiredInputType: 'reference',
  },
  {
    instruction:
      'Generate at least two options and articulate the trade-offs of each.',
    requiredInputType: 'decision',
  },
  {
    instruction:
      'Select the preferred option, capture rationale, assumptions, dependencies, and risk flags.',
    requiredInputType: 'decision',
  },
];

const ACT_TEMPLATE: ChecklistItemSpec[] = [
  {
    instruction:
      'Confirm the Act Handoff Package is in place and the prerequisites are met.',
    requiredInputType: 'reference',
  },
  {
    instruction:
      'Assign / accept the task, schedule the work window, and confirm materials are available.',
    requiredInputType: 'decision',
  },
  {
    instruction:
      'Execute the work; capture progress proof (photo, measurement, note) at key checkpoints.',
    requiredInputType: 'proof',
  },
  {
    instruction:
      'Submit completion proof and request verification.',
    requiredInputType: 'proof',
  },
  {
    instruction:
      'Receive verification outcome; address rework or sign off completion.',
    requiredInputType: 'verification',
  },
];

// ---------------------------------------------------------------------------
// Per-Domain authoring table. Each domain has a default overlay bundle, the
// focused question for each stage, and the domain-specific final checklist
// items that flavour the stage template.
// ---------------------------------------------------------------------------

type DomainAuthoring = {
  bundle: readonly OverlayId[];
  observe: {
    title: string;
    focusedQuestion: string;
    completionCriteria?: string;
    domainItems: ChecklistItemSpec[];
  };
  plan: {
    title: string;
    focusedQuestion: string;
    completionCriteria?: string;
    domainItems: ChecklistItemSpec[];
  };
  act: {
    title: string;
    focusedQuestion: string;
    completionCriteria?: string;
    domainItems: ChecklistItemSpec[];
  };
};

const DOMAIN_AUTHORING: Record<UniversalDomain, DomainAuthoring> = {
  'vision-intent': {
    bundle: ['zones', 'sectors', 'timeline-phasing'],
    observe: {
      title: 'Document Vision & Intent',
      focusedQuestion:
        'What does the steward want this land to become, and what values guide its design?',
      domainItems: [
        {
          instruction:
            'Capture the steward’s vision statement and primary success criteria in their own words.',
          requiredInputType: 'evidence',
        },
        {
          instruction:
            'Record any non-negotiable values, covenants, or ethical constraints that bound the design.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Vision Commitments',
      focusedQuestion:
        'Which values and outcomes will we commit to, and how do they translate into design priorities?',
      domainItems: [
        {
          instruction:
            'Translate vision into ranked design priorities and a 1-page commitments summary.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Operationalise Vision Commitments',
      focusedQuestion:
        'Who carries which commitment, in what cadence, with what visible proof?',
      domainItems: [],
    },
  },
  'land-base': {
    bundle: ['zones', 'access-movement', 'risk-compliance'],
    observe: {
      title: 'Document Land Base & Boundaries',
      focusedQuestion:
        'What are the legal, physical, and ownership boundaries we are designing within?',
      domainItems: [
        {
          instruction:
            'Confirm deed/title boundaries and overlay them on the base map.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'risk-compliance',
        },
        {
          instruction:
            'Identify easements, rights-of-way, and any contested boundaries.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Boundary & Land-Use Strategy',
      focusedQuestion:
        'Where do we draw working boundaries, easements, and use zones?',
      domainItems: [
        {
          instruction:
            'Define internal use zones and any boundary modifications required.',
          requiredInputType: 'decision',
          linkedOverlayId: 'zones',
        },
      ],
    },
    act: {
      title: 'Mark & Record Boundary Work',
      focusedQuestion:
        'Who installs and records boundary infrastructure (markers, fences, signage)?',
      domainItems: [],
    },
  },
  'climate': {
    bundle: ['sectors', 'monitoring-records', 'suitability'],
    observe: {
      title: 'Document Climate & Microclimate',
      focusedQuestion:
        'What climatic conditions, seasonal patterns, and extremes does this land experience?',
      domainItems: [
        {
          instruction:
            'Capture annual rainfall, temperature range, frost dates, and prevailing wind direction.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'sectors',
        },
        {
          instruction:
            'Identify on-site microclimates (frost pockets, sun traps, wind tunnels).',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Climate Response Strategy',
      focusedQuestion:
        'How will design respond to and buffer against climatic patterns and extremes?',
      domainItems: [
        {
          instruction:
            'Specify windbreaks, shade structures, frost protection, and climate-resilient species placement.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Install Climate Response Features',
      focusedQuestion:
        'Who installs windbreaks, shade, frost protection, and verifies they perform?',
      domainItems: [],
    },
  },
  'topography': {
    bundle: ['contours-landform', 'water-flow', 'suitability'],
    observe: {
      title: 'Document Topography & Landform',
      focusedQuestion:
        'What is the shape of the land — slopes, aspects, key contours and features?',
      domainItems: [
        {
          instruction:
            'Capture contour lines, slope direction, and any key landform features (ridges, valleys, plateaus).',
          requiredInputType: 'evidence',
          linkedOverlayId: 'contours-landform',
        },
        {
          instruction:
            'Identify keylines, ridges, saddles, and natural drainage divides.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Landform Modifications',
      focusedQuestion:
        'Where will we work with the land’s shape — earthworks, terraces, swales, keylines?',
      domainItems: [
        {
          instruction:
            'Specify earthwork locations, types, cut/fill volumes, and equipment access.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Execute Earthworks & Landform',
      focusedQuestion:
        'Who shapes the land, with what equipment, with what before/after proof?',
      domainItems: [
        {
          instruction:
            'Capture before/after photos at each earthwork location and verify finished levels.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
  'hydrology': {
    bundle: ['water-flow', 'contours-landform', 'soil-conditions', 'infrastructure-utilities'],
    observe: {
      title: 'Document Water Flow & Resources',
      focusedQuestion:
        'Where does water come from, how does it move, and where does it stagnate or escape?',
      domainItems: [
        {
          instruction:
            'Map surface flow paths, watercourses, springs, ponds, and known infiltration zones.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'water-flow',
        },
        {
          instruction:
            'Record well depths, water rights, and any existing storage capacity.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Water Management Strategy',
      focusedQuestion:
        'How will we slow, spread, sink, store, and route water across the design?',
      domainItems: [
        {
          instruction:
            'Specify swales, ponds, tanks, channels, irrigation, and overflow routes.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Install Water-Control Features',
      focusedQuestion:
        'Who builds the swales, ponds, tanks, channels, and verifies they hold and route as designed?',
      domainItems: [
        {
          instruction:
            'Run a flow test or first-rain inspection on each new feature and record the outcome.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
  'soil': {
    bundle: ['soil-conditions', 'monitoring-records', 'ecology-habitat'],
    observe: {
      title: 'Document Soil Conditions',
      focusedQuestion:
        'What is the soil’s texture, depth, biology, fertility, and contamination state?',
      domainItems: [
        {
          instruction:
            'Take soil samples at representative locations and submit for texture / nutrient analysis.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'soil-conditions',
        },
        {
          instruction:
            'Note compaction, erosion, surface organic matter, and contamination flags.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Soil Building Strategy',
      focusedQuestion:
        'How will we build and protect soil over the design horizon?',
      domainItems: [
        {
          instruction:
            'Specify amendments, cover-crop rotations, mulch strategies, and protected/no-till areas.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Execute Soil Building Work',
      focusedQuestion:
        'Who applies amendments, plants cover crops, and tests improvement over time?',
      domainItems: [
        {
          instruction:
            'Re-test soil after the agreed window and compare against baseline.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
  'ecology': {
    bundle: ['ecology-habitat', 'sectors', 'risk-compliance'],
    observe: {
      title: 'Document Ecology & Habitat',
      focusedQuestion: 'What life systems already exist on this land?',
      domainItems: [
        {
          instruction:
            'Conduct a species inventory — plants, birds, mammals, insects, soil life — and map habitat patches.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'ecology-habitat',
        },
        {
          instruction:
            'Identify sensitive areas, invasive species, and wildlife corridors.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Habitat & Biodiversity Strategy',
      focusedQuestion:
        'Which habitats will we protect, restore, and create, and which species will we manage out?',
      domainItems: [
        {
          instruction:
            'Specify protected zones, restoration plantings, invasive controls, and habitat features.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Restore Habitat & Monitor Species Response',
      focusedQuestion:
        'Who installs habitat features and monitors species response over time?',
      domainItems: [
        {
          instruction:
            'Establish photo points / monitoring plots and capture baseline imagery before any planting.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
  'plants-food': {
    bundle: ['zones', 'soil-conditions', 'water-flow', 'resource-flows'],
    observe: {
      title: 'Document Existing Vegetation & Crops',
      focusedQuestion: 'What is growing where, in what condition, with what yield?',
      domainItems: [
        {
          instruction:
            'Inventory existing trees, crops, beds, and pasture; note variety, age, health, and yield estimate.',
          requiredInputType: 'evidence',
        },
        {
          instruction:
            'Identify pest, disease, or weed pressure and any constraints from soil / water observations.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Plant & Food Production Strategy',
      focusedQuestion:
        'What will we grow where, in what guilds, with what rotation and harvest plan?',
      domainItems: [
        {
          instruction:
            'Specify crop / tree / pasture layout with guilds, rotations, and harvest windows.',
          requiredInputType: 'decision',
          linkedOverlayId: 'zones',
        },
      ],
    },
    act: {
      title: 'Install & Maintain Plantings',
      focusedQuestion:
        'Who plants, mulches, irrigates, harvests, and records yield?',
      domainItems: [
        {
          instruction:
            'Record planting dates, varieties, locations, and survival rates after the first season.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
  'animals-livestock': {
    bundle: ['zones', 'access-movement', 'infrastructure-utilities', 'ecology-habitat'],
    observe: {
      title: 'Document Animals & Wildlife Present',
      focusedQuestion:
        'What domestic and wild animals use this land, and how does that shape the design?',
      domainItems: [
        {
          instruction:
            'Inventory existing livestock, working animals, and notable wildlife; note welfare concerns.',
          requiredInputType: 'evidence',
        },
        {
          instruction:
            'Identify predation risk, pest impact, and any zoonotic / safety considerations.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Animal & Livestock Strategy',
      focusedQuestion:
        'Which animals, in what numbers, in what rotation, with what shelter and infrastructure?',
      domainItems: [
        {
          instruction:
            'Specify species, stocking rates, rotation pattern, shelter, water, and fencing.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Care for & Verify Animal Operations',
      focusedQuestion:
        'Who handles husbandry, rotation, and welfare verification?',
      domainItems: [
        {
          instruction:
            'Capture rotation moves, health checks, and any incidents with date-stamped proof.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
  'built-infrastructure': {
    bundle: ['infrastructure-utilities', 'access-movement', 'risk-compliance'],
    observe: {
      title: 'Document Built Infrastructure',
      focusedQuestion:
        'What buildings, fences, tanks, and utilities exist and in what condition?',
      domainItems: [
        {
          instruction:
            'Inventory existing structures with condition rating, year built, and known issues.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'infrastructure-utilities',
        },
        {
          instruction:
            'Note any compliance, permit, or insurance constraints on existing structures.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Built Infrastructure Plan',
      focusedQuestion:
        'What new structures, repairs, and upgrades, in what sequence, with what budget?',
      domainItems: [
        {
          instruction:
            'Specify new builds, repairs, demolitions, and their phasing.',
          requiredInputType: 'decision',
          linkedOverlayId: 'timeline-phasing',
        },
      ],
    },
    act: {
      title: 'Build & Verify Infrastructure',
      focusedQuestion:
        'Who constructs, inspects, and signs off each structure?',
      domainItems: [
        {
          instruction:
            'Capture inspection sign-off (self, contractor, or regulator) for each completed structure.',
          requiredInputType: 'verification',
        },
      ],
    },
  },
  'access-circulation': {
    bundle: ['access-movement', 'zones', 'risk-compliance'],
    observe: {
      title: 'Document Access & Movement',
      focusedQuestion:
        'How do people, vehicles, animals, and goods move across the site today?',
      domainItems: [
        {
          instruction:
            'Map all roads, tracks, paths, gates, and frequent movement lines.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'access-movement',
        },
        {
          instruction:
            'Identify access constraints — narrow tracks, seasonal closures, emergency egress gaps.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Access & Circulation Strategy',
      focusedQuestion:
        'Which roads, paths, gates, and routes will we build, modify, or close?',
      domainItems: [
        {
          instruction:
            'Specify access network with surface type, width, gates, and emergency-egress checks.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Install Access & Verify Routes',
      focusedQuestion:
        'Who builds, surfaces, and tests each access feature?',
      domainItems: [
        {
          instruction:
            'Drive / walk each completed route loaded with worst-case usage and capture proof.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
  'energy-resources': {
    bundle: ['resource-flows', 'infrastructure-utilities', 'sectors'],
    observe: {
      title: 'Document Energy & Resource Flows',
      focusedQuestion:
        'What energy, materials, and waste flow into, through, and out of the site?',
      domainItems: [
        {
          instruction:
            'Map inputs (fuel, feed, fertiliser, electricity), outputs (yield, waste), and recovery loops.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'resource-flows',
        },
        {
          instruction:
            'Identify the largest cost / waste streams and any leak points.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Energy & Resource Strategy',
      focusedQuestion:
        'How will we capture, cycle, and close loops on energy, water, nutrients, and materials?',
      domainItems: [
        {
          instruction:
            'Specify solar / wind / biomass capture, composting, greywater, and recovery systems.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Install Energy & Resource Systems',
      focusedQuestion:
        'Who installs the systems and verifies they produce / cycle as designed?',
      domainItems: [
        {
          instruction:
            'Capture commissioning / first-cycle output for each system.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
  'people-governance': {
    bundle: ['roles-responsibility', 'zones', 'stewardship-intensity'],
    observe: {
      title: 'Document People & Governance Structure',
      focusedQuestion:
        'Who is involved, in what roles, with what decision rights and time commitments?',
      domainItems: [
        {
          instruction:
            'List all stakeholders, current roles, decision authority, and time availability.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'roles-responsibility',
        },
        {
          instruction:
            'Capture skill gaps, conflicts, and any governance ambiguity.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Roles & Decision Rights',
      focusedQuestion:
        'How will we structure responsibility and decision-making across the design horizon?',
      domainItems: [
        {
          instruction:
            'Publish a roles & responsibilities matrix and a decision-rights map.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Onboard People & Confirm Roles',
      focusedQuestion:
        'Who is assigned, when do they start, with what training and confirmation?',
      domainItems: [
        {
          instruction:
            'Capture onboarding sign-off for each role holder.',
          requiredInputType: 'verification',
        },
      ],
    },
  },
  'economics-capacity': {
    bundle: ['timeline-phasing', 'stewardship-intensity', 'resource-flows'],
    observe: {
      title: 'Document Financial & Operational Capacity',
      focusedQuestion:
        'What financial, labour, and time capacity exists to deliver the work?',
      domainItems: [
        {
          instruction:
            'Capture budget envelope, available labour-hours, and time horizon.',
          requiredInputType: 'evidence',
        },
        {
          instruction:
            'Note any covenant-grounded constraints on capital channels (no riba, no gharar).',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Budget, Phasing & Capacity Plan',
      focusedQuestion:
        'Which work fits within capacity, in what sequence, with what funding sources?',
      domainItems: [
        {
          instruction:
            'Publish a phased budget that maps work packages to capital channels and labour windows.',
          requiredInputType: 'decision',
          linkedOverlayId: 'timeline-phasing',
        },
      ],
    },
    act: {
      title: 'Execute Spending & Track Capacity',
      focusedQuestion:
        'Who controls spend, tracks hours, and reports variance against plan?',
      domainItems: [
        {
          instruction:
            'Capture receipts, time logs, and variance reports for each phase.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
  'risk-compliance': {
    bundle: ['risk-compliance', 'monitoring-records', 'sectors'],
    observe: {
      title: 'Document Risks, Hazards & Compliance',
      focusedQuestion:
        'What legal, safety, environmental, and disqualifier risks exist on this site?',
      domainItems: [
        {
          instruction:
            'List zoning, permit, easement, and other regulatory constraints.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'risk-compliance',
        },
        {
          instruction:
            'Identify safety hazards, hazardous materials, fire / flood risk, and any disqualifier flags.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Risk Mitigation & Compliance Plan',
      focusedQuestion:
        'Which risks do we accept, mitigate, transfer, or design out, and how do we stay compliant?',
      domainItems: [
        {
          instruction:
            'Publish a risk register with mitigations, owners, and a compliance checklist.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Implement Risk Controls & Verify',
      focusedQuestion:
        'Who installs safety features, runs inspections, and signs off compliance?',
      domainItems: [
        {
          instruction:
            'Capture inspection reports and compliance sign-offs for each control.',
          requiredInputType: 'verification',
        },
      ],
    },
  },
  'monitoring-records': {
    bundle: ['monitoring-records', 'zones', 'stewardship-intensity'],
    observe: {
      title: 'Document Existing Monitoring & Records',
      focusedQuestion:
        'What monitoring, records, and feedback loops already exist on this site?',
      domainItems: [
        {
          instruction:
            'Inventory existing logs, photo points, sensors, and reporting cadences.',
          requiredInputType: 'evidence',
          linkedOverlayId: 'monitoring-records',
        },
        {
          instruction:
            'Note any record gaps that block downstream decisions.',
          requiredInputType: 'evidence',
        },
      ],
    },
    plan: {
      title: 'Decide Monitoring & Records Plan',
      focusedQuestion:
        'Which metrics, cadence, points, and ownership will we commit to going forward?',
      domainItems: [
        {
          instruction:
            'Publish a monitoring plan with metrics, points, frequency, and reviewers.',
          requiredInputType: 'decision',
        },
      ],
    },
    act: {
      title: 'Install Monitoring & Capture Records',
      focusedQuestion:
        'Who installs sensors, photo points, sample sites, and ensures data flows back into review?',
      domainItems: [
        {
          instruction:
            'Capture first-reading or first-observation for each monitoring point as commissioning proof.',
          requiredInputType: 'proof',
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Derivation: build the 48 Objectives and the flat checklist-item list from
// the authoring table above.
// ---------------------------------------------------------------------------

const STAGE_ORDER: readonly Stage[] = ['observe', 'plan', 'act'];

const OUTPUT_KIND_BY_STAGE: Record<Stage, Objective['outputKind']> = {
  observe: 'observation-record',
  plan: 'plan-decision-record',
  act: 'act-task',
};

const ALLOWED_STATUSES_BY_STAGE: Record<Stage, readonly string[]> = {
  observe: ObserveStatus.options,
  plan: PlanApprovalStatus.options,
  act: ActTaskStatus.options,
};

function buildObjectiveId(domain: UniversalDomain, stage: Stage): string {
  return `${domain}--${stage}`;
}

function buildChecklistItemId(
  domain: UniversalDomain,
  stage: Stage,
  ordinal: number,
): string {
  return `${domain}--${stage}--${ordinal}`;
}

function templateForStage(stage: Stage): ChecklistItemSpec[] {
  if (stage === 'observe') return OBSERVE_TEMPLATE;
  if (stage === 'plan') return PLAN_TEMPLATE;
  return ACT_TEMPLATE;
}

function bundleForStage(
  baseBundle: readonly OverlayId[],
  stage: Stage,
): OverlayBundle {
  if (stage === 'act') {
    const withRoles: OverlayId[] = [...baseBundle];
    if (!withRoles.includes('roles-responsibility')) {
      withRoles.push('roles-responsibility');
    }
    if (!withRoles.includes('timeline-phasing')) {
      withRoles.push('timeline-phasing');
    }
    return withRoles;
  }
  return [...baseBundle];
}

function requiredInputsForStage(
  domain: UniversalDomain,
  stage: Stage,
): Objective['requiredInputs'] {
  if (stage === 'observe') return [];
  if (stage === 'plan') {
    return [
      {
        kind: 'observation-record',
        objectiveId: buildObjectiveId(domain, 'observe'),
        description: 'Upstream ObservationRecord for this domain.',
      },
    ];
  }
  return [
    {
      kind: 'act-handoff-package',
      objectiveId: buildObjectiveId(domain, 'plan'),
      description:
        'Approved PlanDecisionRecord converted into an ActHandoffPackage.',
    },
  ];
}

const _objectives: Objective[] = [];
const _checklistItems: ChecklistItem[] = [];

for (const domain of Object.keys(DOMAIN_AUTHORING) as UniversalDomain[]) {
  const authoring = DOMAIN_AUTHORING[domain];
  for (const stage of STAGE_ORDER) {
    const objectiveId = buildObjectiveId(domain, stage);
    const stageAuthoring = authoring[stage];
    const items = [...templateForStage(stage), ...stageAuthoring.domainItems];
    const checklistItemIds: string[] = [];

    items.forEach((spec, idx) => {
      const ordinal = idx + 1;
      const itemId = buildChecklistItemId(domain, stage, ordinal);
      checklistItemIds.push(itemId);
      _checklistItems.push({
        id: itemId,
        objectiveId,
        ordinal,
        instruction: spec.instruction,
        linkedOverlayId: spec.linkedOverlayId,
        requiredInputType: spec.requiredInputType,
        required: spec.required ?? true,
      });
    });

    _objectives.push({
      id: objectiveId,
      stage,
      domain,
      title: stageAuthoring.title,
      focusedQuestion: stageAuthoring.focusedQuestion,
      completionCriteria: stageAuthoring.completionCriteria,
      requiredInputs: requiredInputsForStage(domain, stage),
      defaultOverlayBundle: bundleForStage(authoring.bundle, stage),
      checklistItemIds,
      outputKind: OUTPUT_KIND_BY_STAGE[stage],
      allowedStatuses: [...ALLOWED_STATUSES_BY_STAGE[stage]],
    });
  }
}

export const UNIVERSAL_OBJECTIVES: readonly Objective[] = _objectives;
export const UNIVERSAL_CHECKLIST_ITEMS: readonly ChecklistItem[] =
  _checklistItems;

/** Look up an Objective by (stage, domain). */
export function getObjective(
  stage: Stage,
  domain: UniversalDomain,
): Objective | undefined {
  return UNIVERSAL_OBJECTIVES.find(
    (o) => o.stage === stage && o.domain === domain,
  );
}

/** Look up the checklist items for an Objective id. */
export function getChecklistItemsForObjective(
  objectiveId: string,
): readonly ChecklistItem[] {
  return UNIVERSAL_CHECKLIST_ITEMS.filter(
    (item) => item.objectiveId === objectiveId,
  );
}
