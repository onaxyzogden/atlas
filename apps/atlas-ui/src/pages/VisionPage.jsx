import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Droplet,
  Edit3,
  Heart,
  Home,
  Leaf,
  Sprout,
  Sun,
  TriangleAlert,
  Users
} from "lucide-react";
import {
  AppShell,
  ChipList,
  CroppedArt,
  QaOverlay,
  SideRail,
  SurfaceCard,
  TopStageBar
} from "../components/index.js";
import { screenCatalog } from "../screenCatalog.js";
import { visionPage as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import conceptLandscape from "../assets/generated/vision/concept-landscape.png";
import moodboardGrid from "../assets/generated/vision/moodboard-grid.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/human-context/vision");

const iconMap = { sprout: Sprout, users: Users, leaf: Leaf, droplet: Droplet, heart: Heart, sun: Sun, home: Home };

export function VisionPage() {
  return (
    <AppShell className="observe-dashboard-shell">
      <SideRail active="Overview" />
      <main className="detail-page vision-page">
        <TopStageBar />
        <section className="vision-top-grid">
          <VisionIntro />
          <ConceptPanel />
          <QuotePanel />
        </section>
        <section className="vision-middle-grid">
          <CoreFunctions />
          <ExperienceGoals />
          <AspirationPanel />
          <SuccessPanel />
        </section>
        <section className="vision-bottom-grid">
          <ListPanel title="Design principles" items={vm.designPrinciples} />
          <ListPanel title="Guiding values" items={vm.guidingValues} />
          <ListPanel title="Key constraints" tone="warning" items={vm.keyConstraints} />
          <MoodboardPanel />
        </section>
        <footer className="vision-proverb">
          <Sprout aria-hidden="true" />
          <span>{vm.proverb}</span>
          <b>- Indigenous proverb</b>
        </footer>
      </main>
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

function VisionIntro() {
  return (
    <SurfaceCard className="vision-intro-card">
      <span className="stage-kicker">{vm.intro.kicker}</span>
      <h1>{vm.intro.title}</h1>
      <p>{vm.intro.copy}</p>
    </SurfaceCard>
  );
}

function ConceptPanel() {
  return (
    <SurfaceCard className="concept-panel">
      <CroppedArt src={conceptLandscape} className="concept-image" />
    </SurfaceCard>
  );
}

function QuotePanel() {
  const { project } = useBuiltinProject();
  const oneSentence = project?.metadata?.visionStatement ?? vm.oneSentence;
  return (
    <SurfaceCard className="quote-panel">
      <h2>Vision in one sentence <Sun aria-hidden="true" /></h2>
      <blockquote>{oneSentence}</blockquote>
      <button className="outlined-button" type="button"><Edit3 aria-hidden="true" /> Edit vision statement</button>
    </SurfaceCard>
  );
}

function CoreFunctions() {
  return (
    <SurfaceCard className="vision-panel core-functions">
      <h2>Core functions</h2>
      {vm.coreFunctions.map(([iconKey, title, text]) => {
        const Icon = iconMap[iconKey];
        return (
          <div className="function-row" key={title}>
            <Icon aria-hidden="true" />
            <strong>{title}</strong>
            <span>{text}</span>
          </div>
        );
      })}
    </SurfaceCard>
  );
}

function ExperienceGoals() {
  return (
    <SurfaceCard className="vision-panel experience-goals">
      <h2>Experience goals <Sun aria-hidden="true" /></h2>
      <ChipList items={vm.experienceGoals} />
      <p><Leaf aria-hidden="true" /> {vm.experienceTagline}</p>
    </SurfaceCard>
  );
}

function AspirationPanel() {
  return (
    <SurfaceCard className="vision-panel aspiration-panel">
      <h2>Phased aspiration</h2>
      {vm.phases.map(([title, text]) => (
        <div className="phase-row" key={title}>
          <Sprout aria-hidden="true" />
          <strong>{title}</strong>
          <span>{text}</span>
        </div>
      ))}
    </SurfaceCard>
  );
}

function SuccessPanel() {
  return (
    <SurfaceCard className="vision-panel success-panel">
      <h2>What success looks like <Sun aria-hidden="true" /></h2>
      {vm.successItems.map((item) => (
        <p key={item}><CheckCircle2 aria-hidden="true" /> {item}</p>
      ))}
      <button className="green-button" type="button">Define success metrics <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}

function ListPanel({ title, items, tone = "green" }) {
  return (
    <SurfaceCard className={`vision-panel list-panel ${tone}`}>
      <h2>{title}</h2>
      {items.map(([label, text]) => (
        <div className="list-panel-row" key={label}>
          {tone === "warning" ? <TriangleAlert aria-hidden="true" /> : <Sprout aria-hidden="true" />}
          <strong>{label}</strong>
          <span>{text}</span>
        </div>
      ))}
    </SurfaceCard>
  );
}

function MoodboardPanel() {
  return (
    <SurfaceCard className="vision-panel moodboard-panel">
      <h2>Moodboard</h2>
      <CroppedArt src={moodboardGrid} className="moodboard-image" />
      <button className="green-button" type="button">Open inspiration library <ArrowRight aria-hidden="true" /></button>
    </SurfaceCard>
  );
}
