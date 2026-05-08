import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Mail,
  Network,
  Sprout,
  Sun,
  Trash2,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  ChipList,
  CroppedArt,
  DataTable,
  NextStepsPanel,
  SurfaceCard,
} from '../../_shared/components/index.js';
import heroTerrain from '../../assets/indigenous-regional-context/hero-terrain.png';
import { useVisionStore } from '../../../../store/visionStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import ParcelSatelliteSnapshot from '../../../components/ParcelSatelliteSnapshot.js';
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
    <div className="detail-page regional-page">
      <div className="detail-layout">
        <div className="detail-main">
          <RegionalHero />
          <SurfaceCard className="content-card place-card">
            <header className="content-card__header">
              <div>
                <b>1</b>
                <h2>Indigenous Place-Names</h2>
              </div>
            </header>
            <p>Recognize the traditional territories and histories that shape this landscape.</p>
            <ChipList
              removable
              className="place-chip-list"
              items={placeNames}
              onAdd={(value) =>
                updateRegional(id, { indigenousNames: [...placeNames, value] })
              }
              onRemove={(idx) =>
                updateRegional(id, {
                  indigenousNames: placeNames.filter((_, i) => i !== idx),
                })
              }
              addPlaceholder="New place-name"
            />
          </SurfaceCard>

          <div className="two-card-grid">
            <EditableKnowledgeCard
              number="2"
              title="Cultural Challenges"
              icon={AlertTriangle}
              tone="gold"
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
              addPlaceholder="Add challenge"
            />
            <EditableKnowledgeCard
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
              addPlaceholder="Add strength"
            />
          </div>

          <LocalNetworkCard
            rows={network}
            onAdd={(c) => addNetworkContact(id, c)}
            onRemove={(contactId) => removeNetworkContact(id, contactId)}
          />
        </div>
        <RegionalSidebar projectId={id} regional={regional} />
      </div>
    </div>
  );
}

function RegionalHero() {
  return (
    <SurfaceCard className="module-hero-card regional-hero">
      <div className="module-hero-copy">
        <span className="stage-kicker">Module 1 · Human Context</span>
        <h1>Indigenous &amp; Regional Context</h1>
        <p>
          Honour the land&apos;s longer story. Capture indigenous place-names, cultural challenges
          and strengths in this region, and the local network you can lean on for stewardship.
        </p>
        <ChipList
          items={[
            { label: 'Consult before earthworks', icon: AlertTriangle, tone: 'gold' },
            { label: 'Stage 1 archaeology recommended', icon: CheckCircle2, tone: 'orange' },
            { label: 'Cultural strengths identified', icon: Network },
          ]}
        />
      </div>
      <CroppedArt src={heroTerrain} className="module-hero-image" />
    </SurfaceCard>
  );
}

interface EditableKnowledgeCardProps {
  number: string;
  title: string;
  subtitle: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  addPlaceholder: string;
  icon: LucideIcon;
  tone?: 'green' | 'gold';
}

