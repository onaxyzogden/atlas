/**
 * StakeholderCapture -- store-direct (NOT controlled-over-draft).
 *
 * Architecture note:
 *   - The panel (ST4) owns completion/rationale/defer and passes a thin
 *     per-item completion MARKER (`markerValue` / `onMarkerChange`), a flat
 *     FormValue. For the cultural item (c3) that marker carries the single
 *     selected status + free notes. The other five items write NO marker --
 *     their state is the shared register itself.
 *   - Stakeholder rows live in `stakeholderRegisterStore` and are shared across
 *     all six s1-stakeholders items for the same project. This component
 *     subscribes to the store DIRECTLY and performs CRUD inline. It does NOT
 *     lift row state to the panel; the panel never touches rows.
 *   - Pure helpers (`stakeholderModeFor`, `isStakeholderValid`,
 *     `summariseStakeholder`) operate on a SNAPSHOT (rows array passed as arg)
 *     so they remain unit-testable without store wiring.
 *
 * Pixel reference: olos_stakeholders_mixed_surface.html (right-panels
 * #rp-neighbours c1, #rp-authority c2, #rp-indigenous c3, #rp-community c4,
 * #rp-relationships c5, #rp-channels c6). Raw mockup hex/fonts are NOT loaded
 * here; this file maps them to project tokens (see StakeholderCapture.module.css)
 * and lucide icons, matching BoundaryCapture conventions.
 */

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ExternalLink,
  Info,
  Leaf,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import {
  useStakeholderRegisterStore,
  EMPTY_STAKEHOLDERS_BY_ID,
} from '../../../store/stakeholderRegisterStore.js';
import type {
  StakeholderRecord,
  StakeholderType,
} from '../../../store/stakeholderRegisterStore.js';
import css from './StakeholderCapture.module.css';

// --------------------------------------------------------------------------
// Mode type + router (exported pure helper)
// --------------------------------------------------------------------------

export type StakeholderMode = 'mapContact' | 'contact' | 'cultural' | 'annotate';

// REVIEW S1 (mode router): c1 mapContact; c2/c4 + default contact; c3 cultural;
// c5/c6 annotate. Unchanged from prior pass.
export function stakeholderModeFor(itemId: string): StakeholderMode {
  switch (itemId) {
    case 's1-stakeholders-c1':
      return 'mapContact';
    case 's1-stakeholders-c3':
      return 'cultural';
    case 's1-stakeholders-c5':
    case 's1-stakeholders-c6':
      return 'annotate';
    case 's1-stakeholders-c2':
    case 's1-stakeholders-c4':
      return 'contact';
    default:
      return 'contact';
  }
}

// --------------------------------------------------------------------------
// Co-located authority categories (REVIEW S2)
// --------------------------------------------------------------------------

// REVIEW S2: grouped authority buttons mirror the mockup #rp-authority exactly
// (label shown on the button; name written to the register). Operator to confirm
// the four categories / eight authorities. ASCII hyphen, not en-dash.
interface AuthorityButton {
  label: string;
  name: string;
}
interface AuthorityCategory {
  category: string;
  buttons: readonly AuthorityButton[];
}
const AUTHORITY_CATEGORIES: readonly AuthorityCategory[] = [
  {
    category: 'Planning & council',
    buttons: [
      { label: 'Council Planning', name: 'Local Council - Planning' },
      { label: 'Council Environment', name: 'Local Council - Environment' },
    ],
  },
  {
    category: 'Water & land',
    buttons: [
      { label: 'Water Authority', name: 'State Water Authority' },
      { label: 'Catchment Management', name: 'Catchment Management Authority' },
    ],
  },
  {
    category: 'Heritage & conservation',
    buttons: [
      { label: 'Heritage Office', name: 'State Heritage Office' },
      { label: 'Parks & Wildlife', name: 'Parks & Wildlife Authority' },
    ],
  },
  {
    category: 'Agricultural & biosecurity',
    buttons: [
      { label: 'Agriculture Dept', name: 'Dept of Agriculture' },
      { label: 'Biosecurity', name: 'Biosecurity Authority' },
    ],
  },
];

// --------------------------------------------------------------------------
// Co-located cultural statuses (REVIEW S3 -- AMANAH-SENSITIVE)
// --------------------------------------------------------------------------

