/**
 * ScenarioPanel — create, compare, and manage what-if scenarios.
 * Allows users to snapshot current design state and compare alternatives.
 */

import { useState, useMemo } from 'react';
import { useScenarioStore, type Scenario } from '../../store/scenarioStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import type { LocalProject } from '../../store/projectStore.js';

interface ScenarioPanelProps {
  project: LocalProject;
}

export default function ScenarioPanel({ project }: ScenarioPanelProps) {
  const allScenarios = useScenarioStore((s) => s.scenarios);
  const scenarios = useMemo(() => allScenarios.filter((s) => s.projectId === project.id), [allScenarios, project.id]);
  const addScenario = useScenarioStore((s) => s.addScenario);
  const deleteScenario = useScenarioStore((s) => s.deleteScenario);
  const activeId = useScenarioStore((s) => s.activeScenarioId);
  const setActive = useScenarioStore((s) => s.setActiveScenario);

  const allZones = useZoneStore((s) => s.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(() => allStructures.filter((s) => s.projectId === project.id), [allStructures, project.id]);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(() => allPaddocks.filter((p) => p.projectId === project.id), [allPaddocks, project.id]);
  const allCrops = useCropStore((s) => s.cropAreas);
  const crops = useMemo(() => allCrops.filter((c) => c.projectId === project.id), [allCrops, project.id]);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;

    const scenario: Scenario = {
      id: crypto.randomUUID(),
      projectId: project.id,
      name: name.trim(),
      description: desc.trim(),
      isBaseline: scenarios.length === 0,
      createdAt: new Date().toISOString(),
      zoneCount: zones.length,
      structureCount: structures.length,
      paddockCount: paddocks.length,
      cropCount: crops.length,
      totalInvestmentLow: 525,
      totalInvestmentHigh: 843,
      annualRevenueLow: 108,
      annualRevenueHigh: 195,
      breakEvenYear: 4,
    };

    addScenario(scenario);
    setName('');
    setDesc('');
    setShowForm(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 6 }}>
        Scenario Modeling
      </h2>
      <p style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 16, lineHeight: 1.5 }}>
        Snapshot your current design and compare alternatives side by side.
      </p>

      {/* Create scenario */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', padding: '10px', fontSize: 12, fontWeight: 500,
            border: '1px solid rgba(196,162,101,0.2)', borderRadius: 8,
            background: 'rgba(196,162,101,0.08)', color: '#c4a265',
            cursor: 'pointer', marginBottom: 16,
          }}
        >
          + Save Current Design as Scenario
        </button>
      ) : (
        <div style={{ padding: 12, borderRadius: 8, border: '1px solid rgba(196,162,101,0.2)', background: 'var(--color-panel-card)', marginBottom: 16 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            autoFocus
            style={{ width: '100%', padding: '8px 10px', fontSize: 12, background: 'var(--color-panel-subtle)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'var(--color-panel-text)', outline: 'none', fontFamily: 'inherit', marginBottom: 8, boxSizing: 'border-box' }}
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            style={{ width: '100%', padding: '8px 10px', fontSize: 12, background: 'var(--color-panel-subtle)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'var(--color-panel-text)', outline: 'none', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={handleCreate} disabled={!name.trim()} style={{ flex: 1, padding: '8px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, background: name.trim() ? 'rgba(196,162,101,0.15)' : 'var(--color-panel-subtle)', color: name.trim() ? '#c4a265' : 'var(--color-panel-muted)', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
              Save Scenario
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: '8px 14px', fontSize: 11, border: '1px solid var(--color-panel-card-border)', borderRadius: 6, background: 'transparent', color: 'var(--color-panel-muted)', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current state summary */}
      <SectionLabel>Current Design</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
        <StatCard label="Zones" value={zones.length} />
        <StatCard label="Structures" value={structures.length} />
        <StatCard label="Paddocks" value={paddocks.length} />
        <StatCard label="Crop Areas" value={crops.length} />
      </div>

      {/* Saved scenarios */}
      {scenarios.length > 0 && (
        <>
          <SectionLabel>Saved Scenarios ({scenarios.length})</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {scenarios.map((sc) => (
              <ScenarioCard
                key={sc.id}
                scenario={sc}
                isActive={sc.id === activeId}
                onSelect={() => setActive(sc.id === activeId ? null : sc.id)}
                onDelete={() => deleteScenario(sc.id)}
              />
            ))}
          </div>
        </>
      )}

      {scenarios.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', textAlign: 'center', padding: 20, lineHeight: 1.6 }}>
          No scenarios saved yet. Create one to start comparing design alternatives.
        </div>
      )}

      {/* Comparison (if 2+ scenarios) */}
      {scenarios.length >= 2 && (
        <>
          <SectionLabel style={{ marginTop: 16 }}>Quick Comparison</SectionLabel>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-panel-card-border)' }}>
                  <th style={{ padding: '4px 8px', textAlign: 'left', color: 'var(--color-panel-muted)' }}>Metric</th>
                  {scenarios.slice(0, 3).map((sc) => (
                    <th key={sc.id} style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--color-panel-text)', fontWeight: 500 }}>{sc.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Zones', key: 'zoneCount' },
                  { label: 'Structures', key: 'structureCount' },
                  { label: 'Investment', key: 'totalInvestmentHigh', format: (v: number) => `$${v}K` },
                  { label: 'Revenue', key: 'annualRevenueHigh', format: (v: number) => `$${v}K/yr` },
                  { label: 'Break-Even', key: 'breakEvenYear', format: (v: number) => `Year ${v}` },
                ].map((row) => (
                  <tr key={row.label} style={{ borderBottom: '1px solid var(--color-panel-card-border)' }}>
                    <td style={{ padding: '4px 8px', color: 'var(--color-panel-muted)' }}>{row.label}</td>
                    {scenarios.slice(0, 3).map((sc) => {
                      const val = (sc as unknown as Record<string, number>)[row.key] ?? 0;
                      return (
                        <td key={sc.id} style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--color-panel-text)' }}>
                          {row.format ? row.format(val) : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--color-panel-card)', border: '1px solid var(--color-panel-card-border)', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-panel-text)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--color-panel-muted)' }}>{label}</div>
    </div>
  );
}

function ScenarioCard({ scenario, isActive, onSelect, onDelete }: { scenario: Scenario; isActive: boolean; onSelect: () => void; onDelete: () => void }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: isActive ? 'rgba(196,162,101,0.08)' : 'var(--color-panel-card)',
      border: `1px solid ${isActive ? 'rgba(196,162,101,0.3)' : 'var(--color-panel-card-border)'}`,
      cursor: 'pointer',
    }} onClick={onSelect}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-panel-text)' }}>
            {scenario.isBaseline && <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(45,122,79,0.1)', color: '#2d7a4f', marginRight: 6 }}>Baseline</span>}
            {scenario.name}
          </div>
          {scenario.description && (
            <div style={{ fontSize: 10, color: 'var(--color-panel-muted)', marginTop: 2 }}>{scenario.description}</div>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ background: 'none', border: 'none', color: 'var(--color-panel-muted)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}>
          ×
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--color-panel-muted)' }}>
        <span>{scenario.zoneCount} zones</span>
        <span>{scenario.structureCount} structures</span>
        <span>${scenario.totalInvestmentLow}K–${scenario.totalInvestmentHigh}K</span>
      </div>
    </div>
  );
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-panel-section)', marginBottom: 8, ...style }}>
      {children}
    </h3>
  );
}
