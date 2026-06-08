/**
 * PurposeCapture -- a CONTROLLED renderer over a FLAT FormValue for the
 * s1-vision-c1 checklist item ("State the primary purpose of this land
 * project").
 *
 * This capture is READ-ONLY for the project-type selection. The primary type
 * was set at project creation (project.metadata.projectTypeRecord.primaryTypeId)
 * and is intentionally NOT editable in Act -- changing it triggers a
 * project-wide re-sync that must route through Plan. The type grid is therefore
 * display-only: plain divs, no onClick, no role="button", not focusable.
 *
 * The only NEW persisted state added by this capture is an optional free-text
 * "elaboration" string. The component decodes the flat value into a
 * PurposeModel, edits the elaboration, and re-encodes on every change via the
 * private encodePurpose inverse.
 *
 * Contract mirrors StewardCapture: `import * as React from 'react'`;
 * props { itemId, value, onChange, projectId }; exported pure helpers
 * decodePurpose / isPurposeValid / summarisePurpose; private encodePurpose;
 * `const emit = (next) => onChange(encodePurpose(next))`; reads store via a
 * STABLE single-ref Zustand v5 selector.
 *
 * The exported PURPOSE_GRID_CARDS constant is exposed for the completeness-
 * guard test (every canBePrimary type appears exactly once).
 */
