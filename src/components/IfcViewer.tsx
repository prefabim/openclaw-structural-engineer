import { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RawPlacedMesh, RawMeshGroup } from "@/lib/ifcParser";
import { Maximize2 } from "lucide-react";

// ── Theme colors ─────────────────────────────────────────────────────────

const BG_COLOR = 0x131318;
const STRUCTURAL_COLOR = 0xb8b8cc;
const STRUCTURAL_OPACITY = 0.88;
const CONTEXT_COLOR = 0x555566;
const CONTEXT_OPACITY = 0.1;
const ACCENT_HEX = 0x2dd4bf; // teal-400
const ACCENT_EMISSIVE = 0x0a2e2a;
const GRID_LINE = 0x252530;
const GRID_CENTER = 0x303042;

// ── Helpers ──────────────────────────────────────────────────────────────

function buildBufferGeometry(pm: RawPlacedMesh): THREE.BufferGeometry {
  const vCount = pm.vertexData.length / 6;
  const positions = new Float32Array(vCount * 3);
  const normals = new Float32Array(vCount * 3);

  for (let v = 0; v < vCount; v++) {
    const src = v * 6;
    const dst = v * 3;
    positions[dst] = pm.vertexData[src];
    positions[dst + 1] = pm.vertexData[src + 1];
    positions[dst + 2] = pm.vertexData[src + 2];
    normals[dst] = pm.vertexData[src + 3];
    normals[dst + 1] = pm.vertexData[src + 4];
    normals[dst + 2] = pm.vertexData[src + 5];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setIndex(new THREE.BufferAttribute(pm.indexData, 1));

  // Apply placement transform
  const matrix = new THREE.Matrix4().fromArray(pm.transform);
  geo.applyMatrix4(matrix);

  return geo;
}

// ── Types ────────────────────────────────────────────────────────────────

interface SceneData {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  meshMap: Map<number, THREE.Mesh>; // expressId → structural mesh
  raycaster: THREE.Raycaster;
  initialCameraPos: THREE.Vector3;
  initialTarget: THREE.Vector3;
}

interface IfcViewerProps {
  meshGroups: RawMeshGroup[];
  structuralExpressIds: Set<number>;
  selectedExpressId: number | null;
  onSelectElement: (expressId: number | null) => void;
}

// ── Component ────────────────────────────────────────────────────────────

export function IfcViewer({
  meshGroups,
  structuralExpressIds,
  selectedExpressId,
  onSelectElement,
}: IfcViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sdRef = useRef<SceneData | null>(null);
  const mouseStart = useRef<{ x: number; y: number } | null>(null);

  // ── 1. Initialize Three.js (once) ─────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG_COLOR);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 50000);
    camera.position.set(30, 20, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.5;
    controls.maxDistance = 10000;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(50, 80, 50);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8888aa, 0.35);
    fillLight.position.set(-40, -20, -40);
    scene.add(fillLight);

    sdRef.current = {
      scene,
      camera,
      renderer,
      controls,
      meshMap: new Map(),
      raycaster: new THREE.Raycaster(),
      initialCameraPos: camera.position.clone(),
      initialTarget: controls.target.clone(),
    };

    // Render loop
    let running = true;
    const animate = () => {
      if (!running) return;
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw === 0 || ch === 0) return;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    });
    ro.observe(container);

    return () => {
      running = false;
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sdRef.current = null;
    };
  }, []);

  // ── 2. Build scene from mesh data ─────────────────────────────────────
  useEffect(() => {
    const sd = sdRef.current;
    if (!sd || meshGroups.length === 0) return;

    const { scene, camera, controls, meshMap } = sd;

    // Clear old model objects
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((child) => {
      if (child.userData.__ifcModel) toRemove.push(child);
    });
    for (const obj of toRemove) {
      scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    }
    meshMap.clear();

    // Separate structural vs context
    const contextGeos: THREE.BufferGeometry[] = [];
    const structuralByEid = new Map<number, THREE.BufferGeometry[]>();
    const globalBox = new THREE.Box3();

    for (const group of meshGroups) {
      const isStructural = structuralExpressIds.has(group.expressId);

      for (const pm of group.meshes) {
        try {
          const geo = buildBufferGeometry(pm);
          geo.computeBoundingBox();
          if (geo.boundingBox) globalBox.union(geo.boundingBox);

          if (isStructural) {
            const arr = structuralByEid.get(group.expressId) ?? [];
            arr.push(geo);
            structuralByEid.set(group.expressId, arr);
          } else {
            contextGeos.push(geo);
          }
        } catch {
          /* skip */
        }
      }
    }

    // ── Context mesh (merged for performance) ────────────────────────────
    const validCtx = contextGeos.filter(
      (g) => (g.getAttribute("position")?.count ?? 0) > 0,
    );
    if (validCtx.length > 0) {
      try {
        const merged = mergeGeometries(validCtx, false);
        if (merged) {
          const mat = new THREE.MeshLambertMaterial({
            color: CONTEXT_COLOR,
            transparent: true,
            opacity: CONTEXT_OPACITY,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(merged, mat);
          mesh.userData.__ifcModel = true;
          mesh.renderOrder = -1;
          scene.add(mesh);
        }
      } catch {
        /* merge failed, skip context */
      }
    }
    validCtx.forEach((g) => g.dispose());

    // ── Structural meshes (individual for selection) ─────────────────────
    for (const [expressId, geos] of structuralByEid) {
      let geo: THREE.BufferGeometry;
      if (geos.length === 1) {
        geo = geos[0];
      } else {
        try {
          const merged = mergeGeometries(geos, false);
          geo = merged ?? geos[0];
          if (merged) geos.forEach((g) => g.dispose());
        } catch {
          geo = geos[0];
        }
      }

      const mat = new THREE.MeshLambertMaterial({
        color: STRUCTURAL_COLOR,
        transparent: true,
        opacity: STRUCTURAL_OPACITY,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.expressId = expressId;
      mesh.userData.__ifcModel = true;
      meshMap.set(expressId, mesh);
      scene.add(mesh);
    }

    // ── Fit camera ───────────────────────────────────────────────────────
    if (!globalBox.isEmpty()) {
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      globalBox.getCenter(center);
      globalBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 1.6;

      camera.position.set(
        center.x + dist * 0.6,
        center.y + dist * 0.45,
        center.z + dist * 0.6,
      );
      controls.target.copy(center);
      camera.near = Math.max(0.01, maxDim * 0.0005);
      camera.far = maxDim * 100;
      camera.updateProjectionMatrix();
      controls.update();

      // Save for reset
      sd.initialCameraPos = camera.position.clone();
      sd.initialTarget = controls.target.clone();

      // Grid
      const gridSize = Math.max(size.x, size.z) * 2.5;
      const divisions = Math.min(80, Math.max(20, Math.round(gridSize / 2)));
      const grid = new THREE.GridHelper(
        gridSize,
        divisions,
        GRID_CENTER,
        GRID_LINE,
      );
      grid.position.set(center.x, globalBox.min.y - 0.01, center.z);
      grid.userData.__ifcModel = true;
      scene.add(grid);
    }
  }, [meshGroups, structuralExpressIds]);

  // ── 3. Selection highlight ─────────────────────────────────────────────
  useEffect(() => {
    const sd = sdRef.current;
    if (!sd) return;

    for (const [eid, mesh] of sd.meshMap) {
      const mat = mesh.material as THREE.MeshLambertMaterial;
      if (eid === selectedExpressId) {
        mat.color.setHex(ACCENT_HEX);
        mat.opacity = 1.0;
        mat.transparent = false;
        mat.emissive.setHex(ACCENT_EMISSIVE);
        mat.depthWrite = true;
      } else {
        mat.color.setHex(STRUCTURAL_COLOR);
        mat.opacity = STRUCTURAL_OPACITY;
        mat.transparent = true;
        mat.emissive.setHex(0x000000);
        mat.depthWrite = true;
      }
      mat.needsUpdate = true;
    }
  }, [selectedExpressId]);

  // ── 4. Click → raycast → select ───────────────────────────────────────
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    mouseStart.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = mouseStart.current;
      mouseStart.current = null;
      if (!start || !sdRef.current || !containerRef.current) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.sqrt(dx * dx + dy * dy) > 4) return; // drag, not click

      const { raycaster, camera, meshMap } = sdRef.current;
      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(mouse, camera);
      const targets = Array.from(meshMap.values());
      const hits = raycaster.intersectObjects(targets, false);

      if (hits.length > 0) {
        onSelectElement(hits[0].object.userData.expressId);
      } else {
        onSelectElement(null);
      }
    },
    [onSelectElement],
  );

  // ── 5. Reset camera ───────────────────────────────────────────────────
  const resetCamera = useCallback(() => {
    const sd = sdRef.current;
    if (!sd) return;
    sd.camera.position.copy(sd.initialCameraPos);
    sd.controls.target.copy(sd.initialTarget);
    sd.controls.update();
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full" style={{ minHeight: 300 }}>
      <div
        ref={containerRef}
        className="w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />

      {/* Toolbar overlay */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        <button
          type="button"
          onClick={resetCamera}
          title="Reset view"
          className="bg-background/70 backdrop-blur-sm border border-border/50 rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-background/90 transition-colors"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Hint overlay */}
      <div className="absolute bottom-3 left-3 text-[11px] text-muted-foreground/50 select-none pointer-events-none">
        Orbit · Scroll to zoom · Click element to select
      </div>
    </div>
  );
}
