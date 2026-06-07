import { useMemo, useState } from 'react';
import {
  C,
  F,
  PLAN_RECIPE,
  fToC,
  TEMPLATES,
  PLANT_TYPES,
  FEEDSTOCK_LIBRARY,
  ALL_MATERIALS,
  ZERO_INPUTS,
  TARGET_BUCKETS,
  buildTemplateInputs,
  calcBlendedCN,
  calcRatios,
  type PlanObjective,
  type PlantType,
  type Feedstock,
  type FeedstockCategory,
  type RecipeTemplateKey,
  type MaterialInputs,
  type RatioBreakdown,
} from './model.js';
import { useCompostStore } from './useCompostStore.js';

// A confirmed recipe is purely local/ephemeral planning state — it is NOT
// persisted to the store or API (per the local-only Recipe Maker decision).
interface ConfirmedLayer {
  id: string;
  name: string;
  qty: number;
  cn: number;
  category: FeedstockCategory;
}
interface ConfirmedRecipe {
  plant: PlantType;
  template: RecipeTemplateKey;
  layers: ConfirmedLayer[];
  blendedCN: number | null;
  ratios: RatioBreakdown;
}

type RecipeStep = 'plant' | 'inputs' | 'result';

// ─── PLAN STAGE ───────────────────────────────────────────────────────────────
export default function PlanStage() {
  // The org-shared Plan payload from the server; PLAN_RECIPE is the offline
  // fallback. `planRecipeFromPile` reproduces the exact PlanRecipe shape (incl.
  // °F targets), so all the JSX below renders unchanged either way.
  const pile = useCompostStore((s) => s.pile) ?? PLAN_RECIPE;
  const [selectedObj, setSelectedObj] = useState<PlanObjective | undefined>(pile.objectives[2]);
  const [activeSection, setActiveSection] = useState<string>("objectives");

  // ── Recipe Maker — local-only ephemeral planning state ──────────────────────
  const [recipeStep, setRecipeStep] = useState<RecipeStep>("plant");
  const [selectedPlant, setSelectedPlant] = useState<PlantType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RecipeTemplateKey | null>(null);
  const [materialInputs, setMaterialInputs] = useState<MaterialInputs>(ZERO_INPUTS);
  const [confirmedRecipe, setConfirmedRecipe] = useState<ConfirmedRecipe | null>(null);

  const blendedCN = useMemo(() => calcBlendedCN(materialInputs), [materialInputs]);
  const ratios = useMemo(() => calcRatios(materialInputs), [materialInputs]);

  const cnStatus: "empty" | "good" | "too_low" | "too_high" =
    !blendedCN || !selectedPlant ? "empty"
      : blendedCN >= selectedPlant.cnMin && blendedCN <= selectedPlant.cnMax ? "good"
      : blendedCN < selectedPlant.cnMin ? "too_low" : "too_high";

  const highNWarn = ratios.total > 0 && ratios.highNPct < 0.10;
  const activeMaterials = Object.entries(materialInputs).filter(([, v]) => v > 0);

  function applyTemplate(key: RecipeTemplateKey) {
    setSelectedTemplate(key);
    setMaterialInputs(buildTemplateInputs(key));
  }

  function nudgeCategory(catKey: FeedstockCategory, delta: number) {
    setMaterialInputs(prev => {
      const next = { ...prev };
      FEEDSTOCK_LIBRARY[catKey].forEach(mat => {
        next[mat.id] = Math.max(mat.min, Math.min(mat.max, (next[mat.id] || 0) + delta));
      });
      return next;
    });
  }

  function rebalanceToTemplate() {
    if (!selectedTemplate) return;
    const t = TEMPLATES[selectedTemplate];
    const targets = {
      highN: Math.round(TARGET_BUCKETS * t.highN * 2) / 2,
      green: Math.round(TARGET_BUCKETS * t.green * 2) / 2,
      brown: Math.round(TARGET_BUCKETS * t.brown * 2) / 2,
    };
    const scaleCategory = (catKey: FeedstockCategory, targetTotal: number): MaterialInputs => {
      const mats = FEEDSTOCK_LIBRARY[catKey];
      const cur = mats.reduce((s, m) => s + (materialInputs[m.id] || 0), 0);
      if (cur === 0) {
        const perMat = Math.round((targetTotal / mats.length) * 2) / 2;
        return Object.fromEntries(mats.map(m => [m.id, Math.min(perMat, m.max)]));
      }
      const scale = targetTotal / cur;
      return Object.fromEntries(mats.map(m => [m.id, Math.min(Math.round((materialInputs[m.id] || 0) * scale * 2) / 2, m.max)]));
    };
    setMaterialInputs({ ...materialInputs, ...scaleCategory("highN", targets.highN), ...scaleCategory("green", targets.green), ...scaleCategory("brown", targets.brown) });
  }

  function handleSelectPlant(plant: PlantType) {
    setSelectedPlant(plant);
    setSelectedTemplate(plant.recipe);
    setMaterialInputs(buildTemplateInputs(plant.recipe));
  }

  function handleConfirmRecipe() {
    if (!selectedPlant || !selectedTemplate) return;
    const layers: ConfirmedLayer[] = activeMaterials.flatMap(([id, qty]) => {
      const mat = ALL_MATERIALS.find(m => m.id === id);
      if (!mat) return [];
      const cat: FeedstockCategory = FEEDSTOCK_LIBRARY.highN.some(m => m.id === id) ? "highN"
        : FEEDSTOCK_LIBRARY.green.some(m => m.id === id) ? "green" : "brown";
      return [{ id, name: mat.name, qty, cn: mat.cn, category: cat }];
    });
    setConfirmedRecipe({ plant: selectedPlant, template: selectedTemplate, layers, blendedCN, ratios });
    setRecipeStep("result");
  }

  const dims = pile.dimensions;
  const vol = dims.l * dims.w * dims.h;

  // ── Shared slider renderer (local recipe maker only) ────────────────────────
  function MaterialSlider({ mat, catColor }: { mat: Feedstock; catColor: string }) {
    const val = materialInputs[mat.id] ?? 0;
    const pct = mat.max > 0 ? (val / mat.max) * 100 : 0;
    const isActive = val > 0;
    return (
      <div style={{ padding: "5px 12px 7px", background: isActive ? `${catColor}0A` : "transparent", borderLeft: `2px solid ${isActive ? catColor : "transparent"}`, transition: "all 0.12s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
          <span style={{ fontSize: 11, color: isActive ? C.textPrimary : C.textSecondary, fontWeight: isActive ? 600 : 400 }}>{mat.name}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? catColor : C.textTertiary, fontFamily: F.mono, minWidth: 46, textAlign: "right" }}>
            {val > 0 ? `${val} bkt` : "—"}
          </span>
        </div>
        <div style={{ position: "relative", height: 18, display: "flex", alignItems: "center" }}>
          <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", height: 4, borderRadius: 2, width: "100%", background: C.bg4 }} />
          <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", height: 4, borderRadius: 2, width: `${pct}%`, background: isActive ? catColor : C.bg4, transition: "width 0.05s" }} />
          <input type="range" min={mat.min} max={mat.max} step={mat.step} value={val}
            onChange={e => setMaterialInputs(prev => ({ ...prev, [mat.id]: parseFloat(e.target.value) }))}
            style={{ position: "absolute", left: 0, right: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", margin: 0 }}
          />
          <div style={{ position: "absolute", left: `calc(${pct}% - 7px)`, width: 14, height: 14, borderRadius: "50%", background: isActive ? catColor : C.bg4, border: `2px solid ${isActive ? catColor : C.borderLight}`, boxShadow: isActive ? `0 0 0 3px ${catColor}22` : "none", transition: "left 0.05s, background 0.12s", pointerEvents: "none" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 1 }}>
          <span style={{ fontSize: 8, color: C.textTertiary, fontFamily: F.mono }}>{mat.min}</span>
          <span style={{ fontSize: 8, color: C.textTertiary, flex: 1, textAlign: "center", padding: "0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mat.note}</span>
          <span style={{ fontSize: 8, color: C.textTertiary, fontFamily: F.mono }}>{mat.max}</span>
        </div>
      </div>
    );
  }

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
            // C:N Ratio reflects the live Recipe Maker blend when active; falls
            // back to the pile's planned ratio when no materials are loaded.
            {
              label: "C:N Ratio",
              value: blendedCN ? `${blendedCN}:1` : `${pile.cnRatio}:1`,
              good: blendedCN ? (cnStatus === "good" ? true : cnStatus === "empty" ? undefined : false) : true,
            },
            { label: "Total buckets", value: ratios.total > 0 ? `${ratios.total} bkt` : "—", good: ratios.total >= 30 ? true : ratios.total > 0 ? false : undefined },
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
          {selectedPlant && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, color: C.textTertiary, marginBottom: 3 }}>Target for {selectedPlant.label}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.amber, fontFamily: F.mono }}>{selectedPlant.cnMin}–{selectedPlant.cnMax}:1</div>
              {selectedTemplate && <div style={{ fontSize: 11, marginTop: 3, color: TEMPLATES[selectedTemplate].color, fontWeight: 600 }}>{TEMPLATES[selectedTemplate].label}</div>}
            </div>
          )}
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

        {/* RECIPE MAKER — local-only 3-step planner */}
        {activeSection === "recipe" && (
          <>
            {/* Step indicator */}
            <div style={{ padding: "10px 12px 8px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center" }}>
              {([{ id: "plant", label: "1 · Plant" }, { id: "inputs", label: "2 · Materials" }, { id: "result", label: "3 · Recipe" }] as { id: RecipeStep; label: string }[]).map((step, i) => {
                const isActive = recipeStep === step.id;
                const isDone = (step.id === "plant" && recipeStep !== "plant") || (step.id === "inputs" && recipeStep === "result");
                return (
                  <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
                    {i > 0 && <div style={{ width: 14, height: 1, background: isDone ? C.amber : C.border, margin: "0 3px" }} />}
                    <button onClick={() => { if (step.id === "inputs" && !selectedPlant) return; if (step.id === "result" && !confirmedRecipe) return; setRecipeStep(step.id); }} style={{ padding: "3px 8px", borderRadius: 12, border: "none", background: isActive ? C.amberDim : isDone ? C.bg3 : "transparent", color: isActive ? C.amber : isDone ? C.textSecondary : C.textTertiary, fontSize: 10, fontWeight: isActive ? 700 : 500, cursor: "pointer", fontFamily: F.sans }}>{step.label}</button>
                  </div>
                );
              })}
            </div>

            {/* STEP 1 — Plant selector */}
            {recipeStep === "plant" && (
              <div style={{ flex: 1, overflowY: "auto", padding: "8px 6px" }}>
                <div style={{ fontSize: 10, color: C.textTertiary, padding: "2px 6px 8px" }}>Select what you are growing — this pre-loads the right recipe template.</div>
                {PLANT_TYPES.map(plant => {
                  const isSel = selectedPlant?.id === plant.id;
                  const tColor = TEMPLATES[plant.recipe].color;
                  return (
                    <div key={plant.id} onClick={() => handleSelectPlant(plant)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", marginBottom: 3, borderRadius: 8, background: isSel ? C.bg3 : "transparent", border: `1px solid ${isSel ? C.amber + "88" : C.border}`, cursor: "pointer", transition: "all 0.12s" }}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{plant.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isSel ? C.amber : C.textPrimary }}>{plant.label}</div>
                        <div style={{ fontSize: 9, color: C.textTertiary, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{plant.desc}</div>
                      </div>
                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: tColor }}>{TEMPLATES[plant.recipe].label.split("-")[0]}</div>
                        <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.mono }}>{plant.cnMin}–{plant.cnMax}:1</div>
                      </div>
                    </div>
                  );
                })}
                {selectedPlant && (
                  <div style={{ padding: "8px 4px" }}>
                    <button onClick={() => setRecipeStep("inputs")} style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: C.amber, color: "#0F0F0D", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: F.sans }}>Continue → Adjust Materials</button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2 — Sliders */}
            {recipeStep === "inputs" && selectedPlant && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {/* Sticky header */}
                <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.bg, zIndex: 2 }}>
                  {/* Template toggle */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    {(Object.entries(TEMPLATES) as [RecipeTemplateKey, typeof TEMPLATES[RecipeTemplateKey]][]).map(([key, t]) => (
                      <button key={key} onClick={() => applyTemplate(key)} style={{ flex: 1, padding: "5px 0", borderRadius: 8, border: `1px solid ${selectedTemplate === key ? t.color : C.border}`, background: selectedTemplate === key ? t.color + "22" : "transparent", color: selectedTemplate === key ? t.color : C.textTertiary, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: F.sans }}>{t.label}</button>
                    ))}
                  </div>
                  {/* Ratio breakdown */}
                  <div style={{ display: "flex", gap: 3, marginBottom: 5 }}>
                    {[
                      { key: "highN", label: "High-N", pct: ratios.highNPct, bkt: ratios.highN, color: C.blue },
                      { key: "green", label: "Green", pct: ratios.greenPct, bkt: ratios.green, color: C.green },
                      { key: "brown", label: "Brown", pct: ratios.brownPct, bkt: ratios.brown, color: C.amber },
                    ].map(r => (
                      <div key={r.key} style={{ flex: 1, textAlign: "center" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: r.color, fontFamily: F.mono }}>{Math.round(r.pct * 100)}%</div>
                        <div style={{ fontSize: 8, color: C.textTertiary }}>{r.label}</div>
                        <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.mono }}>{r.bkt} bkt</div>
                      </div>
                    ))}
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.textPrimary, fontFamily: F.mono }}>{ratios.total}</div>
                      <div style={{ fontSize: 8, color: C.textTertiary }}>Total</div>
                      <div style={{ fontSize: 9, color: ratios.total >= 30 ? C.green : C.amber, fontFamily: F.mono }}>/{TARGET_BUCKETS}</div>
                    </div>
                  </div>
                  {/* Stacked ratio bar */}
                  <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 5 }}>
                    {[{ pct: ratios.highNPct, color: C.blue }, { pct: ratios.greenPct, color: C.green }, { pct: ratios.brownPct, color: C.amber }].map((s, i) => (
                      <div key={i} style={{ width: `${s.pct * 100}%`, background: s.color, transition: "width 0.2s" }} />
                    ))}
                  </div>
                  {/* C:N needle */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: C.textTertiary }}>Blended C:N</span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: F.mono, color: cnStatus === "good" ? C.green : cnStatus === "too_low" ? C.blue : cnStatus === "too_high" ? C.red : C.textTertiary }}>{blendedCN ? `${blendedCN}:1` : "—"}</span>
                  </div>
                  <div style={{ position: "relative", height: 6, background: C.bg4, borderRadius: 3 }}>
                    <div style={{ position: "absolute", left: `${(selectedPlant.cnMin / 80) * 100}%`, width: `${((selectedPlant.cnMax - selectedPlant.cnMin) / 80) * 100}%`, top: 0, bottom: 0, background: C.green, opacity: 0.35, borderRadius: 3 }} />
                    {blendedCN && <div style={{ position: "absolute", left: `${Math.min(97, (blendedCN / 80) * 100)}%`, top: 0, bottom: 0, width: 3, background: cnStatus === "good" ? C.green : cnStatus === "too_low" ? C.blue : C.red, borderRadius: 2, transition: "left 0.2s" }} />}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                    <span style={{ fontSize: 8, color: C.textTertiary }}>0</span>
                    <span style={{ fontSize: 8, color: C.green }}>target {selectedPlant.cnMin}–{selectedPlant.cnMax}:1</span>
                    <span style={{ fontSize: 8, color: C.textTertiary }}>80+</span>
                  </div>
                  {/* Warnings */}
                  {highNWarn && (
                    <div style={{ marginTop: 6, padding: "6px 10px", background: C.amberDim, borderRadius: 6, border: `1px solid ${C.amber}44` }}>
                      <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginBottom: 2 }}>High-N below 10% — pile may not reach thermophilic temperatures</div>
                      <div style={{ fontSize: 9, color: C.textSecondary }}>Increase High-N or use Rebalance below.</div>
                    </div>
                  )}
                  {cnStatus === "too_low" && <div style={{ fontSize: 10, color: C.blue, marginTop: 4 }}>Too N-rich — slide browns up or greens down.</div>}
                  {cnStatus === "too_high" && <div style={{ fontSize: 10, color: C.red, marginTop: 4 }}>Too C-rich — slide greens or High-N up.</div>}
                  {cnStatus === "good" && !highNWarn && <div style={{ fontSize: 10, color: C.green, marginTop: 4 }}>C:N on target for {selectedPlant.label}.</div>}
                </div>

                {/* Category sliders with nudge buttons */}
                {([
                  { key: "highN", label: "High-N Materials", color: C.blue, desc: "Manures, meals, activators" },
                  { key: "green", label: "Greens", color: C.green, desc: "Fresh plant material, food scraps" },
                  { key: "brown", label: "Browns", color: C.amber, desc: "Dry carbon-rich material" },
                ] as { key: FeedstockCategory; label: string; color: string; desc: string }[]).map(cat => {
                  const catTotal = FEEDSTOCK_LIBRARY[cat.key].reduce((s, m) => s + (materialInputs[m.id] || 0), 0);
                  return (
                    <div key={cat.key} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px 4px" }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: cat.color, flex: 1 }}>{cat.label}</span>
                        <span style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.mono, marginRight: 4 }}>{catTotal} bkt</span>
                        <button onClick={() => nudgeCategory(cat.key, -0.5)} style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>−</button>
                        <button onClick={() => nudgeCategory(cat.key, 0.5)} style={{ width: 20, height: 20, borderRadius: 4, border: `1px solid ${C.border}`, background: C.bg3, color: C.textSecondary, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>+</button>
                      </div>
                      {FEEDSTOCK_LIBRARY[cat.key].map(mat => (
                        <MaterialSlider key={mat.id} mat={mat} catColor={cat.color} />
                      ))}
                    </div>
                  );
                })}

                {/* Rebalance + Confirm */}
                <div style={{ padding: "10px 10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <button onClick={rebalanceToTemplate} style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: `1px solid ${selectedTemplate ? TEMPLATES[selectedTemplate].color + "66" : C.border}`, background: "transparent", color: selectedTemplate ? TEMPLATES[selectedTemplate].color : C.textTertiary, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: F.sans }}>
                    ↺ Rebalance to {selectedTemplate ? TEMPLATES[selectedTemplate].label : "template"}
                  </button>
                  <button onClick={handleConfirmRecipe} disabled={activeMaterials.length === 0} style={{ width: "100%", padding: "11px 0", borderRadius: 8, border: "none", background: cnStatus === "good" && !highNWarn ? C.green : activeMaterials.length > 0 ? C.amber : C.bg4, color: activeMaterials.length > 0 ? "#0F0F0D" : C.textTertiary, fontSize: 12, fontWeight: 700, cursor: activeMaterials.length > 0 ? "pointer" : "default", fontFamily: F.sans, transition: "all 0.15s" }}>
                    {cnStatus === "good" && !highNWarn ? "Confirm Recipe →" : activeMaterials.length > 0 ? "Confirm Anyway →" : "Adjust sliders above"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 — Result */}
            {recipeStep === "result" && confirmedRecipe && (
              <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
                <div style={{ padding: "10px 12px", marginBottom: 8, borderRadius: 8, background: cnStatus === "good" ? C.greenDim : C.amberDim, border: `1px solid ${cnStatus === "good" ? C.green + "44" : C.amber + "44"}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: cnStatus === "good" ? C.green : C.amber, marginBottom: 2 }}>
                    {cnStatus === "good" && !highNWarn ? "Recipe confirmed — all targets met" : "Recipe confirmed — review warnings"}
                  </div>
                  <div style={{ fontSize: 10, color: C.textSecondary }}>
                    {confirmedRecipe.plant.icon} {confirmedRecipe.plant.label} · {TEMPLATES[confirmedRecipe.template].label} · C:N {confirmedRecipe.blendedCN}:1 · {confirmedRecipe.ratios.total} buckets
                  </div>
                </div>
                {/* Ratio bar */}
                <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
                  {[{ pct: confirmedRecipe.ratios.highNPct, color: C.blue }, { pct: confirmedRecipe.ratios.greenPct, color: C.green }, { pct: confirmedRecipe.ratios.brownPct, color: C.amber }].map((s, i) => (
                    <div key={i} style={{ width: `${s.pct * 100}%`, background: s.color }} />
                  ))}
                </div>
                {confirmedRecipe.layers.map((layer, i) => {
                  const catColor = layer.category === "highN" ? C.blue : layer.category === "green" ? C.green : C.amber;
                  return (
                    <div key={layer.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", marginBottom: 3, borderRadius: 7, background: C.bg3, border: `1px solid ${C.border}` }}>
                      <div style={{ width: 8, height: 28, borderRadius: 3, flexShrink: 0, background: catColor }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: C.textPrimary }}>{layer.name}</div>
                        <div style={{ fontSize: 9, color: C.textTertiary, marginTop: 1 }}>{layer.qty} bkt · C:N ~{layer.cn === 999 ? "∞" : `${layer.cn}:1`}</div>
                      </div>
                      <div style={{ fontSize: 10, color: catColor, fontWeight: 700 }}>L{i + 1}</div>
                    </div>
                  );
                })}
                <div style={{ padding: "8px 4px 0" }}>
                  <button onClick={() => { setRecipeStep("plant"); setSelectedPlant(null); setSelectedTemplate(null); setMaterialInputs(ZERO_INPUTS); setConfirmedRecipe(null); }} style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textSecondary, fontSize: 11, cursor: "pointer", fontFamily: F.sans }}>← Start over</button>
                </div>
              </div>
            )}
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

      {/* RIGHT: detail panel */}
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
        ) : activeSection === "recipe" ? (
          <div style={{ maxWidth: 520 }}>
            {recipeStep === "plant" && (
              <>
                <h2 style={{ fontSize: 22, fontFamily: F.serif, color: C.textPrimary, fontWeight: 500, marginBottom: 8 }}>Step 1 — Target Plant</h2>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, marginBottom: 16 }}>Select the crop or plant community this compost is intended for. The plant type pre-selects a recipe template — bacteria-dominant for nitrogen-hungry annuals and lawns, fungi-dominant for perennials, vegetables, and woody plants.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                  {(Object.entries(TEMPLATES) as [RecipeTemplateKey, typeof TEMPLATES[RecipeTemplateKey]][]).map(([key, t]) => (
                    <div key={key} style={{ padding: "12px 14px", background: C.bg3, borderRadius: 10, border: `1px solid ${t.color}44` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.label}</div>
                      <div style={{ fontSize: 10, color: C.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>
                        {key === "bacteria" ? "20% High-N · 45% Green · 35% Brown. Heats rapidly. Suits lawns, brassicas, leafy greens." : "15% High-N · 35% Green · 50% Brown. Slower heat. Suits vegetables, fruit trees, perennials."}
                      </div>
                      <div style={{ fontSize: 9, color: C.textTertiary, fontFamily: F.mono }}>{Math.round(TARGET_BUCKETS * t.highN)} / {Math.round(TARGET_BUCKETS * t.green)} / {Math.round(TARGET_BUCKETS * t.brown)} bkt</div>
                    </div>
                  ))}
                </div>
                {selectedPlant ? (
                  <div style={{ padding: "14px 16px", background: C.bg3, borderRadius: 10, border: `1px solid ${TEMPLATES[selectedPlant.recipe].color}44` }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: TEMPLATES[selectedPlant.recipe].color, marginBottom: 6 }}>{selectedPlant.icon} {selectedPlant.label}</div>
                    <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.6, marginBottom: 10 }}>{selectedPlant.note}</div>
                    <div style={{ display: "flex", gap: 20 }}>
                      <div>
                        <div style={{ fontSize: 9, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Template</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TEMPLATES[selectedPlant.recipe].color, marginTop: 2 }}>{TEMPLATES[selectedPlant.recipe].label}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: C.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em" }}>Target C:N</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, fontFamily: F.mono, marginTop: 2 }}>{selectedPlant.cnMin}–{selectedPlant.cnMax}:1</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "14px 16px", background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}`, color: C.textTertiary, fontSize: 12 }}>Select a plant type from the list to see its template and C:N target.</div>
                )}
              </>
            )}

            {recipeStep === "inputs" && selectedPlant && (
              <>
                <h2 style={{ fontSize: 22, fontFamily: F.serif, color: C.textPrimary, fontWeight: 500, marginBottom: 8 }}>Step 2 — Your Materials</h2>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, marginBottom: 14 }}>
                  Pre-loaded with the {selectedTemplate ? TEMPLATES[selectedTemplate].label : "selected"} template at {TARGET_BUCKETS} total buckets. Adjust sliders to match what you have. Use category + / − buttons to shift whole groups, or drag individual sliders. Hit Rebalance to snap back to template ratios.
                </p>
                <div style={{ padding: "12px 14px", background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: C.textTertiary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Why High-N matters for thermophilic heat</div>
                  <p style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.6 }}>Thermophilic bacteria require a rich nitrogen source to generate the metabolic heat that drives a pile above 55°C. Without sufficient High-N material (≥ 10% by volume), the pile may stall in the mesophilic zone and never reach pathogen-kill temperatures — regardless of the C:N ratio on paper.</p>
                </div>
                {activeMaterials.length > 0 && (
                  <div style={{ padding: "10px 14px", background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 10, color: C.textTertiary, marginBottom: 6 }}>Active inputs — {activeMaterials.length} materials · {ratios.total} buckets</div>
                    {activeMaterials.map(([id, qty]) => {
                      const mat = ALL_MATERIALS.find(m => m.id === id);
                      const col = FEEDSTOCK_LIBRARY.highN.some(m => m.id === id) ? C.blue : FEEDSTOCK_LIBRARY.green.some(m => m.id === id) ? C.green : C.amber;
                      return mat ? (
                        <div key={id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: C.textSecondary }}>{mat.name}</span>
                          <span style={{ fontSize: 11, color: col, fontFamily: F.mono }}>{qty} bkt</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </>
            )}

            {recipeStep === "result" && confirmedRecipe && (
              <>
                <h2 style={{ fontSize: 22, fontFamily: F.serif, color: C.textPrimary, fontWeight: 500, marginBottom: 8 }}>Confirmed Recipe</h2>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, marginBottom: 16 }}>
                  {confirmedRecipe.ratios.total} buckets · {TEMPLATES[confirmedRecipe.template].label} · C:N {confirmedRecipe.blendedCN}:1 · target {confirmedRecipe.plant.cnMin}–{confirmedRecipe.plant.cnMax}:1 for {confirmedRecipe.plant.label}.
                </p>
                <div style={{ padding: "14px 16px", background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: C.textTertiary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Material Contributions</div>
                  {confirmedRecipe.layers.map(layer => {
                    const catColor = layer.category === "highN" ? C.blue : layer.category === "green" ? C.green : C.amber;
                    const pct = Math.round((layer.qty / confirmedRecipe.ratios.total) * 100);
                    return (
                      <div key={layer.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: C.textPrimary }}>{layer.name}</span>
                          <span style={{ fontSize: 11, color: catColor, fontFamily: F.mono }}>{layer.qty} bkt · {pct}%</span>
                        </div>
                        <div style={{ height: 4, background: C.bg4, borderRadius: 2 }}><div style={{ height: "100%", width: `${pct}%`, background: catColor, borderRadius: 2 }} /></div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ padding: "12px 16px", background: C.bg3, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 10, color: C.textTertiary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Agronomic Note</div>
                  <p style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.6 }}>{confirmedRecipe.plant.note}</p>
                </div>
              </>
            )}
          </div>
        ) : (
          <div style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: 22, fontFamily: F.serif, color: C.textPrimary, fontWeight: 500, marginBottom: 12 }}>
              Pre-build Verification
            </h2>
            <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
              <p>All 8 build prerequisites are confirmed complete. The pile was constructed on March 4th following the Plan recipe. The Act stage log begins at Day 0 with an ambient temperature baseline reading of 68°F.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
