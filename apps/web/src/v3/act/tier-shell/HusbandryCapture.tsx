/**
 * HusbandryCapture -- a 6-mode ADVISORY pure-FormValue capture for the
 * silvopasture objective silv-sec-s4-husbandry-framework ("A sound livestock
 * husbandry & welfare framework", 6 checklist items c1..c6). Catalogue item
 * order == mode order:
 *
 *   c1 -> health    (animal health program -- vaccination, parasite, vet)
 *   c2 -> breeding  (breeding / replacement strategy + seasonal calendar)
 *   c3 -> welfare   (daily welfare standard -- feed, water, shade, low stress)
 *   c4 -> halal     (humane and halal handling + slaughter-pathway intent)
 *   c5 -> records   (record-keeping -- numbers, health events, movements)
 *   c6 -> labour    (husbandry fit against available labour)
 *
 * Structure mirrors LivestockIntentCapture / CarryingCapacityCapture (the
 * canonical advisory multi-mode captures): a `husbandryModeFor(itemId)` mapper,
 * the `asStr` FormValue coercion helper, per-mode discriminated-union models,
 * decode/encode (encode is the lossless inverse of decode), is*Valid,
 * summarise*, the props interface, and a single component that renders ONE mode
 * body. Props are {mode, value, onChange, itemId, siblingValues?} -- NO
 * projectId, NO store writes. The panel chrome (eyebrow / title / hint /
 * Record-Defer footer) is owned by the third-column host.
 *
 * CONTROLLED / pure: the model is derived from decode(value) each render; the
 * full next model is emitted via onChange(encode(next)). The capture holds NO
 * local state for PERSISTED values.
 *
 * decode NEVER throws and NEVER fabricates seed data: every text field defaults
 * to EMPTY string (""); halal/labour gates default to false; breeding strategy
 * defaults to null (and an out-of-set raw value coerces back to null).
 *
 * AMANAH / COVENANT NOTES (reviewed 2026-06-10, operator-approved):
 *
 *  - c4 halal handling foregrounds the niyyah of halal stewardship and the
 *    classic dhakah conditions, INCLUDING Tasmiyah (pronouncing the name of
 *    Allah at slaughter) -- delta A of the copy-review gate.
 *
 *  - c4 carries an EXPLICIT pig-output exclusion (delta B): the slaughter /
 *    meat pathway applies ONLY to stock raised for meat. Working animals kept
 *    for non-food ecological or labour roles -- e.g. pigs (khinzir) for
 *    land-clearing, tilling, or waste cycling -- are categorically excluded
 *    from the slaughter-for-consumption pathway; their flesh is never taken as
 *    human food. This honours the pig ruling on the OUTPUT/YIELD side while the
 *    animal's working presence remains permitted upstream.
 *
 *  - The commercial / certified-abattoir + off-farm sale pathway is DEFERRED,
 *    not authored here (consistent with the Amanah discipline around premature
 *    sale-channel framing). Only the on-farm traditional pathway is described.
 *
 * ASCII-only: em-dash -> " - "; no smart quotes; apostrophes use double-quoted
 * JS strings.
 */

import * as React from 'react';

import type { FormValue } from './actToolCatalog.js';
import {
  ChoiceCardGrid,
  InterpretationBlock,
  SectionEyebrow,
} from './captures/controls/index.js';
import type { ChoiceCardOption } from './captures/controls/index.js';
import css from './HusbandryCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type HusbandryMode =
  | 'health' // c1
  | 'breeding' // c2
  | 'welfare' // c3
  | 'halal' // c4
  | 'records' // c5
  | 'labour'; // c6

export const HUSBANDRY_PREFIX = 'silv-sec-s4-husbandry-framework';
const PREFIX_DASH = HUSBANDRY_PREFIX + '-';