function EditableKnowledgeCard({
  number,
  title,
  subtitle,
  items,
  onAdd,
  onRemove,
  addPlaceholder,
  icon: Icon,
  tone = 'green',
}: EditableKnowledgeCardProps) {
  const [draft, setDraft] = useState('');

  function commit(e: FormEvent) {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;
    onAdd(value);
    setDraft('');
  }

  return (
    <SurfaceCard className={`content-card knowledge-card ${tone}`}>
      <header className="content-card__header">
        <div>
          <b>{number}</b>
          <h2>{title}</h2>
        </div>
        <Icon aria-hidden="true" />
      </header>
      <p>{subtitle}</p>
      {items.length > 0 ? (
        <ul className="editable-bullets">
          {items.map((bullet, idx) => (
            <li key={`${bullet}-${idx}`}>
              <span>{bullet}</span>
              <button
                type="button"
                aria-label={`Remove ${bullet}`}
                onClick={() => onRemove(idx)}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-note">No entries yet.</p>
      )}
      <form className="add-row" onSubmit={commit}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={addPlaceholder}
        />
        <button className="outlined-button" type="submit">
          Add
        </button>
      </form>
    </SurfaceCard>
  );
}

interface NetworkRow {
  id: string;
  name: string;
  type: string;
  contact?: string;
}

interface LocalNetworkCardProps {
  rows: NetworkRow[];
  onAdd: (contact: NetworkRow) => void;
  onRemove: (id: string) => void;
}

function LocalNetworkCard({ rows, onAdd, onRemove }: LocalNetworkCardProps) {
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
    <SurfaceCard className="content-card local-network-card">
      <header className="content-card__header">
        <div>
          <b>4</b>
          <h2>Local Network</h2>
        </div>
      </header>
      <p>Organizations and contacts you can lean on for guidance and collaboration.</p>
      {rows.length > 0 ? (
        <DataTable
          columns={['Organization', 'Type', 'Contact', '', '']}
          rows={rows.map((r) => [
            r.name,
            r.type,
            r.contact ?? '—',
            r.contact ? <Mail key={`m-${r.id}`} aria-hidden="true" /> : <span key={`m-${r.id}`} />,
            <button
              key={`del-${r.id}`}
              type="button"
              aria-label={`Remove ${r.name}`}
              onClick={() => onRemove(r.id)}
              className="icon-button"
            >
              <Trash2 aria-hidden="true" />
            </button>,
          ])}
        />
      ) : (
        <p className="empty-note">No contacts yet.</p>
      )}
      <form className="add-network-row" onSubmit={commit}>
        <input
          placeholder="Organization name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          placeholder="Email or phone (optional)"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
        />
        <button className="outlined-button" type="submit">
          Add contact
        </button>
      </form>
    </SurfaceCard>
  );
}

interface RegionalSidebarProps {
  projectId: string;
  regional: ReturnType<typeof useVisionStore.getState>['visions'][number]['regional'];
}

function RegionalSidebar({ projectId, regional }: RegionalSidebarProps) {
  const project = useV3Project(projectId);
  const counts = regionalCounts(regional);

  return (
    <aside className="regional-sidebar">
      <SurfaceCard className="regional-map-card">
        <h2>
          <Sun aria-hidden="true" /> Regional Snapshot
        </h2>
        <ParcelSatelliteSnapshot
          boundary={project?.location?.boundary}
          caption={project?.name}
          width={320}
          height={240}
        />
      </SurfaceCard>
      <div className="regional-stat-grid">
        <RegionalStat icon={AlertTriangle} value={counts.challenges} label="Cultural Challenges" />
        <RegionalStat icon={Sprout} value={counts.strengths} label="Cultural Strengths" />
        <RegionalStat icon={Users} value={counts.contacts} label="Local Contacts" />
      </div>
      <NextStepsPanel
        steps={[
          'Consult First Nations representatives before any earthworks.',
          'Complete a Stage 1 archaeological assessment for sensitive areas.',
          'Reach out to local partners to co-develop stewardship goals.',
        ]}
      />
      <SurfaceCard className="toolkit-card">
        <h2>Build relationships. Design better.</h2>
        <p>
          Strong cultural relationships lead to healthier land stewardship and more resilient
          projects.
        </p>
        <button className="green-button" type="button">
          Open Stewardship Toolkit <ArrowUpRight aria-hidden="true" />
        </button>
      </SurfaceCard>
    </aside>
  );
}

interface RegionalStatProps {
  icon: LucideIcon;
  value: number;
  label: string;
}

function RegionalStat({ icon: Icon, value, label }: RegionalStatProps) {
  return (
    <SurfaceCard className="regional-stat">
      <Icon aria-hidden="true" />
      <strong>{value > 0 ? value : '—'}</strong>
      <span>{label}</span>
    </SurfaceCard>
  );
}
