/**
 * IndigenousRegionalCard — Phase 4a OBSERVE surface.
 *
 * Captures place-name history, cultural challenges/strengths, and a local
 * network registry (neighbours, elders, NGOs, suppliers). Persists via
 * useVisionStore.updateRegional / addNetworkContact.
 */

import { useEffect, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useVisionStore, type RegionalContext } from '../../store/visionStore.js';
import styles from './StewardSurveyCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

function newId(): string {
  return `nc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function IndigenousRegionalCard({ project }: Props) {
  const ensureDefaults = useVisionStore((s) => s.ensureDefaults);
  const visionData = useVisionStore((s) => s.getVisionData(project.id));
  const updateRegional = useVisionStore((s) => s.updateRegional);
  const addNetworkContact = useVisionStore((s) => s.addNetworkContact);
  const removeNetworkContact = useVisionStore((s) => s.removeNetworkContact);

  useEffect(() => {
    ensureDefaults(project.id);
  }, [ensureDefaults, project.id]);

  const regional: RegionalContext = visionData?.regional ?? {};
  const [nameDraft, setNameDraft] = useState('');
  const [contactDraft, setContactDraft] = useState({ name: '', type: '', contact: '' });

  function setText(field: 'culturalChallenges' | 'culturalStrengths', text: string) {
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    updateRegional(project.id, { [field]: lines });
  }

  function addIndigenousName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    updateRegional(project.id, {
      indigenousNames: [...(regional.indigenousNames ?? []), trimmed],
    });
    setNameDraft('');
  }
  function removeIndigenousName(idx: number) {
    updateRegional(project.id, {
      indigenousNames: (regional.indigenousNames ?? []).filter((_, i) => i !== idx),
    });
  }

  function commitContact() {
    if (!contactDraft.name.trim()) return;
    addNetworkContact(project.id, {
      id: newId(),
      name: contactDraft.name.trim(),
      type: contactDraft.type.trim() || 'contact',
      contact: contactDraft.contact.trim() || undefined,
    });
    setContactDraft({ name: '', type: '', contact: '' });
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Module 1 · Human Context</span>
        <h1 className={styles.title}>Indigenous & Regional Context</h1>
        <p className={styles.lede}>
          Honour the land's longer story. Capture indigenous place-names, cultural
          challenges and strengths in this region, and the local network you can
          lean on for stewardship.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Indigenous Place-Names</h2>
        <div className={styles.tagInput}>
          {(regional.indigenousNames ?? []).map((nm, idx) => (
            <span key={`${nm}-${idx}`} className={styles.tag}>
              {nm}
              <button type="button" onClick={() => removeIndigenousName(idx)} aria-label={`Remove ${nm}`}>
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            placeholder="Add a name, press Enter"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addIndigenousName();
              }
            }}
            onBlur={addIndigenousName}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cultural Challenges</h2>
        <div className={styles.field}>
          <textarea
            placeholder="One per line — historical extraction, displacement, land-tenure conflict, …"
            defaultValue={(regional.culturalChallenges ?? []).join('\n')}
            onBlur={(e) => setText('culturalChallenges', e.target.value)}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Cultural Strengths</h2>
        <div className={styles.field}>
          <textarea
            placeholder="One per line — local knowledge holders, surviving food traditions, mutual-aid networks, …"
            defaultValue={(regional.culturalStrengths ?? []).join('\n')}
            onBlur={(e) => setText('culturalStrengths', e.target.value)}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Local Network</h2>
        {(regional.localNetwork ?? []).map((c) => (
          <div key={c.id} className={styles.listRow}>
            <span style={{ fontSize: 13, color: 'rgba(232,220,200,0.92)' }}>{c.name}</span>
            <span style={{ fontSize: 12, color: 'rgba(232,220,200,0.6)' }}>{c.type}</span>
            <span style={{ fontSize: 12, color: 'rgba(232,220,200,0.55)' }}>{c.contact ?? '—'}</span>
            <button type="button" className={styles.removeBtn} onClick={() => removeNetworkContact(project.id, c.id)}>
              Remove
            </button>
          </div>
        ))}
        <div className={styles.listRow}>
          <input
            type="text"
            placeholder="Name"
            value={contactDraft.name}
            onChange={(e) => setContactDraft((d) => ({ ...d, name: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Type (elder, NGO, supplier…)"
            value={contactDraft.type}
            onChange={(e) => setContactDraft((d) => ({ ...d, type: e.target.value }))}
          />
          <input
            type="text"
            placeholder="Contact (phone / email)"
            value={contactDraft.contact}
            onChange={(e) => setContactDraft((d) => ({ ...d, contact: e.target.value }))}
          />
          <button type="button" className={styles.addBtn} style={{ marginTop: 0 }} onClick={commitContact}>
            Add
          </button>
        </div>
      </section>
    </div>
  );
}
