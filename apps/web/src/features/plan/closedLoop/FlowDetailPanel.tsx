/**
 * FlowDetailPanel - per-flow design-intent editor (Slice A2 of the Plan->Act
 * closed-loop workflow). Rendered below the WasteVectorListView list when a
 * steward selects a flow row.
 *
 * Edits the optional A0 design-intent fields (operationalStatus / cadence /
 * transformationNodeIds / activeMonths) plus the mass/volume throughput, all
 * persisted via the existing updateMaterialFlow(id, patch). It also renders the
 * pure loopIntegrityChecks(flow) checklist so the steward sees, at a glance,
 * which loop-design slots are still empty.
 *
 * The legacy flat list + author form in WasteVectorListView are untouched.
 */

import { useEffect, useMemo, useState } from "react";
import type { LocalProject } from "../../../store/projectStore.js";
import {
  useClosedLoopStore,
  FLOW_OPERATIONAL_STATUS_CONFIG,
  FLOW_CADENCE_CONFIG,
  type MaterialFlow,
  type FlowOperationalStatus,
  type FlowCadence,
} from "../../../store/closedLoopStore.js";
import { useFlowEndpointOptions } from "../useFlowEndpointOptions.js";
import { resolveOperationalStatus } from "./flowStatusModel.js";
import { loopIntegrityChecks } from "./loopIntegrity.js";
import { parsePositive } from "./flowFormUtils.js";
import styles from "./FlowDetailPanel.module.css";

interface Props {
  project: LocalProject;
  flow: MaterialFlow;
  onClose: () => void;
}

const STATUS_ORDER: FlowOperationalStatus[] = [
  "active",
  "seasonally-dormant",
  "at-risk",
  "suspended",
];

const CADENCE_ORDER: FlowCadence[] = [
  "continuous",
  "daily",
  "weekly",
  "fortnightly",
  "monthly",
  "seasonal",
  "rotation-based",
  "as-needed",
];

const MONTHS: Array<{ n: number; label: string }> = [
  { n: 1, label: "Jan" },
  { n: 2, label: "Feb" },
  { n: 3, label: "Mar" },
  { n: 4, label: "Apr" },
  { n: 5, label: "May" },
  { n: 6, label: "Jun" },
  { n: 7, label: "Jul" },
  { n: 8, label: "Aug" },
  { n: 9, label: "Sep" },
  { n: 10, label: "Oct" },
  { n: 11, label: "Nov" },
  { n: 12, label: "Dec" },
];

/** Number -> input string ("" when the field is unset). */
function numStr(n: number | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? String(n) : "";
}

export default function FlowDetailPanel({ project, flow, onClose }: Props) {
  const updateFlow = useClosedLoopStore((s) => s.updateMaterialFlow);
  const endpointOptions = useFlowEndpointOptions(project.id);

  const viaOptions = useMemo(
    () => endpointOptions.filter((o) => o.kind === "fertility"),
    [endpointOptions],
  );

  // Throughput inputs are kept as local strings so partial typing round-trips;
  // parsePositive commits them on blur. Reseed when the selected flow changes.
  const [qMass, setQMass] = useState(numStr(flow.massKgPerMonth));
  const [qVolume, setQVolume] = useState(numStr(flow.volumeLPerMonth));

  useEffect(() => {
    setQMass(numStr(flow.massKgPerMonth));
    setQVolume(numStr(flow.volumeLPerMonth));
  }, [flow.id, flow.massKgPerMonth, flow.volumeLPerMonth]);

  const integrity = loopIntegrityChecks(flow);
  const viaIds = flow.transformationNodeIds ?? [];
  const activeMonths = flow.activeMonths ?? [];

  function toggleVia(id: string): void {
    const next = viaIds.includes(id)
      ? viaIds.filter((v) => v !== id)
      : [...viaIds, id];
    updateFlow(flow.id, { transformationNodeIds: next });
  }

  function toggleMonth(n: number): void {
    const next = activeMonths.includes(n)
      ? activeMonths.filter((m) => m !== n)
      : [...activeMonths, n].sort((a, b) => a - b);
    updateFlow(flow.id, { activeMonths: next });
  }

  return (
    <section className={styles.panel} data-testid="flow-detail-panel">
      <header className={styles.header}>
        <h3 className={styles.title}>{flow.label}</h3>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          Close
        </button>
      </header>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Operational status</span>
          <select
            value={resolveOperationalStatus(flow)}
            onChange={(e) =>
              updateFlow(flow.id, {
                operationalStatus: e.target.value as FlowOperationalStatus,
              })
            }
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {FLOW_OPERATIONAL_STATUS_CONFIG[s].label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Cadence</span>
          <select
            value={flow.cadence ?? ""}
            onChange={(e) =>
              updateFlow(flow.id, {
                cadence: e.target.value
                  ? (e.target.value as FlowCadence)
                  : undefined,
              })
            }
          >
            <option value="">Not set</option>
            {CADENCE_ORDER.map((c) => (
              <option key={c} value={c}>
                {FLOW_CADENCE_CONFIG[c].label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Mass (kg / mo)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={qMass}
            onChange={(e) => setQMass(e.target.value)}
            onBlur={() => updateFlow(flow.id, { massKgPerMonth: parsePositive(qMass) })}
            placeholder="e.g. 245"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Volume (L / mo)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={qVolume}
            onChange={(e) => setQVolume(e.target.value)}
            onBlur={() => updateFlow(flow.id, { volumeLPerMonth: parsePositive(qVolume) })}
            placeholder="e.g. 1800"
          />
        </label>
      </div>

      <div className={styles.block}>
        <span className={styles.fieldLabel}>Via nodes (fertility infrastructure)</span>
        {viaOptions.length === 0 ? (
          <p className={styles.empty}>
            No fertility infrastructure placed yet. Add composters, hugelkultur, or
            other fertility nodes in Plan to route this flow through them.
          </p>
        ) : (
          <ul className={styles.viaList}>
            {viaOptions.map((o) => {
              const checked = viaIds.includes(o.id);
              return (
                <li key={o.id} className={styles.viaItem}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleVia(o.id)}
                    />
                    <span>{o.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className={styles.block}>
        <span className={styles.fieldLabel}>Active months (none set = all year)</span>
        <div className={styles.monthGrid}>
          {MONTHS.map((m) => {
            const on = activeMonths.includes(m.n);
            return (
              <button
                key={m.n}
                type="button"
                className={styles.monthBtn}
                data-on={on}
                aria-pressed={on}
                onClick={() => toggleMonth(m.n)}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.block}>
        <span className={styles.fieldLabel}>
          Loop integrity ({integrity.completeCount} / {integrity.totalCount})
        </span>
        <ul className={styles.checklist}>
          {integrity.checks.map((c) => (
            <li key={c.id} className={styles.check} data-done={c.done}>
              <span className={styles.checkDot} data-done={c.done} aria-hidden="true" />
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
