import { useState } from 'react';
import { C, F, PLAN_RECIPE, fToC, type PlanObjective } from './model.js';
import { useCompostStore } from './useCompostStore.js';

// ─── PLAN STAGE ───────────────────────────────────────────────────────────────
export default function PlanStage() {
  // The org-shared Plan payload from the server; PLAN_RECIPE is the offline
  // fallback. `planRecipeFromPile` reproduces the exact PlanRecipe shape (incl.
  // °F targets), so all the JSX below renders unchanged either way.
  const pile = useCompostStore((s) => s.pile) ?? PLAN_RECIPE;
  const [selectedObj, setSelectedObj] = useState<PlanObjective | undefined>(pile.objectives[2]);
  const [activeSection, setActiveSection] = useState<string>("objectives");

  const dims = pile.dimensions;
  const vol = dims.l * dims.w * dims.h;

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden", minWidth: 0 }}>
      {/* LEFT: Plan nav */}
      <div style={{
        width: 228, flexShrink: 0, background: C.bg2,
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 2 }}>Plan</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, fontFamily: F.serif }}>
            {pile.pileName}
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{pile.site}</div>
        </div>

        {/* Section nav */}
        <div style={{ padding: "8px 0" }}>
          {["objectives", "recipe", "checklist"].map(s => (
            <button key={s} onClick={() => setActiveSection(s)} style={{
              width: "100%", textAlign: "left", padding: "9px 16px",
              background: s === activeSection ? C.bg3 : "transparent",
              border: "none", borderLeft: `2px solid ${s === activeSection ? C.amber : "transparent"}`,
              color: s === activeSection ? C.textPrimary : C.textSecondary,
              fontSize: 14, fontWeight: s === activeSection ? 600 : 400,
              cursor: "pointer", fontFamily: F.sans,
              textTransform: "capitalize",
            }}>{s}</button>
          ))}
        </div>

        {/* Pile vitals */}
        <div style={{ margin: "0 10px", padding: "10px 12px", background: C.bg3, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.textTertiary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Pile Vitals</div>
          {[
            { label: "Dimensions", value: `${dims.l}×${dims.w}×${dims.h} ft` },
            { label: "Volume", value: `${vol} cu ft`, good: vol >= 27 },
            { label: "C:N Ratio", value: `${pile.cnRatio}:1`, good: true },
            { label: "Target moisture", value: `${pile.targetMoisture}%`, good: true },
            { label: "Target temp", value: `${fToC(pile.targetTempMin)}–${fToC(pile.targetTempMax)}°C`, good: true },
          ].map(v => (
            <div key={v.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.sans }}>{v.label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: F.mono, color: v.good === false ? C.red : v.good ? C.green : C.textPrimary }}>
                {v.value}
              </span>
            </div>
          ))}
        </div>

        {/* Plan progress */}
        <div style={{ padding: "12px 16px", marginTop: "auto", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 12, color: C.textTertiary, marginBottom: 6 }}>Plan progress</div>
          <div style={{ height: 3, background: C.bg4, borderRadius: 2 }}>
            <div style={{ height: "100%", width: "80%", background: C.amber, borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 5, fontFamily: F.mono }}>4 / 5 objectives</div>
        </div>
      </div>

      {/* CENTRE */}
      <div style={{ width: 310, flexShrink: 0, background: C.bg, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
        {activeSection === "objectives" && (
          <>
            <div style={{ padding: "14px 14px 8px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Planning Objectives</div>
              <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>5 objectives across 3 tiers</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
              {pile.objectives.map(obj => {
                const isSel = selectedObj?.id === obj.id;
                const statusColors: Record<string, string> = { complete: C.green, available: C.amber, locked: C.textTertiary };
                const sc = statusColors[obj.status] ?? C.textTertiary;
                return (
                  <div key={obj.id} onClick={() => setSelectedObj(obj)} style={{
                    padding: "11px 13px", marginBottom: 4, borderRadius: 9,
                    background: isSel ? C.bg3 : "transparent",
                    border: `1px solid ${isSel ? C.amber + "55" : C.border}`,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, fontFamily: F.serif, lineHeight: 1.35, flex: 1 }}>{obj.title}</span>
                      <span style={{
                        fontSize: 12, fontWeight: 700, padding: "2px 7px", borderRadius: 8,
                        background: sc + "22", color: sc, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.06em",
                      }}>{obj.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 4, fontFamily: F.mono }}>Tier {obj.tier}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeSection === "recipe" && (
          <>
            <div style={{ padding: "14px 14px 8px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Feedstock Recipe</div>
              <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>7 layers · target C:N 30:1</div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
              {/* C:N visual bar */}
              <div style={{ margin: "4px 0 12px", padding: "10px 12px", background: C.bg3, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 12, color: C.textTertiary, marginBottom: 6 }}>Browns vs Greens ratio</div>
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", gap: 1 }}>
                  <div style={{ flex: 4, background: C.amber, borderRadius: "4px 0 0 4px" }} />
                  <div style={{ flex: 1, background: C.green, borderRadius: "0 4px 4px 0" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: C.amber, fontFamily: F.mono }}>Browns (C) ~80%</span>
                  <span style={{ fontSize: 12, color: C.green, fontFamily: F.mono }}>Greens (N) ~20%</span>
                </div>
              </div>

              {pile.layers.map((layer, i) => (
                <div key={layer.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", marginBottom: 3, borderRadius: 7,
                  background: C.bg3, border: `1px solid ${C.border}`,
                }}>
                  <div style={{
                    width: 8, height: 32, borderRadius: 3, flexShrink: 0,
                    background: layer.type === "brown" ? C.amber : C.green,
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>{layer.name}</div>
                    <div style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono, marginTop: 1 }}>
                      {layer.depth} · C:N ~{layer.cnApprox}:1 · {layer.type === "brown" ? "Brown" : "Green"}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: layer.type === "brown" ? C.amber : C.green, fontWeight: 700 }}>
                    L{i + 1}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeSection === "checklist" && (
          <>
            <div style={{ padding: "14px 14px 8px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Build Checklist</div>
              <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>
                {pile.checklist.filter(c => c.done).length} / {pile.checklist.length} complete
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
              {pile.checklist.map(item => (
                <div key={item.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "9px 10px", marginBottom: 4, borderRadius: 7,
                  background: item.done ? C.greenDim : C.bg3,
                  border: `1px solid ${item.done ? C.green + "44" : C.border}`,
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                    background: item.done ? C.green : "transparent",
                    border: `1.5px solid ${item.done ? C.green : C.borderLight}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {item.done && <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 13, color: item.done ? C.textPrimary : C.textSecondary, lineHeight: 1.45 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* RIGHT: objective detail */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20, minWidth: 0 }}>
        {activeSection === "objectives" && selectedObj ? (
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: C.textTertiary, fontFamily: F.mono }}>Tier {selectedObj.tier}</span>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: C.textTertiary }} />
              <span style={{
                fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                background: selectedObj.status === "complete" ? C.greenDim : C.amberDim,
                color: selectedObj.status === "complete" ? C.green : C.amber,
                textTransform: "uppercase", letterSpacing: "0.06em",
              }}>{selectedObj.status}</span>
            </div>
            <h2 style={{ fontSize: 24, fontFamily: F.serif, color: C.textPrimary, fontWeight: 500, marginBottom: 20, lineHeight: 1.3 }}>{selectedObj.title}</h2>

            {/* Completion gate */}
            <div style={{ padding: "14px 16px", background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.textTertiary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Completion Gate</div>
              <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>{selectedObj.gate}</p>
            </div>

            {selectedObj.status === "complete" && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: C.greenDim, borderRadius: 10, border: `1px solid ${C.green}44` }}>
                <span style={{ fontSize: 22 }}>✓</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.green }}>Approved for Act</div>
                  <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 1 }}>Plan output verified. Act tasks have been generated from this objective.</div>
                </div>
              </div>
            )}

            {selectedObj.status === "available" && (
              <div style={{ padding: "12px 16px", background: C.amberDim, borderRadius: 10, border: `1px solid ${C.amber}44`, marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 4 }}>Ready to begin</div>
                <div style={{ fontSize: 13, color: C.textSecondary }}>All prerequisite objectives are complete. This objective can now be actioned.</div>
              </div>
            )}

            <div style={{ padding: "14px 16px", background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}`, marginTop: 16 }}>
              <div style={{ fontSize: 12, color: C.textTertiary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Observe Feeds</div>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>
                Act tasks generated by this objective populate the Compost Temperature Curve, Phase Detection, and Maturation Readiness surfaces in Observe.
              </p>
            </div>
          </div>
        ) : activeSection === "objectives" ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: C.textTertiary, fontSize: 14 }}>
            Select an objective
          </div>
        ) : (
          <div style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: 22, fontFamily: F.serif, color: C.textPrimary, fontWeight: 500, marginBottom: 12 }}>
              {activeSection === "recipe" ? "Recipe Design Notes" : "Pre-build Verification"}
            </h2>
            {activeSection === "recipe" && (
              <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                <p style={{ marginBottom: 12 }}>The layered recipe targets a blended C:N ratio of 30:1, alternating carbon-rich browns with nitrogen-rich greens. No single layer achieves 30:1 — the ratio is achieved through careful proportioning across the full stack.</p>
                <p style={{ marginBottom: 12 }}>Wood shavings (C:N ~400:1) are balanced by fresh grass clippings (~20:1) and kitchen scraps (~15:1). The straw layers (~80:1) contribute bulk and aeration channels.</p>
                <p>Pile volume of 48 cu ft exceeds the critical mass minimum of 27 cu ft (3×3×3 ft), providing adequate insulation for sustained thermophilic temperatures.</p>
              </div>
            )}
            {activeSection === "checklist" && (
              <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                <p>All 8 build prerequisites are confirmed complete. The pile was constructed on March 4th following the Plan recipe. The Act stage log begins at Day 0 with an ambient temperature baseline reading of 68°F.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
