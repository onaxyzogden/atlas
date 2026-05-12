import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowUpRight,
  Mail,
  Sprout,
  Sun,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import heroTerrain from '../../assets/indigenous-regional-context/hero-terrain.png';
import { useVisionStore } from '../../../../store/visionStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import ParcelSatelliteSnapshot from '../../../components/ParcelSatelliteSnapshot.js';
import card from '../../../_shared/stageCard/stageCard.module.css';
import hc from '../../../_shared/stageCard/observeExtras.module.css';
import { regionalCounts } from './derivations.js';

const CONTACT_TYPES = ['regulator', 'first_nation', 'community', 'partner', 'other'];

export default function IndigenousRegionalContextDetail() {
  const { projectId } = useParams({ strict: false }) as { projectId?: string };
  const id = projectId ?? 'mtc';

  const ensureDefaults = useVisionStore((s) => s.ensureDefaults);
  const updateRegional = useVisionStore((s) => s.updateRegional);
  const addNetworkContact = useVisionStore((s) => s.addNetworkContact);
  const removeNetworkContact = useVisionStore((s) => s.removeNetworkContact);
  const regional = useVisionStore((s) => s.getVisionData(id)?.regional);

  useEffect(() => {
    ensureDefaults(id);
  }, [id, ensureDefaults]);

  const placeNames = regional?.indigenousNames ?? [];
  const challenges = regional?.culturalChallenges ?? [];
  const strengths = regional?.culturalStrengths ?? [];
  const network = regional?.localNetwork ?? [];

  return (
    <div className={card.page}>
      <div className={card.hero} data-stage="observe">
        <div className={hc.heroRow}>
          <div>
            <p className={card.lede}>
              Honour the land&rsquo;s longer story. Capture indigenous place-names, cultural
              challenges and strengths in this region, and the local network you can lean on
              for stewardship.
            </p>
          </div>
          <img src={heroTerrain} alt="" aria-hidden="true" className={hc.heroArt} />
        </div>
      </div>

      <Section number="1" title="Indigenous Place-Names" subtitle="Recognize the traditional territories and histories that shape this landscape.">
            <ChipEditor
              items={placeNames}
              onAdd={(value) =>
                updateRegional(id, { indigenousNames: [...placeNames, value] })
              }
              onRemove={(idx) =>
                updateRegional(id, {
                  indigenousNames: placeNames.filter((_, i) => i !== idx),
                })
              }
              placeholder="New place-name"
            />
          </Section>

          <div className={card.grid}>
            <BulletSection
              number="2"
              title="Cultural Challenges"
              icon={AlertTriangle}
              subtitle="Key considerations and risks to address with care."
              items={challenges}
              onAdd={(value) =>
                updateRegional(id, { culturalChallenges: [...challenges, value] })
              }
              onRemove={(idx) =>
                updateRegional(id, {
                  culturalChallenges: challenges.filter((_, i) => i !== idx),
                })
              }
              placeholder="Add challenge"
            />
            <BulletSection
              number="3"
              title="Cultural Strengths"
              icon={Sprout}
              subtitle="Assets and relationships to build upon."
              items={strengths}
              onAdd={(value) =>
                updateRegional(id, { culturalStrengths: [...strengths, value] })
              }
              onRemove={(idx) =>
                updateRegional(id, {
                  culturalStrengths: strengths.filter((_, i) => i !== idx),
                })
              }
              placeholder="Add strength"
            />
          </div>

      <LocalNetworkSection
        rows={network}
        onAdd={(c) => addNetworkContact(id, c)}
        onRemove={(contactId) => removeNetworkContact(id, contactId)}
      />

      <RegionalSidebar projectId={id} regional={regional} />
    </div>
  );
}

interface SectionProps {
  number: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

function Section({ number, title, subtitle, children }: SectionProps) {
  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}>
        <b>{number}</b> Step {number}
      </div>
      <h2 className={card.sectionTitle}>{title}</h2>
      {subtitle ? (
        <p className={card.sectionBody} style={{ marginBottom: 12 }}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </section>
  );
}

interface BulletSectionProps {
  number: string;
  title: string;
  subtitle: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (idx: number) => void;
  placeholder: string;
  icon: LucideIcon;
}

function BulletSection({
  number,
  title,
  subtitle,
  items,
  onAdd,
  onRemove,
  placeholder,
  icon: Icon,
}: BulletSectionProps) {
  const [draft, setDraft] = useState('');

  function commit(e: FormEvent) {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft('');
  }

  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}>
        <b>{number}</b>
        <Icon aria-hidden="true" size={12} />
        {title}
      </div>
      <h2 className={card.sectionTitle}>{title}</h2>
      <p className={card.sectionBody} style={{ marginBottom: 12 }}>
        {subtitle}
      </p>
      {items.length > 0 ? (
        <ul className={card.list}>
          {items.map((bullet, idx) => (
            <li key={`${bullet}-${idx}`} className={card.listRow}>
              <span>{bullet}</span>
              <button
                type="button"
                className={card.removeBtn}
                onClick={() => onRemove(idx)}
                aria-label={`Remove ${bullet}`}
              >
                <Trash2 aria-hidden="true" size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={card.empty}>No entries yet.</p>
      )}
      <form
        onSubmit={commit}
        style={{ display: 'flex', gap: 8, marginTop: 10 }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 13,
            color: 'rgba(232,220,200,0.92)',
            fontFamily: 'inherit',
          }}
        />
        <button type="submit" className={card.btn}>
          Add
        </button>
      </form>
    </section>
  );
}

interface NetworkRow {
  id: string;
  name: string;
  type: string;
  contact?: string;
}

interface LocalNetworkSectionProps {
  rows: NetworkRow[];
  onAdd: (contact: NetworkRow) => void;
  onRemove: (id: string) => void;
}

function LocalNetworkSection({ rows, onAdd, onRemove }: LocalNetworkSectionProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState(CONTACT_TYPES[0] ?? 'community');
  const [contact, setContact] = useState('');

  function commit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onAdd({
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: n,
      type,
      contact: contact.trim() || undefined,
    });
    setName('');
    setContact('');
  }

