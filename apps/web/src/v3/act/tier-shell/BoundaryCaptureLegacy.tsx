/**
 * BoundaryCapture -- a CONTROLLED, SELF-ROUTING renderer over a FLAT FormValue
 * (Record<string, string | string[]>) for the s1-boundaries objective. Unlike
 * the single-shape captures (VisionClassify, LabourInventory), this one switches
 * on `itemId` internally and renders one of several mode bodies. Each mode owns
 * a distinct typed model carrying a `kind` discriminant; the component decodes
 * the flat value into that model, edits the model, and re-encodes on every
 * change via the private `encodeBoundary` inverse -- so the persisted shape is
 * always a flat FormValue (string scalars + string[]).
 *
 * BT2 scope implements ONLY:
 *   c1 (s1-boundaries-c1) -- doc mode, titleDeed model
 *   c6 (s1-boundaries-c6) -- doc mode, covenant model
 *   c2 (s1-boundaries-c2) -- map mode, map model
 * The mode router (`boundaryModeFor`) already covers all 7 ids so later tasks
 * (c3 mapEntry; c4/c5/c7 decision) and badges can rely on it now. Until those
 * bodies land, `decodeBoundary` falls back to an empty map model for non-BT2
 * ids and the component renders the map body for them.
 *
 * Token note: mirrors the VisionClassifyCapture.module.css token vocabulary
 * (--color-text{,-muted,-subtle}, --color-surface{,-alt,-raised},
 * --color-border{,-subtle}, --color-success, --color-accent, --color-info,
 * --color-stage-act). The doc-upload action is a METADATA STUB -- it sets a
 * placeholder filename only; no file is read or stored.
 */
import {
  AlertTriangle,
  Check,
  FileText,
  Map as MapIcon,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import type { FormValue } from './actToolCatalog.js';
import css from './BoundaryCaptureLegacy.module.css';

export type BoundaryMode = 'doc' | 'map' | 'mapEntry' | 'decision';

// c1 title/deed (doc mode) and c6 covenant (doc mode) have DIFFERENT shapes,
// so each model carries a distinct `kind` discriminant.
export interface TitleDeedModel {
  kind: 'titleDeed';
  docName: string;
  docStatus: string;
  notes: string;
} // c1
export interface CovenantModel {
  kind: 'covenant';
  obligationTypes: string[];
  docName: string;
} // c6
export interface MapModel {
  kind: 'map';
  acknowledged: boolean;
  notes: string;
} // c2
export interface EasementModel {
  kind: 'mapEntry';
  easements: string[];
  implications: string[];
} // c3
// c4/c5/c7 are all `decision` mode but carry DISTINCT shapes -- each gets
// its own model kind.
export interface ZoningModel {
  kind: 'zoning';
  zoning: string;
  permittedUses: string[];
  reviewFlag: string;
  notes: string;
} // c4
export interface WaterModel {
  kind: 'water';
  sources: string[];
  entitlement: string;
  unit: string;
  status: string;
} // c5
export interface PermitsModel {
  kind: 'permits';
  activities: string[];
  notes: string;
} // c7
export type BoundaryModel =
  | TitleDeedModel
  | CovenantModel
  | MapModel
  | EasementModel
  | ZoningModel
  | WaterModel
  | PermitsModel;

const TITLE_DEED_DOC = 'Title document.pdf';
const COVENANT_DOC = 'Covenant document.pdf';

// --------------------------------------------------------------------------
// flat-value helpers (mirror DecisionWorkingPanel's asString / asArray)
// --------------------------------------------------------------------------

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')) : [];
}

// --------------------------------------------------------------------------
// mode router (ALL 7 ids + safe default)
// --------------------------------------------------------------------------

export function boundaryModeFor(itemId: string): BoundaryMode {
  switch (itemId) {
    case 's1-boundaries-c1':
      return 'doc';
    case 's1-boundaries-c2':
      return 'map';
    case 's1-boundaries-c3':
      return 'mapEntry';
    case 's1-boundaries-c6':
      return 'doc';
    case 's1-boundaries-c4':
    case 's1-boundaries-c5':
    case 's1-boundaries-c7':
      return 'decision';
    default:
      return 'decision';
  }
}

