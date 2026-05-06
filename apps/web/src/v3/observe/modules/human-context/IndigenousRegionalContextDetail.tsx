import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Mail,
  MoreVertical,
  Network,
  Plus,
  Sprout,
  Sun,
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
import regionalMap from '../../assets/indigenous-regional-context/regional-map.png';

export default function IndigenousRegionalContextDetail() {
  return (
    <div className="detail-page regional-page">
      <div className="detail-layout">
        <div className="detail-main">
          <RegionalHero />
          <PlaceNamesCard />
          <div className="two-card-grid">
            <KnowledgeCard
              number="2"
              title="Cultural Challenges"
              icon={AlertTriangle}
              tone="gold"
              subtitle="Key considerations and risks to address with care."
              bullets={[
                'Land-acknowledgement protocols still maturing in rural Halton; consult Mississaugas of the Credit Department of Consultation & Accommodation before any earthworks',
                'Seasonal creek setback corridor overlaps with potentially significant pre-contact archaeological sites - Stage 1 archaeological assessment recommended before excavation',
              ]}
              action="View guidance & resources"
            />
            <KnowledgeCard
              number="3"
              title="Cultural Strengths"
              icon={Sprout}
              subtitle="Assets and relationships to build upon."
              bullets={[
                'Active Halton Hills agricultural community - long-running farmer cooperatives and seed exchanges',
                'Conservation Halton stewardship programs with riparian planting and well-decommissioning grants',
                'Active Muslim community in Mississauga / Brampton supports retreat hosting and weekend gatherings',
              ]}
              action="Explore stewardship opportunities"
            />
          </div>
          <LocalNetworkCard />
        </div>
        <RegionalSidebar />
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

function PlaceNamesCard() {
  return (
    <SurfaceCard className="content-card place-card">
      <header className="content-card__header">
        <div>
          <b>1</b>
          <h2>Indigenous Place-Names</h2>
        </div>
        <button className="outlined-button" type="button">
          <Plus aria-hidden="true" /> Add place-name
        </button>
      </header>
      <p>Recognize the traditional territories and histories that shape this landscape.</p>
      <ChipList
        removable
        className="place-chip-list"
        items={[
          'Mississaugas of the Credit First Nation - Treaty 19 (1818) lands',
          'Haudenosaunee Confederacy - historical territory under the Dish With One Spoon wampum',
          'Anishinaabe / Wendat - pre-contact seasonal use of the Sixteen Mile Creek corridor',
        ]}
      />
    </SurfaceCard>
  );
}

interface KnowledgeCardProps {
  number: string;
  title: string;
  subtitle: string;
  bullets: string[];
  action: string;
  icon: LucideIcon;
  tone?: 'green' | 'gold';
}

function KnowledgeCard({
  number,
  title,
  subtitle,
  bullets,
  action,
  icon: Icon,
  tone = 'green',
}: KnowledgeCardProps) {
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
      <ul>
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <button className="outlined-button" type="button">
        {action} <ArrowUpRight aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function LocalNetworkCard() {
  return (
    <SurfaceCard className="content-card local-network-card">
      <header className="content-card__header">
        <div>
          <b>4</b>
          <h2>Local Network</h2>
        </div>
        <button className="outlined-button" type="button">
          <Plus aria-hidden="true" /> Add contact
        </button>
      </header>
      <p>Organizations and contacts you can lean on for guidance and collaboration.</p>
      <DataTable
        columns={['Organization', 'Type', 'Contact', '', '']}
        rows={[
          [
            'Conservation Halton - Stewardship Services',
            'regulator',
            'stewardship@hrca.on.ca',
            <Mail key="m1" aria-hidden="true" />,
            <MoreVertical key="v1" aria-hidden="true" />,
          ],
          [
            'Mississaugas of the Credit - Department of Consultation & Accommodation',
            'first_nation',
            'consultation@mncfn.ca',
            <Mail key="m2" aria-hidden="true" />,
            <MoreVertical key="v2" aria-hidden="true" />,
          ],
          [
            'Halton Region Federation of Agriculture',
            'community',
            'info@haltonfa.com',
            <Mail key="m3" aria-hidden="true" />,
            <MoreVertical key="v3" aria-hidden="true" />,
          ],
        ]}
      />
    </SurfaceCard>
  );
}

function RegionalSidebar() {
  return (
    <aside className="regional-sidebar">
      <SurfaceCard className="regional-map-card">
        <h2>
          <Sun aria-hidden="true" /> Regional Snapshot
        </h2>
        <CroppedArt src={regionalMap} className="regional-map-image" />
      </SurfaceCard>
      <div className="regional-stat-grid">
        <RegionalStat icon={AlertTriangle} value="2" label="Key Warnings" />
        <RegionalStat icon={Sprout} value="3" label="Cultural Strengths" />
        <RegionalStat icon={Users} value="3" label="Local Contacts" />
      </div>
      <NextStepsPanel
        steps={[
          'Consult Mississaugas of the Credit Department of Consultation & Accommodation before any earthworks.',
          'Complete a Stage 1 archaeological assessment for areas near the creek corridor.',
          'Reach out to local partners to co-develop stewardship goals and opportunities.',
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
  value: string;
  label: string;
}

function RegionalStat({ icon: Icon, value, label }: RegionalStatProps) {
  return (
    <SurfaceCard className="regional-stat">
      <Icon aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </SurfaceCard>
  );
}