  return (
    <section className={card.section}>
      <div className={hc.cardEyebrow}>
        <b>4</b> Local Network
      </div>
      <h2 className={card.sectionTitle}>Local Network</h2>
      <p className={card.sectionBody} style={{ marginBottom: 12 }}>
        Organizations and contacts you can lean on for guidance and collaboration.
      </p>

      {rows.length > 0 ? (
        <table className={card.table}>
          <thead>
            <tr>
              <th>Organization</th>
              <th>Type</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>
                  <span className={card.pill}>{r.type}</span>
                </td>
                <td>
                  {r.contact ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Mail aria-hidden="true" size={12} />
                      {r.contact}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className={card.removeBtn}
                    aria-label={`Remove ${r.name}`}
                    onClick={() => onRemove(r.id)}
                  >
                    <Trash2 aria-hidden="true" size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={card.empty}>No contacts yet.</p>
      )}

      <form
        onSubmit={commit}
        className={card.grid}
        style={{ marginTop: 12 }}
      >
        <label className={card.field}>
          <span>Organization</span>
          <input
            placeholder="Organization name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className={card.field}>
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className={`${card.field} ${card.full}`}>
          <span>Email or phone (optional)</span>
          <input
            placeholder="contact@example.org"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </label>
        <div className={card.btnRow}>
          <button type="submit" className={card.btn}>
            Add contact
          </button>
        </div>
      </form>
    </section>
  );
}

interface ChipEditorProps {
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (idx: number) => void;
  placeholder?: string;
}

function ChipEditor({ items, onAdd, onRemove, placeholder }: ChipEditorProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {items.map((item, idx) => (
        <span key={`${item}-${idx}`} className={`${card.pill} ${card.pillPartial}`}>
          {item}
          <button
            type="button"
            onClick={() => onRemove(idx)}
            style={{
              marginLeft: 6,
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: 12,
              lineHeight: 1,
            }}
            aria-label={`Remove ${item}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        placeholder={placeholder ?? 'Add…'}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const value = (e.target as HTMLInputElement).value.trim();
            if (value) {
              onAdd(value);
              (e.target as HTMLInputElement).value = '';
            }
            e.preventDefault();
          }
        }}
        style={{
          flex: '1 1 160px',
          minWidth: 140,
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 6,
          padding: '6px 10px',
          fontSize: 12,
          color: 'rgba(232,220,200,0.92)',
          fontFamily: 'inherit',
        }}
      />
    </div>
  );
}

interface RegionalSidebarProps {
  projectId: string;
  regional: ReturnType<typeof useVisionStore.getState>['visions'][number]['regional'];
}

function RegionalSidebar({ projectId, regional }: RegionalSidebarProps) {
  const project = useV3Project(projectId);
  const counts = regionalCounts(regional);

  const nextSteps = [
    'Consult First Nations representatives before any earthworks.',
    'Complete a Stage 1 archaeological assessment for sensitive areas.',
    'Reach out to local partners to co-develop stewardship goals.',
  ];

  return (
    <aside>
      <section className={card.section}>
        <div className={hc.cardEyebrow}>
          <Sun aria-hidden="true" size={12} /> Regional Snapshot
        </div>
        <ParcelSatelliteSnapshot
          boundary={project?.location?.boundary}
          caption={project?.name}
          width={320}
          height={200}
        />
        <div style={{ marginTop: 12 }}>
          <div className={card.statRow}>
            <span>
              <AlertTriangle aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Cultural Challenges
            </span>
            <span>{counts.challenges > 0 ? counts.challenges : '—'}</span>
          </div>
          <div className={card.statRow}>
            <span>
              <Sprout aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Cultural Strengths
            </span>
            <span>{counts.strengths > 0 ? counts.strengths : '—'}</span>
          </div>
          <div className={card.statRow}>
            <span>
              <Users aria-hidden="true" size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              Local Contacts
            </span>
            <span>{counts.contacts > 0 ? counts.contacts : '—'}</span>
          </div>
        </div>
      </section>

      <section className={card.section}>
        <h3 className={card.sectionTitle} style={{ fontSize: 13 }}>Next steps</h3>
        <div className={hc.synthesisBlock}>
          {nextSteps.map((step, idx) => (
            <p key={step}>
              <b>{idx + 1}</b>
              <span>{step}</span>
            </p>
          ))}
        </div>
      </section>

      <section className={card.section}>
        <h3 className={card.sectionTitle} style={{ fontSize: 13 }}>
          Build relationships. Design better.
        </h3>
        <p className={card.sectionBody}>
          Strong cultural relationships lead to healthier land stewardship and more
          resilient projects.
        </p>
        <div className={card.btnRow}>
          <button type="button" className={card.btn}>
            Open Stewardship Toolkit
            <ArrowUpRight aria-hidden="true" size={12} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
          </button>
        </div>
      </section>
    </aside>
  );
}
