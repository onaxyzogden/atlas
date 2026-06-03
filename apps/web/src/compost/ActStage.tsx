// ─── ACT STAGE ────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { C, F, ACT_TASKS, getPhaseMeta, fToCStr, daysAbovePasteurisation, type ActTask } from './model.js';
import { useCompostStore } from './useCompostStore.js';

export default function ActStage() {
  const [selectedTask, setSelectedTask] = useState<ActTask | undefined>(ACT_TASKS[4]);
  const [logView, setLogView] = useState<'tasks' | 'log'>('tasks'); // "tasks" | "log"
  const [newTemp, setNewTemp] = useState('');
  const [newNote, setNewNote] = useState('');

  const logEntries = useCompostStore((s) => s.readings);
  const logReading = useCompostStore((s) => s.logReading);

  const lastReading = logEntries[logEntries.length - 1];
  const phase = getPhaseMeta(lastReading?.temp ?? 68);
  const turnings = logEntries.filter((r) => r.turned).length;

  function handleLogEntry() {
    const tC = parseFloat(newTemp);
    if (isNaN(tC) || tC < 0 || tC > 95) return;
    logReading(tC, newNote);
    setNewTemp('');
    setNewNote('');
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
      {/* LEFT */}
      <div style={{
        width: 228, flexShrink: 0, background: C.bg2,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 2 }}>Act</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, fontFamily: F.serif }}>Batch 1 Execution</div>
          <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 2 }}>Day {lastReading?.day ?? 0} · {lastReading?.date ?? ''}</div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', margin: '8px 10px 4px', background: C.bg3, borderRadius: 8, padding: 3, gap: 3 }}>
          {(['tasks', 'log'] as const).map((v) => (
            <button key={v} onClick={() => setLogView(v)} style={{
              flex: 1, padding: '6px 0', borderRadius: 6, border: 'none',
              background: logView === v ? C.bg4 : 'transparent',
              color: logView === v ? C.textPrimary : C.textTertiary,
              fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: F.sans,
              textTransform: 'capitalize',
            }}>{v}</button>
          ))}
        </div>

        {/* Current state */}
        <div style={{ margin: '0 10px 8px', padding: '10px 12px', background: C.bg3, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Current State</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.textTertiary }}>Last temp</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: phase.color, fontFamily: F.mono }}>{fToCStr(lastReading?.temp ?? 68)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.textTertiary }}>Phase</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: phase.color }}>{phase.label}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.textTertiary }}>Turnings</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textPrimary, fontFamily: F.mono }}>{turnings}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: C.textTertiary }}>Moisture est.</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textPrimary, fontFamily: F.mono }}>{lastReading?.moisture ?? 0}%</span>
          </div>
        </div>

        {/* Task list in sidebar */}
        {logView === 'tasks' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px' }}>
            {ACT_TASKS.map((task) => {
              const isSel = selectedTask?.id === task.id;
              const statusColor: Record<string, string> = { verified: C.green, in_progress: C.blue, not_started: C.textTertiary };
              const taskStatusColor = statusColor[task.status] ?? C.textTertiary;
              return (
                <div key={task.id} onClick={() => setSelectedTask(task)} style={{
                  padding: '9px 14px', cursor: 'pointer',
                  background: isSel ? C.bg3 : 'transparent',
                  borderLeft: `2px solid ${isSel ? C.green : 'transparent'}`,
                  transition: 'all 0.1s',
                }}>
                  <div style={{ fontSize: 11, fontWeight: isSel ? 600 : 400, color: isSel ? C.textPrimary : C.textSecondary, lineHeight: 1.35 }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: taskStatusColor, textTransform: 'uppercase' }}>{task.status.replace('_', ' ')}</span>
                    <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.mono }}>{task.proofItems}/{task.proofRequired} proof</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {logView === 'log' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {[...logEntries].reverse().slice(0, 12).map((r) => (
              <div key={r.id} style={{
                padding: '7px 14px',
                borderBottom: `1px solid ${C.border}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}>Day {r.day} · {r.date}</span>
                  {r.turned && <span style={{ fontSize: 9, color: C.amber, fontWeight: 700 }}>TURN</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: getPhaseMeta(r.temp).color, fontFamily: F.mono }}>{fToCStr(r.temp)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CENTRE: task or log entry */}
      <div style={{ width: 310, flexShrink: 0, background: C.bg, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column' }}>
        {logView === 'tasks' && selectedTask && (
          <>
            <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8, textTransform: 'uppercase',
                  background: selectedTask.status === 'verified' ? C.greenDim : C.blueDim,
                  color: selectedTask.status === 'verified' ? C.green : C.blue,
                }}>{selectedTask.status.replace('_', ' ')}</span>
                <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.mono }}>Phase: {selectedTask.phase}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, fontFamily: F.serif, lineHeight: 1.3 }}>{selectedTask.title}</div>
              <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 4, lineHeight: 1.5 }}>{selectedTask.desc}</div>
            </div>

            {/* Proof bar */}
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: C.textTertiary }}>Proof items</span>
                <span style={{ fontSize: 10, fontFamily: F.mono, color: selectedTask.proofItems >= selectedTask.proofRequired ? C.green : C.amber }}>
                  {selectedTask.proofItems} / {selectedTask.proofRequired}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: selectedTask.proofRequired }).map((_, i) => (
                  <div key={i} style={{
                    height: 6, flex: 1, borderRadius: 3,
                    background: i < selectedTask.proofItems ? C.green : C.bg4,
                  }} />
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
              {selectedTask.checklistItems.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '8px 10px', marginBottom: 4, borderRadius: 7,
                  background: item.done ? C.greenDim : C.bg3,
                  border: `1px solid ${item.done ? C.green + '33' : C.border}`,
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: item.done ? C.green : 'transparent',
                    border: `1.5px solid ${item.done ? C.green : C.borderLight}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.done && <span style={{ color: '#fff', fontSize: 9, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 11, color: item.done ? C.textPrimary : C.textSecondary, lineHeight: 1.45 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {logView === 'log' && (
          <>
            <div style={{ padding: '14px 14px 10px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary }}>Log a Reading</div>
              <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 2 }}>Day {(lastReading?.day ?? 0) + 1} · Enter today's probe reading</div>
            </div>
            <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: C.textTertiary, display: 'block', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Core Temperature (°C)
                </label>
                <input
                  type="number"
                  value={newTemp}
                  onChange={(e) => setNewTemp(e.target.value)}
                  placeholder="e.g. 61"
                  style={{
                    width: '100%', padding: '10px 12px',
                    background: C.bg3, border: `1px solid ${C.border}`,
                    borderRadius: 8, color: C.textPrimary, fontSize: 14,
                    fontFamily: F.mono, outline: 'none',
                  }}
                />
                {newTemp && !isNaN(parseFloat(newTemp)) && (
                  <div style={{ marginTop: 5, fontSize: 10, color: getPhaseMeta(parseFloat(newTemp) * 9 / 5 + 32).color, fontFamily: F.mono }}>
                    → {getPhaseMeta(parseFloat(newTemp) * 9 / 5 + 32).label}
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 10, color: C.textTertiary, display: 'block', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Field Note (optional)
                </label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Observations, odour, colour changes..."
                  style={{
                    width: '100%', padding: '10px 12px', height: 80,
                    background: C.bg3, border: `1px solid ${C.border}`,
                    borderRadius: 8, color: C.textPrimary, fontSize: 12,
                    fontFamily: F.sans, outline: 'none', resize: 'none',
                  }}
                />
              </div>
              <button
                onClick={handleLogEntry}
                disabled={!newTemp || isNaN(parseFloat(newTemp))}
                style={{
                  padding: '11px 0', borderRadius: 8, border: 'none',
                  background: newTemp && !isNaN(parseFloat(newTemp)) ? C.green : C.bg4,
                  color: newTemp && !isNaN(parseFloat(newTemp)) ? '#fff' : C.textTertiary,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: F.sans,
                  transition: 'all 0.15s',
                }}>
                Submit Reading
              </button>

              {/* Proof slots */}
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 10, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Proof Schema — Daily Log</div>
                {['Temperature measurement (required)', 'Field note (required)', 'Photo of probe in situ (required)'].map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 7, background: C.bg3, border: `1px solid ${C.border}`, marginBottom: 4,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? C.green : C.bg4, border: `1.5px solid ${i === 0 ? C.green : C.borderLight}` }} />
                    <span style={{ fontSize: 10, color: i === 0 ? C.textPrimary : C.textSecondary }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT: full log table */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <div style={{ padding: '14px 20px 10px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.bg, zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary }}>Full Temperature Log</div>
          <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 1 }}>{logEntries.length} readings · {turnings} turnings · {daysAbovePasteurisation(logEntries)} days above 55°C</div>
        </div>
        <div style={{ padding: '8px 16px' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '52px 70px 70px 60px 60px 1fr', gap: 8, padding: '4px 8px', marginBottom: 4 }}>
            {['Day', 'Date', 'Temp °C', 'Moisture', 'Turn', 'Notes'].map((h) => (
              <span key={h} style={{ fontSize: 9, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
            ))}
          </div>
          {logEntries.map((r) => {
            const pm = getPhaseMeta(r.temp);
            return (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '52px 70px 70px 60px 60px 1fr',
                gap: 8, padding: '6px 8px', borderRadius: 6, marginBottom: 2,
                background: r.turned ? C.amberDim : 'transparent',
                border: r.turned ? `1px solid ${C.amber}33` : `1px solid transparent`,
              }}>
                <span style={{ fontSize: 11, color: C.textTertiary, fontFamily: F.mono }}>D{r.day}</span>
                <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.mono }}>{r.date}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: pm.color, fontFamily: F.mono }}>{fToCStr(r.temp)}</span>
                <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: F.mono }}>{r.moisture}%</span>
                <span style={{ fontSize: 10, color: r.turned ? C.amber : C.textTertiary, fontWeight: r.turned ? 700 : 400 }}>
                  {r.turned ? '↺ Yes' : '—'}
                </span>
                <span style={{ fontSize: 10, color: C.textTertiary, lineHeight: 1.4 }}>{r.note || ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
