import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Calculator, Copy, Check } from "lucide-react";

interface LoadCase {
  id: string;
  name: string;
  type: "permanent" | "variable" | "accidental";
  category: string;
  value: number;
}

const CATEGORIES = {
  permanent: [
    { value: "self-weight", label: "Self-weight (G_k)" },
    { value: "superimposed", label: "Superimposed dead load" },
    { value: "earth", label: "Earth pressure" },
  ],
  variable: [
    { value: "A", label: "Cat. A — Residential" },
    { value: "B", label: "Cat. B — Office" },
    { value: "C", label: "Cat. C — Congregation" },
    { value: "D", label: "Cat. D — Shopping" },
    { value: "E", label: "Cat. E — Storage" },
    { value: "H", label: "Cat. H — Roof" },
    { value: "snow", label: "Snow (s_k)" },
    { value: "wind", label: "Wind (w_k)" },
  ],
  accidental: [
    { value: "fire", label: "Fire" },
    { value: "impact", label: "Impact" },
  ],
};

// EN 1990 Table A1.1 — ψ factors (Polish NA)
const PSI_FACTORS: Record<string, [number, number, number]> = {
  // [ψ0, ψ1, ψ2]
  A: [0.7, 0.5, 0.3],
  B: [0.7, 0.5, 0.3],
  C: [0.7, 0.7, 0.6],
  D: [0.7, 0.7, 0.6],
  E: [1.0, 0.9, 0.8],
  H: [0.0, 0.0, 0.0],
  snow: [0.5, 0.2, 0.0], // PN-EN zone ≤ 1000m
  wind: [0.6, 0.2, 0.0],
  fire: [0.0, 0.0, 0.0],
  impact: [0.0, 0.0, 0.0],
};

// Partial factors
const GAMMA_G_SUP = 1.35;
const GAMMA_G_INF = 1.0;
const GAMMA_Q = 1.5;

interface Combination {
  name: string;
  type: "ULS" | "SLS-char" | "SLS-freq" | "SLS-qp";
  expression: string;
  value: number;
}

function generateCombinations(loads: LoadCase[]): Combination[] {
  const permanent = loads.filter((l) => l.type === "permanent");
  const variable = loads.filter((l) => l.type === "variable");
  const combos: Combination[] = [];

  if (variable.length === 0) {
    // Only permanent loads
    const val = permanent.reduce((s, l) => s + GAMMA_G_SUP * l.value, 0);
    const expr = permanent.map((l) => `${GAMMA_G_SUP}×${l.value}`).join(" + ");
    combos.push({ name: "ULS-1 (G only)", type: "ULS", expression: expr, value: val });
    return combos;
  }

  // ULS: EN 1990 Eq. 6.10a/6.10b (use 6.10 simplified for now)
  // For each leading variable action
  for (let lead = 0; lead < variable.length; lead++) {
    const parts: string[] = [];
    let val = 0;

    // Permanent loads (unfavorable)
    for (const g of permanent) {
      parts.push(`${GAMMA_G_SUP}·${g.name}`);
      val += GAMMA_G_SUP * g.value;
    }

    // Leading variable
    const lv = variable[lead];
    parts.push(`${GAMMA_Q}·${lv.name}`);
    val += GAMMA_Q * lv.value;

    // Accompanying variables
    for (let j = 0; j < variable.length; j++) {
      if (j === lead) continue;
      const av = variable[j];
      const psi0 = PSI_FACTORS[av.category]?.[0] ?? 0.7;
      if (psi0 > 0) {
        parts.push(`${GAMMA_Q}·${psi0}·${av.name}`);
        val += GAMMA_Q * psi0 * av.value;
      }
    }

    combos.push({
      name: `ULS-${lead + 1} (leading: ${lv.name})`,
      type: "ULS",
      expression: parts.join(" + "),
      value: val,
    });
  }

  // SLS Characteristic: Σ G_k + Q_k,1 + Σ ψ0·Q_k,i
  for (let lead = 0; lead < variable.length; lead++) {
    const parts: string[] = [];
    let val = 0;
    for (const g of permanent) { parts.push(g.name); val += g.value; }
    const lv = variable[lead];
    parts.push(lv.name);
    val += lv.value;
    for (let j = 0; j < variable.length; j++) {
      if (j === lead) continue;
      const av = variable[j];
      const psi0 = PSI_FACTORS[av.category]?.[0] ?? 0.7;
      if (psi0 > 0) { parts.push(`${psi0}·${av.name}`); val += psi0 * av.value; }
    }
    combos.push({
      name: `SLS-char-${lead + 1} (${lv.name})`,
      type: "SLS-char",
      expression: parts.join(" + "),
      value: val,
    });
  }

  // SLS Frequent: Σ G_k + ψ1·Q_k,1 + Σ ψ2·Q_k,i
  for (let lead = 0; lead < variable.length; lead++) {
    const parts: string[] = [];
    let val = 0;
    for (const g of permanent) { parts.push(g.name); val += g.value; }
    const lv = variable[lead];
    const psi1 = PSI_FACTORS[lv.category]?.[1] ?? 0.5;
    parts.push(`${psi1}·${lv.name}`);
    val += psi1 * lv.value;
    for (let j = 0; j < variable.length; j++) {
      if (j === lead) continue;
      const av = variable[j];
      const psi2 = PSI_FACTORS[av.category]?.[2] ?? 0.3;
      if (psi2 > 0) { parts.push(`${psi2}·${av.name}`); val += psi2 * av.value; }
    }
    combos.push({
      name: `SLS-freq-${lead + 1} (${lv.name})`,
      type: "SLS-freq",
      expression: parts.join(" + "),
      value: val,
    });
  }

  // SLS Quasi-permanent: Σ G_k + Σ ψ2·Q_k,i
  {
    const parts: string[] = [];
    let val = 0;
    for (const g of permanent) { parts.push(g.name); val += g.value; }
    for (const qv of variable) {
      const psi2 = PSI_FACTORS[qv.category]?.[2] ?? 0.3;
      if (psi2 > 0) { parts.push(`${psi2}·${qv.name}`); val += psi2 * qv.value; }
    }
    combos.push({
      name: "SLS-qp (quasi-permanent)",
      type: "SLS-qp",
      expression: parts.join(" + "),
      value: val,
    });
  }

  return combos;
}

