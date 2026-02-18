import { useMemo } from "react";
import { calculateMNEnvelope, type MNInput, type MNPoint } from "@/lib/mnDiagram";

interface MNDiagramChartProps {
  params: MNInput;
  designPoint?: { N: number; M: number };
  width?: number;
  height?: number;
}

export function MNDiagramChart({
  params,
  designPoint,
  width = 420,
  height = 360,
}: MNDiagramChartProps) {
  const result = useMemo(() => calculateMNEnvelope(params), [params]);

  const margin = { top: 24, right: 24, bottom: 44, left: 60 };
  const w = width - margin.left - margin.right;
  const h = height - margin.top - margin.bottom;

  // Find bounds
  const allN = result.envelope.map((p) => p.N);
  const allM = result.envelope.map((p) => p.M);
  if (designPoint) {
    allN.push(designPoint.N);
    allM.push(designPoint.M);
  }

  const nMin = Math.min(...allN) * 1.1;
  const nMax = Math.max(...allN) * 1.1;
  const mMax = Math.max(...allM) * 1.15;

  const scaleM = (m: number) => margin.left + (m / mMax) * w;
  const scaleN = (n: number) => margin.top + h - ((n - nMin) / (nMax - nMin)) * h;

  // Build SVG path for envelope
  const pathPoints = result.envelope
    .map((p) => `${scaleM(p.M).toFixed(1)},${scaleN(p.N).toFixed(1)}`)
    .join(" L ");
  const envelopePath = `M ${pathPoints} Z`;

  // Grid lines
  const nTicks = generateTicks(nMin, nMax, 6);
  const mTicks = generateTicks(0, mMax, 5);

  // Check if design point is inside envelope
  const isInside = designPoint ? isPointInsideEnvelope(designPoint, result.envelope) : null;

  return (
    <div className="inline-block my-3 bg-background border rounded-xl p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center justify-between">
        <span>M-N Interaction Diagram ({params.b}×{params.h}, C{params.fck}/{params.fck + 8})</span>
        {designPoint && (
          <span className={`font-semibold ${isInside ? "text-emerald-500" : "text-red-500"}`}>
            {isInside ? "✓ Safe" : "✗ Unsafe"}
          </span>
        )}
      </div>
      <svg width={width} height={height} className="overflow-visible">
        {/* Background */}
        <rect x={margin.left} y={margin.top} width={w} height={h} fill="currentColor" className="text-muted/20" rx="2" />

        {/* Grid */}
        {nTicks.map((n) => (
          <g key={`n-${n}`}>
            <line
              x1={margin.left} y1={scaleN(n)}
              x2={margin.left + w} y2={scaleN(n)}
              stroke="currentColor" className="text-border" strokeDasharray="3 3"
            />
            <text x={margin.left - 6} y={scaleN(n)} textAnchor="end" dominantBaseline="middle"
              className="fill-muted-foreground text-[9px]">
              {n.toFixed(0)}
            </text>
          </g>
        ))}
        {mTicks.map((m) => (
          <g key={`m-${m}`}>
            <line
              x1={scaleM(m)} y1={margin.top}
              x2={scaleM(m)} y2={margin.top + h}
              stroke="currentColor" className="text-border" strokeDasharray="3 3"
            />
            <text x={scaleM(m)} y={margin.top + h + 14} textAnchor="middle"
              className="fill-muted-foreground text-[9px]">
              {m.toFixed(0)}
            </text>
          </g>
        ))}

        {/* N=0 axis */}
        {nMin < 0 && nMax > 0 && (
          <line
            x1={margin.left} y1={scaleN(0)}
            x2={margin.left + w} y2={scaleN(0)}
            stroke="currentColor" className="text-muted-foreground" strokeWidth="0.5"
          />
        )}

        {/* Envelope fill */}
        <path d={envelopePath} fill="currentColor" className="text-emerald-500/15" />

        {/* Envelope stroke */}
        <path d={envelopePath} fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="2" />

        {/* Key points */}
        <circle cx={scaleM(result.pureCompression.M)} cy={scaleN(result.pureCompression.N)} r="3"
          fill="currentColor" className="text-blue-400" />
        <circle cx={scaleM(result.balanced.M)} cy={scaleN(result.balanced.N)} r="3"
          fill="currentColor" className="text-amber-400" />

        {/* Design point */}
        {designPoint && (
          <g>
            <circle cx={scaleM(designPoint.M)} cy={scaleN(designPoint.N)} r="5.5"
              fill="currentColor" className={isInside ? "text-emerald-400" : "text-red-500"} />
            <circle cx={scaleM(designPoint.M)} cy={scaleN(designPoint.N)} r="5.5"
              fill="none" stroke="white" strokeWidth="1.5" />
            <text
              x={scaleM(designPoint.M) + 10} y={scaleN(designPoint.N) - 6}
              className="fill-foreground text-[9px] font-medium"
            >
              ({designPoint.M.toFixed(0)}, {designPoint.N.toFixed(0)})
            </text>
          </g>
        )}

        {/* Axes labels */}
        <text x={margin.left + w / 2} y={height - 4} textAnchor="middle"
          className="fill-muted-foreground text-[10px]">
          M [kNm]
        </text>
        <text x={12} y={margin.top + h / 2} textAnchor="middle"
          className="fill-muted-foreground text-[10px]"
          transform={`rotate(-90, 12, ${margin.top + h / 2})`}>
          N [kN]
        </text>
      </svg>
    </div>
  );
}

