import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';

/**
 * The WebGL half of the dental scan preview, alone in its own module so that
 * three.js is fetched only once there is a scan to draw.
 *
 * `DentalScanPreview` imported three.js at the top level, which put the whole
 * renderer in the Imaging tab's chunk: opening "Imaging & scans" downloaded
 * ~500 KB of 3D engine whether or not any scan file existed, and before the
 * split it sat in the app's single entry chunk, where every phone paid for it
 * on first load.
 *
 * Everything around the canvas — the heading, the add link, the detected-files
 * list, and the no-WebGL placeholder — stays in the parent, so a browser
 * without WebGL never loads this at all.
 */
export function DentalScanCanvas({
  onUnavailable,
}: {
  /** Called when this browser can't give us a WebGL context after all. */
  onUnavailable: () => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const { t } = useInterfaceLanguage();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || failed) return;

    const width = mount.clientWidth || 320;
    const height = 220;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setFailed(true);
      onUnavailable();
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 6);
    camera.lookAt(0, 0, 0);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const light = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.1);
    scene.add(light);

    const material = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.55,
      metalness: 0.04,
    });
    const highlightMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.5,
      metalness: 0.02,
    });

    const group = new THREE.Group();
    const toothGeometry = new THREE.CapsuleGeometry(0.17, 0.38, 4, 10);

    for (let i = 0; i < 14; i++) {
      const angle = Math.PI * (0.18 + (i / 13) * 0.64);
      const x = Math.cos(angle) * 2.1;
      const z = Math.sin(angle) * 0.7;
      const tooth = new THREE.Mesh(
        toothGeometry,
        i === 4 || i === 9 ? highlightMaterial : material,
      );
      tooth.position.set(x, 0, z);
      tooth.rotation.z = -x * 0.12;
      tooth.rotation.x = 0.2;
      group.add(tooth);
    }

    const archGeometry = new THREE.TorusGeometry(1.45, 0.04, 8, 80, Math.PI);
    const arch = new THREE.Mesh(
      archGeometry,
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 }),
    );
    arch.position.set(0, -0.18, 0.12);
    arch.rotation.z = Math.PI;
    group.add(arch);

    scene.add(group);

    let frame = 0;
    const animate = () => {
      group.rotation.y = Math.sin(frame / 90) * 0.18;
      group.rotation.x = -0.2 + Math.sin(frame / 120) * 0.04;
      renderer.render(scene, camera);
      frame += 1;
      requestId = requestAnimationFrame(animate);
    };

    let requestId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(requestId);
      renderer.dispose();
      toothGeometry.dispose();
      archGeometry.dispose();
      material.dispose();
      highlightMaterial.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [failed, onUnavailable]);

  return (
    <>
      <div className="absolute start-3 top-3 z-10 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
        {t('Demo geometry')}
      </div>
      <div ref={mountRef} className="h-full w-full" />
    </>
  );
}

export default DentalScanCanvas;
