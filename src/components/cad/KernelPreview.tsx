import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface Props {
  glb: ArrayBuffer;
  onError: (message: string) => void;
  onEmpty: () => void;
}

const KEYS_HINT = 'Part preview. Arrow keys pan, Shift and arrow keys orbit, plus and minus zoom.';

// The kernel's tessellation of a part. A render is a preview, never evidence that a CAD model exists (I3).
export function KernelPreview({ glb, onError, onEmpty }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState('');
  const [triangles, setTriangles] = useState(0);

  useEffect(() => {
    const el = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onError('this browser cannot draw a 3D preview (no WebGL)');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const canvas = renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', KEYS_HINT);
    canvas.className = 'outline-none focus-visible:ring-2 focus-visible:ring-steel-400';
    el.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2e2e2e, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(1, 2, 1.5);
    scene.add(key);
    const camera = new THREE.PerspectiveCamera(40, el.clientWidth / el.clientHeight, 0.001, 100);
    const controls = new OrbitControls(camera, canvas); // left drag orbits, right drag pans, wheel zooms
    controls.listenToKeyEvents(canvas); // arrows pan; with Shift they orbit
    const zoom = (e: KeyboardEvent) => {
      const f = e.key === '+' || e.key === '=' ? 0.85 : e.key === '-' || e.key === '_' ? 1 / 0.85 : 0;
      if (!f) return;
      e.preventDefault();
      camera.position.sub(controls.target).multiplyScalar(f).add(controls.target);
    };
    canvas.addEventListener('keydown', zoom);

    let disposed = false;
    const loaded = (gltf: { scene: THREE.Object3D }) => {
      if (disposed) return;
      const material = new THREE.MeshStandardMaterial({ color: 0xa3a3a3, metalness: 0.15, roughness: 0.55 });
      let count = 0;
      gltf.scene.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.material = material;
        count += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3;
      });
      if (!count) return onEmpty();
      scene.add(gltf.scene);
      const box = new THREE.Box3().setFromObject(gltf.scene);
      const s = box.getSize(new THREE.Vector3());
      const c = box.getCenter(new THREE.Vector3());
      // glTF is Y-up in metres; the kernel is Z-up in millimetres, so CAD x, y, z are world x, z, y.
      setSize([s.x, s.z, s.y].map((v) => (v * 1000).toFixed(2)).join(' × '));
      setTriangles(count);
      const r = s.length() / 2; // bounding sphere radius
      const fit = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.25;
      controls.target.copy(c);
      camera.position.copy(c).addScaledVector(new THREE.Vector3(0.6, 0.5, 0.8).normalize(), fit);
      camera.near = r / 500;
      camera.far = r * 200;
      camera.updateProjectionMatrix();
    };
    try {
      new GLTFLoader().parse(glb, '', loaded, (e) => onError(`the preview mesh could not be read: ${e.message}`));
    } catch (e) {
      onError(`the preview mesh could not be read: ${(e as Error).message}`);
    }

    let frame = 0;
    const tick = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(tick);
    };
    tick();
    const resize = new ResizeObserver(() => {
      if (!el.clientWidth || !el.clientHeight) return;
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    });
    resize.observe(el);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      canvas.removeEventListener('keydown', zoom);
      controls.stopListenToKeyEvents();
      controls.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [glb, onError, onEmpty]);

  return (
    <div className="relative h-full w-full bg-[#111111]" data-triangles={triangles} data-size-mm={size}>
      <div ref={mount} className="absolute inset-0" />
      <PreviewLabel note="kernel mesh; the execution record is the evidence" />
      {size && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-neutral-900/80 px-2 py-1 font-tech text-[11px] text-neutral-300">
          mesh bounds {size} mm
        </div>
      )}
    </div>
  );
}

export function PreviewLabel({ note }: { note: string }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2 rounded border border-neutral-600 bg-neutral-900/80 px-2 py-1 text-[11px] text-neutral-300">
      <span className="font-semibold uppercase tracking-wider text-neutral-100">Preview</span>
      <span>{note}</span>
    </div>
  );
}
