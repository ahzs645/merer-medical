import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Routes as AppRoutes } from '../../../Routes';
import { useInterfaceLanguage } from '../../../app/providers/InterfaceLanguageProvider';
import { ImagingItem } from '../../imaging/types';

type ScanSource = {
  id: string;
  title: string;
  contentType?: string;
  source?: string;
};

type ScanAttachment = {
  title?: string;
  contentType?: string;
  url?: string;
};

type ScanResource = {
  content?: Array<{ attachment?: ScanAttachment }>;
  attachment?: ScanAttachment;
};

export function DentalScanPreview({ imaging }: { imaging: ImagingItem[] }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webGlUnavailable, setWebGlUnavailable] = useState(false);
  const { t } = useInterfaceLanguage();
  const scanSources = getDentalScanSources(imaging);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || webGlUnavailable) return;

    const width = mount.clientWidth || 320;
    const height = 220;

    if (!isWebGlAvailable()) {
      setWebGlUnavailable(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setWebGlUnavailable(true);
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
  }, [webGlUnavailable]);

  return (
    <div className="rounded-md bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            {t('Demo 3D scan placeholder')}
          </h2>
          <p className="text-sm text-gray-600">
            {t(
              'This generated arch is a placeholder, not a rendered patient scan. Uploaded STL, PLY, or OBJ files are listed below when available.',
            )}
          </p>
        </div>
        <Link
          to={`${AppRoutes.AddRecord}?specialty=dental&dental=imaging`}
          className="inline-flex w-fit shrink-0 items-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700"
        >
          {t('Add dental image/scan')}
        </Link>
      </div>
      <div
        ref={mountRef}
        className="relative mt-3 h-[220px] overflow-hidden rounded-md border border-gray-200"
      >
        <div className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200">
          {t('Placeholder geometry')}
        </div>
        {webGlUnavailable && (
          <div className="flex h-full items-center justify-center bg-slate-50 px-6">
            <div className="w-full max-w-sm">
              <div className="relative mx-auto h-28 w-64 max-w-full rounded-b-full border-b-4 border-slate-300">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div
                    key={index}
                    className="absolute top-7 h-11 w-5 rounded-full bg-slate-200 ring-1 ring-slate-300"
                    style={{
                      left: `${12 + index * 8}%`,
                      transform: `translateX(-50%) rotate(${(index - 4.5) * 3}deg)`,
                    }}
                  />
                ))}
                <div className="absolute left-[36%] top-7 h-11 w-5 rounded-full bg-sky-300 ring-1 ring-sky-400" />
                <div className="absolute left-[64%] top-7 h-11 w-5 rounded-full bg-sky-300 ring-1 ring-sky-400" />
              </div>
              <p className="mt-4 text-center text-sm font-medium text-slate-700">
                {t('3D preview unavailable')}
              </p>
              <p className="mt-1 text-center text-xs text-slate-500">
                {t(
                  'Showing a static placeholder because WebGL is not available in this browser.',
                )}
              </p>
            </div>
          </div>
        )}
      </div>
      {scanSources.length > 0 ? (
        <div className="mt-3 rounded-md bg-slate-50 p-3">
          <p className="text-sm font-semibold text-slate-900">
            {t('Detected scan source files')}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {scanSources.slice(0, 4).map((source) => (
              <div
                key={source.id}
                className="min-w-0 rounded-md bg-white p-2 ring-1 ring-slate-200"
              >
                <p className="truncate text-sm font-medium text-slate-900">
                  {source.title}
                </p>
                <p className="mt-1 truncate text-xs text-slate-600">
                  {[source.contentType, source.source]
                    .filter(Boolean)
                    .join(' · ') || t('Scan file')}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            {t(
              'These files are source attachments. The preview above remains demo geometry until patient scan rendering is implemented.',
            )}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-600">
          {t(
            'No dental scan source file is attached yet. Add a dental image/scan to store the source file with the record.',
          )}
        </p>
      )}
    </div>
  );
}

function isWebGlAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

function getDentalScanSources(imaging: ImagingItem[]): ScanSource[] {
  return imaging.flatMap((item) => {
    const resource = getResource(item);
    const attachments = [
      ...(Array.isArray(resource?.content)
        ? resource.content.map((content) => content?.attachment)
        : []),
      resource?.attachment,
    ].filter(isScanAttachmentRecord);

    if (attachments.length === 0 && isScanLike(item)) {
      return [
        {
          id: item.id,
          title: item.title,
          contentType: item.attachmentType,
          source:
            item.document.metadata?.original_filename ||
            item.document.metadata?.id,
        },
      ];
    }

    return attachments
      .filter((attachment) => isScanAttachment(attachment, item))
      .map((attachment, index) => ({
        id: `${item.id}:${index}`,
        title: attachment.title || item.title,
        contentType: attachment.contentType || item.attachmentType,
        source:
          attachment.url ||
          item.document.metadata?.original_filename ||
          item.document.metadata?.id,
      }));
  });
}

function isScanLike(item: ImagingItem) {
  return (
    item.categories.includes('scan') ||
    isScanFileName(item.title) ||
    isScanContentType(item.attachmentType)
  );
}

function isScanAttachment(attachment: ScanAttachment, item: ImagingItem) {
  return (
    isScanContentType(attachment?.contentType) ||
    isScanFileName(attachment?.title) ||
    isScanFileName(attachment?.url) ||
    isScanLike(item)
  );
}

function isScanAttachmentRecord(
  attachment: ScanAttachment | undefined,
): attachment is ScanAttachment {
  return !!attachment;
}

function isScanContentType(contentType?: string) {
  return /model\/(stl|ply|obj)|application\/(sla|vnd\.ms-pki\.stl)/i.test(
    contentType || '',
  );
}

function isScanFileName(value?: string) {
  return /\.(stl|ply|obj)(?:$|[?#])/i.test(value || '');
}

function getResource(item: ImagingItem): ScanResource {
  const raw = item.document.data_record.raw as
    | (ScanResource & { resource?: ScanResource })
    | undefined;
  return raw?.resource || raw || {};
}
