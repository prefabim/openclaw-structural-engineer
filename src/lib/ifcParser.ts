// IFC Parser - loads web-ifc dynamically to avoid bundling ~3.5MB

// ── Raw 3D geometry types (for Three.js viewer) ──────────────────────────

export interface RawPlacedMesh {
  /** Interleaved vertex data: x,y,z,nx,ny,nz per vertex */
  vertexData: Float32Array;
  /** Triangle index data */
  indexData: Uint32Array;
  /** RGBA color from IFC */
  color: [number, number, number, number];
  /** 4x4 column-major transform matrix */
  transform: number[];
}

export interface RawMeshGroup {
  expressId: number;
  meshes: RawPlacedMesh[];
}

// ── Structural element types ─────────────────────────────────────────────

export interface IfcStructuralElement {
  expressId: number;
  type: "beam" | "column" | "slab" | "wall";
  name: string;
  objectType: string;
  material: string;
  properties: Record<string, string>;
  geometry: {
    length?: number;
    width?: number;
    height?: number;
    depth?: number;
    area?: number;
  };
}

export interface IfcParseResult {
  filename: string;
  elements: IfcStructuralElement[];
  summary: {
    beams: number;
    columns: number;
    slabs: number;
    walls: number;
    total: number;
  };
  /** Raw 3D mesh data for all products (for the viewer) */
  meshGroups: RawMeshGroup[];
}

function getPropertyValue(prop: any): string {
  if (!prop) return "";
  if (prop.value !== undefined) return String(prop.value);
  if (typeof prop === "string") return prop;
  if (typeof prop === "number") return String(prop);
  return "";
}

// Dynamic import from ESM CDN
let webIfcPromise: Promise<any> | null = null;

function loadWebIFC(): Promise<any> {
  if (webIfcPromise) return webIfcPromise;
  const cdnUrl = "https://cdn.jsdelivr.net/npm/web-ifc@0.0.75/web-ifc-api.js";
  // @ts-ignore - dynamic CDN import
  webIfcPromise = import(/* @vite-ignore */ cdnUrl);
  return webIfcPromise;
}

// IFC type constants (hardcoded to avoid importing the full schema)
const IFCBEAM = 753842376;
const IFCBEAMSTANDARDCASE = 2906023776;
const IFCCOLUMN = 843113511;
const IFCCOLUMNSTANDARDCASE = 905975707;
const IFCSLAB = 1529196076;
const IFCSLABSTANDARDCASE = 3027962421;
const IFCWALL = 2391406946;
const IFCWALLSTANDARDCASE = 3512223829;
const IFCRELASSOCIATESMATERIAL = 2655215786;
const IFCRELDEFINESBYPROPERTIES = 4186316022;

const STRUCTURAL_TYPES: Record<number, IfcStructuralElement["type"]> = {
  [IFCBEAM]: "beam",
  [IFCBEAMSTANDARDCASE]: "beam",
  [IFCCOLUMN]: "column",
  [IFCCOLUMNSTANDARDCASE]: "column",
  [IFCSLAB]: "slab",
  [IFCSLABSTANDARDCASE]: "slab",
  [IFCWALL]: "wall",
  [IFCWALLSTANDARDCASE]: "wall",
};

