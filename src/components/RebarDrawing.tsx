import { useMemo } from "react";

interface RebarParams {
  type: "beam" | "column";
  b: number;      // width mm
  h: number;      // height mm
  cover: number;  // cover mm
  topBars?: string;  // e.g. "2x16"
  botBars?: string;  // e.g. "4x20"
  mainBars?: string; // for columns e.g. "8x20"
  stirrups?: string; // e.g. "8/200"
  fck?: number;
}

interface Bar {
  x: number;
  y: number;
  diameter: number;
}

function parseBars(spec: string): { count: number; diameter: number } {
  const match = spec.match(/(\d+)\s*[x×]\s*(\d+)/i);
  if (!match) return { count: 0, diameter: 0 };
  return { count: Number.parseInt(match[1]), diameter: Number.parseInt(match[2]) };
}

function parseStirrups(spec: string): { diameter: number; spacing: number } {
  const match = spec.match(/(\d+)\s*[/]\s*(\d+)/);
  if (!match) return { diameter: 8, spacing: 200 };
  return { diameter: Number.parseInt(match[1]), spacing: Number.parseInt(match[2]) };
}

/**
 * Parse [REBAR_DRAWING:...] marker string.
 */
export function parseRebarMarker(marker: string): RebarParams | null {
  const match = marker.match(/\[REBAR_DRAWING:(.*?)\]/);
  if (!match) return null;

  const pairs: Record<string, string> = {};
  for (const pair of match[1].split(",")) {
    const [key, val] = pair.split("=");
    if (key && val) pairs[key.trim()] = val.trim();
  }

  if (!pairs.b || !pairs.h) return null;

  return {
    type: (pairs.type as "beam" | "column") || "beam",
    b: Number.parseInt(pairs.b),
    h: Number.parseInt(pairs.h),
    cover: Number.parseInt(pairs.cover || "35"),
    topBars: pairs.topBars,
    botBars: pairs.botBars,
    mainBars: pairs.mainBars,
    stirrups: pairs.stirrups,
    fck: pairs.fck ? Number.parseInt(pairs.fck) : undefined,
  };
}

