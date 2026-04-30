/**
 * NetworkCrmCard — ACT-stage Module 4 (Social Permaculture).
 *
 * External-network address book: vendors, consultants, tradespeople,
 * nurseries, community contacts. Distinct from `memberStore` (which is
 * the project ACL). Filter chips by role so the steward can answer
 * "who do I call when the cistern springs a leak?" or "who buys garlic?"
 * in two clicks.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import {
  useNetworkStore,
  type NetworkContact,
  type NetworkRole,
} from '../../store/networkStore.js';
import styles from './actCard.module.css';

interface Props { project: LocalProject; onSwitchToMap: () => void; }

const ROLES: Array<{ value: NetworkRole; label: string }> = [
  { value: 'vendor',       label: 'Vendor' },
  { value: 'consultant',   label: 'Consultant' },
  { value: 'tradesperson', label: 'Tradesperson' },
  { value: 'nursery',      label: 'Nursery' },
  { value: 'community',    label: 'Community' },
];

interface Draft {
  name: string;
  role: NetworkRole;
  org: string;
  email: string;
  phone: string;
  notes: string;
}
const EMPTY_DRAFT: Draft = { name: '', role: 'vendor', org: '', email: '', phone: '', notes: '' };

function newId() { return `nc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export default function NetworkCrmCard({ project }: Props) {
  const allContacts = useNetworkStore((s) => s.contacts);
  const addContact = useNetworkStore((s) => s.addContact);
  const removeContact = useNetworkStore((s) => s.removeContact);

  const [filter, setFilter] = useState<NetworkRole | ''>('');
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const contacts = useMemo(
    () => allContacts.filter((c) => c.projectId === project.id),
    [allContacts, project.id],
  );
  const filtered = useMemo(
    () => (filter ? contacts.filter((c) => c.role === filter) : contacts),
    [contacts, filter],
  );

  function commit() {
    if (!draft.name.trim()) return;
    const entry: NetworkContact = {
      id: newId(),
      projectId: project.id,
      name: draft.name.trim(),
      role: draft.role,
      org: draft.org.trim() || undefined,
      email: draft.email.trim() || undefined,
      phone: draft.phone.trim() || undefined,
      notes: draft.notes.trim() || undefined,
    };
    addContact(entry);
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Act · Module 4 — Social Permaculture</span>
        <h1 className={styles.title}>Network CRM</h1>
        <p className={styles.lede}>
          The local network is a permaculture asset. Vendors keep the
          irrigation flowing, nurseries hold the species you cannot raise,
          consultants close knowledge gaps, neighbours show up on
          work-days. Track them all here.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add contact</h2>
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Name</label>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Role</label>
            <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as NetworkRole })}>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Org</label>
            <input value={draft.org} onChange={(e) => setDraft({ ...draft, org: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Email</label>
            <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
          </div>
          <div className={styles.field}>
            <label>Phone</label>
            <input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <label>Notes</label>
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={commit} disabled={!draft.name.trim()}>
            Add contact
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Directory ({filtered.length}/{contacts.length})</h2>
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`${styles.tag} ${filter === '' ? styles.tagActive : ''}`}
            onClick={() => setFilter('')}
          >
            All
          </button>
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`${styles.tag} ${filter === r.value ? styles.tagActive : ''}`}
              onClick={() => setFilter(r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className={styles.empty}>No contacts here yet.</p>
        ) : (
          <ul className={styles.list}>
            {filtered.map((c) => (
              <li key={c.id} className={styles.listRow}>
                <span>
                  <strong>{c.name}</strong>
                  {c.org && <span className={styles.listMeta}> · {c.org}</span>}
                  <div className={styles.listMeta}>
                    <span className={styles.pill} style={{ marginRight: 6 }}>{c.role}</span>
                    {c.email && <a href={`mailto:${c.email}`} style={{ color: 'inherit', marginRight: 8 }}>{c.email}</a>}
                    {c.phone && <span>{c.phone}</span>}
                  </div>
                  {c.notes && <div className={styles.listMeta}>{c.notes}</div>}
                </span>
                <button type="button" className={styles.removeBtn} onClick={() => removeContact(c.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