import * as React from 'react';
import {
  ArrowRight,
  Beef,
  Compass,
  GraduationCap,
  Heart,
  HeartHandshake,
  Home,
  Leaf,
  PawPrint,
  Sprout,
  ShoppingBasket,
  Sun,
  Trees,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import { findProjectType } from '@ogden/shared';
import {
  useProjectStore,
  type LocalProject,
} from '../../../store/projectStore.js';
import EditInPlanButton from './EditInPlanButton.js';
import css from './PurposeCapture.module.css';

// ---------------------------------------------------------------------------
// Grid card definitions (module-level constant, exported for test guard)
// ---------------------------------------------------------------------------

export interface PurposeGridCard {
  id: string;
  group: string;
  name: string;
  description: string;
  Icon: LucideIcon;
}

/**
 * The 13 canBePrimary project types, grouped for display. `residential`
 * (canBePrimary:false) is intentionally excluded. Order within each group
 * matches the mockup. For `livestock_operation` (no mockup card) the label
 * and description are sourced from PROJECT_TYPES.
 *
 * ASCII-only: no em/en-dashes, no degree glyphs.
 */
export const PURPOSE_GRID_CARDS: readonly PurposeGridCard[] = [
  // Group 1: Farm & homestead
  {
    id: 'regenerative_farm',
    group: 'Farm & homestead',
    name: 'Regen Farm',
    description:
      'Regenerative mixed-enterprise farming. Ecological function and production co-primary.',
    Icon: Sprout,
  },
  {
    id: 'homestead',
    group: 'Farm & homestead',
    name: 'Homestead',
    description:
      'Family-scale food, shelter, and resilience. Long-term self-sufficient land stewardship.',
    Icon: Home,
  },
  {
    id: 'market_garden',
    group: 'Farm & homestead',
    name: 'Market Garden',
    description:
      'Intensive vegetable production - beds, tunnels, wash/pack, irrigation, and sales.',
    Icon: ShoppingBasket,
  },
  {
    id: 'nursery',
    group: 'Farm & homestead',
    name: 'Nursery',
    description:
      'Plant propagation, seedling production, greenhouse systems, and specialist stock.',
    Icon: Leaf,
  },
  {
    id: 'off_grid',
    group: 'Farm & homestead',
    name: 'Off-Grid',
    description:
      'Water, energy, shelter, and food security in remote or self-sufficient settings.',
    Icon: Sun,
  },
  // Group 2: Ecological systems
  {
    id: 'orchard_food_forest',
    group: 'Ecological systems',
    name: 'Orchard / Food Forest',
    description:
      'Perennial tree crops, guilds, and succession systems for long-term yields.',
    Icon: Trees,
  },
  {
    id: 'silvopasture',
    group: 'Ecological systems',
    name: 'Silvopasture / Livestock',
    description:
      'Rotational grazing, paddocks, forage, and animal-integrated land management.',
    Icon: PawPrint,
  },
  {
    id: 'conservation',
    group: 'Ecological systems',
    name: 'Conservation',
    description:
      'Habitat restoration, native planting, corridors. Production incidental or absent.',
    Icon: Heart,
  },
  {
    id: 'livestock_operation',
    group: 'Ecological systems',
    name: findProjectType('livestock_operation')?.label ?? 'Livestock Operation',
    description:
      findProjectType('livestock_operation')?.description ??
      'Standalone grazing and animal-husbandry enterprise centered on the herd.',
    Icon: Beef,
  },
  // Group 3: Community & experience
  {
    id: 'ecovillage',
    group: 'Community & experience',
    name: 'Intentional Community',
    description:
      'Shared land, housing clusters, governance, and communal infrastructure.',
    Icon: Users,
  },
  {
    id: 'agritourism',
    group: 'Community & experience',
    name: 'Agritourism / Retreat',
    description:
      'Guest experiences, farm tours, retreat programs, and visitor hospitality.',
    Icon: Compass,
  },
  {
    id: 'education',
    group: 'Community & experience',
    name: 'Education / Demo',
    description:
      'Workshops, demonstration plots, field learning, and public-facing teaching.',
    Icon: GraduationCap,
  },
  {
    id: 'wellness',
    group: 'Community & experience',
    name: 'Wellness Sanctuary',
    description:
      'Healing gardens, quiet retreat, contemplative trails, and sensory design.',
    Icon: HeartHandshake,
  },
];

// Groups in display order
const GROUPS: readonly string[] = [
  'Farm & homestead',
  'Ecological systems',
  'Community & experience',
];

// ---------------------------------------------------------------------------
// flat-value helpers
// ---------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// PurposeModel
// ---------------------------------------------------------------------------

export interface PurposeModel {
  elaboration: string;
}

// ---------------------------------------------------------------------------
// decode / encode
// ---------------------------------------------------------------------------

export function decodePurpose(value: FormValue): PurposeModel {
  return {
    elaboration: asString(value.elaboration),
  };
}

// Exact inverse of decodePurpose. Private (NOT exported).
function encodePurpose(model: PurposeModel): FormValue {
  return {
    elaboration: model.elaboration,
  };
}

// ---------------------------------------------------------------------------
// validity / summary
// ---------------------------------------------------------------------------

// Always valid: elaboration is optional and the primary type was set at
// project creation -- it is a pre-existing fact, not a new answer.
// Mirrors isStewardValid's "zero invites is a complete answer" rationale.
export function isPurposeValid(_model: PurposeModel): boolean {
  return true;
}

export function summarisePurpose(model: PurposeModel): string {
  const text = model.elaboration.trim();
  if (text === '') return 'Primary purpose confirmed';
  // Truncate to ~60 chars with ASCII ellipsis if longer.
  const MAX = 60;
  const truncated = text.length > MAX ? text.slice(0, MAX).trimEnd() + '...' : text;
  return 'Purpose: ' + truncated;
}

// ---------------------------------------------------------------------------
// component
// ---------------------------------------------------------------------------

export interface PurposeCaptureProps {
  itemId: string;
  value: FormValue;
  onChange: (next: FormValue) => void;
  projectId: string;
}

export default function PurposeCapture({
  value,
  onChange,
  projectId,
}: PurposeCaptureProps): JSX.Element {
  const model = decodePurpose(value);

  const emit = (next: PurposeModel) => onChange(encodePurpose(next));

  // STABLE single-ref selector (Zustand v5 -- .find returns an existing array
  // element, not a fresh object, so the reference is stable across renders
  // unless the project itself changes).
  const project: LocalProject | undefined = useProjectStore((s) =>
    s.projects.find(
      (p: LocalProject) => p.id === projectId || p.serverId === projectId,
    ),
  );

  const typeRecord = project?.metadata?.projectTypeRecord ?? null;

  const primaryTypeId: string | null = typeRecord?.primaryTypeId ?? null;
  const secondaryTypeIds: readonly string[] = typeRecord?.secondaryTypeIds ?? [];

  return (
    <div className={css.root}>
      {/* ---------- TYPE GRID ---------- */}
      {GROUPS.map((group) => {
        const cards = PURPOSE_GRID_CARDS.filter((c) => c.group === group);
        return (
          <div key={group} className={css.groupSection}>
            <span className={css.secLabel}>{group}</span>
            <div className={css.cardGrid}>
              {cards.map((card) => {
                const isPrimary = card.id === primaryTypeId;
                const isSecondary =
                  !isPrimary && secondaryTypeIds.includes(card.id);
                // +2 badge: canBeSecondary === true, NOT the current primary,
                // NOT already a chosen secondary. Data-driven from PROJECT_TYPES.
                const canBeSecondary =
                  findProjectType(card.id)?.canBeSecondary === true;
                const showCapabilityBadge =
                  canBeSecondary && !isPrimary && !isSecondary;

                return (
                  <div
                    key={card.id}
                    className={css.typeCard}
                    data-selected={isPrimary ? 'true' : undefined}
                    data-secondary={isSecondary ? 'true' : undefined}
                    data-type-id={card.id}
                  >
                    <div className={css.cardHeader}>
                      <card.Icon
                        size={13}
                        className={css.cardIcon}
                        aria-hidden="true"
                      />
                      <span className={css.cardName}>{card.name}</span>
                    </div>
                    <p className={css.cardDesc}>{card.description}</p>
                    <div className={css.badgeRow}>
                      {isPrimary ? (
                        <span className={css.primaryBadge}>Primary</span>
                      ) : null}
                      {isSecondary ? (
                        <span className={css.secondaryBadge}>Secondary</span>
                      ) : null}
                      {showCapabilityBadge ? (
                        <span
                          className={css.capabilityBadge}
                          title="Can also be used as a secondary type"
                        >
                          +2
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className={css.divider} />

      {/* ---------- READ-ONLY NOTE + EDIT LINK ---------- */}
      <div className={css.readOnlyNote}>
        <span>Primary type set in Plan - edit there to change</span>
        <EditInPlanButton
          projectId={projectId}
          editRoute={{ kind: 'plan-type' }}
        />
      </div>

      <div className={css.divider} />

      {/* ---------- ELABORATION FIELD ---------- */}
      <div>
        <div className={css.fieldLabel}>In plain language</div>
        <div className={css.fieldSubLabel}>(optional)</div>
        <textarea
          className={css.elaborationTa}
          aria-label="Primary purpose elaboration"
          value={model.elaboration}
          placeholder={'e.g. "A 45 ha property focused on rare provenance stock for ecological restoration supply." (1-2 sentences)'}
          onChange={(e) => emit({ elaboration: e.target.value })}
        />
      </div>

      {/* ---------- FEEDS CALLOUT ---------- */}
      <div className={css.feedsBlock}>
        <ArrowRight size={11} className={css.feedsIcon} aria-hidden="true" />
        <div className={css.feedsTxt}>
          The primary type anchors all tier objectives and design logic.
          Secondary types layer additional scope onto this foundation.
        </div>
      </div>
    </div>
  );
}
