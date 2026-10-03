import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

export type ScanFormat = 'stl' | 'ply';

/** base64 (with or without a data: prefix) → bytes. */
export function base64ToArrayBuffer(data: string): ArrayBuffer {
  const binary = atob(data.replace(/^data:[^,]*,/, '').replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * The person's own intraoral scan, drawn with three.js's STL/PLY loaders.
 * Drag to turn it, pinch or scroll to zoom.
 *
 * This used to draw "demo geometry" — fourteen capsules on an arch — beside
 * the patient's real STL files, with a caption most people would not read.
 * A picture of somebody's teeth next to yours is the wrong default for a
 * medical record, so it is gone: either the file's own bytes are drawn, or
 * nothing is.
 *
 * Alone in its own module so three.js is fetched only when there is a scan
 * with stored bytes to draw.
 */
export function DentalScanCanvas({
  data,
  format,
  onUnavailable,
}: {
  /** The file's bytes, base64. */
  data: string;
  format: ScanFormat;
  /** Called when this browser can't give us a WebGL context after all. */
  onUnavailable: () => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useInterfaceLanguage();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let geometry: THREE.BufferGeometry;
    try {
      const buffer = base64ToArrayBuffer(data);
      geometry =
        format === 'ply'
          ? new PLYLoader().parse(buffer)
          : new STLLoader().parse(buffer);
    } catch {
      setError(t('This scan file could not be read.'));
      return;
    }
    if (!geometry.getAttribute('position')?.count) {
      setError(t('This scan file has no surface to draw.'));
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      onUnavailable();
      return;
    }

    const width = mount.clientWidth || 320;
    const height = mount.clientHeight || 320;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(1, 2, 3);
    scene.add(key);

    geometry.computeVertexNormals();
    geometry.center();
    geometry.computeBoundingSphere();
    const radius = geometry.boundingSphere?.radius || 1;

    const material = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.6,
      metalness: 0.02,
      // PLY scans carry the scanner's colour per vertex.
      vertexColors: !!geometry.getAttribute('color'),
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const camera = new THREE.PerspectiveCamera(
      40,
      width / height,
      radius / 100,
      radius * 20,
    );
    camera.position.set(0, radius * 0.6, radius * 2.6);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    let requestId = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      requestId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(requestId);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [data, format, onUnavailable, t]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-700">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="h-full w-full touch-none"
      role="img"
      aria-label={t('3D view of your scan. Drag to turn it.')}
    />
  );
}

export default DentalScanCanvas;
