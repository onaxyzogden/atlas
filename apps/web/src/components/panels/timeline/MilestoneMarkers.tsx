import { useState } from 'react';
import type { Milestone } from '../../../store/visionStore.js';
import type { BuildPhase } from '../../../store/phaseStore.js';
import p from '../../../styles/panel.module.css';
import { error as errorToken } from '../../../lib/tokens.js';

interface Props {
  milestones: Milestone[];
  phases: BuildPhase[];
  onAdd: (milestone: Milestone) => void;
  onUpdate: (milestoneId: string, updates: Partial<Omit<Milestone, 'id'>>) => void;
  onDelete: (milestoneId: string) => void;
}

export default function MilestoneMarkers({ milestones, phases, onAdd, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [newPhaseId, setNewPhaseId] = useState(phases[0]?.id ?? '');

  const handleAdd = () => {
    if (!newNote.trim() || !newPhaseId) return;
    onAdd({ id: crypto.randomUUID(), phaseId: newPhaseId, note: newNote.trim(), targetDate: null });
    setNewNote('');
  };

  return (
    <div>
      <div className={p.sectionLabel}>Milestones</div>
      {milestones.length === 0 && (
        <div className={p.empty} style={{ marginBottom: 8 }}>No milestones set. Add milestone markers to track progress.</div>
      )}
      {milestones.map((m) => {
        const phase = phases.find((ph) => ph.id === m.phaseId);
        return (
          <div key={m.id} className={p.card} style={{ marginBottom: 6 }}>
            {editingId === m.id ? (
              <div>
                <input className={p.input} value={m.note} onChange={(e) => onUpdate(m.id, { note: e.target.value })} autoFocus />
                <div className={p.row} style={{ marginTop: 4 }}>
                  <button className={p.btn} style={{ width: 'auto', padding: '4px 10px', fontSize: 11 }} onClick={() => setEditingId(null)}>Done</button>
                  <button className={p.btn} style={{ width: 'auto', padding: '4px 10px', fontSize: 11, color: errorToken.DEFAULT }} onClick={() => { onDelete(m.id); setEditingId(null); }}>Delete</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditingId(m.id)} style={{ cursor: 'pointer' }}>
                <div className={p.cardTitle}>{m.note}</div>
                <div className={p.cardDesc}>{phase?.name ?? 'Unknown phase'}{m.targetDate ? ` \u2014 ${m.targetDate}` : ''}</div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add new milestone */}
      <div className={p.card} style={{ marginTop: 8 }}>
        <div className={p.row} style={{ gap: 6 }}>
          <select className={p.input} style={{ width: 100 }} value={newPhaseId} onChange={(e) => setNewPhaseId(e.target.value)}>
            {phases.map((ph) => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
          </select>
          <input className={p.input} placeholder="Milestone note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />
          <button className={`${p.btn} ${p.btnPrimary}`} style={{ width: 'auto', padding: '6px 12px' }} onClick={handleAdd} disabled={!newNote.trim()}>+</button>
        </div>
      </div>
    </div>
  );
}
