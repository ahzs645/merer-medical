import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function DentalScanPreview() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 320;
    const height = 220;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
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
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            3D scan preview
          </h2>
          <p className="text-sm text-gray-600">
            Three.js is wired for STL/PLY/OBJ-style scan rendering. This demo
            preview uses a generated arch until uploaded scan files are stored.
          </p>
        </div>
      </div>
      <div
        ref={mountRef}
        className="mt-3 h-[220px] overflow-hidden rounded-md border border-gray-200"
      />
    </div>
  );
}