// REVIEW S3: the five Indigenous/cultural statuses mirror #rp-indigenous cards
// sc-1..sc-5. AMANAH-SENSITIVE: copy is taken verbatim from the operator mockup;
// do not reword without Scholar Council / operator review. `tone` maps to the
// mockup's per-card accent (amber/neutral/teal/green).
type CulturalTone = 'amber' | 'neutral' | 'teal' | 'green';
interface CulturalStatus {
  id: string;
  title: string;
  desc: string;
  consequence: string;
  tone: CulturalTone;
}
const CULTURAL_STATUSES: readonly CulturalStatus[] = [
  {
    id: 'not-investigated',
    title: 'Not yet investigated',
    desc: 'An enquiry has not yet been made with relevant cultural heritage authorities or traditional owners.',
    consequence:
      'A verification reminder will be generated in Act before any Tier 1 survey work begins.',
    tone: 'amber',
  },
  {
    id: 'enquiry-no-obligations',
    title: 'Enquiry made - no current obligations identified',
    desc: 'Relevant bodies have been contacted. No current formal obligations, protocols, or active relationships were identified for this parcel.',
    consequence: 'Record contact made and date in notes below.',
    tone: 'neutral',
  },
  {
    id: 'active-consultation',
    title: 'Active relationship or consultation in progress',
    desc: 'Traditional owners, custodians, or a cultural heritage body are actively engaged with this project or the land it occupies.',
    consequence: 'Record the contact and any agreed protocols in notes below.',
    tone: 'teal',
  },
  {
    id: 'assessment-required',
    title: 'Cultural heritage assessment required',
    desc: 'Specific areas cannot proceed to Act works until a cultural heritage assessment has been completed.',
    consequence:
      'Affected areas will be gated in Act. No earthworks or site works can proceed until assessment is attached.',
    tone: 'amber',
  },
  {
    id: 'formal-protocol',
    title: 'Formal protocol, agreement, or recognition in place',
    desc: 'A formal arrangement is documented and in place - such as a Land Use Agreement, ICH protocol, or formal recognition.',
    consequence: 'Attach the agreement document.',
    tone: 'green',
  },
];
const DEFAULT_CULTURAL_STATUS = 'not-investigated';

function culturalTitleFor(id: string): string {
  const found = CULTURAL_STATUSES.find((s) => s.id === id);
  return (found ?? CULTURAL_STATUSES[0]!).title;
}

// --------------------------------------------------------------------------
// Relationship-quality tone map (c5)
// --------------------------------------------------------------------------

// REVIEW S4: relationship pills map their display value to (a) the lowercased
// RelationshipStatus persisted on the row and (b) the mockup tone class
// (.rel-pill.active-*). Conflict=red, Tension=amber, Neutral=neutral,
// Goodwill=teal, Partnership=green.
type RelationshipTone = 'red' | 'amber' | 'neutral' | 'teal' | 'green';
const RELATIONSHIP_TONES: Record<string, RelationshipTone> = {
  Conflict: 'red',
  Tension: 'amber',
  Neutral: 'neutral',
  Goodwill: 'teal',
  Partnership: 'green',
};

// --------------------------------------------------------------------------
// Marker helpers (cultural item only)
// --------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function effectiveCulturalStatus(marker: FormValue): string {
  const s = asString(marker.culturalStatus);
  return s || DEFAULT_CULTURAL_STATUS;
}

// --------------------------------------------------------------------------
// Avatar initials
// --------------------------------------------------------------------------

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((w) => w.length > 0)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
    .slice(0, 2);
}

// --------------------------------------------------------------------------
// Validity helper (exported pure -- operates on snapshot)
// --------------------------------------------------------------------------

// REVIEW S5: validity per the spec table. There are NO "none" marker toggles
// anymore. c1 needs >=1 neighbour row; c2 needs >=1 authority row; c3/c4/c5/c6
// are always valid (c3: a status is always effectively selected; c4: "can record
// with none"; c5/c6: annotation is optional). c2 and c4 are both `contact` mode
// and c5 and c6 are both `annotate`, so we branch on the ITEM ID.
export function isStakeholderValid(
  itemId: string,
  rows: readonly StakeholderRecord[],
  _marker: FormValue,
): boolean {
  switch (itemId) {
    case 's1-stakeholders-c1':
      return rows.filter((r) => r.type === 'neighbour').length >= 1;
    case 's1-stakeholders-c2':
      return rows.filter((r) => r.type === 'authority').length >= 1;
    // c4 community, c3 cultural, c5 relationships, c6 channels: always valid.
    default:
      return true;
  }
}