function generateTicks(min: number, max: number, count: number): number[] {
  const step = (max - min) / count;
  const niceStep = niceNum(step);
  const ticks: number[] = [];
  let v = Math.ceil(min / niceStep) * niceStep;
  while (v <= max) {
    ticks.push(v);
    v += niceStep;
  }
  return ticks;
}

function niceNum(v: number): number {
  const exp = Math.floor(Math.log10(Math.abs(v) || 1));
  const frac = v / Math.pow(10, exp);
  let nice: number;
  if (frac <= 1.5) nice = 1;
  else if (frac <= 3) nice = 2;
  else if (frac <= 7) nice = 5;
  else nice = 10;
  return nice * Math.pow(10, exp);
}

/**
 * Simple point-in-polygon check for the design point against the envelope.
 */
function isPointInsideEnvelope(point: { N: number; M: number }, envelope: MNPoint[]): boolean {
  // Ray casting algorithm
  let inside = false;
  const pts = envelope;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].M, yi = pts[i].N;
    const xj = pts[j].M, yj = pts[j].N;
    const intersect = ((yi > point.N) !== (yj > point.N))
      && (point.M < (xj - xi) * (point.N - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Parse M-N diagram params from a marker string.
 * Format: [MN_DIAGRAM:b=400,h=400,As1=1608,As2=804,fck=30,fyk=500,NEd=1500,MEd=80]
 */
export function parseMNMarker(marker: string): { params: MNInput; designPoint?: { N: number; M: number } } | null {
  const match = marker.match(/\[MN_DIAGRAM:(.*?)\]/);
  if (!match) return null;

  const pairs = match[1].split(",").reduce((acc, pair) => {
    const [key, val] = pair.split("=");
    acc[key.trim()] = Number.parseFloat(val);
    return acc;
  }, {} as Record<string, number>);

  if (!pairs.b || !pairs.h || !pairs.fck || !pairs.fyk) return null;

  const params: MNInput = {
    b: pairs.b,
    h: pairs.h,
    As1: pairs.As1 || pairs.As || 0,
    As2: pairs.As2 || pairs.As1 || pairs.As || 0,
    fck: pairs.fck,
    fyk: pairs.fyk,
    cover: pairs.cover || 45,
  };

  const designPoint = (pairs.NEd !== undefined && pairs.MEd !== undefined)
    ? { N: pairs.NEd, M: pairs.MEd }
    : undefined;

  return { params, designPoint };
}
