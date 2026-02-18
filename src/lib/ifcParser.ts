// IFC Parser - loads web-ifc entirely from CDN to avoid bundling 3.5MB

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
}

function getPropertyValue(prop: any): string {
  if (!prop) return "";
  if (prop.value !== undefined) return String(prop.value);
  if (typeof prop === "string") return prop;
  if (typeof prop === "number") return String(prop);
  return "";
}

// Load web-ifc from CDN dynamically
let webIfcPromise: Promise<any> | null = null;

function loadWebIFC(): Promise<any> {
  if (webIfcPromise) return webIfcPromise;

  webIfcPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/web-ifc@0.0.75/web-ifc-api-iife.js";
    script.onload = () => {
      const WebIFC = (window as any).WebIFC;
      if (WebIFC) {
        resolve(WebIFC);
      } else {
        reject(new Error("web-ifc failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load web-ifc from CDN"));
    document.head.appendChild(script);
  });

  return webIfcPromise;
}

export async function parseIfcFile(
  fileBuffer: Uint8Array,
  filename: string,
): Promise<IfcParseResult> {
  const WebIFC = await loadWebIFC();

  const ifcApi = new WebIFC.IfcAPI();
  ifcApi.SetWasmPath("https://cdn.jsdelivr.net/npm/web-ifc@0.0.75/");
  await ifcApi.Init();

  const modelId = ifcApi.OpenModel(fileBuffer);

  // IFC type constants
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

  ifcApi.CloseModel(modelId);

  return { filename, elements, summary };
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