// --------------------------------------------------------------------------
// Summary helper (exported pure -- operates on snapshot)
// --------------------------------------------------------------------------

// REVIEW S6: concise record summaries per the spec.
export function summariseStakeholder(
  itemId: string,
  rows: readonly StakeholderRecord[],
  marker: FormValue,
): string {
  switch (itemId) {
    case 's1-stakeholders-c1': {
      const n = rows.filter((r) => r.type === 'neighbour').length;
      return `${n} neighbour${n === 1 ? '' : 's'} recorded`;
    }
    case 's1-stakeholders-c2': {
      const n = rows.filter((r) => r.type === 'authority').length;
      return `${n} authority contact${n === 1 ? '' : 's'} recorded`;
    }
    case 's1-stakeholders-c4': {
      const n = rows.filter((r) => r.type === 'community').length;
      if (n === 0) return 'No community stakeholders recorded';
      return `${n} community stakeholder${n === 1 ? '' : 's'} recorded`;
    }
    case 's1-stakeholders-c3':
      return `Cultural status: ${culturalTitleFor(effectiveCulturalStatus(marker))}`;
    case 's1-stakeholders-c5': {
      const n = rows.filter((r) => !!r.relationshipStatus).length;
      return `${n} relationship${n === 1 ? '' : 's'} characterised`;
    }
    case 's1-stakeholders-c6': {
      const n = rows.filter((r) => (r.commsChannels?.length ?? 0) > 0).length;
      return `${n} stakeholder${n === 1 ? '' : 's'} with preferred channels`;
    }
    default:
      return '';
  }
}

// --------------------------------------------------------------------------
// Component props
// --------------------------------------------------------------------------

export interface StakeholderCaptureProps {
  itemId: string;
  projectId: string;
  resolveOptions: (optionSetId: string) => readonly string[];
  markerValue: FormValue;
  onMarkerChange: (next: FormValue) => void;
}

// --------------------------------------------------------------------------
// Default component
// --------------------------------------------------------------------------

export default function StakeholderCapture(
  props: StakeholderCaptureProps,
): JSX.Element {
  const { itemId, projectId, resolveOptions, markerValue, onMarkerChange } =
    props;

  // --- stable-snapshot selector (CRITICAL: avoids Zustand v5 infinite-render trap) ---
  const rowsById = useStakeholderRegisterStore(
    (s) => s.byProject[projectId] ?? EMPTY_STAKEHOLDERS_BY_ID,
  );
  const rows = useMemo(() => Object.values(rowsById), [rowsById]);

  // --- store actions (stable references in Zustand v5) ---
  const { createStakeholder, updateStakeholder, deleteStakeholder } =
    useStakeholderRegisterStore.getState();

  const mode = stakeholderModeFor(itemId);

  if (mode === 'mapContact') {
    return (
      <NeighboursBody
        projectId={projectId}
        rows={rows}
        resolveOptions={resolveOptions}
        createStakeholder={createStakeholder}
        deleteStakeholder={deleteStakeholder}
      />
    );
  }

  if (mode === 'cultural') {
    return (
      <CulturalBody markerValue={markerValue} onMarkerChange={onMarkerChange} />
    );
  }

  if (mode === 'annotate') {
    return (
      <AnnotateBody
        itemId={itemId}
        projectId={projectId}
        rows={rows}
        resolveOptions={resolveOptions}
        updateStakeholder={updateStakeholder}
      />
    );
  }

  // contact -- c2 (authority) vs c4 (community), branch on item id.
  if (itemId === 's1-stakeholders-c2') {
    return (
      <AuthorityBody
        projectId={projectId}
        rows={rows}
        createStakeholder={createStakeholder}
      />
    );
  }
  return (
    <CommunityBody
      projectId={projectId}
      rows={rows}
      resolveOptions={resolveOptions}
      createStakeholder={createStakeholder}
    />
  );
}

// --------------------------------------------------------------------------
// Shared action types
// --------------------------------------------------------------------------