// --------------------------------------------------------------------------
// decode / encode
// --------------------------------------------------------------------------

export function decodeBoundary(itemId: string, value: FormValue): BoundaryModel {
  switch (itemId) {
    case 's1-boundaries-c1':
      return {
        kind: 'titleDeed',
        docName: asString(value.docName),
        docStatus: asString(value.docStatus),
        notes: asString(value.notes),
      };
    case 's1-boundaries-c6':
      return {
        kind: 'covenant',
        obligationTypes: asArray(value.obligationTypes),
        docName: asString(value.docName),
      };
    case 's1-boundaries-c2':
      return {
        kind: 'map',
        acknowledged: asString(value.acknowledged) === 'true',
        notes: asString(value.notes),
      };
    case 's1-boundaries-c3':
      return {
        kind: 'mapEntry',
        easements: asArray(value.easements),
        implications: asArray(value.implications),
      };
    case 's1-boundaries-c4':
      return {
        kind: 'zoning',
        zoning: asString(value.zoning),
        permittedUses: asArray(value.permittedUses),
        reviewFlag: asString(value.reviewFlag),
        notes: asString(value.notes),
      };
    case 's1-boundaries-c5':
      return {
        kind: 'water',
        sources: asArray(value.sources),
        entitlement: asString(value.entitlement),
        unit: asString(value.unit),
        status: asString(value.status),
      };
    case 's1-boundaries-c7':
      return {
        kind: 'permits',
        activities: asArray(value.activities),
        notes: asString(value.notes),
      };
    default:
      // Safe total fallback for unknown ids (every s1-boundaries id is
      // handled above).
      return { kind: 'map', acknowledged: false, notes: '' };
  }
}

function encodeBoundary(model: BoundaryModel): FormValue {
  switch (model.kind) {
    case 'titleDeed':
      return {
        docName: model.docName,
        docStatus: model.docStatus,
        notes: model.notes,
      };
    case 'covenant':
      return {
        obligationTypes: model.obligationTypes,
        docName: model.docName,
      };
    case 'map':
      return {
        acknowledged: model.acknowledged ? 'true' : '',
        notes: model.notes,
      };
    case 'mapEntry':
      return { easements: model.easements, implications: model.implications };
    case 'zoning':
      return {
        zoning: model.zoning,
        permittedUses: model.permittedUses,
        reviewFlag: model.reviewFlag,
        notes: model.notes,
      };
    case 'water':
      return {
        sources: model.sources,
        entitlement: model.entitlement,
        unit: model.unit,
        status: model.status,
      };
    case 'permits':
      return { activities: model.activities, notes: model.notes };
  }
}

// --------------------------------------------------------------------------
// validity / summary
// --------------------------------------------------------------------------

export function isBoundaryValid(_itemId: string, model: BoundaryModel): boolean {
  switch (model.kind) {
    case 'titleDeed':
      return model.docStatus !== '';
    case 'covenant':
      return model.obligationTypes.length >= 1;
    case 'map':
      return model.acknowledged === true;
    case 'mapEntry':
      return (
        model.easements.length >= 1 ||
        model.implications.includes('No implications')
      );
    case 'zoning':
      return model.zoning !== '' && model.reviewFlag !== '';
    case 'water':
      return model.sources.length >= 1 && model.status !== '';
    case 'permits':
      // Zero permits is a valid answer.
      return true;
    default:
      return false;
  }
}

export function summariseBoundary(_itemId: string, model: BoundaryModel): string {
  switch (model.kind) {
    case 'titleDeed':
      return `Status: ${model.docStatus || 'unset'}${
        model.docName ? '; ' + model.docName : ''
      }`;
    case 'covenant':
      return `${model.obligationTypes.length} obligation type(s): ${model.obligationTypes.join(
        ', ',
      )}`;
    case 'map':
      return model.acknowledged ? 'Boundaries acknowledged' : 'Not acknowledged';
    case 'mapEntry':
      return `${model.easements.length} easement(s); ${model.implications.length} implication(s)`;
    case 'zoning':
      return `Zoning: ${model.zoning || 'unset'}; ${model.permittedUses.length} use(s); ${model.reviewFlag || 'no flag'}`;
    case 'water':
      return `${model.sources.length} source(s); ${
        model.entitlement
          ? (model.entitlement + ' ' + (model.unit || '')).trim()
          : 'no entitlement'
      }; ${model.status || 'no status'}`;
    case 'permits':
      return `${model.activities.length} permit-required activity(ies)`;
    default:
      return '';
  }
}

