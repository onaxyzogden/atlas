import { useState } from "react";
import { Search, Plus, Settings } from "lucide-react";
import {
  Button,
  IconButton,
  TextInput,
  Textarea,
  Select,
  Modal,
  Tooltip,
  Skeleton,
  useToast,
} from "../components/primitives/index.js";

export function DevPrimitivesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [text, setText] = useState("");
  const [textErr, setTextErr] = useState("");
  const [select, setSelect] = useState("a");
  const toast = useToast();

  return (
    <main
      style={{
        padding: "var(--space-8)",
        background: "var(--olos-bg)",
        color: "var(--olos-cream)",
        minHeight: "100vh",
        fontFamily: "var(--olos-font-ui)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-8)",
      }}
    >
      <header>
        <h1 style={{ fontFamily: "var(--olos-font-display)", margin: 0 }}>
          atlas-ui — Phase 2 primitives
        </h1>
        <p style={{ color: "var(--olos-text-label)", marginTop: "var(--space-2)" }}>
          Visual QA surface. Dev-only route.
        </p>
      </header>

      <section style={section}>
        <h2 style={h2}>Buttons</h2>
        <div style={row}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" disabled>Disabled</Button>
        </div>
        <div style={row}>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Icon buttons</h2>
        <div style={row}>
          <Tooltip content="Search">
            <IconButton label="Search" size="sm"><Search /></IconButton>
          </Tooltip>
          <Tooltip content="Add">
            <IconButton label="Add" size="md" variant="solid"><Plus /></IconButton>
          </Tooltip>
          <Tooltip content="Settings" side="bottom">
            <IconButton label="Settings" size="lg"><Settings /></IconButton>
          </Tooltip>
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Form fields</h2>
        <div style={{ ...row, alignItems: "flex-start", maxWidth: 480 }}>
          <TextInput
            label="Project name"
            value={text}
            onChange={(e) => setText(e.target.value)}
            hint="Short, kebab-case identifier."
            placeholder="e.g. olos-atlas"
          />
          <TextInput
            label="Email"
            error={textErr}
            placeholder="user@example.com"
            onBlur={(e) => setTextErr(e.target.value && !e.target.value.includes("@") ? "Invalid email" : "")}
          />
        </div>
        <div style={{ ...row, alignItems: "flex-start", maxWidth: 480 }}>
          <Select
            label="Variant"
            value={select}
            onChange={(e) => setSelect(e.target.value)}
          >
            <option value="a">Option A</option>
            <option value="b">Option B</option>
            <option value="c">Option C</option>
          </Select>
          <Textarea label="Notes" placeholder="Free-form notes..." rows={3} />
        </div>
      </section>

      <section style={section}>
        <h2 style={h2}>Modal & Toast</h2>
        <div style={row}>
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <Button variant="secondary" onClick={() => toast.success("Saved successfully")}>
            Toast: success
          </Button>
          <Button variant="secondary" onClick={() => toast.warning("Heads up")}>
            Toast: warning
          </Button>
          <Button variant="secondary" onClick={() => toast.error("Something failed")}>
            Toast: error
          </Button>
          <Button variant="secondary" onClick={() => toast.info("FYI")}>
            Toast: info
          </Button>
        </div>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Confirm action">
          <p style={{ marginTop: 0 }}>
            ESC or the backdrop click closes. Tab cycles within the dialog.
          </p>
          <TextInput label="Reason" placeholder="(optional)" />
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end", marginTop: "var(--space-4)" }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => { setModalOpen(false); toast.success("Confirmed"); }}>
              Confirm
            </Button>
          </div>
        </Modal>
      </section>

      <section style={section}>
        <h2 style={h2}>Skeleton</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxWidth: 360 }}>
          <Skeleton height={20} width="60%" />
          <Skeleton height={14} />
          <Skeleton height={14} width="80%" />
          <Skeleton height={120} radius={12} />
        </div>
        <p style={{ color: "var(--olos-text-label)", fontSize: "var(--text-sm)" }}>
          Toggle OS-level "Reduce motion" — shimmer should freeze.
        </p>
      </section>
    </main>
  );
}

const section = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-4)",
  padding: "var(--space-6)",
  background: "var(--elev-2-bg)",
  border: "var(--elev-2-border)",
  borderRadius: "var(--radius-lg)",
};

const h2 = {
  margin: 0,
  fontFamily: "var(--olos-font-display)",
  fontSize: "var(--text-xl)",
  color: "var(--olos-cream)",
};

const row = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-3)",
  alignItems: "center",
};
