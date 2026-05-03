import {
  ArrowRight,
  Clock3,
  Hammer,
  Leaf,
  Plus,
  Sprout,
  UserRound,
  Users
} from "lucide-react";
import {
  AppShell,
  BreadcrumbBar,
  ChipList,
  CroppedArt,
  InsightSidebar,
  ProgressRing,
  QaOverlay,
  SideRail,
  SurfaceCard
} from "../components/index.js";
import { SelectField, TextAreaField, TextInput } from "../components/FormFields.jsx";
import { screenCatalog } from "../screenCatalog.js";
import { stewardSurvey as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import heroLandscape from "../assets/generated/steward-survey/hero-landscape.png";
import capacityOrbit from "../assets/generated/steward-survey/capacity-orbit.png";

const metadata = screenCatalog.find((screen) => screen.route === "/observe/human-context/steward-survey");

const themeIconMap = { leaf: Leaf, users: Users, clock: Clock3 };

export function StewardSurveyPage() {
  return (
    <AppShell className="observe-dashboard-shell">
      <SideRail active="Overview" />
      <main className="detail-page steward-page">
        <BreadcrumbBar items={vm.breadcrumb} />
        <div className="detail-layout">
          <div className="detail-main">
            <ModuleHero
              kicker={vm.hero.kicker}
              title={vm.hero.title}
              copy={vm.hero.copy}
              image={heroLandscape}
            />
            <IdentityCard />
            <CapacityCard />
            <VisionCard />
            <div className="detail-note">All fields are optional. You can update this anytime as your understanding deepens.</div>
          </div>
          <StewardSnapshot />
        </div>
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

function ModuleHero({ kicker, title, copy, image }) {
  return (
    <SurfaceCard className="module-hero-card">
      <div className="module-hero-copy">
        <span className="stage-kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      <CroppedArt src={image} className="module-hero-image" />
    </SurfaceCard>
  );
}

function FormCard({ number, title, icon: Icon, children, className = "" }) {
  return (
    <SurfaceCard className={`form-card ${className}`}>
      <header className="form-card__header">
        {Icon ? <Icon aria-hidden="true" /> : null}
        <b>{number}</b>
        <h2>{title}</h2>
      </header>
      {children}
    </SurfaceCard>
  );
}

function IdentityCard() {
  const { project } = useBuiltinProject();
  const i = vm.identity;
  const name = project?.metadata?.stewardName ?? i.name;
  return (
    <FormCard number="1" title="Identity" icon={UserRound}>
      <div className="field-grid identity-grid">
        <TextInput label="Name" value={name} />
        <TextInput label="Age" value={i.age} />
        <TextInput label="Occupation" value={i.occupation} />
        <SelectField label="Lifestyle" value={i.lifestyle} options={i.lifestyleOptions} />
      </div>
    </FormCard>
  );
}

function CapacityCard() {
  const c = vm.capacity;
  return (
    <FormCard number="2" title="Capacity & Resources" icon={Clock3} className="capacity-card">
      <div className="capacity-grid">
        <div className="field-grid capacity-fields">
          <TextInput label="Maintenance hrs/wk - initial" value={c.initialHrs} />
          <TextInput label="Budget" value={c.budget} />
          <TextInput label="Maintenance hrs/wk - ongoing" value={c.ongoingHrs} />
          <div className="capacity-overview">
            <span>Capacity overview</span>
            <strong>{c.totalHrs}</strong>
            <small>hrs / week total</small>
            <div className="stacked-bar"><i /><b /></div>
            <em>{c.initialHrs} hrs initial</em>
            <em>{c.ongoingHrs} hrs ongoing</em>
          </div>
          <div className="budget-card">
            <span><Leaf />{c.establishmentLine} <small>Establishment<br />{c.establishmentPct}%</small></span>
            <ProgressRing value={c.establishmentPct} label="$" />
            <span>{c.ongoingLine} <small>Ongoing<br />{c.ongoingPct}%</small></span>
          </div>
          <div className="skills-row">
            <span>Skills</span>
            <ChipList removable items={c.skills} />
            <button className="add-chip" type="button"><Plus aria-hidden="true" /> Add skill</button>
          </div>
        </div>
        <CroppedArt src={capacityOrbit} className="capacity-orbit" />
      </div>
    </FormCard>
  );
}

function VisionCard() {
  const { project } = useBuiltinProject();
  const statement = project?.metadata?.visionStatement ?? vm.vision.statement;
  const themeChips = vm.vision.themes.map((t) =>
    typeof t === "string" ? t : { label: t.label, icon: themeIconMap[t.iconKey] }
  );
  return (
    <FormCard number="3" title="Vision" icon={Sprout}>
      <div className="vision-grid">
        <TextAreaField label="In your own words" value={statement} />
        <div className="theme-box">
          <span>Vision themes detected</span>
          <ChipList items={themeChips} />
        </div>
      </div>
    </FormCard>
  );
}

function StewardSnapshot() {
  const s = vm.snapshot;
  return (
    <InsightSidebar
      title="Steward Snapshot"
      icon={Leaf}
      intro="A quick read on who you are as a steward and what it means for your design."
    >
      <SnapshotMetric label="Profile completeness">
        <ProgressRing value={s.profilePct} label={`${s.profilePct}%`} />
        <div><strong>Well on your way.</strong><span>{s.profileNote}</span></div>
      </SnapshotMetric>
      <SnapshotMetric label="Steward archetype">
        <div className="round-icon"><Hammer aria-hidden="true" /></div>
        <div><strong>{s.archetype}</strong><span>{s.archetypeNote}</span></div>
      </SnapshotMetric>
      <SnapshotMetric label="Time capacity">
        <div className="round-icon"><Clock3 aria-hidden="true" /></div>
        <div><strong>{s.capacityHrs}</strong><span>{s.capacityNote}</span></div>
      </SnapshotMetric>
      <section className="sidebar-list">
        <h3>What this implies for design</h3>
        {s.implications.map((item) => <p key={item}>✓ {item}</p>)}
      </section>
      <div className="design-tip">
        <b>Design tip</b>
        <p>{s.designTip}</p>
        <button type="button">View design implications <ArrowRight aria-hidden="true" /></button>
      </div>
    </InsightSidebar>
  );
}

function SnapshotMetric({ label, children }) {
  return (
    <section className="snapshot-metric">
      <h3>{label}</h3>
      <div>{children}</div>
    </section>
  );
}
