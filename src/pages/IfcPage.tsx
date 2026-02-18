import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import {
  HardHat,
  Upload,
  ArrowLeft,
  Loader2,
  Calculator,
  Building2,
  Columns3,
  LayoutGrid,
  BrickWall,
  FileText,
  ChevronDown,
  ChevronUp,
  Box,
} from "lucide-react";
import {
  parseIfcFile,
  elementToPrompt,
  type IfcParseResult,
  type IfcStructuralElement,
} from "@/lib/ifcParser";

// Lazy-load the 3D viewer so three.js isn't in the critical path
const IfcViewer = lazy(() =>
  import("@/components/IfcViewer").then((m) => ({ default: m.IfcViewer })),
);

const TYPE_ICONS = {
  beam: Building2,
  column: Columns3,
  slab: LayoutGrid,
  wall: BrickWall,
};

const TYPE_COLORS = {
  beam: "text-blue-500 bg-blue-500/10",
  column: "text-amber-500 bg-amber-500/10",
  slab: "text-emerald-500 bg-emerald-500/10",
  wall: "text-rose-500 bg-rose-500/10",
};

// ── Element card ─────────────────────────────────────────────────────────

function ElementCard({
  element,
  isSelected,
  onSelect,
  onCalculate,
}: {
  element: IfcStructuralElement;
  isSelected: boolean;
  onSelect: () => void;
  onCalculate: (prompt: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = TYPE_ICONS[element.type];
  const colorClass = TYPE_COLORS[element.type];
  const hasProperties = Object.keys(element.properties).length > 0;

  return (
    <div
      id={`element-card-${element.expressId}`}
      onClick={onSelect}
      className={`border rounded-xl p-4 bg-background transition-all cursor-pointer ${
        isSelected
          ? "ring-2 ring-chart-1 border-chart-1/40 shadow-md shadow-chart-1/5"
          : "hover:border-foreground/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{element.name}</h3>
            <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 bg-muted rounded-full">
              {element.type}
            </span>
          </div>
          {element.objectType && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {element.objectType}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            {element.material && <span>Material: {element.material}</span>}
            {element.geometry.length != null && (
              <span>
                L: {(element.geometry.length * 1000).toFixed(0)} mm
              </span>
            )}
            {element.geometry.width != null && (
              <span>
                W: {(element.geometry.width * 1000).toFixed(0)} mm
              </span>
            )}
            {element.geometry.height != null && (
              <span>
                H: {(element.geometry.height * 1000).toFixed(0)} mm
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onCalculate(elementToPrompt(element));
            }}
          >
            <Calculator className="w-3.5 h-3.5" /> Calculate
          </Button>
          {hasProperties && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title="Show IFC properties"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </Button>
          )}
        </div>
      </div>

      {expanded && hasProperties && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            IFC Properties
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {Object.entries(element.properties).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate">{key}</span>
                <span className="font-mono text-right">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

export function IfcPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IfcParseResult | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectedExpressId, setSelectedExpressId] = useState<number | null>(
    null,
  );

  // Set of structural element express IDs (for the viewer)
  const structuralExpressIds = useMemo(() => {
    if (!result) return new Set<number>();
    return new Set(result.elements.map((e) => e.expressId));
  }, [result]);

  // When selection changes from viewer, scroll card into view
  useEffect(() => {
    if (selectedExpressId == null) return;
    const el = document.getElementById(`element-card-${selectedExpressId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedExpressId]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setParsing(true);
      setError(null);
      setResult(null);
      setSelectedExpressId(null);

      try {
        const buffer = await file.arrayBuffer();
        const parsed = await parseIfcFile(new Uint8Array(buffer), file.name);
        setResult(parsed);
      } catch (err) {
        console.error("IFC parse error:", err);
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("wasm") || msg.includes("Aborted")) {
          setError(
            "WASM engine failed to load. Please try again or use a different browser (Chrome/Edge recommended).",
          );
        } else {
          setError(`Failed to parse IFC: ${msg}`);
        }
      } finally {
        setParsing(false);
      }
    },
    [],
  );

  const handleCalculate = useCallback(
    (prompt: string) => {
      sessionStorage.setItem("ifc-prompt", prompt);
      navigate("/chat");
    },
    [navigate],
  );

  const filteredElements = result?.elements.filter(
    (e) => !typeFilter || e.type === typeFilter,
  );

  const has3D = (result?.meshGroups?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b shrink-0">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <HardHat className="w-5 h-5 text-chart-1" />
          <span className="font-semibold text-sm">{APP_NAME}</span>
          <span className="text-muted-foreground text-sm">/ IFC Import</span>
        </div>
      </div>

      {!result ? (
        /* ── Upload area ────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 rounded-2xl bg-chart-1/10 flex items-center justify-center mb-6">
            <FileText className="w-8 h-8 text-chart-1" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Import IFC Model</h1>
          <p className="text-muted-foreground text-sm text-center max-w-md mb-8">
            Upload an IFC file to extract structural elements and view the 3D
            model. Each element can be sent to the AI for Eurocode design
            calculations.
          </p>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm max-w-md text-center">
              {error}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".ifc"
            className="hidden"
            onChange={handleFileUpload}
          />

          <Button
            size="lg"
            className="gap-2 h-12 px-8 rounded-xl"
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
          >
            {parsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Parsing IFC…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload IFC file
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground mt-4">
            Supports IFC2x3 and IFC4 files. Parsing happens in your browser — no
            data is uploaded to any server.
          </p>
        </div>
      ) : (
        /* ── Results ────────────────────────────────────────────────── */
        <div className="flex-1 flex flex-col min-h-0">
          {/* 3D Viewer */}
          {has3D && (
            <div className="shrink-0 border-b" style={{ height: "55vh", minHeight: 320 }}>
              <Suspense
                fallback={
                  <div className="w-full h-full flex items-center justify-center bg-[#131318]">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Box className="w-6 h-6 animate-pulse" />
                      <span className="text-sm">Loading 3D viewer…</span>
                    </div>
                  </div>
                }
              >
                <IfcViewer
                  meshGroups={result.meshGroups}
                  structuralExpressIds={structuralExpressIds}
                  selectedExpressId={selectedExpressId}
                  onSelectElement={setSelectedExpressId}
                />
              </Suspense>
            </div>
          )}

          {/* Elements panel */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-4 py-6">
              {/* Title row */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-xl font-bold">{result.filename}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.summary.total} structural element
                    {result.summary.total !== 1 ? "s" : ""} found
                    {has3D && (
                      <span className="ml-2 text-chart-1">
                        · 3D model loaded
                      </span>
                    )}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setResult(null);
                    setTypeFilter(null);
                    setSelectedExpressId(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  <Upload className="w-3.5 h-3.5" /> New file
                </Button>
              </div>

              {/* Summary cards / filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {(
                  [
                    {
                      type: "beam",
                      label: "Beams",
                      count: result.summary.beams,
                      icon: Building2,
                    },
                    {
                      type: "column",
                      label: "Columns",
                      count: result.summary.columns,
                      icon: Columns3,
                    },
                    {
                      type: "slab",
                      label: "Slabs",
                      count: result.summary.slabs,
                      icon: LayoutGrid,
                    },
                    {
                      type: "wall",
                      label: "Walls",
                      count: result.summary.walls,
                      icon: BrickWall,
                    },
                  ] as const
                ).map(({ type, label, count, icon: TypeIcon }) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() =>
                      setTypeFilter(typeFilter === type ? null : type)
                    }
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      typeFilter === type
                        ? "border-foreground/30 bg-muted"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <TypeIcon
                      className={`w-5 h-5 mb-2 ${TYPE_COLORS[type].split(" ")[0]}`}
                    />
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </button>
                ))}
              </div>

              {/* Element list */}
              <div className="space-y-2 pb-8">
                {filteredElements?.map((elem) => (
                  <ElementCard
                    key={elem.expressId}
                    element={elem}
                    isSelected={elem.expressId === selectedExpressId}
                    onSelect={() =>
                      setSelectedExpressId(
                        selectedExpressId === elem.expressId
                          ? null
                          : elem.expressId,
                      )
                    }
                    onCalculate={handleCalculate}
                  />
                ))}
                {filteredElements?.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    No {typeFilter} elements found in this model.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
