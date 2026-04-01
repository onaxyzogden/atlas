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
import p from '../../styles/panel.module.css';
import s from './ScenarioPanel.module.css';

interface ScenarioPanelProps {
  project: LocalProject;
}

export default function ScenarioPanel({ project }: ScenarioPanelProps) {
  const allScenarios = useScenarioStore((st) => st.scenarios);
  const scenarios = useMemo(() => allScenarios.filter((sc) => sc.projectId === project.id), [allScenarios, project.id]);
  const addScenario = useScenarioStore((st) => st.addScenario);
  const deleteScenario = useScenarioStore((st) => st.deleteScenario);
  const activeId = useScenarioStore((st) => st.activeScenarioId);
  const setActive = useScenarioStore((st) => st.setActiveScenario);

  const allZones = useZoneStore((st) => st.zones);
  const zones = useMemo(() => allZones.filter((z) => z.projectId === project.id), [allZones, project.id]);
  const allStructures = useStructureStore((st) => st.structures);
  const structures = useMemo(() => allStructures.filter((st) => st.projectId === project.id), [allStructures, project.id]);
  const allPaddocks = useLivestockStore((st) => st.paddocks);
  const paddocks = useMemo(() => allPaddocks.filter((pd) => pd.projectId === project.id), [allPaddocks, project.id]);
  const allCrops = useCropStore((st) => st.cropAreas);
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
    <div className={p.container}>
      <h2 className={`${p.title} ${p.mb8}`}>
        Scenario Modeling
      </h2>
      <p className={s.subtitle}>
        Snapshot your current design and compare alternatives side by side.
      </p>

      {/* Create scenario */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className={s.createBtn}
        >
          + Save Current Design as Scenario
        </button>
      ) : (
        <div className={s.formCard}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Scenario name"
            autoFocus
            className={s.formInput}
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className={`${s.formInput} ${s.formTextarea}`}
          />
          <div className={s.formActions}>
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className={`${s.saveBtn} ${name.trim() ? s.saveBtnEnabled : s.saveBtnDisabled}`}
            >
              Save Scenario
            </button>
            <button
              onClick={() => setShowForm(false)}
              className={s.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current state summary */}
      <SectionLabel>Current Design</SectionLabel>
      <div className={s.statGrid}>
        <StatCard label="Zones" value={zones.length} />
        <StatCard label="Structures" value={structures.length} />
        <StatCard label="Paddocks" value={paddocks.length} />
        <StatCard label="Crop Areas" value={crops.length} />
      </div>

      {/* Saved scenarios */}
      {scenarios.length > 0 && (
        <>
          <SectionLabel>Saved Scenarios ({scenarios.length})</SectionLabel>
          <div className={`${p.section} ${p.sectionGapLg}`}>
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
        <div className={p.empty}>
          No scenarios saved yet. Create one to start comparing design alternatives.
        </div>
      )}

      {/* Comparison (if 2+ scenarios) */}
      {scenarios.length >= 2 && (
        <>
          <SectionLabel className={p.mt8}>Quick Comparison</SectionLabel>
          <div className={s.tableWrap}>
            <table className={s.comparisonTable}>
              <thead>
                <tr>
                  <th className={s.thMetric}>Metric</th>
                  {scenarios.slice(0, 3).map((sc) => (
                    <th key={sc.id} className={s.thScenario}>{sc.name}</th>
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
                  <tr key={row.label}>
                    <td className={s.tdLabel}>{row.label}</td>
                    {scenarios.slice(0, 3).map((sc) => {
                      const val = (sc as unknown as Record<string, number>)[row.key] ?? 0;
                      return (
                        <td key={sc.id} className={s.tdValue}>
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
    <div className={s.statCard}>
      <div className={s.statValue}>{value}</div>
      <div className={s.statLabel}>{label}</div>
    </div>
  );
}

function ScenarioCard({ scenario, isActive, onSelect, onDelete }: { scenario: Scenario; isActive: boolean; onSelect: () => void; onDelete: () => void }) {
  return (
    <div
      className={`${s.scenarioCard} ${isActive ? s.scenarioCardActive : s.scenarioCardInactive}`}
      onClick={onSelect}
    >
      <div className={s.scenarioHeader}>
        <div>
          <div className={s.scenarioName}>
            {scenario.isBaseline && <span className={s.baselineBadge}>Baseline</span>}
            {scenario.name}
          </div>
          {scenario.description && (
            <div className={s.scenarioDesc}>{scenario.description}</div>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={s.deleteBtn}
        >
          ×
        </button>
      </div>
      <div className={s.scenarioMeta}>
        <span>{scenario.zoneCount} zones</span>
        <span>{scenario.structureCount} structures</span>
        <span>${scenario.totalInvestmentLow}K–${scenario.totalInvestmentHigh}K</span>
      </div>
    </div>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`${p.sectionLabel} ${className ?? ''}`}>
      {children}
    </h3>
  );
}