type CreateFn = (
  projectId: string,
  seed: Omit<StakeholderRecord, 'id' | 'createdAt' | 'projectId'> &
    Partial<Pick<StakeholderRecord, 'id' | 'createdAt'>>,
) => StakeholderRecord;
type UpdateFn = (
  projectId: string,
  id: string,
  patch: Partial<StakeholderRecord>,
) => void;
type DeleteFn = (projectId: string, id: string) => void;

// --------------------------------------------------------------------------
// Shared map mock (decorative -- c1)
// --------------------------------------------------------------------------

function MapMock(): JSX.Element {
  return (
    <div className={css.mapMock}>
      <div className={css.mapImg}>
        <svg
          className={css.mapTopo}
          viewBox="0 0 290 110"
          aria-hidden="true"
          role="presentation"
        >
          <ellipse cx="145" cy="55" rx="105" ry="42" className={css.topoLine} />
          <ellipse cx="145" cy="55" rx="75" ry="30" className={css.topoLine} />
          <ellipse cx="145" cy="55" rx="45" ry="18" className={css.topoLine} />
        </svg>
        <div className={css.mapN1} />
        <div className={css.mapN2} />
        <div className={css.mapSite} />
        <span className={`${css.mapLbl} ${css.mapLblN1}`}>N1</span>
        <span className={`${css.mapLbl} ${css.mapLblN2}`}>N2</span>
        <span className={`${css.mapLbl} ${css.mapLblSite}`}>Your site</span>
      </div>
      <div className={css.mapToolsRow}>
        <button
          type="button"
          className={css.mapToolBtn}
          data-testid="stakeholder-pin-neighbour"
          disabled
        >
          <MapPin size={13} />
          <span>Pin neighbour</span>
        </button>
        <button
          type="button"
          className={`${css.mapToolBtn} ${css.mapToolBtnPrimary}`}
          data-testid="stakeholder-open-map"
          disabled
        >
          <ExternalLink size={13} />
          <span>Open map</span>
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Shared contact row (c1 / c2 / c4 registers)
// --------------------------------------------------------------------------

function ContactRow({
  row,
  avClass,
  onRemove,
}: {
  row: StakeholderRecord;
  avClass: string | undefined;
  onRemove?: () => void;
}): JSX.Element {
  return (
    <div className={css.contactRow}>
      <span className={`${css.av} ${avClass}`}>{initialsOf(row.name)}</span>
      <span className={css.crInfo}>
        <span className={css.crName}>{row.name}</span>
        {row.role ? <span className={css.crRole}>{row.role}</span> : null}
      </span>
      {onRemove ? (
        <button
          type="button"
          className={css.crDel}
          data-testid="stakeholder-remove"
          aria-label={`Remove ${row.name}`}
          onClick={onRemove}
        >
          <Trash2 size={13} />
        </button>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------------------
// Shared feeds block
// --------------------------------------------------------------------------

function FeedsBlock({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

// --------------------------------------------------------------------------
// NeighboursBody (c1, mapContact)
// --------------------------------------------------------------------------

function NeighboursBody({
  projectId,
  rows,
  resolveOptions,
  createStakeholder,
  deleteStakeholder,
}: {
  projectId: string;
  rows: StakeholderRecord[];
  resolveOptions: (id: string) => readonly string[];
  createStakeholder: CreateFn;
  deleteStakeholder: DeleteFn;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const neighbourRows = rows.filter((r) => r.type === 'neighbour');
  const typeOptions = resolveOptions('stakeholderNeighbourType');

  const handleAdd = () => {
    const role = selectedType || typeOptions[0] || 'Shares boundary';
    createStakeholder(projectId, {
      name: name.trim() || 'Unknown neighbour',
      type: 'neighbour',
      role,
    });
    setName('');
    setSelectedType('');
    setOpen(false);
  };

  return (
    <div className={css.root} data-mode="mapContact">
      <MapMock />

      <div className={css.section}>
        <div className={css.secLbl}>
          Neighbours in register
          <span className={css.secCount}>{neighbourRows.length}</span>
        </div>
        {neighbourRows.length > 0 && (
          <div className={css.rowList}>
            {neighbourRows.map((r) => (
              <ContactRow
                key={r.id}
                row={r}
                avClass={css.avN}
                onRemove={() => deleteStakeholder(projectId, r.id)}
              />
            ))}
          </div>
        )}

        {open ? (
          <div className={css.addForm}>
            <div className={css.fieldLbl}>Name or description</div>
            <input
              type="text"
              className={css.textInput}
              data-testid="stakeholder-name"
              placeholder="e.g. Sarah & Tom Mathews"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className={css.fieldLbl}>Relationship type</div>
            <div className={css.typeChips}>
              {typeOptions.map((opt) => {
                const active = selectedType === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    className={css.typeChip}
                    data-testid="stakeholder-neighbour-type"
                    data-active={active ? 'true' : 'false'}
                    aria-pressed={active}
                    onClick={() => setSelectedType(active ? '' : opt)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={css.primaryBtn}
              data-testid="stakeholder-add"
              onClick={handleAdd}
            >
              Add to register
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={css.addBtn}
            data-testid="stakeholder-add-neighbour"
            onClick={() => setOpen(true)}
          >
            <Plus size={13} />
            <span>Add neighbour</span>
          </button>
        )}
      </div>

      <FeedsBlock>
        Neighbours feed <strong>Plan: Land use constraint map</strong> and the
        Stakeholder Register Act handoff.
      </FeedsBlock>
    </div>
  );
}

// --------------------------------------------------------------------------
// AuthorityBody (c2, contact)
// --------------------------------------------------------------------------

function AuthorityBody({
  projectId,
  rows,
  createStakeholder,
}: {
  projectId: string;
  rows: StakeholderRecord[];
  createStakeholder: CreateFn;
}): JSX.Element {
  const authorityRows = rows.filter((r) => r.type === 'authority');
  const addedNames = new Set(authorityRows.map((r) => r.name));

  const handleAdd = (name: string) => {
    if (addedNames.has(name)) return;
    createStakeholder(projectId, {
      name,
      type: 'authority',
      role: 'Authority contact',
    });
  };

  return (
    <div className={css.root} data-mode="contact">
      <div className={css.section}>
        <div className={css.secLbl}>Add by authority type</div>
        {AUTHORITY_CATEGORIES.map((cat) => (
          <div className={css.authCat} key={cat.category}>
            <div className={css.authCatName}>{cat.category}</div>
            <div className={css.authTypes}>
              {cat.buttons.map((b) => {
                const added = addedNames.has(b.name);
                return (
                  <button
                    key={b.name}
                    type="button"
                    className={css.authBtn}
                    data-testid="stakeholder-auth-btn"
                    data-added={added ? 'true' : 'false'}
                    disabled={added}
                    onClick={() => handleAdd(b.name)}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className={css.section}>
        <div className={css.secLbl}>
          Added<span className={css.secCount}>{authorityRows.length}</span>
        </div>
        {authorityRows.length > 0 && (
          <div className={css.rowList}>
            {authorityRows.map((r) => (
              <ContactRow key={r.id} row={r} avClass={css.avA} />
            ))}
          </div>
        )}
      </div>

      <FeedsBlock>
        Authority contacts feed the <strong>Stakeholder Register</strong> and
        flag permits / consultation requirements in Act.
      </FeedsBlock>
    </div>
  );
}

// --------------------------------------------------------------------------
// CommunityBody (c4, contact)
// --------------------------------------------------------------------------

function CommunityBody({
  projectId,
  rows,
  resolveOptions,
  createStakeholder,
}: {
  projectId: string;
  rows: StakeholderRecord[];
  resolveOptions: (id: string) => readonly string[];
  createStakeholder: CreateFn;
}): JSX.Element {
  const communityRows = rows.filter((r) => r.type === 'community');
  const addedLabels = new Set(communityRows.map((r) => r.name));
  const typeOptions = resolveOptions('stakeholderCommunityType');

  const handleAddChip = (label: string) => {
    if (addedLabels.has(label)) return;
    createStakeholder(projectId, {
      name: label,
      type: 'community',
      role: 'Community member',
    });
  };

  const handleAddAnother = () => {
    createStakeholder(projectId, {
      name: 'Community member',
      type: 'community',
      role: 'Community member',
    });
  };

  return (
    <div className={css.root} data-mode="contact">
      <div className={css.section}>
        <div className={css.secLbl}>Add by community type</div>
        <div className={css.typeChips}>
          {typeOptions.map((opt) => {
            const added = addedLabels.has(opt);
            return (
              <button
                key={opt}
                type="button"
                className={css.typeChip}
                data-testid="stakeholder-community-chip"
                data-added={added ? 'true' : 'false'}
                disabled={added}
                onClick={() => handleAddChip(opt)}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className={css.section}>
        <div className={css.secLbl}>
          Added<span className={css.secCount}>{communityRows.length}</span>
        </div>
        {communityRows.length > 0 && (
          <div className={css.rowList}>
            {communityRows.map((r) => (
              <ContactRow key={r.id} row={r} avClass={css.avC} />
            ))}
          </div>
        )}
        <button
          type="button"
          className={css.addBtn}
          data-testid="stakeholder-add-another"
          onClick={handleAddAnother}
        >
          <Plus size={13} />
          <span>Add another</span>
        </button>
      </div>

      <FeedsBlock>
        Community contacts feed the <strong>Stakeholder Register</strong>.
      </FeedsBlock>
    </div>
  );
}

// --------------------------------------------------------------------------
// CulturalBody (c3, cultural) -- AMANAH-SENSITIVE
// --------------------------------------------------------------------------

function CulturalBody({
  markerValue,
  onMarkerChange,
}: {
  markerValue: FormValue;
  onMarkerChange: (next: FormValue) => void;
}): JSX.Element {
  // Effective status defaults to not-investigated when the marker is unset (the
  // mockup pre-selects sc-1). We do NOT mutate the marker during render -- the
  // default is purely a display/validity convenience; selecting a card writes it.
  const selected = effectiveCulturalStatus(markerValue);
  const notes = asString(markerValue.culturalNotes);

  const selectStatus = (id: string) => {
    onMarkerChange({ ...markerValue, culturalStatus: id });
  };
  const changeNotes = (text: string) => {
    onMarkerChange({ ...markerValue, culturalNotes: text });
  };

  return (
    <div className={css.root} data-mode="cultural">
      <div className={css.section}>
        <div className={`${css.secLbl} ${css.secLblCultural}`}>
          Current status - select one
        </div>
        {CULTURAL_STATUSES.map((s) => {
          const active = selected === s.id;
          return (
            <button
              key={s.id}
              type="button"
              className={css.statusCard}
              data-testid="cultural-status-card"
              data-status-id={s.id}
              data-tone={s.tone}
              data-active={active ? 'true' : 'false'}
              aria-pressed={active}
              onClick={() => selectStatus(s.id)}
            >
              <span className={css.scDot} data-tone={s.tone} />
              <span className={css.scBody}>
                <span className={css.scTitle}>{s.title}</span>
                <span className={css.scDesc}>{s.desc}</span>
                <span className={css.scConsequence}>{s.consequence}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={css.section}>
        <div className={css.secLbl}>Context, contacts, or notes</div>
        <textarea
          className={css.textTa}
          data-testid="cultural-notes"
          aria-label="Context, contacts, or notes"
          placeholder="Record any details of enquiries made, contacts, protocols, or agreements..."
          value={notes}
          onChange={(e) => changeNotes(e.target.value)}
        />
      </div>

      <div className={css.guidanceBlock}>
        <Info size={13} className={css.guidanceIcon} aria-hidden="true" />
        <div className={css.guidanceTxt}>
          This item cannot be left blank. Selecting "Not yet investigated" is an
          honest starting point - it is not a failure. It ensures OLOS generates
          a reminder before any land survey work begins.
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// AnnotateBody (c5 relationships / c6 channels)
// --------------------------------------------------------------------------

function AnnotateBody({
  itemId,
  projectId,
  rows,
  resolveOptions,
  updateStakeholder,
}: {
  itemId: string;
  projectId: string;
  rows: StakeholderRecord[];
  resolveOptions: (id: string) => readonly string[];
  updateStakeholder: UpdateFn;
}): JSX.Element {
  const isC5 = itemId === 's1-stakeholders-c5';

  if (rows.length === 0) {
    return (
      <div className={css.root} data-mode="annotate">
        <div className={css.section}>
          <div className={css.secLbl}>Stakeholders in register</div>
          <p className={css.emptyNote}>
            Add stakeholders in items 1-4 first.
            {isC5 ? (
              <>
                <br />
                {"They'll appear here for characterisation."}
              </>
            ) : null}
          </p>
        </div>
        <AnnotateFeeds isC5={isC5} />
      </div>
    );
  }

  return (
    <div className={css.root} data-mode="annotate">
      <div className={css.section}>
        <div className={css.secLbl}>
          Stakeholders in register
          <span className={css.secCount}>{rows.length}</span>
        </div>
        <div className={css.rowList}>
          {rows.map((r) =>
            isC5 ? (
              <RelationshipPerson
                key={r.id}
                projectId={projectId}
                row={r}
                resolveOptions={resolveOptions}
                updateStakeholder={updateStakeholder}
              />
            ) : (
              <ChannelPerson
                key={r.id}
                projectId={projectId}
                row={r}
                resolveOptions={resolveOptions}
                updateStakeholder={updateStakeholder}
              />
            ),
          )}
        </div>
      </div>
      <AnnotateFeeds isC5={isC5} />
    </div>
  );
}

function AnnotateFeeds({ isC5 }: { isC5: boolean }): JSX.Element {
  return isC5 ? (
    <FeedsBlock>
      Relationship quality feeds{' '}
      <strong>Act: Stakeholder engagement protocols</strong>. Conflict-flagged
      relationships will prompt a communication step before any Act task on
      shared boundary zones.
    </FeedsBlock>
  ) : (
    <FeedsBlock>
      Preferred channels feed <strong>Act: Notification delivery</strong> and{' '}
      <strong>Observation Architecture</strong> - tasks involving this
      stakeholder will use their preferred channel.
    </FeedsBlock>
  );
}

function avClassFor(type: StakeholderType | ''): string {
  if (type === 'neighbour') return css.avN ?? '';
  if (type === 'authority') return css.avA ?? '';
  return css.avC ?? '';
}

function RelationshipPerson({
  projectId,
  row,
  resolveOptions,
  updateStakeholder,
}: {
  projectId: string;
  row: StakeholderRecord;
  resolveOptions: (id: string) => readonly string[];
  updateStakeholder: UpdateFn;
}): JSX.Element {
  const options = resolveOptions('stakeholderRelationship');
  return (
    <div className={css.annoPerson}>
      <div className={css.apHead}>
        <span className={`${css.av} ${avClassFor(row.type)} ${css.avSmall}`}>
          {initialsOf(row.name)}
        </span>
        <span className={css.apName}>{row.name}</span>
        {row.role ? <span className={css.apRole}>{row.role}</span> : null}
      </div>
      <div className={css.apBody}>
        <div className={css.relPills}>
          {options.map((opt) => {
            const value = opt.toLowerCase();
            const active = row.relationshipStatus === value;
            const tone = RELATIONSHIP_TONES[opt] ?? 'neutral';
            return (
              <button
                key={opt}
                type="button"
                className={css.relPill}
                data-testid="annotate-relationship-pill"
                data-value={opt}
                data-tone={tone}
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
                onClick={() =>
                  updateStakeholder(projectId, row.id, {
                    relationshipStatus:
                      value as StakeholderRecord['relationshipStatus'],
                  })
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ChannelPerson({
  projectId,
  row,
  resolveOptions,
  updateStakeholder,
}: {
  projectId: string;
  row: StakeholderRecord;
  resolveOptions: (id: string) => readonly string[];
  updateStakeholder: UpdateFn;
}): JSX.Element {
  const options = resolveOptions('stakeholderCommsChannel');
  const current = row.commsChannels ?? [];
  return (
    <div className={css.annoPerson}>
      <div className={css.apHead}>
        <span className={`${css.av} ${avClassFor(row.type)} ${css.avSmall}`}>
          {initialsOf(row.name)}
        </span>
        <span className={css.apName}>{row.name}</span>
        {row.role ? <span className={css.apRole}>{row.role}</span> : null}
      </div>
      <div className={css.apBody}>
        <div className={css.chPills}>
          {options.map((opt) => {
            const active = current.includes(opt);
            const next = active
              ? current.filter((c) => c !== opt)
              : [...current, opt];
            return (
              <button
                key={opt}
                type="button"
                className={css.chPill}
                data-testid="annotate-channel-pill"
                data-value={opt}
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
                onClick={() =>
                  updateStakeholder(projectId, row.id, { commsChannels: next })
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
