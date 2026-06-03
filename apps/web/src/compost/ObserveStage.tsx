import { useState } from 'react';
import {
  C,
  F,
  PHASE_COMPARISON,
  getPhaseMeta,
  fToC,
  fToCStr,
  daysAbovePasteurisation,
  type Reading,
} from './model.js';
import { useCompostStore } from './useCompostStore.js';

// ─── OBSERVE STAGE ────────────────────────────────────────────────────────────
export default function ObserveStage() {
  const [activeView, setActiveView] = useState('unified'); // "unified" | "curve" | "temporal"

  const allReadings = useCompostStore((s) => s.readings);
  const lastR = allReadings[allReadings.length - 1] as Reading;
  const daysAbove = daysAbovePasteurisation(allReadings);
  const turningCount = allReadings.filter((r) => r.turned).length;
  const peakReading = allReadings.reduce((mx, r) => (r.temp > mx.temp ? r : mx), allReadings[0] as Reading);
  const phase = getPhaseMeta(lastR.temp);
  const daysInCuringPhase = allReadings.filter((r) => r.temp < 113 && r.day >= 20).length;

  // Temperature curve SVG — all internal values in °F for positioning, labels shown in °C
  function TempCurve({ readings, width, height }: { readings: Reading[]; width: number; height: number }) {
    const maxTemp = 170;
    const minTemp = 55;
    const pad = { left: 42, right: 16, top: 16, bottom: 28 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;
    const maxDay = readings[readings.length - 1]?.day ?? 1;

    function xOf(day: number) { return pad.left + (day / maxDay) * chartW; }
    function yOf(temp: number) { return pad.top + (1 - (temp - minTemp) / (maxTemp - minTemp)) * chartH; }

    const path = readings.map((r, i) => `${i === 0 ? 'M' : 'L'}${xOf(r.day).toFixed(1)},${yOf(r.temp).toFixed(1)}`).join(' ');
    const fillPath = path + ` L${xOf(maxDay)},${(pad.top + chartH).toFixed(1)} L${xOf(0)},${(pad.top + chartH).toFixed(1)} Z`;

    const turningDays = readings.filter((r) => r.turned);

    // Phase background bands
    const mesoBand = { y1: yOf(113), y2: pad.top + chartH };
    const thermoBand = { y1: yOf(160), y2: yOf(113) };
    const pastBand = { y1: yOf(145), y2: yOf(131) };

    // Y-axis ticks in °F (used for positioning), displayed as °C
    const yTicks = [160, 145, 131, 113, 80, 55];

    return (
      <svg width={width} height={height}>
        {/* Phase bands */}
        <rect x={pad.left} y={thermoBand.y1} width={chartW} height={thermoBand.y2 - thermoBand.y1}
          fill={C.heat} opacity={0.06} />
        <rect x={pad.left} y={pastBand.y1} width={chartW} height={pastBand.y2 - pastBand.y1}
          fill={C.heat} opacity={0.10} />

        {/* Grid lines */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={pad.left + chartW} y1={yOf(t)} y2={yOf(t)}
              stroke={C.border} strokeWidth={0.5} strokeDasharray="3,3" />
            <text x={pad.left - 6} y={yOf(t) + 4} textAnchor="end"
              fontSize={9} fill={C.textTertiary} fontFamily={F.mono}>{fToC(t)}</text>
          </g>
        ))}

        {/* Phase labels */}
        <text x={pad.left + 5} y={yOf(155)} fontSize={9} fill={C.heat} opacity={0.7} fontFamily={F.sans} fontWeight={700}>Thermophilic</text>
        <text x={pad.left + 5} y={yOf(95)} fontSize={9} fill={C.mesophilic} opacity={0.7} fontFamily={F.sans} fontWeight={700}>Mesophilic</text>

        {/* Horizontal zone labels */}
        <text x={pad.left + chartW - 4} y={yOf(131) - 3} textAnchor="end" fontSize={8} fill={C.heat} opacity={0.6} fontFamily={F.mono}>55°C pasteurisation</text>
        <text x={pad.left + chartW - 4} y={yOf(113) - 3} textAnchor="end" fontSize={8} fill={C.mesophilic} opacity={0.6} fontFamily={F.mono}>45°C threshold</text>

        {/* Turning markers */}
        {turningDays.map((r) => (
          <g key={r.id}>
            <line x1={xOf(r.day)} x2={xOf(r.day)} y1={pad.top} y2={pad.top + chartH}
              stroke={C.amber} strokeWidth={0.8} strokeDasharray="4,3" opacity={0.5} />
            <text x={xOf(r.day)} y={pad.top + chartH + 11} textAnchor="middle"
              fontSize={8} fill={C.amber} fontFamily={F.mono}>↺</text>
          </g>
        ))}

        {/* Fill */}
        <path d={fillPath} fill={C.heat} opacity={0.04} />

        {/* Curve */}
        <path d={path} fill="none" stroke={C.heat} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points (sparse) */}
        {readings.filter((r, i) => i % 3 === 0 || r.turned).map((r) => (
          <circle key={r.id} cx={xOf(r.day)} cy={yOf(r.temp)} r={3}
            fill={r.turned ? C.amber : C.heat} opacity={0.9} />
        ))}

        {/* X-axis day labels */}
        {[0, 7, 14, 21, 28, 34].map((d) => (
          <text key={d} x={xOf(d)} y={pad.top + chartH + 18} textAnchor="middle"
            fontSize={9} fill={C.textTertiary} fontFamily={F.mono}>D{d}</text>
        ))}
      </svg>
    );
  }

  // Temporal: delta comparison between phases
  function PhaseComparison() {
    const phases = PHASE_COMPARISON;
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 14 }}>Phase Breakdown — Temporal View</div>
        {phases.map((p) => (
          <div key={p.id} style={{ marginBottom: 12, padding: '14px 16px', background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: p.color, fontFamily: F.serif }}>{p.name}</span>
                <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono, marginLeft: 10 }}>Days {p.days} · {p.readings} readings</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color: p.color, fontFamily: F.mono }}>{fToCStr(p.peakTemp)}</span>
            </div>
            <p style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.55, marginBottom: 8 }}>{p.desc}</p>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <span style={{ fontSize: 9, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Peak temp</span>
                <div style={{ fontSize: 12, fontWeight: 700, color: p.color, fontFamily: F.mono, marginTop: 1 }}>{fToCStr(p.peakTemp)}</div>
              </div>
              <div>
                <span style={{ fontSize: 9, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avg moisture</span>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary, fontFamily: F.mono, marginTop: 1 }}>{p.avgMoisture}%</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minWidth: 0 }}>
      {/* LEFT: observe nav */}
      <div style={{
        width: 228, flexShrink: 0, background: C.bg2,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, marginBottom: 2 }}>Observe</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, fontFamily: F.serif }}>Compost Intelligence</div>
          <div style={{ fontSize: 10, color: C.textSecondary, marginTop: 2 }}>Day {lastR.day} · {lastR.date}</div>
        </div>

        <div style={{ padding: '8px 0' }}>
          {[
            { id: 'unified', label: 'Unified State', sub: 'Current land picture' },
            { id: 'curve', label: 'Temperature Curve', sub: 'Domain detail view' },
            { id: 'temporal', label: 'Phase Analysis', sub: 'Temporal layer' },
          ].map((v) => (
            <button key={v.id} onClick={() => setActiveView(v.id)} style={{
              width: '100%', textAlign: 'left', padding: '10px 16px',
              background: v.id === activeView ? C.bg3 : 'transparent',
              border: 'none', borderLeft: `2px solid ${v.id === activeView ? C.blue : 'transparent'}`,
              cursor: 'pointer', transition: 'all 0.1s',
            }}>
              <div style={{ fontSize: 12, fontWeight: v.id === activeView ? 600 : 400, color: v.id === activeView ? C.textPrimary : C.textSecondary, fontFamily: F.sans }}>{v.label}</div>
              <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 1 }}>{v.sub}</div>
            </button>
          ))}
        </div>

        {/* Freshness model */}
        <div style={{ margin: '0 10px', padding: '10px 12px', background: C.bg3, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.textTertiary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Data Freshness</div>
          {[
            { label: 'Temperature log', state: 'current', color: C.green },
            { label: 'Moisture estimate', state: 'current', color: C.green },
            { label: 'Maturation photo', state: 'current', color: C.green },
            { label: 'Germination test', state: 'missing', color: C.textTertiary },
          ].map((f) => (
            <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: C.textTertiary }}>{f.label}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 6,
                background: f.state === 'current' ? C.greenDim : C.bg4,
                color: f.color, textTransform: 'uppercase',
              }}>{f.state}</span>
            </div>
          ))}
        </div>

        {/* Observe principle */}
        <div style={{ margin: '10px 10px 8px', padding: '10px 12px', background: C.bg3, borderRadius: 8, border: `1px solid ${C.blueDim}` }}>
          <p style={{ fontSize: 10, color: C.textTertiary, lineHeight: 1.55, fontStyle: 'italic' }}>
            "Observe records reality — not what was intended, but what actually happened in the pile."
          </p>
        </div>
      </div>

      {/* MAIN observe content */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0, padding: 20 }}>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Current Temp', value: fToCStr(lastR.temp), sub: phase.label, color: phase.color },
            { label: 'Peak Recorded', value: fToCStr(peakReading.temp), sub: `Day ${peakReading.day}`, color: C.heat },
            { label: 'Days Pasteurising', value: daysAbove, sub: '≥ 55°C', color: daysAbove >= 3 ? C.green : C.amber },
            { label: 'Total Turnings', value: turningCount, sub: 'aeration events', color: C.amber },
            { label: 'Days in Curing', value: daysInCuringPhase, sub: '< 45°C since D20', color: C.curing },
          ].map((k) => (
            <div key={k.label} style={{
              padding: '12px 14px', background: C.bg3, borderRadius: 10,
              border: `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: 9, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: k.color, fontFamily: F.mono, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: 9, color: C.textTertiary, marginTop: 3 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {activeView === 'unified' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {/* Domain cards */}
              {[
                {
                  domain: 'Temperature', icon: '🌡', freshness: 'current',
                  observations: `${allReadings.length} readings over ${lastR.day} days`,
                  summary: `Peak ${fToCStr(peakReading.temp)} on Day ${peakReading.day}. ${daysAbove} days above pasteurisation threshold. Currently ${fToCStr(lastR.temp)} in ${phase.label} phase.`,
                  status: 'rich',
                },
                {
                  domain: 'Aeration & Turning', icon: '↺', freshness: 'current',
                  observations: `${turningCount} turning events logged`,
                  summary: `6 turns executed at Days 3, 6, 9, 14, 20, and 27. All turns triggered by temperature or visual cues. No anaerobic events detected.`,
                  status: 'rich',
                },
                {
                  domain: 'Moisture', icon: '💧', freshness: 'current',
                  observations: 'Squeeze-test estimates per reading',
                  summary: `Started at 52%, declined to 36% through natural evaporation and microbial activity. Water added at Turn 1 (Day 3). Within 35–60% target throughout.`,
                  status: 'rich',
                },
                {
                  domain: 'Biology / Maturation', icon: '🌿', freshness: 'current',
                  observations: 'Field notes from visual inspection',
                  summary: `Actinomycetes observed Day 14. Fungal threads at Day 18. Earthworms at pile base Day 27. Earthy, non-offensive odour confirmed from Day 20 onward.`,
                  status: 'rich',
                },
                {
                  domain: 'Germination Test', icon: '🌱', freshness: 'missing',
                  observations: 'No data yet',
                  summary: 'Cress seed germination test not yet performed. Required before compost can be declared application-ready. Act task t6 pending.',
                  status: 'missing',
                },
              ].map((d) => (
                <div key={d.domain} style={{
                  padding: '14px 16px', background: C.bg3, borderRadius: 10,
                  border: `1px solid ${d.status === 'missing' ? C.textTertiary + '33' : C.border}`,
                  opacity: d.status === 'missing' ? 0.7 : 1,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{d.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{d.domain}</span>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 6,
                      background: d.freshness === 'current' ? C.greenDim : C.bg4,
                      color: d.freshness === 'current' ? C.green : C.textTertiary,
                      textTransform: 'uppercase',
                    }}>{d.freshness}</span>
                  </div>
                  <p style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.55, marginBottom: 6 }}>{d.summary}</p>
                  <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.mono }}>{d.observations}</div>
                </div>
              ))}
            </div>

            {/* Pathogen kill status */}
            <div style={{ padding: '14px 18px', background: daysAbove >= 3 ? C.greenDim : C.amberDim, borderRadius: 10, border: `1px solid ${daysAbove >= 3 ? C.green + '44' : C.amber + '44'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: daysAbove >= 3 ? C.green : C.amber, marginBottom: 3 }}>
                    Pathogen Kill Status: {daysAbove >= 3 ? 'CONFIRMED' : 'INSUFFICIENT'}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSecondary }}>
                    {daysAbove} days recorded ≥ 55°C. USDA standard requires minimum 3 consecutive days above 55°C.
                    {daysAbove >= 3 ? ' Threshold exceeded — E. coli and Salmonella kill confirmed by evidence record.' : ' Additional days required before pathogen kill can be confirmed.'}
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: daysAbove >= 3 ? C.green : C.amber, fontFamily: F.mono, flexShrink: 0, marginLeft: 16 }}>{daysAbove}d</div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'curve' && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>Temperature Curve — Domain Detail</div>
            <div style={{ fontSize: 11, color: C.textSecondary, marginBottom: 16 }}>
              Full 34-day thermal record. Turning events marked ↺ in amber. Phase bands shown.
            </div>
            <div style={{ background: C.bg3, borderRadius: 12, border: `1px solid ${C.border}`, padding: '16px 12px 8px', marginBottom: 16 }}>
              <TempCurve readings={allReadings} width={680} height={280} />
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, padding: '10px 0', marginBottom: 16 }}>
              {[
                { color: C.heat, label: 'Temperature curve' },
                { color: C.amber, label: 'Turning event' },
                { color: C.heat, label: 'Thermophilic zone (45–71°C)', opacity: 0.2 },
                { color: C.heat, label: 'Pasteurisation band (55–63°C)', opacity: 0.4 },
              ].map((l) => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 4, borderRadius: 2, background: l.color, opacity: l.opacity || 1 }} />
                  <span style={{ fontSize: 10, color: C.textTertiary }}>{l.label}</span>
                </div>
              ))}
            </div>
            {/* Notable events */}
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary, marginBottom: 10 }}>Notable Data Points</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {allReadings.filter((r) => r.proofPhoto || r.turned || r.note).slice(0, 9).map((r) => (
                <div key={r.id} style={{ padding: '10px 12px', background: C.bg3, borderRadius: 8, border: `1px solid ${C.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: C.textTertiary, fontFamily: F.mono }}>Day {r.day} · {r.date}</span>
                    {r.turned && <span style={{ fontSize: 9, color: C.amber, fontWeight: 700 }}>TURN</span>}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: getPhaseMeta(r.temp).color, fontFamily: F.mono, marginBottom: 3 }}>{fToCStr(r.temp)}</div>
                  {r.note && <div style={{ fontSize: 10, color: C.textTertiary, lineHeight: 1.4 }}>{r.note.slice(0, 60)}{r.note.length > 60 ? '…' : ''}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'temporal' && <PhaseComparison />}
      </div>
    </div>
  );
}