export function RebarDrawingChart({ params }: { params: RebarParams }) {
  const { bars, stirrup, svgWidth, svgHeight, scale, offsetX, offsetY } = useMemo(() => {
    const { type, b, h, cover } = params;

    // Scale to fit in ~350x280 SVG
    const maxW = 320;
    const maxH = 260;
    const sc = Math.min(maxW / b, maxH / h, 0.6);
    const oX = 50;
    const oY = 30;
    const sW = b * sc + oX * 2;
    const sH = h * sc + oY * 2;

    const stirrup = params.stirrups ? parseStirrups(params.stirrups) : { diameter: 8, spacing: 200 };
    const bars: Bar[] = [];

    if (type === "column" && params.mainBars) {
      // Column: distribute bars around perimeter
      const { count, diameter } = parseBars(params.mainBars);
      if (count >= 4) {
        // Corner bars
        const d = cover + stirrup.diameter + diameter / 2;
        const positions: [number, number][] = [];

        // Corners
        positions.push([d, d]);
        positions.push([b - d, d]);
        positions.push([d, h - d]);
        positions.push([b - d, h - d]);

        // Distribute remaining bars on sides
        const remaining = count - 4;
        if (remaining > 0) {
          const perSide = Math.ceil(remaining / 4);
          // Top edge
          for (let i = 1; i <= perSide && bars.length + positions.length < count; i++) {
            positions.push([d + (b - 2 * d) * i / (perSide + 1), d]);
          }
          // Bottom edge
          for (let i = 1; i <= perSide && positions.length < count; i++) {
            positions.push([d + (b - 2 * d) * i / (perSide + 1), h - d]);
          }
          // Left edge
          for (let i = 1; i <= perSide && positions.length < count; i++) {
            positions.push([d, d + (h - 2 * d) * i / (perSide + 1)]);
          }
          // Right edge
          for (let i = 1; i <= perSide && positions.length < count; i++) {
            positions.push([b - d, d + (h - 2 * d) * i / (perSide + 1)]);
          }
        }

        for (const [px, py] of positions.slice(0, count)) {
          bars.push({ x: px, y: py, diameter });
        }
      }
    } else {
      // Beam layout
      const dStirrup = stirrup.diameter;

      if (params.botBars) {
        const { count, diameter } = parseBars(params.botBars);
        const y = h - cover - dStirrup - diameter / 2;
        const startX = cover + dStirrup + diameter / 2;
        const endX = b - cover - dStirrup - diameter / 2;
        const spacing = count > 1 ? (endX - startX) / (count - 1) : 0;
        for (let i = 0; i < count; i++) {
          bars.push({ x: startX + spacing * i, y, diameter });
        }
      }

      if (params.topBars) {
        const { count, diameter } = parseBars(params.topBars);
        const y = cover + dStirrup + diameter / 2;
        const startX = cover + dStirrup + diameter / 2;
        const endX = b - cover - dStirrup - diameter / 2;
        const spacing = count > 1 ? (endX - startX) / (count - 1) : 0;
        for (let i = 0; i < count; i++) {
          bars.push({ x: startX + spacing * i, y, diameter });
        }
      }
    }

    return { bars, stirrup, svgWidth: sW, svgHeight: sH, scale: sc, offsetX: oX, offsetY: oY };
  }, [params]);

  const { b, h, cover, type } = params;
  const sx = (v: number) => offsetX + v * scale;
  const sy = (v: number) => offsetY + v * scale;

  // Dimension lines
  const dimOffset = 16;

  return (
    <div className="inline-block my-3 bg-background border rounded-xl p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Cross-Section: {b}×{h}mm {type === "column" ? "Column" : "Beam"}
        {params.fck ? ` · C${params.fck}/${params.fck + 8}` : ""}
        {params.stirrups ? ` · ø${stirrup.diameter}/${stirrup.spacing}` : ""}
      </div>
      <svg width={svgWidth} height={svgHeight + 20} className="overflow-visible">
        {/* Concrete section */}
        <rect
          x={sx(0)} y={sy(0)}
          width={b * scale} height={h * scale}
          fill="currentColor" className="text-muted/30"
        />
        <rect
          x={sx(0)} y={sy(0)}
          width={b * scale} height={h * scale}
          fill="none"
          stroke="currentColor" strokeWidth="2" className="text-foreground/60"
        />

        {/* Stirrup */}
        <rect
          x={sx(cover)} y={sy(cover)}
          width={(b - 2 * cover) * scale} height={(h - 2 * cover) * scale}
          fill="none"
          stroke="currentColor" strokeWidth="1.5" className="text-emerald-500"
          strokeDasharray="none"
          rx="3"
        />

        {/* Reinforcement bars */}
        {bars.map((bar, i) => (
          <g key={i}>
            <circle
              cx={sx(bar.x)} cy={sy(bar.y)}
              r={Math.max(bar.diameter * scale * 0.5, 4)}
              fill="currentColor" className="text-blue-500"
            />
            <circle
              cx={sx(bar.x)} cy={sy(bar.y)}
              r={Math.max(bar.diameter * scale * 0.5, 4)}
              fill="none"
              stroke="currentColor" strokeWidth="1" className="text-blue-700"
            />
          </g>
        ))}

        {/* Width dimension (bottom) */}
        <line x1={sx(0)} y1={sy(h) + dimOffset} x2={sx(b)} y2={sy(h) + dimOffset}
          stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" markerStart="url(#arrowL)" markerEnd="url(#arrowR)" />
        <text x={sx(b / 2)} y={sy(h) + dimOffset + 12} textAnchor="middle"
          className="fill-muted-foreground text-[9px]">{b}</text>

        {/* Height dimension (left) */}
        <line x1={sx(0) - dimOffset} y1={sy(0)} x2={sx(0) - dimOffset} y2={sy(h)}
          stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" markerStart="url(#arrowU)" markerEnd="url(#arrowD)" />
        <text x={sx(0) - dimOffset - 4} y={sy(h / 2)} textAnchor="middle"
          className="fill-muted-foreground text-[9px]"
          transform={`rotate(-90, ${sx(0) - dimOffset - 4}, ${sy(h / 2)})`}>{h}</text>

        {/* Arrow markers */}
        <defs>
          <marker id="arrowR" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" />
          </marker>
          <marker id="arrowL" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
            <path d="M6,0 L0,3 L6,6" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" />
          </marker>
          <marker id="arrowD" markerWidth="6" markerHeight="6" refX="3" refY="5" orient="auto">
            <path d="M0,0 L3,6 L6,0" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" />
          </marker>
          <marker id="arrowU" markerWidth="6" markerHeight="6" refX="3" refY="1" orient="auto">
            <path d="M0,6 L3,0 L6,6" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" />
          </marker>
        </defs>

        {/* Bar labels */}
        {params.botBars && (
          <text x={sx(b) + 8} y={sy(h - cover - stirrup.diameter)} textAnchor="start"
            className="fill-blue-500 text-[9px] font-medium">{params.botBars.replace("x", "ø")}</text>
        )}
        {params.topBars && (
          <text x={sx(b) + 8} y={sy(cover + stirrup.diameter + 4)} textAnchor="start"
            className="fill-blue-500 text-[9px] font-medium">{params.topBars.replace("x", "ø")}</text>
        )}
        {params.mainBars && (
          <text x={sx(b) + 8} y={sy(h / 2)} textAnchor="start"
            className="fill-blue-500 text-[9px] font-medium">{params.mainBars.replace("x", "ø")}</text>
        )}
      </svg>
    </div>
  );
}
