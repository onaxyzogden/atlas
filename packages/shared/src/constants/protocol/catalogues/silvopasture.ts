// catalogues/silvopasture.ts
//
// SILVOPASTURE protocol deltas - integrated trees, forage, and livestock on
// shared ground. Vertical-slice depth. Carries BOTH a primary layer (when
// silvopasture is the project's primary type) and a secondary layer (additive
// protocols + patches it injects when layered onto a host primary such as
// homestead or regenerative_farm).
//
// Patches DERIVED under the operator's "spec + expertise" authorization, in the
// spirit of the silvopasture objective secondary; thresholds stay as [tokens].

import type {
  ProtocolPatchRecord,
  StandardProtocolTemplate,
} from '../../../schemas/protocol/protocol.schema.js';

export const SILVOPASTURE_PRIMARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'silv-tree-browse-damage',
    name: 'Tree Browse Damage',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'silvopasture',
    stratumId: 's6-integration-design',
    objectiveId: 'silv-sec-s4-grazing-design',
    severityTier: 'respond',
    condition: 'IF browse damage to trees exceeds [browse tolerance]',
    response: 'Adjust stocking or grazing timing, or add tree guards, to protect the trees.',
    rationale:
      'In silvopasture the trees are slow capital; unmanaged browse converts a decades-long asset into this season’s forage.',
    feeds: ['Plants', 'Animals'],
  },
  {
    id: 'silv-establishment-protection',
    name: 'Tree Establishment Protection',
    type: 'threshold',
    source: 'primary',
    sourceTypeId: 'silvopasture',
    stratumId: 's6-integration-design',
    objectiveId: 'silv-sec-s4-grazing-design',
    severityTier: 'respond',
    condition: 'IF newly planted trees are within their [establishment window] AND grazing is scheduled',
    response: 'Exclude or guard the young trees until they are established.',
    rationale:
      'The establishment window is when a tree is most vulnerable and least replaceable; protecting it then is the cheapest it will ever be.',
    feeds: ['Plants', 'Animals'],
  },
  {
    id: 'silv-forage-shade-balance',
    name: 'Forage / Shade Balance',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'silvopasture',
    stratumId: 's6-integration-design',
    objectiveId: 'silv-sec-s3-forage-survey',
    severityTier: 'watch',
    condition: 'IF understory forage declines under the canopy past [threshold]',
    response: 'Review canopy density and consider thinning to restore the forage layer.',
    rationale:
      'Silvopasture is a deliberate balance of two yields; a closing canopy quietly trades the forage system away for the tree system.',
    feeds: ['Plants', 'Ecology'],
  },
  {
    id: 'silv-rotational-fencing-integrity',
    name: 'Treed-Paddock Entry Check',
    type: 'cyclical',
    source: 'primary',
    sourceTypeId: 'silvopasture',
    stratumId: 's5-system-design',
    objectiveId: 'silv-sec-s4-grazing-design',
    severityTier: 'respond',
    condition: 'IF a rotation entry event occurs in a treed paddock',
    response: 'Inspect fencing, tree guards, and water before opening the gate.',
    rationale:
      'Trees complicate fence lines and water runs; a pre-entry check catches the guard or wire a paddock without trees would not have.',
    feeds: ['Built Infrastructure', 'Animals'],
  },
  {
    id: 'silv-root-zone-compaction',
    name: 'Tree Root-Zone Compaction',
    type: 'judgment',
    source: 'primary',
    sourceTypeId: 'silvopasture',
    stratumId: 's4-foundation-decisions',
    objectiveId: 'silv-sec-s4-grazing-design',
    severityTier: 'watch',
    condition: 'IF animals concentrate and compact soil around tree root zones',
    response: 'Review zone allocation or rotation to protect the root zones.',
    rationale:
      'Compaction at the root zone strangles the tree slowly and invisibly; reading the animal-distribution pattern early prevents it.',
    feeds: ['Soil', 'Animals'],
  },
];

export const SILVOPASTURE_SECONDARY_PROTOCOLS: readonly StandardProtocolTemplate[] = [
  {
    id: 'silv2-integrated-browse-window',
    name: 'Integrated Browse Window',
    type: 'threshold',
    source: 'secondary',
    sourceTypeId: 'silvopasture',
    stratumId: 's6-integration-design',
    objectiveId: 'silv-sec-s4-grazing-design',
    severityTier: 'respond',
    condition:
      'IF the host system’s trees enter a vulnerable phenophase AND livestock are present',
    response: 'Time grazing to avoid browse on the host system’s trees.',
    rationale:
      'When silvopasture is layered onto another system, its livestock can damage trees the host planted for a different purpose.',
    feeds: ['Plants', 'Animals'],
  },
  {
    id: 'silv2-nutrient-distribution',
    name: 'Manure Distribution Balance',
    type: 'judgment',
    source: 'secondary',
    sourceTypeId: 'silvopasture',
    stratumId: 's6-integration-design',
    objectiveId: 'silv-sec-s4-grazing-design',
    severityTier: 'watch',
    condition: 'IF manure concentration under the canopy becomes uneven',
    response: 'Adjust animal distribution so nutrient return is spread, not pooled.',
    rationale:
      'Even nutrient return is half the value of integrating animals; pooled manure both wastes fertility and risks runoff.',
    feeds: ['Soil', 'Animals'],
  },
];

export const SILVOPASTURE_SECONDARY_PATCHES: readonly ProtocolPatchRecord[] = [
  {
    targetTemplateId: 'u-s6-ecology-indicator-decline',
    secondaryTypeId: 'silvopasture',
    conditionAmendment: 'OR browse pressure on integrated trees exceeds [browse tolerance]',
    responseAmendment:
      'Include the tree-forage-livestock interaction in the investigation, not just the declining indicator alone.',
    ref: 'silvopasture-secondary-patch-1',
  },
  {
    targetTemplateId: 'u-s6-yield-shortfall',
    secondaryTypeId: 'silvopasture',
    conditionAmendment:
      'OR tree-fodder or timber yield from the silvopasture falls below [expected yield]',
    responseAmendment:
      'Review the tree-forage-livestock integration as a whole, not the single shortfalling yield in isolation.',
    ref: 'silvopasture-secondary-patch-2',
  },
];