export async function parseIfcFile(
  fileBuffer: Uint8Array,
  filename: string,
): Promise<IfcParseResult> {
  const WebIFC = await loadWebIFC();

  const ifcApi = new WebIFC.IfcAPI();

  // Use CDN for WASM too (most reliable, avoids cross-origin issues)
  ifcApi.SetWasmPath("https://cdn.jsdelivr.net/npm/web-ifc@0.0.75/");

  await ifcApi.Init();

  const modelId = ifcApi.OpenModel(fileBuffer);

  const elements: IfcStructuralElement[] = [];

  for (const [ifcType, elemType] of Object.entries(STRUCTURAL_TYPES)) {
    const typeCode = Number(ifcType);
    let ids: any;
    try {
      ids = ifcApi.GetLineIDsWithType(modelId, typeCode);
    } catch {
      continue;
    }

    for (let i = 0; i < ids.size(); i++) {
      const expressId = ids.get(i);
      const element = ifcApi.GetLine(modelId, expressId);

      const name = getPropertyValue(element.Name) || `${elemType}_${expressId}`;
      const objectType = getPropertyValue(element.ObjectType) || "";

      // Try to get material
      let material = "";
      try {
        const matRelIds = ifcApi.GetLineIDsWithType(modelId, IFCRELASSOCIATESMATERIAL);
        for (let m = 0; m < matRelIds.size(); m++) {
          const matRel = ifcApi.GetLine(modelId, matRelIds.get(m));
          if (matRel.RelatedObjects) {
            const relatedIds = Array.isArray(matRel.RelatedObjects)
              ? matRel.RelatedObjects.map((o: any) => o.value || o)
              : [];
            if (relatedIds.includes(expressId)) {
              const matRef = matRel.RelatingMaterial;
              if (matRef) {
                try {
                  const mat = ifcApi.GetLine(modelId, matRef.value || matRef);
                  material = getPropertyValue(mat.Name) || "";
                  if (!material && mat.MaterialLayers) {
                    const layers = Array.isArray(mat.MaterialLayers) ? mat.MaterialLayers : [];
                    if (layers.length > 0) {
                      const layer = ifcApi.GetLine(modelId, layers[0].value || layers[0]);
                      if (layer.Material) {
                        const layerMat = ifcApi.GetLine(modelId, layer.Material.value || layer.Material);
                        material = getPropertyValue(layerMat.Name) || "";
                      }
                    }
                  }
                } catch { /* skip */ }
              }
              break;
            }
          }
        }
      } catch { /* best-effort */ }

      // Get property sets
      const properties: Record<string, string> = {};
      try {
        const propRelIds = ifcApi.GetLineIDsWithType(modelId, IFCRELDEFINESBYPROPERTIES);
        for (let p = 0; p < Math.min(propRelIds.size(), 500); p++) {
          const propRel = ifcApi.GetLine(modelId, propRelIds.get(p));
          if (propRel.RelatedObjects) {
            const relatedIds = Array.isArray(propRel.RelatedObjects)
              ? propRel.RelatedObjects.map((o: any) => o.value || o)
              : [];
            if (relatedIds.includes(expressId) && propRel.RelatingPropertyDefinition) {
              try {
                const pset = ifcApi.GetLine(modelId, propRel.RelatingPropertyDefinition.value || propRel.RelatingPropertyDefinition);
                if (pset.HasProperties) {
                  const props = Array.isArray(pset.HasProperties) ? pset.HasProperties : [];
                  for (const propRef of props.slice(0, 20)) {
                    try {
                      const prop = ifcApi.GetLine(modelId, propRef.value || propRef);
                      const propName = getPropertyValue(prop.Name);
                      const propVal = prop.NominalValue ? getPropertyValue(prop.NominalValue) : "";
                      if (propName && propVal) {
                        properties[propName] = propVal;
                      }
                    } catch { /* skip */ }
                  }
                }
                if (pset.Quantities) {
                  const quantities = Array.isArray(pset.Quantities) ? pset.Quantities : [];
                  for (const qRef of quantities.slice(0, 20)) {
                    try {
                      const q = ifcApi.GetLine(modelId, qRef.value || qRef);
                      const qName = getPropertyValue(q.Name);
                      const qVal = q.LengthValue || q.AreaValue || q.VolumeValue || q.WeightValue || q.CountValue;
                      if (qName && qVal) {
                        properties[qName] = getPropertyValue(qVal);
                      }
                    } catch { /* skip */ }
                  }
                }
              } catch { /* skip */ }
            }
          }
        }
      } catch { /* best-effort */ }

      // Extract geometry from properties
      const geometry: IfcStructuralElement["geometry"] = {};
      for (const key of ["Length", "Span", "length"]) {
        if (properties[key]) { geometry.length = Number.parseFloat(properties[key]); break; }
      }
      for (const key of ["Width", "width", "b"]) {
        if (properties[key]) { geometry.width = Number.parseFloat(properties[key]); break; }
      }
      for (const key of ["Height", "Depth", "height", "h", "depth"]) {
        if (properties[key]) { geometry.height = Number.parseFloat(properties[key]); break; }
      }
      for (const key of ["NetArea", "GrossArea", "Area", "CrossSectionArea"]) {
        if (properties[key]) { geometry.area = Number.parseFloat(properties[key]); break; }
      }

      elements.push({ expressId, type: elemType, name, objectType, material, properties, geometry });
    }
  }

  const summary = {
    beams: elements.filter((e) => e.type === "beam").length,
    columns: elements.filter((e) => e.type === "column").length,
    slabs: elements.filter((e) => e.type === "slab").length,
    walls: elements.filter((e) => e.type === "wall").length,
    total: elements.length,
  };

  // ── Extract 3D geometry from ALL products ──────────────────────────────
  const meshGroups: RawMeshGroup[] = [];
  try {
    ifcApi.StreamAllMeshes(modelId, (flatMesh: any) => {
      const expressId = flatMesh.expressID;
      const placedGeometries = flatMesh.geometries;
      const meshes: RawPlacedMesh[] = [];

      for (let i = 0; i < placedGeometries.size(); i++) {
        const pg = placedGeometries.get(i);
        try {
          const ifcGeometry = ifcApi.GetGeometry(modelId, pg.geometryExpressID);
          const vertexData = ifcApi.GetVertexArray(
            ifcGeometry.GetVertexData(),
            ifcGeometry.GetVertexDataSize(),
          );
          const indexData = ifcApi.GetIndexArray(
            ifcGeometry.GetIndexData(),
            ifcGeometry.GetIndexDataSize(),
          );

          if (vertexData.length > 0 && indexData.length > 0) {
            meshes.push({
              vertexData: new Float32Array(vertexData),
              indexData: new Uint32Array(indexData),
              color: [pg.color.x, pg.color.y, pg.color.z, pg.color.w],
              transform: Array.from(pg.flatTransformation),
            });
          }

          // Free WASM-side geometry buffer
          ifcGeometry.delete?.();
        } catch { /* skip malformed geometry */ }
      }

      if (meshes.length > 0) {
        meshGroups.push({ expressId, meshes });
      }
    });
  } catch (e) {
    console.warn("[IFC] Geometry extraction failed:", e);
  }

  ifcApi.CloseModel(modelId);

  return { filename, elements, summary, meshGroups };
}

/**
 * Generate a prompt for the AI chat from a structural element
 */
export function elementToPrompt(element: IfcStructuralElement): string {
  const { type, name, material, geometry, properties } = element;

  const parts = [`Analyze and design this ${type} from an IFC model:`];
  parts.push(`Name: ${name}`);
  if (material) parts.push(`Material: ${material}`);
  if (geometry.length) parts.push(`Length/Span: ${(geometry.length * 1000).toFixed(0)} mm`);
  if (geometry.width) parts.push(`Width: ${(geometry.width * 1000).toFixed(0)} mm`);
  if (geometry.height) parts.push(`Height: ${(geometry.height * 1000).toFixed(0)} mm`);
  if (geometry.area) parts.push(`Area: ${geometry.area.toFixed(4)} m²`);

  const relevantProps = Object.entries(properties).slice(0, 10);
  if (relevantProps.length > 0) {
    parts.push("\nProperties:");
    for (const [key, val] of relevantProps) {
      parts.push(`  ${key}: ${val}`);
    }
  }

  parts.push("\nPlease provide a structural design check per Eurocodes. Assume typical loading if not specified.");
  return parts.join("\n");
}