export function husbandryModeFor(itemId: string): HusbandryMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  const suffix = itemId.slice(PREFIX_DASH.length);
  switch (suffix) {
    case 'c1':
      return 'health';
    case 'c2':
      return 'breeding';
    case 'c3':
      return 'welfare';
    case 'c4':
      return 'halal';
    case 'c5':
      return 'records';
    case 'c6':
      return 'labour';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Models (discriminated union by `kind`)
// ---------------------------------------------------------------------------

export interface HealthModel {
  kind: 'health';
  vetNotes: string;
}
export interface BreedingModel {
  kind: 'breeding';
  /** one breeding strategy id, or null = none */
  strategy: string | null;
  notes: string;
}
export interface WelfareModel {
  kind: 'welfare';
  notes: string;
}
export interface HalalModel {
  kind: 'halal';
  pathwayAcknowledged: boolean;
  notes: string;
}
export interface RecordsModel {
  kind: 'records';
  notes: string;
}
export interface LabourModel {
  kind: 'labour';
  confirmed: boolean;
  notes: string;
}

export type HusbandryModel =
  | HealthModel
  | BreedingModel
  | WelfareModel
  | HalalModel
  | RecordsModel
  | LabourModel;

// ---------------------------------------------------------------------------
// Verbatim constants
// ---------------------------------------------------------------------------

interface BreedingSpec {
  id: string;
  title: string;
  description: string;
}

/**
 * Breeding strategy options. NOTE the AI/ET id is "aiet", not "ai" -- an
 * out-of-set raw value (including "ai") must decode back to null.
 */
export const BREEDING_STRATEGIES: readonly BreedingSpec[] = [
  {
    id: 'autumn',
    title: 'Autumn joining',
    description:
      'Rams in around March - April for an August - September lambing onto rising spring feed. Aligns the labour peak with the warmer months.',
  },
  {
    id: 'spring',
    title: 'Spring joining',
    description:
      'Rams in around October for an autumn lambing. Suits milder zones; ewes lamb onto a managed autumn break rather than peak spring growth.',
  },
  {
    id: 'aiet',
    title: 'AI / ET program',
    description:
      'Artificial insemination or embryo transfer for accelerated genetic gain. Higher cost and skill; usually layered onto a natural-joining base flock.',
  },
];

const BREEDING_BY_ID = new Map<string, BreedingSpec>(
  BREEDING_STRATEGIES.map((b) => [b.id, b]),
);
const BREEDING_IDS = new Set<string>(BREEDING_STRATEGIES.map((b) => b.id));

interface InfoCard {
  title: string;
  body: string;
}

// c1 health -- two health sections + a vet card.
const HEALTH_SECTIONS: readonly InfoCard[] = [
  {
    title: 'Vaccination -- Merino ewes',
    body:
      'Annual 5-in-1 (or 6-in-1) clostridial booster pre-lambing, with lamb marking and weaning boosters. Record batch, date, and withholding periods.',
  },
  {
    title: 'Internal parasite management',
    body:
      'Worm-egg-count monitoring before drenching, strategic summer drench, and OJD risk-zone classification for the property to guide biosecurity.',
  },
];
const VET_CARD: InfoCard = {
  title: 'Veterinary relationship',
  body:
    'Name a regular veterinarian or remote service before stock arrive: routine herd-health planning, emergency cover, and prescription animal remedies.',
};

// c3 welfare -- five welfare domains.
const WELFARE_DOMAINS: readonly InfoCard[] = [
  {
    title: 'Feed',
    body:
      'Year-round nutrition plan with a feed gap and supplement strategy; maintain a body condition score >= 2.5 across the flock.',
  },
  {
    title: 'Water',
    body:
      'Clean, reliable water within reach of every paddock at full stocking, including a heatwave reserve and a trough-failure fallback.',
  },
  {
    title: 'Shade & shelter',
    body:
      'Accessible shade in every paddock; when forecast is above 30C, shift handling to the cool of the morning and ensure water and shade access.',
  },
  {
    title: 'Health & body condition',
    body:
      'Regular condition scoring, lameness and flystrike checks, and prompt treatment or humane culling of animals that cannot be restored to welfare.',
  },
  {
    title: 'Low-stress handling',
    body:
      'Calm, quiet stock-handling using flight-zone and pressure-release technique; well-designed yards; no dogs or prods that cause needless fear.',
  },
];

// c5 records -- four record rows.
const RECORD_ROWS: readonly InfoCard[] = [
  {
    title: 'Stock register',
    body:
      'Opening numbers, births, deaths, purchases, and transfers by mob and class, reconciled at each muster.',
  },
  {
    title: 'Health event log',
    body:
      'Vaccinations, drenches, treatments, and their withholding periods, with batch numbers retained for traceability.',
  },
  {
    title: 'Halal slaughter records',
    body:
      'For any stock taken for meat: date, person, method, and confirmation of niyyah and Tasmiyah, kept with the stock register.',
  },
  {
    title: 'Zakat records',
    body:
      'Herd count held at the zakat anniversary (hawl) so the livestock zakat obligation can be assessed and discharged.',
  },
];

// c6 labour -- four seasonal periods.
const LABOUR_PERIODS: readonly InfoCard[] = [
  {
    title: 'Light Jan-Mar',
    body: 'Routine checks, water and shade monitoring, summer drench and observation.',
  },
  {
    title: 'Moderate Apr-Jul',
    body: 'Joining, pregnancy scanning, and pre-lambing vaccination and condition management.',
  },
  {
    title: 'PEAK Aug-Nov',
    body: 'Lambing, lamb marking, crutching, and shearing concentrate the heaviest labour of the year.',
  },
  {
    title: 'Moderate Dec',
    body: 'Weaning, pre-summer health check, and ram soundness review ahead of the next joining.',
  },
];

// c4 halal -- the dhakah requirements (includes Tasmiyah, delta A).
const HALAL_REQUIREMENTS: readonly string[] = [
  'The animal must be alive, healthy, and free from visible disease at the moment of slaughter.',
  'Tasmiyah - the name of Allah is pronounced (Bismillah, Allahu akbar) by the one who slaughters.',
  'A swift, single pass of a sharp blade, severing the trachea, oesophagus, and the two jugular vessels.',
  'Full, complete blood drainage before any further handling or skinning.',
  "The blade is sharpened out of the animal's sight, and no animal is slaughtered within sight of another.",
  'Facing the qiblah where practicable, with calm, unhurried handling throughout.',
];

// ---------------------------------------------------------------------------
// FormValue coercion helper (mirror Livestock / CarryingCapacity convention)
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

// ---------------------------------------------------------------------------
// decode: FormValue -> HusbandryModel (TOTAL / defensive; never throws /
// fabricates seed data)
// ---------------------------------------------------------------------------

export function decodeHusbandry(mode: HusbandryMode, value: FormValue): HusbandryModel {
  switch (mode) {
    case 'health':
      return { kind: 'health', vetNotes: asStr(value.hbVetNotes) };
    case 'breeding': {
      const raw = asStr(value.hbStrategy);
      return {
        kind: 'breeding',
        strategy: BREEDING_IDS.has(raw) ? raw : null,
        notes: asStr(value.hbBreedingNotes),
      };
    }
    case 'welfare':
      return { kind: 'welfare', notes: asStr(value.hbWelfareNotes) };
    case 'halal':
      return {
        kind: 'halal',
        pathwayAcknowledged: asStr(value.hbPathwayAck) === 'yes',
        notes: asStr(value.hbHalalNotes),
      };
    case 'records':
      return { kind: 'records', notes: asStr(value.hbRecordsNotes) };
    case 'labour':
      return {
        kind: 'labour',
        confirmed: asStr(value.hbLabourConfirmed) === 'yes',
        notes: asStr(value.hbLabourNotes),
      };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown HusbandryMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: HusbandryModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeHusbandry(_mode: HusbandryMode, model: HusbandryModel): FormValue {
  switch (model.kind) {
    case 'health':
      return { hbVetNotes: model.vetNotes };
    case 'breeding':
      return { hbStrategy: model.strategy ?? '', hbBreedingNotes: model.notes };
    case 'welfare':
      return { hbWelfareNotes: model.notes };
    case 'halal':
      return {
        hbPathwayAck: model.pathwayAcknowledged ? 'yes' : '',
        hbHalalNotes: model.notes,
      };
    case 'records':
      return { hbRecordsNotes: model.notes };
    case 'labour':
      return {
        hbLabourConfirmed: model.confirmed ? 'yes' : '',
        hbLabourNotes: model.notes,
      };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown HusbandryModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (advisory: only halal gates; the rest are always recordable)
// ---------------------------------------------------------------------------

export function isHusbandryValid(mode: HusbandryMode, value: FormValue): boolean {
  if (mode === 'halal') {
    return (decodeHusbandry('halal', value) as HalalModel).pathwayAcknowledged === true;
  }
  return true;
}

// ---------------------------------------------------------------------------
// summaries (one line per mode; defensive)
// ---------------------------------------------------------------------------

export function summariseHusbandry(mode: HusbandryMode, value: FormValue): string {
  switch (mode) {
    case 'health': {
      const m = decodeHusbandry('health', value) as HealthModel;
      return m.vetNotes.trim() !== ''
        ? 'Animal health program noted'
        : 'Animal health program - vet relationship pending';
    }
    case 'breeding': {
      const m = decodeHusbandry('breeding', value) as BreedingModel;
      const spec = m.strategy ? BREEDING_BY_ID.get(m.strategy) : undefined;
      return spec ? `Breeding strategy: ${spec.title}` : 'Breeding strategy not selected';
    }
    case 'welfare':
      return 'Daily welfare standard recorded';
    case 'halal': {
      const m = decodeHusbandry('halal', value) as HalalModel;
      return m.pathwayAcknowledged
        ? 'Halal handling pathway acknowledged (on-farm)'
        : 'Halal handling pathway not yet acknowledged';
    }
    case 'records':
      return 'Record-keeping framework defined';
    case 'labour': {
      const m = decodeHusbandry('labour', value) as LabourModel;
      return m.confirmed
        ? 'Husbandry confirmed to fit available labour'
        : 'Labour fit reviewed';
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown HusbandryMode: ${String(_exhaustive)}`);
    }
  }
}

// ===========================================================================
// React component + 6 mode bodies (c1..c6)
// ===========================================================================

export interface HusbandryCaptureProps {
  mode: HusbandryMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. silv-sec-s4-husbandry-framework-c1). */
  itemId: string;
  /** full per-item FormValue map (unused -- no mode reads siblings here). */
  siblingValues?: Record<string, FormValue>;
}

function InfoCardList({ cards }: { cards: readonly InfoCard[] }): React.JSX.Element {
  return (
    <div className={css.cardList}>
      {cards.map((c) => (
        <div key={c.title} className={css.card}>
          <div className={css.cardTitle}>{c.title}</div>
          <div className={css.cardBody}>{c.body}</div>
        </div>
      ))}
    </div>
  );
}

function FeedsNote({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

export function HusbandryCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: HusbandryCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- c1: health ----------------------------------------------------------
  if (mode === 'health') {
    const model = decodeHusbandry('health', value) as HealthModel;
    return (
      <div className={css.root} data-hb-mode="health">
        <div>
          <SectionEyebrow>Animal health program</SectionEyebrow>
          <InfoCardList cards={HEALTH_SECTIONS} />
        </div>
        <div className={css.card}>
          <div className={css.cardTitle}>{VET_CARD.title}</div>
          <div className={css.cardBody}>{VET_CARD.body}</div>
        </div>
        <div>
          <label className={css.fieldLbl} htmlFor="hb-vet-notes">
            Veterinary notes
          </label>
          <textarea
            id="hb-vet-notes"
            className={css.notesArea}
            value={model.vetNotes}
            onChange={(e) =>
              onChange(
                encodeHusbandry('health', { kind: 'health', vetNotes: e.target.value }),
              )
            }
            placeholder="Vet name, herd-health plan, emergency cover..."
          />
        </div>
        <FeedsNote>
          The health program follows the{' '}
          <strong>candidate species and biosecurity risk</strong> recorded
          upstream, and feeds the record-keeping and labour plan.
        </FeedsNote>
      </div>
    );
  }

  // -- c2: breeding --------------------------------------------------------
  if (mode === 'breeding') {
    const model = decodeHusbandry('breeding', value) as BreedingModel;
    const options: ChoiceCardOption[] = BREEDING_STRATEGIES.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
    }));
    const set = (patch: Partial<Omit<BreedingModel, 'kind'>>): void =>
      onChange(encodeHusbandry('breeding', { ...model, ...patch, kind: 'breeding' }));
    return (
      <div className={css.root} data-hb-mode="breeding">
        <div>
          <SectionEyebrow>Breeding / replacement strategy</SectionEyebrow>
          <ChoiceCardGrid
            options={options}
            value={model.strategy !== null ? [model.strategy] : []}
            onChange={(next) => set({ strategy: next[0] ?? null })}
            columns={1}
            ariaLabel="Breeding strategy"
          />
        </div>
        <FeedsNote>
          Seasonal husbandry calendar: <strong>Labour peak -- August to November</strong>{' '}
          for lambing, marking, and shearing. The strategy sets the joining and
          replacement rhythm for the year.
        </FeedsNote>
        <div>
          <label className={css.fieldLbl} htmlFor="hb-breeding-notes">
            Breeding notes
          </label>
          <textarea
            id="hb-breeding-notes"
            className={css.notesArea}
            value={model.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Ram selection, replacement rate, calendar adjustments..."
          />
        </div>
      </div>
    );
  }

  // -- c3: welfare ---------------------------------------------------------
  if (mode === 'welfare') {
    const model = decodeHusbandry('welfare', value) as WelfareModel;
    return (
      <div className={css.root} data-hb-mode="welfare">
        <div>
          <SectionEyebrow>Daily welfare standard</SectionEyebrow>
          <InfoCardList cards={WELFARE_DOMAINS} />
        </div>
        <InterpretationBlock tone="pass">
          {'"Allah has prescribed ihsan (excellence) in all things. So when you '}
          {'slaughter, slaughter well; let each of you sharpen his blade and spare '}
          {'suffering to the animal." -- Sahih Muslim 1955. Ihsan governs the daily '}
          {'standard of care, not only the moment of slaughter.'}
        </InterpretationBlock>
        <div>
          <label className={css.fieldLbl} htmlFor="hb-welfare-notes">
            Welfare notes
          </label>
          <textarea
            id="hb-welfare-notes"
            className={css.notesArea}
            value={model.notes}
            onChange={(e) =>
              onChange(
                encodeHusbandry('welfare', { kind: 'welfare', notes: e.target.value }),
              )
            }
            placeholder="Site-specific welfare commitments, shade plan, handling protocol..."
          />
        </div>
      </div>
    );
  }

  // -- c4: halal (gating) --------------------------------------------------
  if (mode === 'halal') {
    const model = decodeHusbandry('halal', value) as HalalModel;
    const setNotes = (notes: string): void =>
      onChange(
        encodeHusbandry('halal', {
          kind: 'halal',
          pathwayAcknowledged: model.pathwayAcknowledged,
          notes,
        }),
      );
    const toggleAck = (): void =>
      onChange(
        encodeHusbandry('halal', {
          kind: 'halal',
          pathwayAcknowledged: !model.pathwayAcknowledged,
          notes: model.notes,
        }),
      );
    return (
      <div className={css.root} data-hb-mode="halal">
        <div className={css.doctrine}>
          This operation affirms the niyyah (intention) of halal stewardship: stock
          raised for meat are handled and slaughtered in a manner that is both humane
          and lawful, by a sane adult Muslim, in obedience to the Sharia and in ihsan
          toward the animal.
        </div>
        <div>
          <SectionEyebrow>Halal slaughter requirements</SectionEyebrow>
          <ul className={css.reqList}>
            {HALAL_REQUIREMENTS.map((req) => (
              <li key={req} className={css.reqItem}>
                <span className={css.reqMark} aria-hidden="true">
                  +
                </span>
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={css.card}>
          <div className={css.cardTitle}>On-farm traditional halal slaughter</div>
          <div className={css.cardBody}>
            The available pathway is on-farm slaughter for the household, performed by a
            competent Muslim handler under the conditions above. This keeps welfare and
            traceability under direct control.
          </div>
        </div>
        <InterpretationBlock tone="info">
          Commercial-abattoir pathway deferred. Any off-farm processing or onward sale
          pathway is out of scope for this framework and will be designed separately under
          Scholar Council review.
        </InterpretationBlock>
        <InterpretationBlock tone="warn">
          This slaughter and meat pathway applies only to stock raised for meat (here,
          sheep). Working animals kept for non-food ecological or labour roles - for
          example pigs (khinzir) for land-clearing, tilling, or waste cycling - are
          categorically excluded from the slaughter-for-consumption pathway; their flesh
          is never taken as human food.
        </InterpretationBlock>
        <InterpretationBlock tone="pass">
          Welfare and halal are not in tension: ihsan requires excellence in daily care
          and excellence in slaughter together. A calm, well-kept animal and a swift,
          lawful slaughter are one continuous duty.
        </InterpretationBlock>
        <div>
          <label className={css.fieldLbl} htmlFor="hb-halal-notes">
            Handling notes
          </label>
          <textarea
            id="hb-halal-notes"
            className={css.notesArea}
            value={model.notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Who performs slaughter, training, equipment, qiblah orientation..."
          />
        </div>
        <label className={css.confirmRow}>
          <input
            type="checkbox"
            className={css.confirmBox}
            checked={model.pathwayAcknowledged}
            onChange={toggleAck}
          />
          <span className={css.confirmTxt}>
            I acknowledge the humane and halal handling pathway above and confirm the
            slaughter-pathway intent for any stock raised for meat.
          </span>
        </label>
      </div>
    );
  }

  // -- c5: records ---------------------------------------------------------
  if (mode === 'records') {
    const model = decodeHusbandry('records', value) as RecordsModel;
    return (
      <div className={css.root} data-hb-mode="records">
        <FeedsNote>
          Under the National Livestock Identification System, sheep carry a mob-based
          tag: record the <strong>NLIS mob tag</strong> and movement documents
          (NVD / waybill) for every mob movement on and off the property.
        </FeedsNote>
        <div>
          <SectionEyebrow>Record-keeping</SectionEyebrow>
          <InfoCardList cards={RECORD_ROWS} />
        </div>
        <InterpretationBlock tone="info">
          Nisab threshold for sheep: 40 sheep (one ewe due at 40 - 120). Track the herd
          count against the hawl so the livestock zakat obligation can be assessed.
        </InterpretationBlock>
        <div>
          <label className={css.fieldLbl} htmlFor="hb-records-notes">
            Record-keeping notes
          </label>
          <textarea
            id="hb-records-notes"
            className={css.notesArea}
            value={model.notes}
            onChange={(e) =>
              onChange(
                encodeHusbandry('records', { kind: 'records', notes: e.target.value }),
              )
            }
            placeholder="Tools or registers used, who maintains them, review cadence..."
          />
        </div>
      </div>
    );
  }

  // -- c6: labour ----------------------------------------------------------
  const model = decodeHusbandry('labour', value) as LabourModel;
  const setLabour = (patch: Partial<Omit<LabourModel, 'kind'>>): void =>
    onChange(encodeHusbandry('labour', { ...model, ...patch, kind: 'labour' }));
  return (
    <div className={css.root} data-hb-mode="labour">
      <div>
        <SectionEyebrow>Seasonal labour profile</SectionEyebrow>
        <InfoCardList cards={LABOUR_PERIODS} />
      </div>
      <InterpretationBlock tone="pass">
        Annual average -- manageable: routine husbandry fits within the daily care hours
        committed in the livestock-intent capacity self-assessment.
      </InterpretationBlock>
      <InterpretationBlock tone="warn">
        August-November peak -- plan additional support: lambing, marking, and shearing
        concentrate the labour. Arrange relief, casual help, or contract shearers ahead
        of the season.
      </InterpretationBlock>
      <div>
        <label className={css.fieldLbl} htmlFor="hb-labour-notes">
          Labour-fit notes
        </label>
        <textarea
          id="hb-labour-notes"
          className={css.notesArea}
          value={model.notes}
          onChange={(e) => setLabour({ notes: e.target.value })}
          placeholder="Who does what, peak-season arrangements, gaps to resolve..."
        />
      </div>
      <label className={css.confirmRow}>
        <input
          type="checkbox"
          className={css.confirmBox}
          checked={model.confirmed}
          onChange={() => setLabour({ confirmed: !model.confirmed })}
        />
        <span className={css.confirmTxt}>
          I confirm the husbandry framework is consistent with available labour and the
          welfare standard.
        </span>
      </label>
    </div>
  );
}

export default HusbandryCapture;
