/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  MousePointer,
  RotateCw,
  Hand,
  ZoomIn,
  Maximize2,
  Ruler,
  Scissors,
  Box,
  Eye,
  Plus,
  X,
  Compass,
  FileCode2,
} from 'lucide-react';
import { CADModelParameters, MaterialOption } from '../../types/cad';
import { AVAILABLE_MATERIALS } from '../../data/mockCadData';

interface ThreeCADViewportProps {
  parameters: CADModelParameters;
  onParameterChange?: (params: Partial<CADModelParameters>) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onOpenReport?: () => void;
}

export type ViewportTool = 'select' | 'rotate' | 'pan' | 'zoom' | 'fit' | 'measure' | 'section' | 'render' | 'views';
export type RenderMode = 'shaded' | 'wireframe' | 'section' | 'xray';
export type CameraPreset = 'iso' | 'front' | 'top' | 'right' | 'back';

export const ThreeCADViewport: React.FC<ThreeCADViewportProps> = ({
  parameters,
  activeTab = 'Demo bracket',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const partGroupRef = useRef<THREE.Group | null>(null);
  const dimensionsGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Viewport states
  const [activeTool, setActiveTool] = useState<ViewportTool>('select');
  const [renderMode, setRenderMode] = useState<RenderMode>('shaded');
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showRenderMenu, setShowRenderMenu] = useState<boolean>(false);
  const [showViewsMenu, setShowViewsMenu] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [cameraView, setCameraView] = useState<CameraPreset>('iso');
  const [measurementDistance, setMeasurementDistance] = useState<string | null>(null);

  // Helper to rebuild or update the procedural mechanical bracket
  const buildMountingBracket = useCallback((params: CADModelParameters, mode: RenderMode) => {
    if (!sceneRef.current) return;

    if (partGroupRef.current) {
      sceneRef.current.remove(partGroupRef.current);
      // Clean up geometries and materials
      partGroupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    const group = new THREE.Group();
    group.name = 'Mounting_Bracket';

    // Find material settings
    const currentMat = AVAILABLE_MATERIALS.find((m) => m.name === params.material) || AVAILABLE_MATERIALS[0];

    // Determine base material configuration based on renderMode
    let material: THREE.Material;
    if (mode === 'wireframe') {
      material = new THREE.MeshBasicMaterial({
        color: 0x7fa3c4,
        wireframe: true,
      });
    } else if (mode === 'xray') {
      material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(currentMat.color),
        metalness: 0.1,
        roughness: 0.1,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
    } else {
      // High-grade PBR Brushed Metal
      material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(currentMat.color),
        metalness: currentMat.metalness,
        roughness: currentMat.roughness,
        clearcoat: 0.1,
        clearcoatRoughness: 0.2,
        reflectivity: 0.9,
        clippingPlanes: mode === 'section' && clipPlaneRef.current ? [clipPlaneRef.current] : [],
        clipShadows: true,
      });
    }

    // Edge outline material for crisp CAD edges
    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x262626,
      linewidth: 1.5,
    });

    // Dimensions in mm (scale in Three.js coordinate system where 1 unit = 10mm for stable numerical precision)
    const L = params.length / 10;          // 8.0
    const W = params.width / 10;           // 5.0
    const T = params.thickness / 10;       // 1.0
    const H = params.flangeHeight / 10;    // 5.0
    const holeD = params.holeDiameter / 10;// 0.8
    const boreD = params.centerBoreDiameter / 10; // 2.4
    const R = params.filletRadius / 10;    // 0.2

    // 1. Base Plate Shape with Rounded Corners
    const baseShape = new THREE.Shape();
    const halfL = L / 2;
    const halfW = W / 2;
    const r = Math.min(R, 0.4);

    baseShape.moveTo(-halfL + r, -halfW);
    baseShape.lineTo(halfL - r, -halfW);
    baseShape.quadraticCurveTo(halfL, -halfW, halfL, -halfW + r);
    baseShape.lineTo(halfL, halfW - r);
    baseShape.quadraticCurveTo(halfL, halfW, halfL - r, halfW);
    baseShape.lineTo(-halfL + r, halfW);
    baseShape.quadraticCurveTo(-halfL, halfW, -halfL, halfW - r);
    baseShape.lineTo(-halfL, -halfW + r);
    baseShape.quadraticCurveTo(-halfL, -halfW, -halfL + r, -halfW);

    // 4 base holes as holes in the base shape
    const marginX = halfL - 1.4;
    const marginY = halfW - 1.2;
    const holeRadius = holeD / 2;

    const holePositions = [
      [marginX, marginY],
      [-marginX, marginY],
      [marginX, -marginY],
      [-marginX, -marginY],
    ];

    holePositions.forEach(([hx, hy]) => {
      const holePath = new THREE.Path();
      holePath.absarc(hx, hy, holeRadius, 0, Math.PI * 2, true);
      baseShape.holes.push(holePath);
    });

    const extrudeSettings = {
      depth: T,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };

    const baseGeometry = new THREE.ExtrudeGeometry(baseShape, extrudeSettings);
    baseGeometry.rotateX(-Math.PI / 2);
    // Center base on floor Y=0
    baseGeometry.translate(0, 0, 0);

    const baseMesh = new THREE.Mesh(baseGeometry, material);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    baseMesh.userData = { name: 'Base Plate', dims: `${params.length} x ${params.width} x ${params.thickness} mm` };

    const baseEdges = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeometry, 28), edgeMaterial);
    baseMesh.add(baseEdges);
    group.add(baseMesh);

    // 2. Vertical Upright Flange (L-profile back plate)
    // Positioned along the back edge of the base plate
    const flangeThickness = T;
    const flangeShape = new THREE.Shape();
    flangeShape.moveTo(-halfL + r, 0);
    flangeShape.lineTo(halfL - r, 0);
    flangeShape.quadraticCurveTo(halfL, 0, halfL, r);
    flangeShape.lineTo(halfL, H - r);
    flangeShape.quadraticCurveTo(halfL, H, halfL - r, H);
    flangeShape.lineTo(-halfL + r, H);
    flangeShape.quadraticCurveTo(-halfL, H, -halfL, H - r);
    flangeShape.lineTo(-halfL, r);
    flangeShape.quadraticCurveTo(-halfL, 0, -halfL + r, 0);

    // Center clearance bore in the upright flange
    const flangeHole = new THREE.Path();
    flangeHole.absarc(0, H * 0.58, boreD / 2, 0, Math.PI * 2, true);
    flangeShape.holes.push(flangeHole);

    const flangeExtrudeSettings = {
      depth: flangeThickness,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
    };

    const flangeGeometry = new THREE.ExtrudeGeometry(flangeShape, flangeExtrudeSettings);
    // Position at back edge
    flangeGeometry.translate(0, T, -halfW);

    const flangeMesh = new THREE.Mesh(flangeGeometry, material);
    flangeMesh.castShadow = true;
    flangeMesh.receiveShadow = true;
    flangeMesh.userData = { name: 'Vertical Flange', dims: `${params.length} x ${params.flangeHeight} x ${params.thickness} mm` };

    const flangeEdges = new THREE.LineSegments(new THREE.EdgesGeometry(flangeGeometry, 28), edgeMaterial);
    flangeMesh.add(flangeEdges);
    group.add(flangeMesh);

    // 3. Counterbore rings for mounting holes to match industrial SolidWorks precision
    const counterBoreMat = new THREE.MeshStandardMaterial({
      color: 0x737373,
      metalness: 0.9,
      roughness: 0.35,
    });

    holePositions.forEach(([hx, hy]) => {
      const ringGeo = new THREE.CylinderGeometry(holeRadius * 1.35, holeRadius * 1.35, 0.05, 32);
      const ringMesh = new THREE.Mesh(ringGeo, counterBoreMat);
      ringMesh.position.set(hx, T + 0.08, hy);
      group.add(ringMesh);
    });

    // 4. Fillet junction gussets / fillet blend cylinder between base and flange
    const blendCylinder = new THREE.CylinderGeometry(R, R, L - 0.4, 16);
    blendCylinder.rotateZ(Math.PI / 2);
    blendCylinder.translate(0, T + R, -halfW + flangeThickness + R);
    const blendMesh = new THREE.Mesh(blendCylinder, material);
    blendMesh.castShadow = true;
    group.add(blendMesh);

    // Center the entire bracket in viewport
    group.position.set(0, 0, 0);

    sceneRef.current.add(group);
    partGroupRef.current = group;
  }, []);

  // Build technical dimension lines & annotations (80mm, 50mm, 50mm, Ø8mm)
  const buildDimensionLines = useCallback((params: CADModelParameters) => {
    if (!sceneRef.current) return;

    if (dimensionsGroupRef.current) {
      sceneRef.current.remove(dimensionsGroupRef.current);
    }

    const dimGroup = new THREE.Group();
    dimGroup.name = 'Engineering_Dimensions';

    const L = params.length / 10;
    const W = params.width / 10;
    const T = params.thickness / 10;
    const H = params.flangeHeight / 10;
    const halfL = L / 2;
    const halfW = W / 2;

    const lineMat = new THREE.LineBasicMaterial({
      color: 0xa3a3a3,
      linewidth: 1.5,
      depthTest: true,
    });

    // Helper to create an engineering dimension line with end tick markers
    const createDimLine = (p1: THREE.Vector3, p2: THREE.Vector3, offset: THREE.Vector3) => {
      const lineGroup = new THREE.Group();

      // Extension lines
      const ext1Geo = new THREE.BufferGeometry().setFromPoints([p1, p1.clone().add(offset)]);
      const ext2Geo = new THREE.BufferGeometry().setFromPoints([p2, p2.clone().add(offset)]);
      lineGroup.add(new THREE.Line(ext1Geo, lineMat));
      lineGroup.add(new THREE.Line(ext2Geo, lineMat));

      // Main dimension line
      const pt1 = p1.clone().add(offset.clone().multiplyScalar(0.85));
      const pt2 = p2.clone().add(offset.clone().multiplyScalar(0.85));
      const dimGeo = new THREE.BufferGeometry().setFromPoints([pt1, pt2]);
      lineGroup.add(new THREE.Line(dimGeo, lineMat));

      // Arrowheads (small cones)
      const dir = pt2.clone().sub(pt1).normalize();
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0xa3a3a3 });

      const arrow1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 12), arrowMat);
      arrow1.position.copy(pt1);
      arrow1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      lineGroup.add(arrow1);

      const arrow2 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 12), arrowMat);
      arrow2.position.copy(pt2);
      arrow2.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
      lineGroup.add(arrow2);

      return lineGroup;
    };

    // 1. Length Dimension (80 mm) - Front Edge
    const lenP1 = new THREE.Vector3(-halfL, 0, halfW);
    const lenP2 = new THREE.Vector3(halfL, 0, halfW);
    const lenOffset = new THREE.Vector3(0, 0, 1.8);
    dimGroup.add(createDimLine(lenP1, lenP2, lenOffset));

    // 2. Width Dimension (50 mm) - Right Side Edge
    const widthP1 = new THREE.Vector3(halfL, 0, -halfW);
    const widthP2 = new THREE.Vector3(halfL, 0, halfW);
    const widthOffset = new THREE.Vector3(1.8, 0, 0);
    dimGroup.add(createDimLine(widthP1, widthP2, widthOffset));

    // 3. Height Dimension (50 mm) - Vertical Left Edge
    const heightP1 = new THREE.Vector3(-halfL, 0, -halfW);
    const heightP2 = new THREE.Vector3(-halfL, H + T, -halfW);
    const heightOffset = new THREE.Vector3(-1.8, 0, 0);
    dimGroup.add(createDimLine(heightP1, heightP2, heightOffset));

    // 4. Hole Leader Callout line for front-right hole (Ø8 mm)
    const holePos = new THREE.Vector3(halfL - 1.4, T + 0.1, halfW - 1.2);
    const leaderP2 = holePos.clone().add(new THREE.Vector3(1.5, 1.2, 0.8));
    const leaderP3 = leaderP2.clone().add(new THREE.Vector3(1.0, 0, 0));

    const leaderGeo = new THREE.BufferGeometry().setFromPoints([holePos, leaderP2, leaderP3]);
    dimGroup.add(new THREE.Line(leaderGeo, lineMat));

    const dotGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x7fa3c4 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(holePos);
    dimGroup.add(dot);

    sceneRef.current.add(dimGroup);
    dimensionsGroupRef.current = dimGroup;
  }, []);

  // Main Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    // Detect software WebGL as prescribed by the Three.js skill
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // Deep graphite CAD canvas
    sceneRef.current = scene;

    // 2. Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 1000);
    camera.position.set(16, 14, 20); // Isometric perspective matching the screenshot
    cameraRef.current = camera;

    // 3. Renderer with ACES Filmic Tone Mapping and SRGB Color Space
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;

    // Section view clipping plane
    clipPlaneRef.current = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.5);

    // Empty container then append
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio Environment Map (PMREMGenerator + RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Lighting: Warm Key + Cool Hemisphere + Studio Soft Fill
    const dirLight = new THREE.DirectionalLight(0xfff6ea, 2.2);
    dirLight.position.set(15, 25, 18);
    dirLight.castShadow = !isSoftwareGl;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0003;
    dirLight.shadow.normalBias = 0.02;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x7fa3c4, 1.4);
    rimLight.position.set(-15, 12, -18);
    scene.add(rimLight);

    const hemiLight = new THREE.HemisphereLight(0xf5f5f5, 0x171717, 1.0);
    scene.add(hemiLight);

    // 6. Technical Engineering Grid Plane
    const gridHelper = new THREE.GridHelper(28, 28, 0x3a3a3a, 0x262626);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Soft Radial Contact Shadow Plane directly beneath the part
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const shadowCtx = shadowCanvas.getContext('2d');
    if (shadowCtx) {
      const grad = shadowCtx.createRadialGradient(128, 128, 20, 128, 128, 120);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.3)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      shadowCtx.fillStyle = grad;
      shadowCtx.fillRect(0, 0, 256, 256);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 14),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.005;
    scene.add(shadowPlane);

    // 7. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 + 0.05;
    controls.minDistance = 6;
    controls.maxDistance = 60;
    controls.target.set(0, 2.2, 0);
    controls.listenToKeyEvents(renderer.domElement); // arrows pan; with Shift they orbit
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute('aria-label', 'Demo model preview. Arrow keys pan, Shift and arrow keys orbit.');
    renderer.domElement.className = 'outline-none focus-visible:ring-2 focus-visible:ring-steel-400';
    controlsRef.current = controls;

    // 8. Build Bracket Model & Dimension Overlay
    buildMountingBracket(parameters, renderMode);
    if (showDimensions) {
      buildDimensionLines(parameters);
    }

    // 9. Animation / Render Loop
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    tick();

    // 10. Resize Observer for fluid responsiveness
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  // Pan makes a left drag pan; Select and Rotate leave it orbiting.
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.mouseButtons.LEFT = activeTool === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  }, [activeTool]);

  // Update geometry when parameters or renderMode change
  useEffect(() => {
    buildMountingBracket(parameters, renderMode);
    if (showDimensions) {
      buildDimensionLines(parameters);
    } else if (dimensionsGroupRef.current && sceneRef.current) {
      sceneRef.current.remove(dimensionsGroupRef.current);
      dimensionsGroupRef.current = null;
    }
  }, [parameters, renderMode, showDimensions, buildMountingBracket, buildDimensionLines]);

  // Handle Camera Presets
  const setCameraPreset = (preset: CameraPreset) => {
    if (!cameraRef.current || !controlsRef.current) return;
    setCameraView(preset);
    const c = cameraRef.current;
    const ctrl = controlsRef.current;
    ctrl.target.set(0, 2.2, 0);

    switch (preset) {
      case 'iso':
        c.position.set(16, 14, 20);
        break;
      case 'front':
        c.position.set(0, 2.5, 24);
        break;
      case 'top':
        c.position.set(0, 26, 0.01);
        break;
      case 'right':
        c.position.set(24, 2.5, 0);
        break;
      case 'back':
        c.position.set(0, 2.5, -24);
        break;
    }
    ctrl.update();
  };

  const handleFitToView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    controlsRef.current.target.set(0, 2.2, 0);
    cameraRef.current.position.set(16, 14, 20);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-graphite-0c select-none overflow-hidden">
      {/* 1. Clean CAD Document Tab Bar */}
      <div className="h-8 bg-graphite-0e border-b border-graphite-23 flex items-center justify-between px-2.5 z-10 flex-shrink-0 text-xs">
        <div className="flex items-center gap-1 min-w-0">
          <button
            title="CAD Workspace"
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          >
            <Box className="w-3.5 h-3.5 text-steel-400" />
          </button>

          {/* Active Document Tab */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-graphite-1b border-t-2 border-t-steel-500 border-x border-graphite-2c rounded-t text-neutral-200 font-medium text-[11px] truncate max-w-[200px]">
            <span className="w-1.5 h-1.5 rounded-full bg-steel-400 shrink-0" />
            <span className="font-tech tracking-tight truncate">{activeTab}</span>
            <button
              title="Close Tab"
              className="p-0.5 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50 rounded ml-1 shrink-0"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>

          <button
            title="New CAD Document"
            className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Clean Unboxed Document Metadata (Anti-Slop Zero-Pill) */}
        <div className="flex min-w-0 items-center gap-2 text-[10px] font-tech text-neutral-400">
          <span className="shrink-0 rounded border border-neutral-600 px-1.5 py-0.5 font-semibold uppercase tracking-wider text-neutral-100">Preview</span>
          <span className="hidden md:inline truncate" title="demo model drawn from parameters, not built by a CAD kernel">demo model, not built by a CAD kernel</span>
        </div>
      </div>

      {/* 2. Floating 3D Canvas Viewport */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden">
        {/* Three.js Canvas Container */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Floating Compact HUD Toolbar (Top-Left of Viewport, Zero Collision) */}
        <div className="absolute top-2.5 left-2.5 z-20 flex max-w-[calc(100%-8rem)] flex-wrap items-center gap-0.5 p-1 bg-graphite-14/90 backdrop-blur-md border border-graphite-2c rounded-lg shadow-xl shadow-black/40">
          <button
            onClick={() => setActiveTool('select')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              activeTool === 'select'
                ? 'bg-steel-600 text-white shadow-sm '
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
            title="Select entity (Click to inspect)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Select</span>
          </button>

          <button
            onClick={() => setActiveTool('rotate')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              activeTool === 'rotate'
                ? 'bg-steel-600 text-white'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
            title="Orbit / Rotate (Left Click + Drag)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rotate</span>
          </button>

          <button
            onClick={() => setActiveTool('pan')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              activeTool === 'pan'
                ? 'bg-steel-600 text-white'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
            title="Pan (Right Click + Drag)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pan</span>
          </button>

          <button
            onClick={handleFitToView}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors cursor-pointer"
            title="Fit model to view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit</span>
          </button>

          <div className="w-[1px] h-4 bg-neutral-700/60 mx-0.5" />

          <button
            onClick={() => setShowDimensions(!showDimensions)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              showDimensions
                ? 'bg-neutral-800 text-steel-300 border border-steel-500/40'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
            title="Toggle Engineering Dimensions"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Measure</span>
          </button>

          <button
            onClick={() => {
              const nextMode = renderMode === 'section' ? 'shaded' : 'section';
              setRenderMode(nextMode);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              renderMode === 'section'
                ? 'bg-amber-600 text-white'
                : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
            }`}
            title="Section Cut View"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Section</span>
          </button>

          <div className="w-[1px] h-4 bg-neutral-700/60 mx-0.5" />

          {/* Shading Style Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowRenderMenu(!showRenderMenu);
                setShowViewsMenu(false);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                renderMode !== 'shaded' ? 'text-steel-400 bg-neutral-800' : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'
              }`}
              title="Rendering mode"
            >
              <Box className="w-3.5 h-3.5" />
              <span className="capitalize hidden md:inline">{renderMode}</span>
            </button>

            {showRenderMenu && (
              <div className="absolute top-full left-0 mt-1 w-32 bg-graphite-18 border border-graphite-2f rounded-md shadow-xl py-1 z-30 font-tech text-xs">
                <button
                  onClick={() => {
                    setRenderMode('shaded');
                    setShowRenderMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-neutral-800 cursor-pointer ${
                    renderMode === 'shaded' ? 'text-steel-400 font-semibold' : 'text-neutral-300'
                  }`}
                >
                  PBR Shaded
                </button>
                <button
                  onClick={() => {
                    setRenderMode('wireframe');
                    setShowRenderMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-neutral-800 cursor-pointer ${
                    renderMode === 'wireframe' ? 'text-steel-400 font-semibold' : 'text-neutral-300'
                  }`}
                >
                  Wireframe
                </button>
                <button
                  onClick={() => {
                    setRenderMode('xray');
                    setShowRenderMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-neutral-800 cursor-pointer ${
                    renderMode === 'xray' ? 'text-steel-400 font-semibold' : 'text-neutral-300'
                  }`}
                >
                  X-Ray Translucent
                </button>
              </div>
            )}
          </div>

          {/* Camera Views Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowViewsMenu(!showViewsMenu);
                setShowRenderMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/60 transition-colors cursor-pointer"
              title="Camera view angles"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="uppercase text-[10px] hidden md:inline">{cameraView}</span>
            </button>

            {showViewsMenu && (
              <div className="absolute top-full right-0 mt-1 w-32 bg-graphite-18 border border-graphite-2f rounded-md shadow-xl py-1 z-30 font-tech text-xs">
                {(['iso', 'front', 'top', 'right', 'back'] as CameraPreset[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setCameraPreset(p);
                      setShowViewsMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 uppercase hover:bg-neutral-800 cursor-pointer ${
                      cameraView === p ? 'text-steel-400 font-semibold' : 'text-neutral-300'
                    }`}
                  >
                    {p === 'iso' ? 'Isometric' : `${p} View`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Floating Compact 3D Orientation Gizmo (Top-Right, Zero Collision) */}
        <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5">
          <div className="relative w-11 h-11 bg-graphite-14/90 backdrop-blur-md border border-graphite-2c rounded-lg shadow-lg flex items-center justify-center p-1">
            <div className="relative w-9 h-9 border border-steel-500/30 rounded bg-graphite-22 flex flex-col items-center justify-center text-[9px] font-tech text-steel-300 font-bold">
              <span className="text-steel-400 text-[8px]">Z</span>
              <div className="flex items-center justify-between w-full px-0.5">
                <span className="text-emerald-400 text-[8px]">Y</span>
                <span className="text-neutral-200 text-[8px]">TOP</span>
                <span className="text-rose-400 text-[8px]">X</span>
              </div>
            </div>
          </div>

          {/* Quick Camera Presets Strip */}
          <div className="flex items-center gap-0.5 bg-graphite-14/90 backdrop-blur-md border border-graphite-2c rounded p-0.5 text-[9px] font-tech">
            <button
              onClick={() => setCameraPreset('iso')}
              className={`px-1.5 py-0.5 rounded cursor-pointer ${
                cameraView === 'iso' ? 'bg-steel-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              ISO
            </button>
            <button
              onClick={() => setCameraPreset('front')}
              className={`px-1 py-0.5 rounded cursor-pointer ${
                cameraView === 'front' ? 'bg-steel-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              F
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className={`px-1 py-0.5 rounded cursor-pointer ${
                cameraView === 'top' ? 'bg-steel-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              T
            </button>
            <button
              onClick={() => setCameraPreset('right')}
              className={`px-1 py-0.5 rounded cursor-pointer ${
                cameraView === 'right' ? 'bg-steel-600 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              R
            </button>
          </div>
        </div>

        {/* Technical Dimension Callouts (Responsive & Graceful) */}
        {showDimensions && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Length Badge */}
            <div
              className="absolute left-[45%] bottom-[20%] -translate-x-1/2 px-2 py-0.5 bg-graphite-12/90 backdrop-blur-sm border border-graphite-35 rounded text-neutral-200 text-[11px] font-tech font-semibold tracking-wide shadow-md pointer-events-auto"
              title="Base Length"
            >
              {parameters.length.toFixed(0)} mm
            </div>

            {/* Width Badge */}
            <div
              className="absolute right-[22%] bottom-[20%] px-2 py-0.5 bg-graphite-12/90 backdrop-blur-sm border border-graphite-35 rounded text-neutral-200 text-[11px] font-tech font-semibold tracking-wide shadow-md pointer-events-auto"
              title="Base Width"
            >
              {parameters.width.toFixed(0)} mm
            </div>

            {/* Flange Height Badge */}
            <div
              className="absolute left-[36%] top-[42%] -translate-y-1/2 -rotate-90 px-2 py-0.5 bg-graphite-12/90 backdrop-blur-sm border border-graphite-35 rounded text-neutral-200 text-[11px] font-tech font-semibold tracking-wide shadow-md pointer-events-auto"
              title="Flange Height"
            >
              {parameters.flangeHeight.toFixed(0)} mm
            </div>

            {/* Hole Diameter Callout */}
            <div
              className="absolute right-[28%] top-[46%] px-2 py-0.5 bg-steel-950/90 backdrop-blur-sm border border-steel-500/50 rounded text-steel-300 text-[11px] font-tech font-semibold tracking-wide shadow-md pointer-events-auto"
              title="4x Mounting Holes"
            >
              Ø{parameters.holeDiameter.toFixed(0)} mm
            </div>
          </div>
        )}

        {/* Clean Bottom Viewport Metadata Bar */}
        <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-2 text-[10px] font-tech text-neutral-400 bg-graphite-14/85 backdrop-blur-sm px-2 py-0.5 rounded border border-graphite-2a">
          <span>Scale 1:1</span>
          <span className="text-neutral-600">·</span>
          <span>MMGS</span>
          <span className="text-neutral-600">·</span>
          <span>ISO 2768-m</span>
        </div>
      </div>
    </div>
  );
};