// --------------------------------------------------------------------------
// component
// --------------------------------------------------------------------------

export interface BoundaryCaptureProps {
  itemId: string;
  value: FormValue;
  onChange: (next: FormValue) => void;
  resolveOptions: (optionSetId: string) => readonly string[];
}

function UploadZone({
  docName,
  onAttach,
  onRemove,
}: {
  docName: string;
  onAttach: () => void;
  onRemove: () => void;
}): JSX.Element {
  return (
    <div className={css.field}>
      <span className={css.label}>Attach documents</span>
      {docName ? (
        <div className={css.attached}>
          <FileText size={15} className={css.attachedIcon} />
          <span className={css.attachedName}>{docName}</span>
          <button
            type="button"
            className={css.attachedRemove}
            data-testid="doc-remove"
            aria-label={`Remove ${docName}`}
            onClick={onRemove}
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={css.uploadZone}
          data-testid="doc-upload"
          onClick={onAttach}
        >
          <UploadCloud size={20} className={css.uploadIcon} />
          <span className={css.uploadText}>Click to attach a document</span>
          <span className={css.uploadHint}>Metadata only -- file storage coming soon</span>
        </button>
      )}
    </div>
  );
}

function TitleDeedBody({
  model,
  options,
  onChange,
}: {
  model: TitleDeedModel;
  options: readonly string[];
  onChange: (next: FormValue) => void;
}): JSX.Element {
  const emit = (next: TitleDeedModel) => onChange(encodeBoundary(next));

  return (
    <div className={css.root}>
      <UploadZone
        docName={model.docName}
        onAttach={() => emit({ ...model, docName: TITLE_DEED_DOC })}
        onRemove={() => emit({ ...model, docName: '' })}
      />

      <div className={css.field}>
        <span className={css.label}>Document status</span>
        <div className={css.optionRow}>
          {options.map((opt) => {
            const active = model.docStatus === opt;
            return (
              <button
                key={opt}
                type="button"
                className={css.optionBtn}
                data-testid={`docstatus-${opt}`}
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
                onClick={() =>
                  emit({ ...model, docStatus: active ? '' : opt })
                }
              >
                {active ? <Check size={13} className={css.optionIcon} /> : null}
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={css.field}>
        <span className={css.label}>Notes</span>
        <textarea
          className={css.textarea}
          aria-label="Notes"
          value={model.notes}
          onChange={(e) => emit({ ...model, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

function CovenantBody({
  model,
  options,
  onChange,
}: {
  model: CovenantModel;
  options: readonly string[];
  onChange: (next: FormValue) => void;
}): JSX.Element {
  const emit = (next: CovenantModel) => onChange(encodeBoundary(next));

  const toggle = (opt: string) => {
    const has = model.obligationTypes.includes(opt);
    const obligationTypes = has
      ? model.obligationTypes.filter((t) => t !== opt)
      : [...model.obligationTypes, opt];
    emit({ ...model, obligationTypes });
  };

  return (
    <div className={css.root}>
      <div className={css.field}>
        <span className={css.label}>Obligation type</span>
        <div className={css.optionRow}>
          {options.map((opt) => {
            const active = model.obligationTypes.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                className={css.flagBtn}
                data-testid={`obligation-${opt}`}
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
                onClick={() => toggle(opt)}
              >
                <span className={css.flagIcon}>
                  {active ? <Check size={13} /> : <ShieldCheck size={13} />}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <UploadZone
        docName={model.docName}
        onAttach={() => emit({ ...model, docName: COVENANT_DOC })}
        onRemove={() => emit({ ...model, docName: '' })}
      />
    </div>
  );
}

function MapPreview(): JSX.Element {
  return (
    <div className={css.mapPreview}>
      <svg
        className={css.mapSvg}
        viewBox="0 0 240 120"
        aria-hidden="true"
        role="presentation"
      >
        <ellipse cx="120" cy="60" rx="96" ry="40" className={css.topoLine} />
        <ellipse cx="120" cy="60" rx="66" ry="26" className={css.topoLine} />
        <ellipse cx="120" cy="60" rx="36" ry="13" className={css.topoLine} />
        <polygon
          points="28,86 92,22 168,30 214,78 150,102 70,98"
          className={css.boundaryLine}
        />
      </svg>
      <div className={css.mapCaption}>
        <MapIcon size={13} className={css.mapCaptionIcon} />
        <span>Base layer preview</span>
      </div>
    </div>
  );
}

function MapBody({
  model,
  onChange,
}: {
  model: MapModel;
  onChange: (next: FormValue) => void;
}): JSX.Element {
  const emit = (next: MapModel) => onChange(encodeBoundary(next));

  return (
    <div className={css.root}>
      <MapPreview />

      <button
        type="button"
        className={css.openMapBtn}
        data-testid="open-map"
        disabled
      >
        <MapIcon size={15} />
        <span>Open map -- coming soon</span>
      </button>

      <button
        type="button"
        className={css.ackToggle}
        data-testid="ack-toggle"
        data-active={model.acknowledged ? 'true' : 'false'}
        aria-pressed={model.acknowledged}
        onClick={() => emit({ ...model, acknowledged: !model.acknowledged })}
      >
        <span className={css.ackBox}>
          {model.acknowledged ? <Check size={13} /> : null}
        </span>
        <span>Boundaries reviewed on base layer</span>
      </button>

      <div className={css.field}>
        <span className={css.label}>Notes</span>
        <textarea
          className={css.textarea}
          aria-label="Notes"
          value={model.notes}
          onChange={(e) => emit({ ...model, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

function EasementBody({
  model,
  options,
  onChange,
}: {
  model: EasementModel;
  options: readonly string[];
  onChange: (next: FormValue) => void;
}): JSX.Element {
  const emit = (next: EasementModel) => onChange(encodeBoundary(next));

  const editEasement = (index: number, text: string) => {
    const easements = model.easements.map((e, i) => (i === index ? text : e));
    emit({ ...model, easements });
  };

  const removeEasement = (index: number) => {
    const easements = model.easements.filter((_, i) => i !== index);
    emit({ ...model, easements });
  };

  const addEasement = () => {
    emit({ ...model, easements: [...model.easements, ''] });
  };

  const toggleImplication = (opt: string) => {
    const has = model.implications.includes(opt);
    const implications = has
      ? model.implications.filter((t) => t !== opt)
      : [...model.implications, opt];
    emit({ ...model, implications });
  };

  return (
    <div className={css.root}>
      <MapPreview />

      <div className={css.optionRow}>
        <button
          type="button"
          className={css.openMapBtn}
          data-testid="open-map"
          disabled
        >
          <MapIcon size={15} />
          <span>Open map -- coming soon</span>
        </button>
        <button
          type="button"
          className={css.openMapBtn}
          data-testid="pin-easement"
          disabled
        >
          <MapPin size={15} />
          <span>Pin easement</span>
        </button>
        <button
          type="button"
          className={css.openMapBtn}
          data-testid="draw-row"
          disabled
        >
          <MapIcon size={15} />
          <span>Draw ROW line</span>
        </button>
      </div>

      <div className={css.field}>
        <span className={css.label}>Easements identified</span>
        {model.easements.map((easement, index) => (
          <div className={css.easeRow} key={index}>
            <input
              type="text"
              className={css.easeInput}
              data-testid={`easement-input-${index}`}
              aria-label={`Easement ${index + 1}`}
              value={easement}
              onChange={(e) => editEasement(index, e.target.value)}
            />
            <button
              type="button"
              className={css.easeRemove}
              data-testid={`easement-remove-${index}`}
              aria-label={`Remove easement ${index + 1}`}
              onClick={() => removeEasement(index)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className={css.easeAdd}
          data-testid="easement-add"
          onClick={addEasement}
        >
          <Plus size={14} />
          <span>Add another easement</span>
        </button>
      </div>

      <div className={css.field}>
        <span className={css.label}>Planning implications</span>
        <div className={css.optionRow}>
          {options.map((opt) => {
            const active = model.implications.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                className={css.flagBtn}
                data-testid={`implication-${opt}`}
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
                onClick={() => toggleImplication(opt)}
              >
                <span className={css.flagIcon}>
                  {active ? <Check size={13} /> : <ShieldCheck size={13} />}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ZoningBody({
  model,
  resolveOptions,
  onChange,
}: {
  model: ZoningModel;
  resolveOptions: (optionSetId: string) => readonly string[];
  onChange: (next: FormValue) => void;
}): JSX.Element {
  const emit = (next: ZoningModel) => onChange(encodeBoundary(next));

  const zoningOptions = resolveOptions('boundaryZoning');
  const useOptions = resolveOptions('boundaryPermittedUses');
  const reviewOptions = resolveOptions('boundaryZoningReview');

  const toggleUse = (opt: string) => {
    const has = model.permittedUses.includes(opt);
    const permittedUses = has
      ? model.permittedUses.filter((u) => u !== opt)
      : [...model.permittedUses, opt];
    emit({ ...model, permittedUses });
  };

  return (
    <div className={css.root}>
      <div className={css.field}>
        <span className={css.label}>Primary zoning classification</span>
        <select
          className={css.selectInput}
          data-testid="zoning-select"
          aria-label="Primary zoning classification"
          value={model.zoning}
          onChange={(e) => emit({ ...model, zoning: e.target.value })}
        >
          <option value="">Select a classification</option>
          {zoningOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className={css.field}>
        <span className={css.label}>Permitted uses confirmed</span>
        <div className={css.checkRow}>
          {useOptions.map((opt) => (
            <label key={opt} className={css.checkLabel}>
              <input
                type="checkbox"
                data-testid={`use-${opt}`}
                checked={model.permittedUses.includes(opt)}
                onChange={() => toggleUse(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={css.field}>
        <span className={css.label}>Anything requiring further review?</span>
        <div className={css.optionRow}>
          {reviewOptions.map((opt) => {
            const active = model.reviewFlag === opt;
            return (
              <button
                key={opt}
                type="button"
                className={css.flagBtn}
                data-testid={`review-${opt}`}
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
                onClick={() =>
                  emit({ ...model, reviewFlag: active ? '' : opt })
                }
              >
                <span className={css.flagIcon}>
                  {active ? <Check size={13} /> : <ShieldCheck size={13} />}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={css.field}>
        <span className={css.label}>Notes (optional)</span>
        <textarea
          className={css.textarea}
          aria-label="Notes"
          value={model.notes}
          onChange={(e) => emit({ ...model, notes: e.target.value })}
        />
      </div>
    </div>
  );
}

function WaterBody({
  model,
  resolveOptions,
  onChange,
}: {
  model: WaterModel;
  resolveOptions: (optionSetId: string) => readonly string[];
  onChange: (next: FormValue) => void;
}): JSX.Element {
  const emit = (next: WaterModel) => onChange(encodeBoundary(next));

  const sourceOptions = resolveOptions('boundaryWaterSources');
  const unitOptions = resolveOptions('boundaryWaterUnit');
  const statusOptions = resolveOptions('boundaryWaterStatus');

  const toggleSource = (opt: string) => {
    const has = model.sources.includes(opt);
    const sources = has
      ? model.sources.filter((s) => s !== opt)
      : [...model.sources, opt];
    emit({ ...model, sources });
  };

  return (
    <div className={css.root}>
      <div className={css.field}>
        <span className={css.label}>Water sources available on the land</span>
        <div className={css.checkRow}>
          {sourceOptions.map((opt) => (
            <label key={opt} className={css.checkLabel}>
              <input
                type="checkbox"
                data-testid={`source-${opt}`}
                checked={model.sources.includes(opt)}
                onChange={() => toggleSource(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={css.field}>
        <span className={css.label}>Annual entitlement (if licenced)</span>
        <div className={css.numRow}>
          <input
            type="number"
            className={css.numInput}
            data-testid="water-entitlement"
            aria-label="Annual entitlement"
            placeholder="Volume"
            value={model.entitlement}
            onChange={(e) => emit({ ...model, entitlement: e.target.value })}
          />
          <select
            className={css.unitSelect}
            data-testid="water-unit"
            aria-label="Unit"
            value={model.unit}
            onChange={(e) => emit({ ...model, unit: e.target.value })}
          >
            <option value="">Unit</option>
            {unitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <span className={css.fieldNote}>
          Leave blank if unknown -- flag for investigation
        </span>
      </div>

      <div className={css.field}>
        <span className={css.label}>Status</span>
        <div className={css.optionRow}>
          {statusOptions.map((opt) => {
            const active = model.status === opt;
            return (
              <button
                key={opt}
                type="button"
                className={css.flagBtn}
                data-testid={`waterstatus-${opt}`}
                data-active={active ? 'true' : 'false'}
                aria-pressed={active}
                onClick={() => emit({ ...model, status: active ? '' : opt })}
              >
                <span className={css.flagIcon}>
                  {active ? <Check size={13} /> : <ShieldCheck size={13} />}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PermitsBody({
  model,
  resolveOptions,
  onChange,
}: {
  model: PermitsModel;
  resolveOptions: (optionSetId: string) => readonly string[];
  onChange: (next: FormValue) => void;
}): JSX.Element {
  const emit = (next: PermitsModel) => onChange(encodeBoundary(next));

  const activityOptions = resolveOptions('boundaryPermitActivities');

  const toggleActivity = (opt: string) => {
    const has = model.activities.includes(opt);
    const activities = has
      ? model.activities.filter((a) => a !== opt)
      : [...model.activities, opt];
    emit({ ...model, activities });
  };

  return (
    <div className={css.root}>
      <div className={css.field}>
        <span className={css.label}>Activities that will need a permit</span>
        <div className={css.checkRow}>
          {activityOptions.map((opt) => (
            <label key={opt} className={css.checkLabel}>
              <input
                type="checkbox"
                data-testid={`activity-${opt}`}
                checked={model.activities.includes(opt)}
                onChange={() => toggleActivity(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      </div>

      <div className={css.field}>
        <span className={css.label}>Any additional permit notes</span>
        <textarea
          className={css.textarea}
          aria-label="Notes"
          value={model.notes}
          onChange={(e) => emit({ ...model, notes: e.target.value })}
        />
      </div>

      <div className={css.advisory}>
        <AlertTriangle size={15} className={css.advisoryIcon} />
        <span>
          Permit-required activities cannot receive an Act handoff approval
          until the permit is obtained and attached as a document.
        </span>
      </div>
    </div>
  );
}

export default function BoundaryCapture({
  itemId,
  value,
  onChange,
  resolveOptions,
}: BoundaryCaptureProps): JSX.Element {
  const model = decodeBoundary(itemId, value);

  switch (model.kind) {
    case 'titleDeed':
      return (
        <TitleDeedBody
          model={model}
          options={resolveOptions('boundaryDocStatus')}
          onChange={onChange}
        />
      );
    case 'covenant':
      return (
        <CovenantBody
          model={model}
          options={resolveOptions('boundaryCovenantTypes')}
          onChange={onChange}
        />
      );
    case 'mapEntry':
      return (
        <EasementBody
          model={model}
          options={resolveOptions('boundaryEasementImplications')}
          onChange={onChange}
        />
      );
    case 'zoning':
      return (
        <ZoningBody
          model={model}
          resolveOptions={resolveOptions}
          onChange={onChange}
        />
      );
    case 'water':
      return (
        <WaterBody
          model={model}
          resolveOptions={resolveOptions}
          onChange={onChange}
        />
      );
    case 'permits':
      return (
        <PermitsBody
          model={model}
          resolveOptions={resolveOptions}
          onChange={onChange}
        />
      );
    case 'map':
    default:
      return <MapBody model={model} onChange={onChange} />;
  }
}
