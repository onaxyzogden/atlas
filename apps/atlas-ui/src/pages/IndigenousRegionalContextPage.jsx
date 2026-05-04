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
  Users
} from "lucide-react";
import {
  AppShell,
  ChipList,
  CroppedArt,
  DataTable,
  NextStepsPanel,
  QaOverlay,
  SurfaceCard,
  TopStageBar,
  ProjectDataStatus
} from "../components/index.js";
import { observeNav } from "../data/navConfig.js";
import { screenCatalog } from "../screenCatalog.js";
import { indigenousRegionalContext as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import heroTerrain from "../assets/generated/indigenous-regional-context/hero-terrain.png";
import regionalMap from "../assets/generated/indigenous-regional-context/regional-map.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/human-context/indigenous-regional-context");

const chipIconMap = { alert: AlertTriangle, check: CheckCircle2, network: Network };
const statIconMap = { alert: AlertTriangle, sprout: Sprout, users: Users };

export function IndigenousRegionalContextPage() {
  return (
    <AppShell navConfig={observeNav}>
      <div className="detail-page regional-page">
        <TopStageBar />
        <ProjectDataStatus />
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
                subtitle={vm.challenges.subtitle}
                bullets={vm.challenges.bullets}
                action={vm.challenges.action}
              />
              <KnowledgeCard
                number="3"
                title="Cultural Strengths"
                icon={Sprout}
                subtitle={vm.strengths.subtitle}
                bullets={vm.strengths.bullets}
                action={vm.strengths.action}
              />
            </div>
            <LocalNetworkCard />
          </div>
          <RegionalSidebar />
        </div>
      </div>
      {import.meta.env.DEV ? (
        <QaOverlay
          reference={metadata.reference}
          nativeWidth={metadata.viewport.width}
          nativeHeight={metadata.viewport.height}
        />
      ) : null}
    </AppShell>
  );
}

function RegionalHero() {
  const chips = vm.hero.chips.map((c) => ({ label: c.label, icon: chipIconMap[c.iconKey], tone: c.tone }));
  return (
    <SurfaceCard className="module-hero-card regional-hero">
      <div className="module-hero-copy">
        <span className="stage-kicker">{vm.hero.kicker}</span>
        <h1>{vm.hero.title}</h1>
        <p>{vm.hero.copy}</p>
        <ChipList items={chips} />
      </div>
      <CroppedArt src={heroTerrain} className="module-hero-image" />
    </SurfaceCard>
  );
}

function PlaceNamesCard() {
  return (
    <SurfaceCard className="content-card place-card">
      <header className="content-card__header">
        <div><b>1</b><h2>Indigenous Place-Names</h2></div>
        <button className="outlined-button" type="button"><Plus aria-hidden="true" /> Add place-name</button>
      </header>
      <p>Recognize the traditional territories and histories that shape this landscape.</p>
      <ChipList removable className="place-chip-list" items={vm.placeNames} />
    </SurfaceCard>
  );
}

function KnowledgeCard({ number, title, subtitle, bullets, action, icon: Icon, tone = "green" }) {
  return (
    <SurfaceCard className={`content-card knowledge-card ${tone}`}>
      <header className="content-card__header">
        <div><b>{number}</b><h2>{title}</h2></div>
        <Icon aria-hidden="true" />
      </header>
      <p>{subtitle}</p>
      <ul>
        {bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
      </ul>
      <button className="outlined-button" type="button">{action} <ArrowUpRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function LocalNetworkCard() {
  return (
    <SurfaceCard className="content-card local-network-card">
      <header className="content-card__header">
        <div><b>4</b><h2>Local Network</h2></div>
        <button className="outlined-button" type="button"><Plus aria-hidden="true" /> Add contact</button>
      </header>
      <p>Organizations and contacts you can lean on for guidance and collaboration.</p>
      <DataTable
        columns={["Organization", "Type", "Contact", "", ""]}
        rows={vm.localNetwork.map((row, i) => [
          row.org,
          row.type,
          row.contact,
          <Mail key={`m${i}`} />,
          <MoreVertical key={`v${i}`} />
        ])}
      />
    </SurfaceCard>
  );
}

function RegionalSidebar() {
  const { project } = useBuiltinProject();
  const county = project?.metadata?.county ?? null;
  const bioregion = project?.metadata?.bioregion ?? null;
  const snapshotLabel = county ?? bioregion ?? "Regional Snapshot";
  return (
    <aside className="regional-sidebar">
      <SurfaceCard className="regional-map-card">
        <h2><Sun aria-hidden="true" /> {snapshotLabel}</h2>
        <CroppedArt src={regionalMap} className="regional-map-image" />
      </SurfaceCard>
      <div className="regional-stat-grid">
        {vm.sidebar.stats.map((s) => (
          <RegionalStat key={s.label} icon={statIconMap[s.iconKey]} value={s.value} label={s.label} />
        ))}
      </div>
      <NextStepsPanel steps={vm.sidebar.nextSteps} />
      <SurfaceCard className="toolkit-card">
        <h2>Build relationships. Design better.</h2>
        <p>Strong cultural relationships lead to healthier land stewardship and more resilient projects.</p>
        <button className="green-button" type="button">Open Stewardship Toolkit <ArrowUpRight aria-hidden="true" /></button>
      </SurfaceCard>
    </aside>
  );
}

function RegionalStat({ icon: Icon, value, label }) {
  return (
    <SurfaceCard className="regional-stat">
      <Icon aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </SurfaceCard>
  );
}