let idCounter = 0;

export function LoadCombinationsPage() {
  const [loads, setLoads] = useState<LoadCase[]>([
    { id: `lc-${++idCounter}`, name: "G₁", type: "permanent", category: "self-weight", value: 5.0 },
    { id: `lc-${++idCounter}`, name: "Q₁", type: "variable", category: "B", value: 3.0 },
    { id: `lc-${++idCounter}`, name: "S", type: "variable", category: "snow", value: 1.2 },
  ]);

  const [copied, setCopied] = useState(false);

  const addLoad = useCallback((type: "permanent" | "variable") => {
    const count = loads.filter((l) => l.type === type).length + 1;
    const name = type === "permanent" ? `G₃` : `Q${count}`;
    setLoads((prev) => [
      ...prev,
      {
        id: `lc-${++idCounter}`,
        name,
        type,
        category: type === "permanent" ? "self-weight" : "B",
        value: 0,
      },
    ]);
  }, [loads]);

  const removeLoad = useCallback((id: string) => {
    setLoads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLoad = useCallback((id: string, field: keyof LoadCase, value: string | number) => {
    setLoads((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (field === "value") return { ...l, value: Number(value) || 0 };
        return { ...l, [field]: value };
      })
    );
  }, []);

  const combinations = useMemo(() => generateCombinations(loads), [loads]);
  const governing = useMemo(() => {
    const uls = combinations.filter((c) => c.type === "ULS");
    return uls.length > 0 ? uls.reduce((a, b) => a.value > b.value ? a : b) : null;
  }, [combinations]);

  const copyTable = useCallback(() => {
    const rows = combinations.map((c) => `${c.name}\t${c.expression}\t${c.value.toFixed(2)}`);
    navigator.clipboard.writeText(`Name\tExpression\tValue (kN/m)\n${rows.join("\n")}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [combinations]);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Header */}
      <div className="h-14 border-b flex items-center px-6 gap-3 shrink-0">
        <Calculator className="w-5 h-5 text-muted-foreground" />
        <h1 className="font-semibold">Load Combinations — EN 1990</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
          {/* Load inputs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-sm">Load Cases</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => addLoad("permanent")}>
                  <Plus className="w-3.5 h-3.5" /> Permanent
                </Button>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => addLoad("variable")}>
                  <Plus className="w-3.5 h-3.5" /> Variable
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {loads.map((load) => (
                <div key={load.id} className="flex items-center gap-2 p-3 border rounded-lg bg-background">
                  <Input
                    className="w-20 h-8 text-sm"
                    value={load.name}
                    onChange={(e) => updateLoad(load.id, "name", e.target.value)}
                  />
                  <select
                    className="h-8 px-2 text-xs border rounded-md bg-background"
                    value={load.category}
                    onChange={(e) => updateLoad(load.id, "category", e.target.value)}
                  >
                    {CATEGORIES[load.type].map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    className="w-24 h-8 text-sm text-right"
                    value={load.value || ""}
                    onChange={(e) => updateLoad(load.id, "value", e.target.value)}
                    placeholder="kN/m"
                  />
                  <span className="text-xs text-muted-foreground">kN/m</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    load.type === "permanent" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    {load.type === "permanent" ? "G" : "Q"}
                  </span>
                  {load.type === "variable" && (
                    <span className="text-[10px] text-muted-foreground">
                      ψ₀={PSI_FACTORS[load.category]?.[0] ?? "?"} ψ₁={PSI_FACTORS[load.category]?.[1] ?? "?"} ψ₂={PSI_FACTORS[load.category]?.[2] ?? "?"}
                    </span>
                  )}
                  <div className="flex-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLoad(load.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          {combinations.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium text-sm">
                  Generated Combinations ({combinations.length})
                </h2>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={copyTable}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Table"}
                </Button>
              </div>

              {governing && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Governing ULS combination:</div>
                  <div className="text-sm font-semibold mt-0.5">{governing.name} = {governing.value.toFixed(2)} kN/m</div>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 py-2 font-medium">Combination</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                      <th className="text-left px-3 py-2 font-medium">Expression</th>
                      <th className="text-right px-3 py-2 font-medium">Value (kN/m)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinations.map((c, i) => (
                      <tr key={i} className={`border-t ${c === governing ? "bg-emerald-50/50 dark:bg-emerald-900/10" : ""}`}>
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            c.type === "ULS" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}>{c.type}</span>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{c.expression}</td>
                        <td className="px-3 py-2 text-right font-mono font-medium">{c.value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p>γ_G,sup = {GAMMA_G_SUP} · γ_G,inf = {GAMMA_G_INF} · γ_Q = {GAMMA_Q} (STR/GEO, persistent/transient)</p>
                <p>ψ factors per PN-EN 1990 Table A1.1 (Polish National Annex)</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
